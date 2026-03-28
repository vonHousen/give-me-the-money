from decimal import Decimal

from pydantic import BaseModel, Field, field_validator

class ReceiptRow(BaseModel):
    item_name: str = Field(min_length=1)
    item_count: int = Field(ge=1)
    total_cost: Decimal = Field(ge=0)


class ProcessedReceipt(BaseModel):
    rows: list[ReceiptRow]
    currency_code: str = Field(min_length=3, max_length=3)

    @field_validator("currency_code")
    @classmethod
    def normalize_currency_code(cls, value: str) -> str:
        return value.strip().upper()
