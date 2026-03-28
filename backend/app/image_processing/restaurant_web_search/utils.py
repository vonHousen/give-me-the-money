import json
from typing import Any

from pydantic import ValidationError

from app.image_processing.restaurant_web_search import response_formats as ws_response_formats
from app.image_processing.restaurant_web_search.exceptions import RestaurantWebSearchParseError
from app.image_processing.restaurant_web_search.models import (
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

    return RestaurantWebEnrichment(
        status="success",
        match=match,
        menu_source_urls=raw.menu_source_urls,
    )


def coerce_menu_item_verification_response(
    parsed_response: Any,
) -> ws_response_formats.MenuItemVerificationResponse:
    if parsed_response is None:
        raise RestaurantWebSearchParseError("menu verification agent returned empty response")

    try:
        if isinstance(parsed_response, ws_response_formats.MenuItemVerificationResponse):
            return parsed_response
        if isinstance(parsed_response, str):
            return ws_response_formats.MenuItemVerificationResponse.model_validate(
                extract_json_object(parsed_response)
            )
        return ws_response_formats.MenuItemVerificationResponse.model_validate(parsed_response)
    except ValidationError as exc:
        raise RestaurantWebSearchParseError(
            "menu verification output does not match expected schema"
        ) from exc


def menu_match_map_by_row_name(
    response: ws_response_formats.MenuItemVerificationResponse,
) -> dict[str, ws_response_formats.ReceiptRowMenuMatch]:
    return {entry.row_item_name: entry for entry in response.matches}


def summarize_enrichment(enrichment: RestaurantWebEnrichment) -> dict[str, Any]:
    return {
        "status": enrichment.status,
        "failure_reason": enrichment.failure_reason,
        "match": enrichment.match.model_dump() if enrichment.match else None,
        "menu_source_urls": enrichment.menu_source_urls,
    }
