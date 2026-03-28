import asyncio

import pytest

from app.image_processing.restaurant_web_search import service
from app.image_processing.restaurant_web_search.models import RestaurantInfo


async def _fake_agent_success(*_args, **_kwargs):
    return {
        "match": {
            "restaurant_name": "Bistro XYZ",
            "confidence": 0.8,
            "evidence_urls": ["https://example.com"],
        },
        "menu_source_urls": ["https://example.com/menu"],
    }


async def _fake_agent_failure(*_args, **_kwargs):
    raise RuntimeError("upstream failed")


async def _fake_menu_verify_success(*_args, **_kwargs):
    return {
        "matches": [
            {
                "row_item_name": "Soup",
                "is_menu_match": True,
                "matched_menu_item_name": "Tomato Soup",
                "matched_menu_item_description": "Tomato soup with croutons.",
                "matched_menu_item_image_url": "https://example.com/menu/tomato-soup.jpg",
                "matched_menu_item_price": "12.00",
                "match_confidence": 0.91,
            }
        ]
    }


def test_is_web_search_enabled_when_truthy_env_expect_true(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("RESTAURANT_WEB_SEARCH_ENABLED", "true")

    assert service.is_web_search_enabled() is True


def test_enrich_restaurant_from_web_when_missing_data_expect_skipped() -> None:
    info = RestaurantInfo(restaurant_name=None, restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "skipped"


def test_enrich_restaurant_from_web_when_agent_success_expect_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_web_search_agent", _fake_agent_success)
    info = RestaurantInfo(restaurant_name="Bistro XYZ", restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "success"
    assert result.match is not None
    assert result.match.restaurant_name == "Bistro XYZ"


def test_enrich_restaurant_from_web_async_when_agent_success_expect_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_web_search_agent", _fake_agent_success)
    info = RestaurantInfo(restaurant_name="Bistro XYZ", restaurant_address=None, nip=None)

    result = asyncio.run(service.enrich_restaurant_from_web_async(info))

    assert result.status == "success"
    assert result.match is not None
    assert result.match.restaurant_name == "Bistro XYZ"


def test_enrich_restaurant_from_web_when_agent_fails_expect_failed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_web_search_agent", _fake_agent_failure)
    info = RestaurantInfo(restaurant_name="Bistro XYZ", restaurant_address=None, nip=None)

    result = service.enrich_restaurant_from_web(info)

    assert result.status == "failed"


def test_verify_menu_items_from_sources_async_when_success_expect_matches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(service, "_run_menu_item_verification_agent", _fake_menu_verify_success)

    result = asyncio.run(
        service.verify_menu_items_from_sources_async(
            row_item_names=["Soup"],
            menu_source_urls=["https://example.com/menu"],
            restaurant_name="Bistro XYZ",
        )
    )

    assert len(result.matches) == 1
    assert result.matches[0].is_menu_match is True
    assert result.matches[0].matched_menu_item_description == "Tomato soup with croutons."
    assert (
        result.matches[0].matched_menu_item_image_url == "https://example.com/menu/tomato-soup.jpg"
    )


def test_verify_menu_items_from_sources_async_when_missing_sources_expect_empty() -> None:
    result = asyncio.run(
        service.verify_menu_items_from_sources_async(
            row_item_names=["Soup"],
            menu_source_urls=[],
            restaurant_name="Bistro XYZ",
        )
    )

    assert result.matches == []
