import asyncio
import base64
import os
from typing import Any

from google import genai
from google.genai import types
from pydantic import BaseModel

from app.image_processing.model import (
    ProcessedReceipt,
    ProcessedReceiptWithImages,
    ReceiptRow,
    ReceiptRowWithImage,
)
from app.image_processing.ocr.exceptions import (
    ImageProcessingConfigError,
    ImageProcessingUpstreamError,
)
from app.logging import get_logger

LOGGER = get_logger(__name__)
DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image"
DEFAULT_CONTEXT_MODEL = "gemini-2.5-flash"
IMAGE_GENERATION_SYNC_FLAG = "GEMINI_IMAGE_GENERATION_SYNC"


class _SynthesizedReceiptContext(BaseModel):
    restaurant_type: str | None = None
    cuisine_type: str | None = None
    visual_style: str | None = None
    plating_style: str | None = None
    atmosphere_keywords: list[str] | None = None


def _build_context_prompt(receipt: ProcessedReceipt) -> str:
    row_names = ", ".join(row.item_name for row in receipt.rows[:20]) or "(no items)"
    restaurant_name = receipt.restaurant_info.restaurant_name or "unknown"
    restaurant_address = receipt.restaurant_info.restaurant_address or "unknown"
    return (
        "You are creating concise culinary context for image generation.\n"
        "Return only JSON with keys: restaurant_type, cuisine_type, visual_style, "
        "plating_style, atmosphere_keywords.\n"
        "Keep each value short and practical for food image prompt engineering.\n"
        f"Restaurant name: {restaurant_name}\n"
        f"Restaurant address: {restaurant_address}\n"
        f"Receipt items: {row_names}\n"
    )


def _build_image_prompt(row: ReceiptRow, context: _SynthesizedReceiptContext | None) -> str:
    if context is None:
        return (
            "Create a realistic food photography image of the following receipt item: "
            f"{row.item_name}."
        )

    atmosphere = ", ".join(context.atmosphere_keywords or [])
    return (
        "Create a realistic food photography image for this menu item:\n"
        f"Item name: {row.item_name}\n"
        f"Restaurant type: {context.restaurant_type or 'unknown'}\n"
        f"Cuisine type: {context.cuisine_type or 'unknown'}\n"
        f"Visual style: {context.visual_style or 'natural restaurant photo'}\n"
        f"Plating style: {context.plating_style or 'restaurant plating'}\n"
        f"Atmosphere keywords: {atmosphere or 'neutral'}\n"
        "No text overlays, no logos, no watermarks."
    )


async def _synthesize_context(
    *,
    aclient: Any,
    receipt: ProcessedReceipt,
    context_model: str,
) -> _SynthesizedReceiptContext | None:
    try:
        response = await aclient.models.generate_content(
            model=context_model,
            contents=_build_context_prompt(receipt),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_SynthesizedReceiptContext,
            ),
        )
    except Exception:  # noqa: BLE001
        LOGGER.exception("Failed to synthesize receipt context; continuing without context")
        return None

    parsed = getattr(response, "parsed", None)
    if parsed is None:
        LOGGER.warning("Context synthesis returned empty payload; continuing without context")
        return None

    if isinstance(parsed, _SynthesizedReceiptContext):
        return parsed

    if isinstance(parsed, dict):
        return _SynthesizedReceiptContext(
            restaurant_type=parsed.get("restaurant_type"),
            cuisine_type=parsed.get("cuisine_type"),
            visual_style=parsed.get("visual_style"),
            plating_style=parsed.get("plating_style"),
            atmosphere_keywords=parsed.get("atmosphere_keywords"),
        )

    LOGGER.warning("Context synthesis returned unexpected shape; continuing without context")
    return None


def _extract_image_base64(response: Any) -> str | None:
    parts = getattr(response, "parts", None) or []
    for part in parts:
        inline_data = getattr(part, "inline_data", None)
        if inline_data is None:
            continue
        data = getattr(inline_data, "data", None)
        if data is None:
            continue
        if isinstance(data, bytes):
            return base64.b64encode(data).decode("utf-8")
        if isinstance(data, str):
            return data
    return None


async def _generate_row_image(
    *,
    aclient: Any,
    row: ReceiptRow,
    image_model: str,
    context: _SynthesizedReceiptContext | None,
) -> ReceiptRowWithImage:
    try:
        response = await aclient.models.generate_content(
            model=image_model,
            contents=_build_image_prompt(row=row, context=context),
            config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
    except Exception:  # noqa: BLE001
        LOGGER.exception(f"Failed to generate image for row '{row.item_name}'")
        return ReceiptRowWithImage.model_validate(
            {
                "item_name": row.item_name,
                "item_count": row.item_count,
                "total_cost": row.total_cost,
                "generated_image_base64": None,
            }
        )

    image_b64 = _extract_image_base64(response)
    if image_b64 is None:
        LOGGER.warning(f"No image payload generated for row '{row.item_name}'")

    return ReceiptRowWithImage.model_validate(
        {
            "item_name": row.item_name,
            "item_count": row.item_count,
            "total_cost": row.total_cost,
            "generated_image_base64": image_b64,
        }
    )


async def enrich_processed_receipt_with_images_async(
    receipt: ProcessedReceipt,
) -> ProcessedReceiptWithImages:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ImageProcessingConfigError("GEMINI_API_KEY is required")

    image_model = os.getenv("GEMINI_IMAGE_MODEL", DEFAULT_IMAGE_MODEL)
    context_model = os.getenv("GEMINI_IMAGE_CONTEXT_MODEL", DEFAULT_CONTEXT_MODEL)
    run_sync = os.getenv(IMAGE_GENERATION_SYNC_FLAG, "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }

    try:
        async with genai.Client(api_key=api_key).aio as aclient:
            context = await _synthesize_context(
                aclient=aclient,
                receipt=receipt,
                context_model=context_model,
            )

            if run_sync:
                LOGGER.info("Generating receipt images in sequential mode")
                rows_with_images = []
                for row in receipt.rows:
                    rows_with_images.append(
                        await _generate_row_image(
                            aclient=aclient,
                            row=row,
                            image_model=image_model,
                            context=context,
                        )
                    )
            else:
                tasks = [
                    _generate_row_image(
                        aclient=aclient,
                        row=row,
                        image_model=image_model,
                        context=context,
                    )
                    for row in receipt.rows
                ]
                rows_with_images = await asyncio.gather(*tasks)
    except Exception as exc:  # noqa: BLE001
        raise ImageProcessingUpstreamError("Gemini image generation failed unexpectedly") from exc

    return ProcessedReceiptWithImages.model_validate(
        {
            "rows": [row.model_dump() for row in rows_with_images],
            "currency_code": receipt.currency_code,
            "restaurant_info": receipt.restaurant_info.model_dump(),
        }
    )
