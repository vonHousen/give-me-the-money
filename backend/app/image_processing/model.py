from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field, computed_field, field_validator


class ReceiptRow(BaseModel):
    item_name: str = Field(min_length=1)
    item_count: int = Field(ge=1)
    total_cost: Decimal = Field(ge=0)


class ReceiptRowWithImage(ReceiptRow):
    generated_image_base64: str | None = None


class RestaurantInfo(BaseModel):
    nip: str | None = None
    restaurant_address: str | None = None
    restaurant_name: str | None = None

    def serialize_only_extracted(self) -> dict[str, Any]:
        return self.model_dump(exclude_none=True)


class MenuItem(BaseModel):
    item_name: str = Field(min_length=1)
    item_price: Decimal | None = Field(default=None, ge=0)
    currency_code: str | None = Field(default=None, min_length=3, max_length=3)


class ProcessedReceipt(BaseModel):
    rows: list[ReceiptRow]
    currency_code: str = Field(min_length=3, max_length=3)
    restaurant_info: RestaurantInfo = Field(default_factory=RestaurantInfo)

    @computed_field
    @property
    def calculated_total(self) -> Decimal:
        return sum((row.total_cost for row in self.rows), Decimal("0"))

    @field_validator("currency_code")
    @classmethod
    def normalize_currency_code(cls, value: str) -> str:
        return value.strip().upper()


class ProcessedReceiptWithImages(ProcessedReceipt):
    rows: list[ReceiptRowWithImage]


class EnrichedRestaurantInfo(RestaurantInfo):
    website_url: str | None = None
    evidence_urls: list[str] = Field(default_factory=list)
    menu_source_urls: list[str] = Field(default_factory=list)


class EnrichedReceiptRow(ReceiptRow):
    is_menu_match: bool = False
    matched_menu_item_name: str | None = None
    matched_menu_item_description: str | None = None
    matched_menu_item_image_url: str | None = None
    matched_menu_item_price: Decimal | None = Field(default=None, ge=0)
    match_confidence: float | None = Field(default=None, ge=0, le=1)


class EnrichedProcessedReceipt(BaseModel):
    rows: list[EnrichedReceiptRow]
    currency_code: str = Field(min_length=3, max_length=3)
    restaurant_info: EnrichedRestaurantInfo = Field(default_factory=EnrichedRestaurantInfo)

    @computed_field
    @property
    def calculated_total(self) -> Decimal:
        return sum((row.total_cost for row in self.rows), Decimal("0"))

    @field_validator("currency_code")
    @classmethod
    def normalize_currency_code(cls, value: str) -> str:
        return value.strip().upper()
