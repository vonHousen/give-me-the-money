import base64
import importlib
from typing import Any

import pytest

from app.image_processing.exceptions import (
    ImageProcessingConfigError,
    ImageProcessingParseError,
    ImageProcessingUpstreamError,
)
from app.image_processing.response_formats import ProcessedReceipt

parse_receipt_module = importlib.import_module("app.image_processing.parse_receipt")
parse_receipt = parse_receipt_module.parse_receipt


class _FakePart:
    @staticmethod
    def from_bytes(data: bytes, mime_type: str) -> dict[str, Any]:
        return {"data": data, "mime_type": mime_type}


class _FakeGenerateContentConfig:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class _FakeResponse:
    def __init__(self, parsed: Any) -> None:
        self.parsed = parsed


class _FakeModels:
    def __init__(self, parsed: Any, capture: dict[str, Any], should_fail: bool) -> None:
        self._parsed = parsed
        self._capture = capture
        self._should_fail = should_fail

    def generate_content(self, **kwargs: Any) -> _FakeResponse:
        self._capture["request"] = kwargs
        if self._should_fail:
            raise RuntimeError("upstream failed")
        return _FakeResponse(self._parsed)


class _FakeGenaiModule:
    def __init__(self, parsed: Any, capture: dict[str, Any], should_fail: bool) -> None:
        self._parsed = parsed
        self._capture = capture
        self._should_fail = should_fail

    class Client:
        def __init__(self, api_key: str) -> None:  # pragma: no cover
            raise NotImplementedError

    def build_client_class(self) -> type:
        parsed = self._parsed
        capture = self._capture
        should_fail = self._should_fail

        class _Client:
            def __init__(self, api_key: str) -> None:
                capture["api_key"] = api_key
                self.models = _FakeModels(parsed=parsed, capture=capture, should_fail=should_fail)

        return _Client


class _FakeTypesModule:
    Part = _FakePart
    GenerateContentConfig = _FakeGenerateContentConfig


def _install_fake_genai(
    monkeypatch: pytest.MonkeyPatch,
    *,
    parsed: Any,
    capture: dict[str, Any],
    should_fail: bool = False,
) -> None:
    fake_genai_module = _FakeGenaiModule(parsed=parsed, capture=capture, should_fail=should_fail)
    fake_genai_module.Client = fake_genai_module.build_client_class()
    monkeypatch.setattr(parse_receipt_module, "_load_genai_modules", lambda: (fake_genai_module, _FakeTypesModule))


def test_parse_receipt_when_raw_base64_input_expect_processed_receipt(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    payload = base64.b64encode(b"fake image bytes").decode("utf-8")
    capture: dict[str, Any] = {}
    parsed = ProcessedReceipt.model_validate(
        {
            "rows": [{"item_name": "Tomato", "item_count": 2, "total_cost": "12.50"}],
            "currency_code": "pln",
        },
    )
    _install_fake_genai(monkeypatch, parsed=parsed, capture=capture)

    # Act
    result = parse_receipt(payload)

    # Assert
    assert result.currency_code == "PLN"
    assert len(result.rows) == 1
    assert result.rows[0].item_name == "Tomato"
    assert capture["api_key"] == "test-key"
    assert capture["request"]["contents"][0]["mime_type"] == "image/jpeg"


def test_parse_receipt_when_data_url_input_expect_mime_type_extracted(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    payload = base64.b64encode(b"fake image bytes").decode("utf-8")
    data_url = f"data:image/png;base64,{payload}"
    capture: dict[str, Any] = {}
    parsed = ProcessedReceipt.model_validate(
        {"rows": [{"item_name": "Coffee", "item_count": 1, "total_cost": "9.99"}], "currency_code": "PLN"},
    )
    _install_fake_genai(monkeypatch, parsed=parsed, capture=capture)

    # Act
    _ = parse_receipt(data_url)

    # Assert
    assert capture["request"]["contents"][0]["mime_type"] == "image/png"


def test_parse_receipt_when_missing_api_key_expect_configuration_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    payload = base64.b64encode(b"fake image bytes").decode("utf-8")

    # Act / Assert
    with pytest.raises(ImageProcessingConfigError):
        parse_receipt(payload)


def test_parse_receipt_when_gemini_fails_expect_upstream_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    payload = base64.b64encode(b"fake image bytes").decode("utf-8")
    capture: dict[str, Any] = {}
    parsed = ProcessedReceipt.model_validate({"rows": [], "currency_code": "PLN"})
    _install_fake_genai(monkeypatch, parsed=parsed, capture=capture, should_fail=True)

    # Act / Assert
    with pytest.raises(ImageProcessingUpstreamError):
        parse_receipt(payload)


def test_parse_receipt_when_rows_are_ambiguous_expect_parse_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Arrange
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    payload = base64.b64encode(b"fake image bytes").decode("utf-8")
    capture: dict[str, Any] = {}
    parsed = {
        "rows": [
            {"item_name": "Pizza", "item_count": 1, "total_cost": "29.00"},
            {"item_name": "", "item_count": 1, "total_cost": "15.00"},
            {"item_name": "Soup", "item_count": 0, "total_cost": "10.00"},
        ],
        "currency_code": "EUR",
    }
    _install_fake_genai(monkeypatch, parsed=parsed, capture=capture)

    # Act / Assert
    with pytest.raises(ImageProcessingParseError):
        parse_receipt(payload)
