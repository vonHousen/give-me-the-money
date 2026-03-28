from app.image_processing.model import EnrichedRestaurantInfo, RestaurantInfo
from app.image_processing.restaurant_web_search.exceptions import RestaurantWebSearchError
from app.image_processing.restaurant_web_search.service import enrich_restaurant_from_web_async
from app.logging import get_logger

LOGGER = get_logger(__name__)


async def verify_restaurant_lookup_info(
    restaurant_info: RestaurantInfo,
) -> EnrichedRestaurantInfo:
    try:
        enrichment = await enrich_restaurant_from_web_async(restaurant_info)
    except RestaurantWebSearchError:
        LOGGER.exception("Restaurant verification failed; returning OCR-extracted restaurant info")
        return EnrichedRestaurantInfo.model_validate(restaurant_info.model_dump())
    except Exception:  # noqa: BLE001
        LOGGER.exception("Restaurant verification failed unexpectedly; returning OCR data")
        return EnrichedRestaurantInfo.model_validate(restaurant_info.model_dump())

    match = enrichment.match
    return EnrichedRestaurantInfo(
        nip=restaurant_info.nip,
        restaurant_name=(
            match.restaurant_name
            if match and match.restaurant_name
            else restaurant_info.restaurant_name
        ),
        restaurant_address=(
            match.restaurant_address
            if match and match.restaurant_address
            else restaurant_info.restaurant_address
        ),
        website_url=match.website_url if match else None,
        evidence_urls=match.evidence_urls if match else [],
        menu_items=enrichment.menu_items,
        menu_source_urls=enrichment.menu_source_urls,
    )
