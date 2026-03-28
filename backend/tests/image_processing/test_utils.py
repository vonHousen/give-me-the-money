import logging
from decimal import Decimal

from app.image_processing.ocr import response_formats, utils


def test_to_model_processed_receipt_when_valid_raw_receipt_expect_domain_model() -> None:
    # Arrange
    raw_receipt = response_formats.ProcessedReceipt.model_validate(
        {
            "rows": [{"item_name": "Orange", "item_count": 3, "total_cost": "10.50"}],
            "total_value": "10.50",
            "restaurant_info": {
                "nip": None,
                "restaurant_address": None,
                "restaurant_name": None,
            },
        },
    )

    # Act
    receipt = utils.to_model_processed_receipt(raw_receipt, currency_code="pln")

    # Assert
    assert receipt.currency_code == "PLN"
    assert len(receipt.rows) == 1
    assert receipt.rows[0].item_name == "Orange"
    assert receipt.rows[0].item_count == 3
    assert receipt.rows[0].total_cost == Decimal("10.50")


def test_to_model_processed_receipt_when_totals_match_expect_info_log(caplog) -> None:
    # Arrange
    raw_receipt = response_formats.ProcessedReceipt.model_validate(
        {
            "rows": [{"item_name": "Orange", "item_count": 3, "total_cost": "10.50"}],
            "total_value": "10.50",
            "restaurant_info": {
                "nip": None,
                "restaurant_address": None,
                "restaurant_name": None,
            },
        },
    )
    caplog.set_level(logging.INFO)

    # Act
    utils.to_model_processed_receipt(raw_receipt)

    # Assert
    assert "✅ success" in caplog.text


def test_to_model_processed_receipt_when_totals_mismatch_expect_warning_log(caplog) -> None:
    # Arrange
    raw_receipt = response_formats.ProcessedReceipt.model_validate(
        {
            "rows": [{"item_name": "Orange", "item_count": 3, "total_cost": "10.50"}],
            "total_value": "11.50",
            "restaurant_info": {
                "nip": None,
                "restaurant_address": None,
                "restaurant_name": None,
            },
        },
    )
    caplog.set_level(logging.WARNING)

    # Act
    receipt = utils.to_model_processed_receipt(raw_receipt)

    # Assert
    assert receipt.calculated_total == Decimal("10.50")
    assert "❌ total mismatch" in caplog.text
