from typing import Literal

from pydantic import BaseModel, Field

from app.image_processing.model import MenuItem, RestaurantInfo


class RestaurantMatch(BaseModel):
    restaurant_name: str | None = None
    restaurant_address: str | None = None
    website_url: str | None = None
    confidence: float = Field(ge=0, le=1, default=0.0)
    evidence_urls: list[str] = Field(default_factory=list)


class RestaurantWebEnrichment(BaseModel):
    status: Literal["success", "skipped", "failed"]
    failure_reason: str | None = None
    match: RestaurantMatch | None = None
    menu_items: list[MenuItem] = Field(default_factory=list)
    menu_source_urls: list[str] = Field(default_factory=list)


__all__ = [
    "RestaurantInfo",
    "MenuItem",
    "RestaurantMatch",
    "RestaurantWebEnrichment",
]
