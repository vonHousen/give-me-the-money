import asyncio
import base64
import importlib
from decimal import Decimal
from typing import Any

import pytest

from app.image_processing.model import ProcessedReceipt, ReceiptRow, RestaurantInfo
from app.image_processing.ocr.exceptions import ImageProcessingConfigError

module = importlib.import_module("app.image_processing.generate_receipt_images")
enrich_processed_receipt_with_images_async = module.enrich_processed_receipt_with_images_async


class _FakeGenerateContentConfig:
    def __init__(self, **kwargs: Any) -> None:
        self.kwargs = kwargs


class _FakeTypesModule:
    GenerateContentConfig = _FakeGenerateContentConfig


class _FakeInlineData:
    def __init__(self, data: bytes | str) -> None:
        self.data = data


class _FakePart:
    def __init__(self, inline_data: _FakeInlineData | None = None) -> None:
        self.inline_data = inline_data


class _FakeResponse:
    def __init__(self, *, parsed: Any = None, parts: list[_FakePart] | None = None) -> None:
        self.parsed = parsed
        self.parts = parts or []


class _FakeAioModels:
    def __init__(
        self,
        *,
        capture: dict[str, Any],
        image_payloads: list[bytes | str | None],
        fail_context: bool = False,
        fail_image_indexes: set[int] | None = None,
    ) -> None:
        self._capture = capture
        self._image_payloads = image_payloads
        self._fail_context = fail_context
        self._fail_image_indexes = fail_image_indexes or set()
        self._image_call_idx = 0

    async def generate_content(self, *, model: str, contents: str, config: Any) -> _FakeResponse:
        self._capture.setdefault("calls", []).append(
            {
                "model": model,
                "contents": contents,
                "config_kwargs": getattr(config, "kwargs", {}),
            }
        )
        if model == "context-model":
            if self._fail_context:
                raise RuntimeError("context failed")
            return _FakeResponse(
                parsed={
                    "restaurant_type": "casual",
                    "cuisine_type": "korean",
                    "visual_style": "natural",
                    "plating_style": "modern",
                    "atmosphere_keywords": ["cozy", "warm"],
                }
            )

        idx = self._image_call_idx
        self._image_call_idx += 1
        if idx in self._fail_image_indexes:
            raise RuntimeError("image generation failed")

        payload = self._image_payloads[idx] if idx < len(self._image_payloads) else None
        if payload is None:
            return _FakeResponse(parts=[])
        return _FakeResponse(parts=[_FakePart(_FakeInlineData(payload))])


class _FakeAioClient:
    def __init__(self, models: _FakeAioModels) -> None:
        self.models = models


class _FakeAioContext:
    def __init__(self, models: _FakeAioModels) -> None:
        self._client = _FakeAioClient(models)

    async def __aenter__(self) -> _FakeAioClient:
        return self._client

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        return None


class _FakeGenaiModule:
    def __init__(self, models: _FakeAioModels) -> None:
        self._models = models

    def Client(self, api_key: str) -> Any:  # noqa: N802
        _ = api_key
        return type("_Client", (), {"aio": _FakeAioContext(self._models)})()


def _sample_receipt() -> ProcessedReceipt:
    return ProcessedReceipt(
        rows=[
            ReceiptRow(item_name="Kimchi", item_count=1, total_cost=Decimal("15.00")),
            ReceiptRow(item_name="Bibimbap", item_count=1, total_cost=Decimal("28.00")),
        ],
        currency_code="pln",
        restaurant_info=RestaurantInfo(
            restaurant_name="K-Bistro",
            restaurant_address="Main Street 12, Warsaw",
            nip="7010911741",
        ),
    )


def _install_fakes(
    monkeypatch: pytest.MonkeyPatch,
    *,
    capture: dict[str, Any],
    image_payloads: list[bytes | str | None],
    fail_context: bool = False,
    fail_image_indexes: set[int] | None = None,
) -> None:
    models = _FakeAioModels(
        capture=capture,
        image_payloads=image_payloads,
        fail_context=fail_context,
        fail_image_indexes=fail_image_indexes,
    )
    monkeypatch.setattr(module, "types", _FakeTypesModule)
    monkeypatch.setattr(module, "genai", _FakeGenaiModule(models))


def test_enrich_images_when_success_expect_images_for_all_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_IMAGE_MODEL", "image-model")
    monkeypatch.setenv("GEMINI_IMAGE_CONTEXT_MODEL", "context-model")
    capture: dict[str, Any] = {}
    _install_fakes(
        monkeypatch,
        capture=capture,
        image_payloads=[b"img-1", b"img-2"],
    )

    result = asyncio.run(enrich_processed_receipt_with_images_async(_sample_receipt()))

    assert result.currency_code == "PLN"
    assert len(result.rows) == 2
    assert result.rows[0].generated_image_base64 == base64.b64encode(b"img-1").decode("utf-8")
    assert result.rows[1].generated_image_base64 == base64.b64encode(b"img-2").decode("utf-8")
    assert capture["calls"][0]["model"] == "context-model"
    assert capture["calls"][1]["model"] == "image-model"
    assert capture["calls"][2]["model"] == "image-model"


def test_enrich_images_when_context_fails_expect_generation_without_context(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_IMAGE_MODEL", "image-model")
    monkeypatch.setenv("GEMINI_IMAGE_CONTEXT_MODEL", "context-model")
    capture: dict[str, Any] = {}
    _install_fakes(
        monkeypatch,
        capture=capture,
        image_payloads=[b"img-1", b"img-2"],
        fail_context=True,
    )

    result = asyncio.run(enrich_processed_receipt_with_images_async(_sample_receipt()))

    assert len(result.rows) == 2
    assert result.rows[0].generated_image_base64 is not None
    image_prompts = [
        entry["contents"] for entry in capture["calls"] if entry["model"] == "image-model"
    ]
    assert all(
        prompt.startswith("Create a realistic food photography image of")
        for prompt in image_prompts
    )


def test_enrich_images_when_some_rows_fail_expect_partial_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_IMAGE_MODEL", "image-model")
    monkeypatch.setenv("GEMINI_IMAGE_CONTEXT_MODEL", "context-model")
    capture: dict[str, Any] = {}
    _install_fakes(
        monkeypatch,
        capture=capture,
        image_payloads=[b"img-1", b"img-2"],
        fail_image_indexes={1},
    )

    result = asyncio.run(enrich_processed_receipt_with_images_async(_sample_receipt()))

    assert result.rows[0].generated_image_base64 is not None
    assert result.rows[1].generated_image_base64 is None


def test_enrich_images_when_api_key_missing_expect_config_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    with pytest.raises(ImageProcessingConfigError):
        asyncio.run(enrich_processed_receipt_with_images_async(_sample_receipt()))


def test_enrich_images_when_sync_flag_enabled_expect_no_gather(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_IMAGE_MODEL", "image-model")
    monkeypatch.setenv("GEMINI_IMAGE_CONTEXT_MODEL", "context-model")
    monkeypatch.setenv("GEMINI_IMAGE_GENERATION_SYNC", "true")
    capture: dict[str, Any] = {}
    _install_fakes(
        monkeypatch,
        capture=capture,
        image_payloads=[b"img-1", b"img-2"],
    )

    async def _fail_gather(*_args: Any, **_kwargs: Any) -> Any:
        raise AssertionError("asyncio.gather should not be used in sync mode")

    monkeypatch.setattr(module.asyncio, "gather", _fail_gather)

    result = asyncio.run(enrich_processed_receipt_with_images_async(_sample_receipt()))

    assert len(result.rows) == 2
    assert result.rows[0].generated_image_base64 is not None
