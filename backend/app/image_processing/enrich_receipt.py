import asyncio
import base64
from pathlib import Path

from app.image_processing.response_formats import ProcessedReceipt
from app.logging import get_logger

DATA_DIR = Path(__file__).parents[2] / "data"
logger = get_logger(__name__)

async def enrich(receipt: ProcessedReceipt, image_ids: list) -> None:
    # TODO, replace this with llm and image generation
    logger.info(f"Starting enrich row: {receipt}")
    await asyncio.sleep(0.5)
