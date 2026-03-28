from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.image_processing.model import (
    EnrichedProcessedReceipt,
    EnrichedReceiptRow,
    EnrichedRestaurantInfo,
    ProcessedReceipt,
    ProcessedReceiptWithImages,
    ReceiptRow,
    ReceiptRowWithImage,
)


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


def test_processed_receipt_when_lookup_info_missing_expect_default_lookup_info() -> None:
    payload = {
        "rows": [{"item_name": "Bread", "item_count": 1, "total_cost": "5.99"}],
        "currency_code": "pln",
    }

    receipt = ProcessedReceipt.model_validate(payload)

    assert receipt.restaurant_info.restaurant_name is None
    assert receipt.restaurant_info.restaurant_address is None
    assert receipt.restaurant_info.nip is None


def test_enriched_lookup_info_when_web_data_present_expect_fields_available() -> None:
    enriched = EnrichedRestaurantInfo.model_validate(
        {
            "restaurant_name": "Bistro XYZ",
            "restaurant_address": "Main Street 10, Warsaw",
            "website_url": "https://example.com",
            "evidence_urls": ["https://example.com/about"],
            "menu_source_urls": ["https://example.com/menu"],
        }
    )

    assert enriched.restaurant_name == "Bistro XYZ"
    assert enriched.website_url == "https://example.com"
    assert len(enriched.evidence_urls) == 1
    assert len(enriched.menu_source_urls) == 1


def test_enriched_processed_receipt_when_valid_payload_expect_calculated_total() -> None:
    enriched = EnrichedProcessedReceipt.model_validate(
        {
            "rows": [
                {
                    "item_name": "Soup",
                    "item_count": 1,
                    "total_cost": "12.00",
                    "is_menu_match": True,
                    "matched_menu_item_name": "Soup of the day",
                    "matched_menu_item_description": "Classic tomato soup with basil.",
                    "matched_menu_item_image_url": "https://example.com/soup.jpg",
                    "matched_menu_item_price": "12.00",
                    "match_confidence": 0.92,
                },
                {
                    "item_name": "Bread",
                    "item_count": 1,
                    "total_cost": "5.00",
                    "is_menu_match": False,
                    "matched_menu_item_name": None,
                    "matched_menu_item_description": None,
                    "matched_menu_item_image_url": None,
                    "matched_menu_item_price": None,
                    "match_confidence": None,
                },
            ],
            "currency_code": "pln",
            "restaurant_info": {"restaurant_name": "Bistro XYZ"},
        }
    )

    assert enriched.currency_code == "PLN"
    assert enriched.calculated_total == Decimal("17.00")
    assert len(enriched.rows) == 2
    assert enriched.rows[0].is_menu_match is True
    assert enriched.rows[0].matched_menu_item_description == "Classic tomato soup with basil."
    assert enriched.rows[0].matched_menu_item_image_url == "https://example.com/soup.jpg"


def test_enriched_receipt_row_when_confidence_out_of_range_expect_validation_error() -> None:
    with pytest.raises(ValidationError):
        EnrichedReceiptRow.model_validate(
            {
                "item_name": "Soup",
                "item_count": 1,
                "total_cost": "12.00",
                "is_menu_match": True,
                "matched_menu_item_name": "Soup",
                "matched_menu_item_description": "A",
                "matched_menu_item_image_url": "https://example.com/soup.jpg",
                "matched_menu_item_price": "12.00",
                "match_confidence": 1.2,
            }
        )


def test_receipt_row_with_image_when_valid_payload_expect_optional_image_supported() -> None:
    row = ReceiptRowWithImage.model_validate(
        {
            "item_name": "Soup",
            "item_count": 1,
            "total_cost": "12.00",
            "generated_image_base64": "Zm9vYmFy",
        }
    )

    assert row.generated_image_base64 == "Zm9vYmFy"


def test_processed_receipt_with_images_when_valid_payload_expect_total_and_currency() -> None:
    receipt = ProcessedReceiptWithImages.model_validate(
        {
            "rows": [
                {
                    "item_name": "Soup",
                    "item_count": 1,
                    "total_cost": "12.00",
                    "generated_image_base64": None,
                },
                {
                    "item_name": "Bread",
                    "item_count": 1,
                    "total_cost": "5.00",
                    "generated_image_base64": "YWJj",
                },
            ],
            "currency_code": "pln",
        }
    )

    assert receipt.currency_code == "PLN"
    assert receipt.calculated_total == Decimal("17.00")
    assert receipt.rows[0].generated_image_base64 is None
