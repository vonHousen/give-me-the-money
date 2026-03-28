import base64
import binascii
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import ValidationError

from app.image_processing.model import ProcessedReceipt
from app.image_processing.ocr import response_formats
from app.image_processing.ocr.exceptions import ImageProcessingParseError
from app.logging import get_logger

DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
DEFAULT_CURRENCY_CODE = "PLN"
LOGGER = get_logger(__name__)


def extract_payload_and_mime(img_b64: str, mime_type: str) -> tuple[str, str]:
    payload = img_b64.strip()
    resolved_mime = mime_type

    if payload.startswith("data:") and "," in payload:
        header, payload = payload.split(",", 1)
        header_mime = header.split(";")[0].replace("data:", "").strip()
        if header_mime:
            resolved_mime = header_mime

    return payload, resolved_mime


def decode_image(img_b64: str, mime_type: str) -> tuple[bytes, str]:
    payload, resolved_mime = extract_payload_and_mime(img_b64=img_b64, mime_type=mime_type)
    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ImageProcessingParseError("invalid base64 image payload") from exc
    return image_bytes, resolved_mime


def log_extracted_restaurant_attributes(
    parsed_receipt: response_formats.ProcessedReceipt,
) -> None:
    if extracted := parsed_receipt.restaurant_info.serialize_only_extracted():
        LOGGER.info(f"Receipt restaurant attributes extracted: {extracted}")


def coerce_raw_response(parsed_response: Any) -> response_formats.ProcessedReceipt:
    if parsed_response is None:
        raise ImageProcessingParseError("gemini returned empty parsed response")

    try:
        if isinstance(parsed_response, response_formats.ProcessedReceipt):
            return parsed_response
        return response_formats.ProcessedReceipt.model_validate(parsed_response)
    except ValidationError as exc:
        raise ImageProcessingParseError(
            "gemini parsed response does not match expected schema",
        ) from exc


def to_model_processed_receipt(
    raw_receipt: response_formats.ProcessedReceipt,
    currency_code: str = DEFAULT_CURRENCY_CODE,
) -> ProcessedReceipt:
    parsed = ProcessedReceipt.model_validate(
        {
            "rows": [row.model_dump() for row in raw_receipt.rows],
            "currency_code": currency_code,
        },
    )

    if raw_receipt.total_value == parsed.calculated_total:
        LOGGER.info("✅ success: receipt total matches calculated_total")
    else:
        LOGGER.warning(
            f"❌ total mismatch: raw total_value={raw_receipt.total_value} "
            f"calculated_total={parsed.calculated_total}",
        )

    return parsed


def parse_decimal(value: Any) -> Decimal:
    if value is None:
        raise ValueError("amount is missing")

    if isinstance(value, Decimal):
        return value

    if isinstance(value, (int, float)):
        return Decimal(str(value))

    raw = str(value).strip()
    cleaned = re.sub(r"[^\d,.\-]", "", raw)
    if not cleaned:
        raise ValueError("amount is empty after normalization")

    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "")
            cleaned = cleaned.replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")

    try:
        return Decimal(cleaned)
    except InvalidOperation as exc:
        raise ValueError(f"invalid amount format: {value}") from exc
