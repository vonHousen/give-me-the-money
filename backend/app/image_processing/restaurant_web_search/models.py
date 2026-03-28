from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, Field


class RestaurantLookupInfo(BaseModel):
    nip: str | None = None
    restaurant_address: str | None = None
    restaurant_name: str | None = None

    def serialize_only_extracted(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class RestaurantMatch(BaseModel):
    restaurant_name: str | None = None
    restaurant_address: str | None = None
    website_url: str | None = None
    confidence: float = Field(ge=0, le=1, default=0.0)
    evidence_urls: list[str] = Field(default_factory=list)


class MenuItem(BaseModel):
    item_name: str = Field(min_length=1)
    item_price: Decimal | None = Field(default=None, ge=0)
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)


class RestaurantWebEnrichment(BaseModel):
    status: Literal["success", "skipped", "failed"]
    failure_reason: str | None = None
    match: RestaurantMatch | None = None
    menu_items: list[MenuItem] = Field(default_factory=list)
    menu_source_urls: list[str] = Field(default_factory=list)
