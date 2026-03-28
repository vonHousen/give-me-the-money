import pytest

from app.image_processing.restaurant_web_search import service
from app.image_processing.restaurant_web_search.models import RestaurantLookupInfo


async def _fake_agent_success(*_args, **_kwargs):
    return {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "confidence": 0.8,
            "evidence_urls": ["https://example.com"],
        },
        "menu_items": [{"item_name": "Soup", "item_price": "12.00", "currency_code": "PLN"}],
        "menu_source_urls": ["https://example.com/menu"],
    }


async def _fake_agent_failure(*_args, **_kwargs):
    raise RuntimeError("upstream failed")


def test_is_web_search_enabled_when_truthy_env_expect_true(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RESTAURANT_WEB_SEARCH_ENABLED", "true")

    assert service.is_web_search_enabled() is True


def test_enrich_restaurant_from_web_when_missing_data_expect_skipped() -> None:
    info = RestaurantLookupInfo(restaurant_name=None, restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "skipped"


def test_enrich_restaurant_from_web_when_agent_success_expect_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_web_search_agent", _fake_agent_success)
    info = RestaurantLookupInfo(restaurant_name="Bistro XYZ", restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "success"
    assert result.match is not None
    assert result.match.restaurant_name == "Bistro XYZ"


def test_enrich_restaurant_from_web_when_agent_fails_expect_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_web_search_agent", _fake_agent_failure)
    info = RestaurantLookupInfo(restaurant_name="Bistro XYZ", restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "failed"
