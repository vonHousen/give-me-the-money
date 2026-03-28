from textwrap import dedent

from app.image_processing.response_formats import ProcessedReceipt

PROMPT_RECEIPT_PARSER = dedent(f"""
    Extract line items from this receipt image.

    {ProcessedReceipt.STRUCTURED_OUTPUT_HINT}

    Rules:
    - Include only purchasable line items.
    - Exclude totals, subtotals, taxes, tips, discounts, balances, and payment method lines.
    - Normalize item_count as integer count per line item.
    - Keep total_cost as the line total amount for the item.
    - If uncertain, skip the row.
""").strip()


def build_receipt_prompt() -> str:
    return PROMPT_RECEIPT_PARSER
