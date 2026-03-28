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
    """A processed receipt containing the items purchased and the currency code."""

    STRUCTURED_OUTPUT_HINT: ClassVar[str] = dedent("""
        Return JSON only with this shape:
        {
          "rows": [{"item_name": "string", "item_count": 1, "total_cost": "12.34"}],
          "currency_code": "PLN"
        }
    """).strip()

    rows: list[ReceiptRow] = Field(default_factory=list)
    # TODO get rid of the currency for now
    currency_code: str = Field(
        min_length=3,
        max_length=3,
        description="The currency code of the receipt.",
    )


# TODO is it used?
class ParseWarning(BaseModel):
    """A warning message for a row that was skipped during parsing."""

    message: str = Field(
        description="The warning message for the row that was skipped during parsing.",
    )
