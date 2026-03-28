import base64
import binascii
import logging
import os
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from pydantic import ValidationError

from app.image_processing import response_formats
from app.image_processing.exceptions import (
    ImageProcessingConfigError,
    ImageProcessingParseError,
    ImageProcessingUpstreamError,
)
from app.image_processing.model import ProcessedReceipt, ReceiptRow
from app.image_processing.prompts import build_receipt_prompt

DEFAULT_GEMINI_MODEL = "gemini-3.1-flash"
DEFAULT_CURRENCY_CODE = "PLN"

LOGGER = logging.getLogger(__name__)


def _load_genai_modules() -> tuple[Any, Any]:
    try:
        from google import genai
        from google.genai import types
    except Exception as exc:  # pragma: no cover
        raise ImageProcessingConfigError("google-genai dependency is not available") from exc
    return genai, types


def _extract_payload_and_mime(img_b64: str, mime_type: str) -> tuple[str, str]:
    payload = img_b64.strip()
    resolved_mime = mime_type

    if payload.startswith("data:") and "," in payload:
        header, payload = payload.split(",", 1)
        header_mime = header.split(";")[0].replace("data:", "").strip()
        if header_mime:
            resolved_mime = header_mime

    return payload, resolved_mime


def _decode_image(img_b64: str, mime_type: str) -> tuple[bytes, str]:
    payload, resolved_mime = _extract_payload_and_mime(img_b64=img_b64, mime_type=mime_type)
    try:
        image_bytes = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ImageProcessingParseError("invalid base64 image payload") from exc
    return image_bytes, resolved_mime


def _coerce_raw_response(parsed_response: Any) -> response_formats.ProcessedReceipt:
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


def _parse_decimal(value: Any) -> Decimal:
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


def _normalize_rows(
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

            total_cost = _parse_decimal(raw_row.total_cost)
            rows.append(
                ReceiptRow(item_name=item_name, item_count=item_count, total_cost=total_cost),
            )
        except Exception as exc:  # noqa: BLE001
            warnings.append(f"row_{index}_skipped: {exc}")

    return rows, warnings


def parse_receipt(img_b64: str, mime_type: str = "image/jpeg") -> ProcessedReceipt:
    """
    Parse a receipt image into a processed receipt.

    Args:
        img_b64: The base64 encoded receipt image.
        mime_type: The mime type of the receipt image.

    Returns:
        A processed receipt containing the items purchased and the currency code.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ImageProcessingConfigError("GEMINI_API_KEY is required")

    model_name = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    image_bytes, resolved_mime = _decode_image(img_b64=img_b64, mime_type=mime_type)

    genai, types = _load_genai_modules()
    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model=model_name,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=resolved_mime),
                build_receipt_prompt(),
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=response_formats.ProcessedReceipt,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        raise ImageProcessingUpstreamError("gemini request failed") from exc

    raw = _coerce_raw_response(response.parsed)
    rows, warnings = _normalize_rows(raw.rows)
    if warnings:
        LOGGER.debug("parse_receipt warnings: %s", warnings)

    return ProcessedReceipt(rows=rows, currency_code=DEFAULT_CURRENCY_CODE)
