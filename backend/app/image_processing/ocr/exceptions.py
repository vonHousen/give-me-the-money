class ImageProcessingError(Exception):
    """Base exception for receipt image processing errors."""


class ImageProcessingConfigError(ImageProcessingError):
    """Raised when runtime configuration is missing or invalid."""


class ImageProcessingParseError(ImageProcessingError):
    """Raised when input or model output cannot be parsed."""


class ImageProcessingUpstreamError(ImageProcessingError):
    """Raised when upstream Gemini API communication fails."""
