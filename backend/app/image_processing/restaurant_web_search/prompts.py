from textwrap import dedent

from app.image_processing.restaurant_web_search.models import RestaurantInfo
from app.image_processing.restaurant_web_search.response_formats import (
    MenuItemVerificationResponse,
    RestaurantWebSearchResponse,
)


def build_restaurant_web_search_prompt(restaurant_info: RestaurantInfo) -> str:
    raw_fields = restaurant_info.serialize_only_extracted()
    fields_hint = "\n".join(f"- {key}: {value}" for key, value in raw_fields.items())

    return dedent(f"""
        You are given partial data extracted from a restaurant receipt.
        Use web search to identify the exact restaurant and find menu URLs for that restaurant.

        Restaurant data from receipt:
        {fields_hint or "- no fields found"}

        {RestaurantWebSearchResponse.STRUCTURED_OUTPUT_HINT}

        Rules:
        - Prioritize official sources
          (restaurant website, official social profiles, delivery platforms).
        - Return a single best restaurant match only.
        - Confidence should be between 0 and 1.
        - Include evidence URLs that support the match.
        - Include menu_source_urls that likely point to the menu.
        - Do not invent missing facts.
    """).strip()


def build_menu_item_verification_prompt(
    row_item_names: list[str],
    menu_source_urls: list[str],
    restaurant_name: str | None,
) -> str:
    row_items_hint = "\n".join(f"- {item}" for item in row_item_names)
    menu_sources_hint = "\n".join(f"- {url}" for url in menu_source_urls)

    return dedent(f"""
        You are verifying whether specific receipt items are present in a restaurant menu.
        Use only the provided menu_source_urls as web sources.

        Restaurant name:
        {restaurant_name or "- unknown"}

        Receipt row item names:
        {row_items_hint or "- no row item names provided"}

        Menu source URLs:
        {menu_sources_hint or "- no menu source urls provided"}

        {MenuItemVerificationResponse.STRUCTURED_OUTPUT_HINT}

        Rules:
        - Return one match object for each receipt row item name.
        - Matching should be fuzzy semantic by item meaning.
        - If there is no match, set is_menu_match to false and matched fields to null.
        - matched_menu_item_description should be a short factual menu description when available.
        - matched_menu_item_image_url should be a direct absolute URL when available.
        - match_confidence should be between 0 and 1.
        - Do not use sources other than provided menu_source_urls.
        - Do not invent missing facts.
    """).strip()
