import pytest
from pydantic import ValidationError

from app.image_processing.restaurant_web_search.response_formats import (
    MenuItemVerificationResponse,
    RestaurantWebSearchResponse,
)


def test_restaurant_web_search_response_when_valid_payload_expect_parsed() -> None:
    payload = {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "restaurant_address": "Main Street 10, Warsaw",
            "website_url": "https://example.com",
            "confidence": 0.87,
            "evidence_urls": ["https://example.com/about"],
        },
        "menu_source_urls": ["https://example.com/menu"],
    }

    parsed = RestaurantWebSearchResponse.model_validate(payload)

    assert parsed.match is not None
    assert parsed.match.restaurant_name == "Bistro XYZ"
    assert parsed.menu_source_urls == ["https://example.com/menu"]


def test_restaurant_web_search_response_when_confidence_out_of_range_expect_error() -> None:
    payload = {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "confidence": 1.5,
            "evidence_urls": [],
        },
        "menu_source_urls": [],
    }

    with pytest.raises(ValidationError):
        RestaurantWebSearchResponse.model_validate(payload)


def test_menu_item_verification_response_when_valid_payload_expect_parsed() -> None:
    payload = {
        "matches": [
            {
                "row_item_name": "gimbab",
                "is_menu_match": True,
                "matched_menu_item_name": "Gimbap",
                "matched_menu_item_price": "28.00",
                "match_confidence": 0.88,
            }
        ]
    }

    parsed = MenuItemVerificationResponse.model_validate(payload)

    assert len(parsed.matches) == 1
    assert parsed.matches[0].is_menu_match is True
