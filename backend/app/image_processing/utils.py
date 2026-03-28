import base64
import binascii
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import ValidationError

from app.image_processing import response_formats
from app.image_processing.exceptions import ImageProcessingParseError
from app.image_processing.model import ReceiptRow

DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
DEFAULT_CURRENCY_CODE = "PLN"


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


def normalize_rows(
    raw_rows: list[response_formats.ReceiptRow],
) -> tuple[list[ReceiptRow], list[str]]:
    rows: list[ReceiptRow] = []
    warnings: list[str] = []

    for index, raw_row in enumerate(raw_rows, start=1):
        try:
            item_name = (raw_row.item_name or "").strip()
            if not item_name:
                raise ValueError("item_name is missing")

            item_count = int(raw_row.item_count)
            if item_count < 1:
                raise ValueError("item_count must be greater than zero")

            total_cost = parse_decimal(raw_row.total_cost)
            rows.append(
                ReceiptRow(item_name=item_name, item_count=item_count, total_cost=total_cost),
            )
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"row_{index}_skipped: {exc}")

    return rows, warnings
