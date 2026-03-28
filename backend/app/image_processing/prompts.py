from textwrap import dedent

from app.image_processing.response_formats import ProcessedReceipt

PROMPT_RECEIPT_PARSER = dedent(f"""
    Extract line items from this receipt image.

    {ProcessedReceipt.STRUCTURED_OUTPUT_HINT}

    <hints>
    - The receipt in the main part contains rows each representing single purchased item.
    - The item's section contain columns from which you can extract certain fields:
        - the first column from the left is item names;
        - the second is the number of instances of that particular item (e.g. 3 x 9,99 => there were 3 instances);
        - the last (first from the right) is the total cost of all instances of the particular item
            with possible letter appended as a suffix - ignore that letter;
        - to sum up: 'Napar imbirowy.A 3 x18,00 54,00A' means that there where 3 intances of 'Napar imbirowy' 
            with a 18,00 price each and the total cost of all these instances is 54,00; 
    </hints>


    <rules>
    - Process only the receipt part with the individual product listing.
    - Ignore any other taxes, payment method lines, etc.
    - If uncertain, skip the row.
    <rules/>
""").strip()


def build_receipt_prompt() -> str:
    return PROMPT_RECEIPT_PARSER
