from textwrap import dedent

from app.image_processing.restaurant_web_search.models import RestaurantLookupInfo
from app.image_processing.restaurant_web_search.response_formats import RestaurantWebSearchResponse


def build_restaurant_web_search_prompt(restaurant_info: RestaurantLookupInfo) -> str:
    raw_fields = restaurant_info.serialize_only_extracted()
    fields_hint = "\n".join(f"- {key}: {value}" for key, value in raw_fields.items())

    return dedent(f"""
        You are given partial data extracted from a restaurant receipt.
        Use web search to identify the exact restaurant and then try to obtain offered menu items.

        Restaurant data from receipt:
        {fields_hint or "- no fields found"}

        {RestaurantWebSearchResponse.STRUCTURED_OUTPUT_HINT}

        Rules:
        - Prioritize official sources
          (restaurant website, official social profiles, delivery platforms).
        - Return a single best restaurant match only.
        - Confidence should be between 0 and 1.
        - Include evidence URLs that support the match.
        - Menu items may be partial if full menu is unavailable.
        - Do not invent missing facts.
    """).strip()
