from app.image_processing.restaurant_web_search import utils
from app.image_processing.restaurant_web_search.response_formats import RestaurantWebSearchResponse


def test_coerce_web_search_response_when_json_string_expect_schema_validated() -> None:
    raw = (
        '{"match":{"restaurant_name":"Bistro XYZ","confidence":0.8,"evidence_urls":[]},'
        '"menu_items":[],"menu_source_urls":[]}'
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
            "menu_items": [{"item_name": "Soup", "item_price": "12.00", "currency_code": "PLN"}],
            "menu_source_urls": ["https://example.com/menu"],
        }
    )

    enrichment = utils.to_model_enrichment(raw)

    assert enrichment.status == "success"
    assert enrichment.match is not None
    assert enrichment.match.confidence == 0.8
    assert len(enrichment.menu_items) == 1
