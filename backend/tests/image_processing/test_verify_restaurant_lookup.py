import asyncio

import pytest

from app.image_processing.restaurant_web_search.exceptions import RestaurantWebSearchConfigError
from app.image_processing.restaurant_web_search.models import (
    MenuItem,
    RestaurantInfo,
    RestaurantMatch,
    RestaurantWebEnrichment,
)
from app.image_processing.verify_restaurant_lookup import verify_restaurant_lookup_info


async def _fake_enrich_success(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    return RestaurantWebEnrichment(
        status="success",
        match=RestaurantMatch(
            restaurant_name="Bistro Verified",
            restaurant_address="Verified Street 42, Warsaw",
            website_url="https://example.com",
            confidence=0.95,
            evidence_urls=["https://example.com/about"],
        ),
        menu_items=[MenuItem(item_name="Soup", item_price="12.00", currency_code="PLN")],
        menu_source_urls=["https://example.com/menu"],
    )


async def _fake_enrich_partial(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    return RestaurantWebEnrichment(
        status="success",
        match=RestaurantMatch(
            restaurant_name="Bistro Verified",
            restaurant_address=None,
            website_url="https://example.com",
            confidence=0.60,
            evidence_urls=["https://example.com/about"],
        ),
    )


async def _fake_enrich_error(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    raise RestaurantWebSearchConfigError("missing key")


def test_verify_restaurant_lookup_info_when_success_expect_overwrite_and_extras(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_success,
    )

    result = asyncio.run(
        verify_restaurant_lookup_info(
            RestaurantInfo(
                nip="1234567890",
                restaurant_name="Bistro OCR",
                restaurant_address="OCR Street 10, Warsaw",
            )
        )
    )

    assert result.nip == "1234567890"
    assert result.restaurant_name == "Bistro Verified"
    assert result.restaurant_address == "Verified Street 42, Warsaw"
    assert result.website_url == "https://example.com"
    assert result.evidence_urls == ["https://example.com/about"]
    assert len(result.menu_items) == 1
    assert result.menu_source_urls == ["https://example.com/menu"]


def test_verify_restaurant_lookup_info_when_partial_match_expect_partial_overwrite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_partial,
    )

    result = asyncio.run(
        verify_restaurant_lookup_info(
            RestaurantInfo(
                nip=None,
                restaurant_name="Bistro OCR",
                restaurant_address="OCR Street 10, Warsaw",
            )
        )
    )

    assert result.restaurant_name == "Bistro Verified"
    assert result.restaurant_address == "OCR Street 10, Warsaw"
    assert result.website_url == "https://example.com"
    assert result.evidence_urls == ["https://example.com/about"]


def test_verify_restaurant_lookup_info_when_verification_fails_expect_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_error,
    )

    result = asyncio.run(
        verify_restaurant_lookup_info(
            RestaurantInfo(
                nip="1234567890",
                restaurant_name="Bistro OCR",
                restaurant_address="OCR Street 10, Warsaw",
            )
        )
    )

    assert result.nip == "1234567890"
    assert result.restaurant_name == "Bistro OCR"
    assert result.restaurant_address == "OCR Street 10, Warsaw"
    assert result.website_url is None
    assert result.evidence_urls == []
    assert result.menu_items == []
    assert result.menu_source_urls == []
