from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.image_processing.model import ProcessedReceipt, ReceiptRow


def test_receipt_row_when_valid_payload_expect_decimal_and_types_validated() -> None:
    # Arrange
    payload = {"item_name": "Bread", "item_count": 1, "total_cost": "5.99"}

    # Act
    row = ReceiptRow.model_validate(payload)

    # Assert
    assert row.item_name == "Bread"
    assert row.item_count == 1
    assert row.total_cost == Decimal("5.99")


def test_receipt_row_when_invalid_item_count_expect_validation_error() -> None:
    # Arrange
    payload = {"item_name": "Bread", "item_count": 0, "total_cost": "5.99"}

    # Act / Assert
    with pytest.raises(ValidationError):
        ReceiptRow.model_validate(payload)


def test_processed_receipt_when_lowercase_currency_expect_uppercase_currency_code() -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Bread", "item_count": 1, "total_cost": "5.99"}],
        "currency_code": "pln",
    }

    # Act
    receipt = ProcessedReceipt.model_validate(payload)

    # Assert
    assert receipt.currency_code == "PLN"


def test_processed_receipt_when_multiple_rows_expect_calculated_total_sum() -> None:
    # Arrange
    payload = {
        "rows": [
            {"item_name": "Bread", "item_count": 1, "total_cost": "5.99"},
            {"item_name": "Milk", "item_count": 2, "total_cost": "8.01"},
        ],
        "currency_code": "pln",
    }

    # Act
    receipt = ProcessedReceipt.model_validate(payload)

    # Assert
    assert receipt.calculated_total == Decimal("14.00")
