import os
import time

from google import genai
from google.genai import types

from app.image_processing import response_formats, utils
from app.image_processing.exceptions import ImageProcessingConfigError, ImageProcessingUpstreamError
from app.image_processing.model import ProcessedReceipt
from app.image_processing.prompts import build_receipt_prompt
from app.logging import get_logger

LOGGER = get_logger(__name__)


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

    model_name = os.getenv("GEMINI_MODEL", utils.DEFAULT_GEMINI_MODEL)
    image_bytes, resolved_mime = utils.decode_image(img_b64=img_b64, mime_type=mime_type)

    client = genai.Client(api_key=api_key)

    llm_call_started = time.perf_counter()
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

    llm_call_elapsed = time.perf_counter() - llm_call_started
    LOGGER.debug("LLM call elapsed time: %.3fs", llm_call_elapsed)

    parsed_receipt: response_formats.ProcessedReceipt = utils.coerce_raw_response(response.parsed)
    return utils.to_model_processed_receipt(parsed_receipt)
