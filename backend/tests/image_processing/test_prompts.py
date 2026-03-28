from app.image_processing.prompts import build_receipt_prompt


def test_prompt_when_building_receipt_prompt_expect_required_instructions_present() -> None:
    # Arrange

    # Act
    prompt = build_receipt_prompt()

    # Assert
    assert "Extract line items from this receipt image." in prompt
    assert "Exclude totals, subtotals, taxes, tips" in prompt
    assert '"rows": [{"item_name": "string", "item_count": 1, "total_cost": "12.34"}]' in prompt
    assert '"total_value": "12.34"' in prompt
