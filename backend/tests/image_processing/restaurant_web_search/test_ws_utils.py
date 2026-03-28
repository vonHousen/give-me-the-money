from app.image_processing.restaurant_web_search import utils
from app.image_processing.restaurant_web_search.response_formats import (
    MenuItemVerificationResponse,
    RestaurantWebSearchResponse,
)


def test_coerce_web_search_response_when_json_string_expect_schema_validated() -> None:
    raw = (
        '{"match":{"restaurant_name":"Bistro XYZ","confidence":0.8,"evidence_urls":[]},'
        '"menu_source_urls":[]}'
    )

    parsed = utils.coerce_web_search_response(raw)

    assert parsed.match is not None
    assert parsed.match.restaurant_name == "Bistro XYZ"


def test_to_model_enrichment_when_valid_response_expect_success_status() -> None:
    raw = RestaurantWebSearchResponse.model_validate(
        {
            "match": {
                "restaurant_name": "Bistro XYZ",
                "confidence": 0.8,
                "evidence_urls": ["https://example.com"],
            },
            "menu_source_urls": ["https://example.com/menu"],
        }
    )

    enrichment = utils.to_model_enrichment(raw)

    assert enrichment.status == "success"
    assert enrichment.match is not None
    assert enrichment.match.confidence == 0.8
    assert enrichment.menu_source_urls == ["https://example.com/menu"]


def test_coerce_menu_item_verification_response_when_json_string_expect_schema_validated() -> None:
    raw = (
        '{"matches":[{"row_item_name":"gimbab","is_menu_match":true,'
        '"matched_menu_item_name":"Gimbap",'
        '"matched_menu_item_description":"Rice rolls with vegetables.",'
        '"matched_menu_item_image_url":"https://example.com/menu/gimbap.jpg",'
        '"matched_menu_item_price":"28.00",'
        '"match_confidence":0.88}]}'
    )

    parsed = utils.coerce_menu_item_verification_response(raw)

    assert len(parsed.matches) == 1
    assert parsed.matches[0].matched_menu_item_name == "Gimbap"
    assert parsed.matches[0].matched_menu_item_description == "Rice rolls with vegetables."
    assert parsed.matches[0].matched_menu_item_image_url == "https://example.com/menu/gimbap.jpg"


def test_menu_match_map_by_row_name_when_valid_response_expect_mapping() -> None:
    response = MenuItemVerificationResponse.model_validate(
        {
            "matches": [
                {
                    "row_item_name": "gimbab",
                    "is_menu_match": True,
                    "matched_menu_item_name": "Gimbap",
                    "matched_menu_item_description": "Rice rolls with vegetables.",
                    "matched_menu_item_image_url": "https://example.com/menu/gimbap.jpg",
                    "matched_menu_item_price": "28.00",
                    "match_confidence": 0.88,
                }
            ]
        }
    )

    mapping = utils.menu_match_map_by_row_name(response)

    assert mapping["gimbab"].is_menu_match is True
