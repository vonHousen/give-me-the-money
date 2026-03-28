from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.image_processing.ocr.response_formats import ProcessedReceipt


def test_schema_when_valid_raw_payload_expect_schema_parses() -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Milk", "item_count": 2, "total_cost": "8.40"}],
        "total_value": "8.40",
        "restaurant_info": {
            "nip": None,
            "restaurant_address": None,
            "restaurant_name": None,
        },
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


def test_schema_when_nip_has_10_digits_expect_schema_parses() -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Milk", "item_count": 1, "total_cost": "4.20"}],
        "total_value": "4.20",
        "restaurant_info": {
            "nip": "1234567890",
            "restaurant_address": None,
            "restaurant_name": None,
        },
    }

    # Act
    parsed = ProcessedReceipt.model_validate(payload)

    # Assert
    assert parsed.restaurant_info.nip == "1234567890"


@pytest.mark.parametrize(
    "nip",
    ["123456789", "12345678901", "12345abc90", "123-456-7890"],
)
def test_schema_when_nip_is_not_exactly_10_digits_expect_validation_error(
    nip: str,
) -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Milk", "item_count": 1, "total_cost": "4.20"}],
        "total_value": "4.20",
        "restaurant_info": {
            "nip": nip,
            "restaurant_address": None,
            "restaurant_name": None,
        },
    }

    # Act / Assert
    with pytest.raises(ValidationError):
        ProcessedReceipt.model_validate(payload)


def test_schema_when_nip_is_none_expect_schema_parses() -> None:
    # Arrange
    payload = {
        "rows": [{"item_name": "Milk", "item_count": 1, "total_cost": "4.20"}],
        "total_value": "4.20",
        "restaurant_info": {
            "nip": None,
            "restaurant_address": None,
            "restaurant_name": None,
        },
    }

    # Act
    parsed = ProcessedReceipt.model_validate(payload)

    # Assert
    assert parsed.restaurant_info.nip is None
