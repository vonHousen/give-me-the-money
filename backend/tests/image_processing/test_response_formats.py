from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.image_processing.response_formats import ProcessedReceipt


def test_schema_when_valid_raw_payload_expect_schema_parses() -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Milk", "item_count": 2, "total_cost": "8.40"}],
        "total_value": "8.40",
    }

    # Act
    parsed = ProcessedReceipt.model_validate(payload)

    # Assert
    assert len(parsed.rows) == 1
    assert parsed.rows[0].item_name == "Milk"
    assert parsed.total_value == Decimal("8.40")


def test_schema_when_rows_are_invalid_type_expect_validation_error() -> None:
    # Arrange
    payload = {"rows": "invalid"}

    # Act / Assert
    with pytest.raises(ValidationError):
        ProcessedReceipt.model_validate(payload)
