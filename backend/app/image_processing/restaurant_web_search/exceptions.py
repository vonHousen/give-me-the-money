from app.image_processing.ocr.exceptions import ImageProcessingError


class RestaurantWebSearchError(ImageProcessingError):
    """Base exception for restaurant web search enrichment."""


class RestaurantWebSearchConfigError(RestaurantWebSearchError):
    """Raised when enrichment runtime configuration is missing or invalid."""


class RestaurantWebSearchParseError(RestaurantWebSearchError):
    """Raised when agent output cannot be parsed into expected schema."""


class RestaurantWebSearchUpstreamError(RestaurantWebSearchError):
    """Raised when ADK/Gemini web-search interaction fails."""
