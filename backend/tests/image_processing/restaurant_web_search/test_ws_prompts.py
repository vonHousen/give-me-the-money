from app.image_processing.restaurant_web_search.models import RestaurantLookupInfo
from app.image_processing.restaurant_web_search.prompts import build_restaurant_web_search_prompt


def test_build_restaurant_web_search_prompt_when_restaurant_fields_present_expect_embedded() -> (
    None
):
    info = RestaurantLookupInfo(
        restaurant_name="Bistro XYZ",
        restaurant_address="Main Street 10, Warsaw",
        nip="1234567890",
    )

    prompt = build_restaurant_web_search_prompt(info)

    assert "Bistro XYZ" in prompt
    assert "Main Street 10, Warsaw" in prompt
    assert "1234567890" in prompt
    assert '"menu_items"' in prompt
