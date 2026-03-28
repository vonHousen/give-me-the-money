import asyncio
import shutil
from pathlib import Path
from uuid import UUID

from app.image_processing.response_formats import ProcessedReceipt
from app.logging import get_logger

DATA_DIR = Path(__file__).parents[2] / "data"
logger = get_logger(__name__)

#TODO Update it
EXAMPLE_IMAGES = [
    "imbir.jpg",
    "busan_beer.jpg",
    "turbo_bowl.jpeg",
    "gimbap.jpeg",
    "kimchi.jpg",
    "kimchi.jpg",
    "fries.jpg",
    "kimchi.jpg",
]

async def enrich(receipt: ProcessedReceipt, image_ids: list[UUID]) -> None:
    logger.info(f"Starting enrich receipt: {receipt}")
    for i, image_id in enumerate(image_ids):
        src = DATA_DIR / EXAMPLE_IMAGES[i % len(EXAMPLE_IMAGES)]
        shutil.copy(src, DATA_DIR / f"{image_id}.jpg")
