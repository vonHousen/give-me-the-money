from decimal import Decimal
from textwrap import dedent
from typing import Any, ClassVar

from pydantic import BaseModel, Field


class ReceiptRow(BaseModel):
    """A single row of an item purchased on a receipt."""

    item_name: str = Field(
        min_length=1,
        description="The name of the item purchased on the receipt.",
    )
    item_count: int = Field(
        ge=1,
        description="The count of instances of the particular item purchased on the receipt.",
    )
    total_cost: Decimal = Field(
        ge=0,
        description="The total cost of all the instances of the item purchased on the receipt.",
    )


class RestaurantInfo(BaseModel):
    """Restaurant's optional info based on the receipt."""

    nip: str | None = Field(
        default=None,
        pattern=r"^\d{10}$",
        description=(
            "The NIP number just above the 'PARAGON FISKALNY' header. Must be exactly 10 digits."
        ),
    )
    restaurant_address: str | None = Field(default=None, description="The restaurant's address.")
    restaurant_name: str | None = Field(default=None, description="The restaurant's name.")

    def serialize_only_extracted(self) -> dict[str, Any]:
        """Serialize only extracted (not-null) fields."""
        return self.model_dump(exclude_none=True)


class ProcessedReceipt(BaseModel):
    """A processed receipt containing the items purchased."""

    STRUCTURED_OUTPUT_HINT: ClassVar[str] = dedent("""
        Return JSON only with this shape:
        {
          "rows": [{"item_name": "string", "item_count": 1, "total_cost": "12.34"}],
          "total_value": "12.34",
          "restaurant_info": {
            "nip": "1234567890",
            "restaurant_address": "string",
            "restaurant_name": "string"
          }
        }
        Set unknown restaurant_info fields to null.
    """).strip()

    rows: list[ReceiptRow] = Field(default_factory=list)
    total_value: Decimal = Field(
        ge=0,
        description="The grand total value for the whole receipt.",
    )
    restaurant_info: RestaurantInfo = Field(
        description="Restaurant's optional info based on the receipt."
    )
