from decimal import Decimal
from textwrap import dedent
from typing import ClassVar

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


class ProcessedReceipt(BaseModel):
    """A processed receipt containing the items purchased."""

    STRUCTURED_OUTPUT_HINT: ClassVar[str] = dedent("""
        Return JSON only with this shape:
        {
          "rows": [{"item_name": "string", "item_count": 1, "total_cost": "12.34"}],
          "total_value": "12.34"
        }
    """).strip()

    rows: list[ReceiptRow] = Field(default_factory=list)
    total_value: Decimal | None = Field(
        default=None,
        ge=0,
        description="The grand total value for the whole receipt.",
    )
