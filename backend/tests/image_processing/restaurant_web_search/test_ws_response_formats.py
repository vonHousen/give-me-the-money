import pytest
from pydantic import ValidationError

from app.image_processing.restaurant_web_search.response_formats import RestaurantWebSearchResponse


def test_restaurant_web_search_response_when_valid_payload_expect_parsed() -> None:
    payload = {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "restaurant_address": "Main Street 10, Warsaw",
            "website_url": "https://example.com",
            "confidence": 0.87,
            "evidence_urls": ["https://example.com/about"],
        },
        "menu_items": [
            {"item_name": "Soup", "item_price": "12.00", "currency_code": "PLN"},
        ],
        "menu_source_urls": ["https://example.com/menu"],
    }

    parsed = RestaurantWebSearchResponse.model_validate(payload)

    assert parsed.match is not None
    assert parsed.match.restaurant_name == "Bistro XYZ"
    assert len(parsed.menu_items) == 1


def test_restaurant_web_search_response_when_confidence_out_of_range_expect_error() -> None:
    payload = {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "confidence": 1.5,
            "evidence_urls": [],
        },
        "menu_items": [],
        "menu_source_urls": [],
    }

    with pytest.raises(ValidationError):
        RestaurantWebSearchResponse.model_validate(payload)
