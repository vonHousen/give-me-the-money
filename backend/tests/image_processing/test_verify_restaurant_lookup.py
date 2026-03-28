import asyncio

import pytest

from app.image_processing.model import ProcessedReceipt, ReceiptRow, RestaurantInfo
from app.image_processing.restaurant_web_search.exceptions import (
    RestaurantWebSearchConfigError,
    RestaurantWebSearchUpstreamError,
)
from app.image_processing.restaurant_web_search.models import (
    RestaurantMatch,
    RestaurantWebEnrichment,
)
from app.image_processing.restaurant_web_search.response_formats import MenuItemVerificationResponse
from app.image_processing.verify_restaurant_lookup import verify_restaurant_lookup_info


def _sample_processed_receipt() -> ProcessedReceipt:
    return ProcessedReceipt(
        rows=[
            ReceiptRow(item_name="NAPAR IMBIROWY", item_count=2, total_cost="36.00"),
            ReceiptRow(item_name="gimbab", item_count=1, total_cost="28.00"),
        ],
        currency_code="pln",
        restaurant_info=RestaurantInfo(
            nip="7010911741",
            restaurant_name="K-Bar Piękna",
            restaurant_address="Piękna 28/34, Warszawa",
        ),
    )


async def _fake_enrich_success(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    return RestaurantWebEnrichment(
        status="success",
        match=RestaurantMatch(
            restaurant_name="K-Bar Piękna",
            restaurant_address="Piękna 28/34, 00-547 Warszawa",
            website_url="https://example.com",
            confidence=0.95,
            evidence_urls=["https://example.com/about"],
        ),
        menu_source_urls=["https://example.com/menu"],
    )


async def _fake_enrich_partial(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    return RestaurantWebEnrichment(
        status="success",
        match=RestaurantMatch(
            restaurant_name="K-Bar Piękna",
            restaurant_address=None,
            website_url="https://example.com",
            confidence=0.60,
            evidence_urls=["https://example.com/about"],
        ),
        menu_source_urls=["https://example.com/menu"],
    )


async def _fake_enrich_error(_restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    raise RestaurantWebSearchConfigError("missing key")


async def _fake_menu_verify_success(
    row_item_names: list[str],
    menu_source_urls: list[str],
    restaurant_name: str | None,
) -> MenuItemVerificationResponse:
    assert restaurant_name == "K-Bar Piękna"
    assert menu_source_urls == ["https://example.com/menu"]
    assert row_item_names == ["NAPAR IMBIROWY", "gimbab"]
    return MenuItemVerificationResponse.model_validate(
        {
            "matches": [
                {
                    "row_item_name": "NAPAR IMBIROWY",
                    "is_menu_match": True,
                    "matched_menu_item_name": "Napar imbirowy",
                    "matched_menu_item_description": "Fresh ginger infusion with honey.",
                    "matched_menu_item_image_url": "https://example.com/img/napar.jpg",
                    "matched_menu_item_price": "18.00",
                    "match_confidence": 0.93,
                }
            ]
        }
    )


async def _fake_menu_verify_error(
    row_item_names: list[str],
    menu_source_urls: list[str],
    restaurant_name: str | None,
) -> MenuItemVerificationResponse:
    _ = row_item_names, menu_source_urls, restaurant_name
    raise RestaurantWebSearchUpstreamError("timeout")


def test_verify_restaurant_lookup_info_when_success_expect_overwrite_and_enriched_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_success,
    )
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.verify_menu_items_from_sources_async",
        _fake_menu_verify_success,
    )

    result = asyncio.run(verify_restaurant_lookup_info(_sample_processed_receipt()))

    assert result.currency_code == "PLN"
    assert result.restaurant_info.nip == "7010911741"
    assert result.restaurant_info.restaurant_name == "K-Bar Piękna"
    assert result.restaurant_info.restaurant_address == "Piękna 28/34, 00-547 Warszawa"
    assert result.restaurant_info.website_url == "https://example.com"
    assert result.restaurant_info.evidence_urls == ["https://example.com/about"]
    assert result.restaurant_info.menu_source_urls == ["https://example.com/menu"]
    assert len(result.rows) == 2
    assert result.rows[0].is_menu_match is True
    assert result.rows[0].matched_menu_item_name == "Napar imbirowy"
    assert result.rows[0].matched_menu_item_description == "Fresh ginger infusion with honey."
    assert result.rows[0].matched_menu_item_image_url == "https://example.com/img/napar.jpg"
    assert result.rows[0].matched_menu_item_price == 18
    assert result.rows[1].is_menu_match is False
    assert result.rows[1].matched_menu_item_description is None
    assert result.rows[1].matched_menu_item_image_url is None


def test_verify_restaurant_lookup_info_when_partial_match_expect_partial_overwrite(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_partial,
    )
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.verify_menu_items_from_sources_async",
        _fake_menu_verify_success,
    )

    result = asyncio.run(verify_restaurant_lookup_info(_sample_processed_receipt()))

    assert result.restaurant_info.restaurant_name == "K-Bar Piękna"
    assert result.restaurant_info.restaurant_address == "Piękna 28/34, Warszawa"
    assert result.restaurant_info.website_url == "https://example.com"
    assert result.restaurant_info.evidence_urls == ["https://example.com/about"]


def test_verify_restaurant_lookup_info_when_menu_verify_fails_expect_unmatched_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_success,
    )
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.verify_menu_items_from_sources_async",
        _fake_menu_verify_error,
    )

    result = asyncio.run(verify_restaurant_lookup_info(_sample_processed_receipt()))

    assert result.restaurant_info.restaurant_name == "K-Bar Piękna"
    assert [row.is_menu_match for row in result.rows] == [False, False]


def test_verify_restaurant_lookup_info_when_verification_fails_expect_fallback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        "app.image_processing.verify_restaurant_lookup.enrich_restaurant_from_web_async",
        _fake_enrich_error,
    )

    result = asyncio.run(verify_restaurant_lookup_info(_sample_processed_receipt()))

    assert result.restaurant_info.nip == "7010911741"
    assert result.restaurant_info.restaurant_name == "K-Bar Piękna"
    assert result.restaurant_info.restaurant_address == "Piękna 28/34, Warszawa"
    assert result.restaurant_info.website_url is None
    assert result.restaurant_info.evidence_urls == []
    assert result.restaurant_info.menu_source_urls == []
    assert [row.is_menu_match for row in result.rows] == [False, False]
