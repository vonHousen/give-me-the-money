from app.image_processing.restaurant_web_search.models import RestaurantInfo
from app.image_processing.restaurant_web_search.prompts import (
    build_menu_item_verification_prompt,
    build_restaurant_web_search_prompt,
)


def test_build_restaurant_web_search_prompt_when_restaurant_fields_present_expect_embedded() -> (
    None
):
    info = RestaurantInfo(
        restaurant_name="Bistro XYZ",
        restaurant_address="Main Street 10, Warsaw",
        nip="1234567890",
    )

    prompt = build_restaurant_web_search_prompt(info)

    assert "Bistro XYZ" in prompt
    assert "Main Street 10, Warsaw" in prompt
    assert "1234567890" in prompt
    assert '"menu_source_urls"' in prompt


def test_build_menu_item_verification_prompt_when_rows_and_urls_expect_embedded() -> None:
    prompt = build_menu_item_verification_prompt(
        row_item_names=["NAPAR IMBIROWY", "gimbab"],
        menu_source_urls=["https://example.com/menu"],
        restaurant_name="K-Bar Piękna",
    )

    assert "NAPAR IMBIROWY" in prompt
    assert "https://example.com/menu" in prompt
    assert "K-Bar Piękna" in prompt
    assert '"matches"' in prompt
