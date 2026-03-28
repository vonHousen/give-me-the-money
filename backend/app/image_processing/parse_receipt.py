import os
import time

from google import genai
from google.genai import types

from app.image_processing.model import ProcessedReceipt
from app.image_processing.ocr import response_formats, utils
from app.image_processing.ocr.exceptions import (
    ImageProcessingConfigError,
    ImageProcessingError,
    ImageProcessingUpstreamError,
)
from app.image_processing.ocr.prompts import build_receipt_prompt
from app.image_processing.restaurant_web_search import (
    RestaurantLookupInfo,
    enrich_restaurant_from_web,
    is_web_search_enabled,
)
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
    LOGGER.debug("Starting receipt parsing pipeline")
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ImageProcessingConfigError("GEMINI_API_KEY is required")

    model_name = os.getenv("GEMINI_MODEL", utils.DEFAULT_GEMINI_MODEL)
    LOGGER.debug(f"Using OCR model: {model_name}")
    image_bytes, resolved_mime = utils.decode_image(img_b64=img_b64, mime_type=mime_type)

    client = genai.Client(api_key=api_key)

    llm_call_started = time.perf_counter()
    LOGGER.debug("Sending receipt image + prompt to Gemini OCR model")
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
    LOGGER.debug(f"LLM call elapsed time: {llm_call_elapsed:.3f}s")

    parsed_receipt: response_formats.ProcessedReceipt = utils.coerce_raw_response(response.parsed)
    utils.log_extracted_restaurant_attributes(parsed_receipt)

    if is_web_search_enabled():
        try:
            LOGGER.debug("Mapping OCR restaurant_info into web-search lookup model")
            restaurant_lookup_info = RestaurantLookupInfo.model_validate(
                parsed_receipt.restaurant_info.model_dump()
            )
            LOGGER.debug("Starting restaurant web-search enrichment")
            _ = enrich_restaurant_from_web(restaurant_lookup_info)
            LOGGER.debug("Restaurant web-search enrichment finished")
        except ImageProcessingError:
            LOGGER.exception("Restaurant web-search enrichment failed!")

    LOGGER.debug("Converting OCR response to final ProcessedReceipt model")
    return utils.to_model_processed_receipt(parsed_receipt)
