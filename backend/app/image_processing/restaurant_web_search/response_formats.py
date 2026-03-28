from decimal import Decimal
from textwrap import dedent
from typing import ClassVar

from pydantic import BaseModel, Field


class RestaurantMatch(BaseModel):
    restaurant_name: str | None = None
    restaurant_address: str | None = None
    website_url: str | None = None
    confidence: float = Field(default=0.0, ge=0, le=1)
    evidence_urls: list[str] = Field(default_factory=list)


class MenuItem(BaseModel):
    item_name: str = Field(min_length=1)
    item_price: Decimal | None = Field(default=None, ge=0)
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)


class RestaurantWebSearchResponse(BaseModel):
    STRUCTURED_OUTPUT_HINT: ClassVar[str] = dedent("""
        Return JSON only with this shape:
        {
          "match": {
            "restaurant_name": "string | null",
            "restaurant_address": "string | null",
            "website_url": "https://... | null",
            "confidence": 0.0,
            "evidence_urls": ["https://..."]
          },
          "menu_items": [
            {
              "item_name": "string",
              "item_price": "12.50 | null",
              "currency_code": "PLN | null"
            }
          ],
          "menu_source_urls": ["https://..."]
        }
        Use null when a scalar value cannot be reliably established.
    """).strip()

    match: RestaurantMatch | None = None
    menu_items: list[MenuItem] = Field(default_factory=list)
    menu_source_urls: list[str] = Field(default_factory=list)
