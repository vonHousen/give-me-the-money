from app.image_processing.model import (
    EnrichedProcessedReceipt,
    EnrichedReceiptRow,
    EnrichedRestaurantInfo,
    ProcessedReceipt,
)
from app.image_processing.restaurant_web_search.exceptions import RestaurantWebSearchError
from app.image_processing.restaurant_web_search.service import (
    enrich_restaurant_from_web_async,
    verify_menu_items_from_sources_async,
)
from app.logging import get_logger

LOGGER = get_logger(__name__)


async def verify_restaurant_lookup_info(
    processed_receipt: ProcessedReceipt,
) -> EnrichedProcessedReceipt:
    try:
        enrichment = await enrich_restaurant_from_web_async(processed_receipt.restaurant_info)
    except RestaurantWebSearchError:
        LOGGER.exception("Restaurant verification failed; returning OCR-extracted restaurant info")
        return _build_fallback_response(processed_receipt)
    except Exception:  # noqa: BLE001
        LOGGER.exception("Restaurant verification failed unexpectedly; returning OCR data")
        return _build_fallback_response(processed_receipt)

    match = enrichment.match
    enriched_restaurant_info = EnrichedRestaurantInfo(
        nip=processed_receipt.restaurant_info.nip,
        restaurant_name=(
            match.restaurant_name
            if match and match.restaurant_name
            else processed_receipt.restaurant_info.restaurant_name
        ),
        restaurant_address=(
            match.restaurant_address
            if match and match.restaurant_address
            else processed_receipt.restaurant_info.restaurant_address
        ),
        website_url=match.website_url if match else None,
        evidence_urls=match.evidence_urls if match else [],
        menu_source_urls=enrichment.menu_source_urls,
    )

    enriched_rows = _build_unmatched_rows(processed_receipt)
    row_item_names = [row.item_name for row in processed_receipt.rows]

    try:
        row_matches = await verify_menu_items_from_sources_async(
            row_item_names=row_item_names,
            menu_source_urls=enrichment.menu_source_urls,
            restaurant_name=enriched_restaurant_info.restaurant_name,
        )
    except RestaurantWebSearchError:
        LOGGER.exception("Menu item verification failed; returning unmatched enriched rows")
    except Exception:  # noqa: BLE001
        LOGGER.exception("Menu item verification failed unexpectedly; returning unmatched rows")
    else:
        matches_by_name = {}
        for entry in row_matches.matches:
            matches_by_name.setdefault(entry.row_item_name, []).append(entry)

        enriched_rows = []
        for row in processed_receipt.rows:
            entries = matches_by_name.get(row.item_name) or []
            row_match = entries.pop(0) if entries else None
            enriched_rows.append(
                EnrichedReceiptRow(
                    item_name=row.item_name,
                    item_count=row.item_count,
                    total_cost=row.total_cost,
                    is_menu_match=row_match.is_menu_match if row_match else False,
                    matched_menu_item_name=(
                        row_match.matched_menu_item_name if row_match else None
                    ),
                    matched_menu_item_description=(
                        row_match.matched_menu_item_description if row_match else None
                    ),
                    matched_menu_item_image_url=(
                        row_match.matched_menu_item_image_url if row_match else None
                    ),
                    matched_menu_item_price=(
                        row_match.matched_menu_item_price if row_match else None
                    ),
                    match_confidence=row_match.match_confidence if row_match else None,
                )
            )

    return EnrichedProcessedReceipt(
        rows=enriched_rows,
        currency_code=processed_receipt.currency_code,
        restaurant_info=enriched_restaurant_info,
    )


def _build_unmatched_rows(processed_receipt: ProcessedReceipt) -> list[EnrichedReceiptRow]:
    return [
        EnrichedReceiptRow(
            item_name=row.item_name,
            item_count=row.item_count,
            total_cost=row.total_cost,
            is_menu_match=False,
            matched_menu_item_name=None,
            matched_menu_item_description=None,
            matched_menu_item_image_url=None,
            matched_menu_item_price=None,
            match_confidence=None,
        )
        for row in processed_receipt.rows
    ]


def _build_fallback_response(processed_receipt: ProcessedReceipt) -> EnrichedProcessedReceipt:
    return EnrichedProcessedReceipt(
        rows=_build_unmatched_rows(processed_receipt),
        currency_code=processed_receipt.currency_code,
        restaurant_info=EnrichedRestaurantInfo.model_validate(
            processed_receipt.restaurant_info.model_dump()
        ),
    )
