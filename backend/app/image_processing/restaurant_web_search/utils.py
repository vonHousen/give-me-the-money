import json
from decimal import Decimal
from typing import Any

from pydantic import ValidationError

from app.image_processing.restaurant_web_search import response_formats as ws_response_formats
from app.image_processing.restaurant_web_search.exceptions import RestaurantWebSearchParseError
from app.image_processing.restaurant_web_search.models import (
    MenuItem,
    RestaurantInfo,
    RestaurantMatch,
    RestaurantWebEnrichment,
)


def has_searchable_restaurant_info(restaurant_info: RestaurantInfo) -> bool:
    extracted = restaurant_info.serialize_only_extracted()
    return bool(extracted)


def extract_json_object(raw_text: str) -> dict[str, Any]:
    stripped = raw_text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[len("json") :].strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError as exc:
        raise RestaurantWebSearchParseError("agent response is not valid JSON") from exc


def coerce_web_search_response(
    parsed_response: Any,
) -> ws_response_formats.RestaurantWebSearchResponse:
    if parsed_response is None:
        raise RestaurantWebSearchParseError("web search agent returned empty response")

    try:
        if isinstance(parsed_response, ws_response_formats.RestaurantWebSearchResponse):
            return parsed_response
        if isinstance(parsed_response, str):
            return ws_response_formats.RestaurantWebSearchResponse.model_validate(
                extract_json_object(parsed_response)
            )
        return ws_response_formats.RestaurantWebSearchResponse.model_validate(parsed_response)
    except ValidationError as exc:
        raise RestaurantWebSearchParseError(
            "web search output does not match expected schema"
        ) from exc


def to_model_enrichment(
    raw: ws_response_formats.RestaurantWebSearchResponse,
) -> RestaurantWebEnrichment:
    match = None
    if raw.match is not None:
        match = RestaurantMatch.model_validate(raw.match.model_dump())

    items: list[MenuItem] = []
    for item in raw.menu_items:
        price: Decimal | None
        if item.item_price is None:
            price = None
        else:
            price = Decimal(str(item.item_price))
        items.append(
            MenuItem(
                item_name=item.item_name,
                item_price=price,
                currency_code=item.currency_code,
            )
        )

    return RestaurantWebEnrichment(
        status="success",
        match=match,
        menu_items=items,
        menu_source_urls=raw.menu_source_urls,
    )


def summarize_enrichment(enrichment: RestaurantWebEnrichment) -> dict[str, Any]:
    return {
        "status": enrichment.status,
        "failure_reason": enrichment.failure_reason,
        "match": enrichment.match.model_dump() if enrichment.match else None,
        "menu_items_count": len(enrichment.menu_items),
        "menu_source_urls": enrichment.menu_source_urls,
    }


def menu_items_for_log(enrichment: RestaurantWebEnrichment) -> list[dict[str, Any]]:
    return [
        {
            "item_name": item.item_name,
            "item_price": str(item.item_price) if item.item_price is not None else None,
            "currency_code": item.currency_code,
        }
        for item in enrichment.menu_items
    ]
