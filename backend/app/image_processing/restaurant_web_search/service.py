import asyncio
import os
import time
from typing import Any

from app.image_processing.restaurant_web_search import utils
from app.image_processing.restaurant_web_search.exceptions import (
    RestaurantWebSearchConfigError,
    RestaurantWebSearchParseError,
    RestaurantWebSearchUpstreamError,
)
from app.image_processing.restaurant_web_search.models import (
    RestaurantInfo,
    RestaurantWebEnrichment,
)
from app.image_processing.restaurant_web_search.prompts import (
    build_menu_item_verification_prompt,
    build_restaurant_web_search_prompt,
)
from app.image_processing.restaurant_web_search.response_formats import MenuItemVerificationResponse
from app.logging import get_logger

LOGGER = get_logger(__name__)
DEFAULT_WEB_SEARCH_MODEL = "gemini-2.5-flash"
DEFAULT_MENU_VERIFICATION_MODEL = "gemini-2.5-flash"


def is_web_search_enabled() -> bool:
    is_enabled = os.getenv("RESTAURANT_WEB_SEARCH_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    LOGGER.debug(f"Restaurant web-search enrichment enabled: {is_enabled}.")
    return is_enabled


def enrich_restaurant_from_web(restaurant_info: RestaurantInfo) -> RestaurantWebEnrichment:
    return asyncio.run(enrich_restaurant_from_web_async(restaurant_info))


async def enrich_restaurant_from_web_async(
    restaurant_info: RestaurantInfo,
) -> RestaurantWebEnrichment:
    LOGGER.info(f"Restaurant web search lookup input: {restaurant_info.serialize_only_extracted()}")

    if not utils.has_searchable_restaurant_info(restaurant_info):
        LOGGER.debug("Skipping web search: no searchable restaurant fields found")
        return RestaurantWebEnrichment(
            status="skipped",
            failure_reason="missing restaurant_info fields",
        )

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RestaurantWebSearchConfigError("GEMINI_API_KEY is required for web search enrichment")

    prompt = build_restaurant_web_search_prompt(restaurant_info)
    model_name = os.getenv("RESTAURANT_WEB_SEARCH_MODEL", DEFAULT_WEB_SEARCH_MODEL)
    timeout_seconds = float(os.getenv("RESTAURANT_WEB_SEARCH_TIMEOUT_SECONDS", "10"))
    LOGGER.debug(
        f"Prepared web-search request with model={model_name}, timeout_seconds={timeout_seconds}, "
        f"prompt_chars={len(prompt)}"
    )

    started = time.perf_counter()
    try:
        LOGGER.debug("Running ADK web-search agent")
        raw_response = await asyncio.wait_for(
            _run_web_search_agent(prompt=prompt, model_name=model_name), timeout_seconds
        )
        parsed = utils.coerce_web_search_response(raw_response)
        enrichment = utils.to_model_enrichment(parsed)
    except TimeoutError:
        LOGGER.exception("ADK web-search agent timed out")
        enrichment = RestaurantWebEnrichment(status="failed", failure_reason="web search timeout")
    except (RestaurantWebSearchParseError, RestaurantWebSearchUpstreamError) as exc:
        LOGGER.exception("ADK web-search agent failed!")
        enrichment = RestaurantWebEnrichment(status="failed", failure_reason=str(exc))
    except Exception as exc:  # noqa: BLE001
        LOGGER.exception("ADK web-search agent failed with unexpected error!")
        enrichment = RestaurantWebEnrichment(
            status="failed", failure_reason=f"unexpected error: {exc}"
        )

    elapsed = time.perf_counter() - started
    LOGGER.debug(f"Restaurant web search elapsed time: {elapsed:.3f}s")
    LOGGER.info(
        f"Restaurant web search enrichment summary: {utils.summarize_enrichment(enrichment)}"
    )
    LOGGER.info(
        f"Restaurant web search fetched match: "
        f"{enrichment.match.model_dump() if enrichment.match else None}"
    )
    LOGGER.info(
        "Restaurant web search fetched evidence/menu sources: "
        f"{{'evidence_urls': {enrichment.match.evidence_urls if enrichment.match else []}, "
        f"'menu_source_urls': {enrichment.menu_source_urls}}}"
    )
    return enrichment


async def verify_menu_items_from_sources_async(
    row_item_names: list[str],
    menu_source_urls: list[str],
    restaurant_name: str | None,
) -> MenuItemVerificationResponse:
    if not row_item_names:
        LOGGER.debug("Skipping menu verification: no row item names provided")
        return MenuItemVerificationResponse()

    if not menu_source_urls:
        LOGGER.debug("Skipping menu verification: no menu source urls provided")
        return MenuItemVerificationResponse()

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RestaurantWebSearchConfigError(
            "GEMINI_API_KEY is required for menu item verification"
        )

    prompt = build_menu_item_verification_prompt(
        row_item_names=row_item_names,
        menu_source_urls=menu_source_urls,
        restaurant_name=restaurant_name,
    )
    model_name = os.getenv("RESTAURANT_MENU_VERIFICATION_MODEL", DEFAULT_MENU_VERIFICATION_MODEL)
    timeout_seconds = float(os.getenv("RESTAURANT_MENU_VERIFICATION_TIMEOUT_SECONDS", "10"))
    LOGGER.debug(
        "Prepared menu verification request with "
        f"model={model_name}, timeout_seconds={timeout_seconds}, prompt_chars={len(prompt)}"
    )

    started = time.perf_counter()
    try:
        LOGGER.debug("Running ADK menu-verification agent")
        raw_response = await asyncio.wait_for(
            _run_menu_item_verification_agent(prompt=prompt, model_name=model_name),
            timeout_seconds,
        )
        parsed = utils.coerce_menu_item_verification_response(raw_response)
    except TimeoutError as exc:
        raise RestaurantWebSearchUpstreamError("menu verification timeout") from exc
    except (RestaurantWebSearchParseError, RestaurantWebSearchUpstreamError):
        raise
    except Exception as exc:  # noqa: BLE001
        raise RestaurantWebSearchUpstreamError(
            f"menu verification failed unexpectedly: {exc}"
        ) from exc
    finally:
        elapsed = time.perf_counter() - started
        LOGGER.debug(f"Menu verification elapsed time: {elapsed:.3f}s")

    LOGGER.info(f"Menu verification match count: {len(parsed.matches)}")
    return parsed


async def _run_web_search_agent(prompt: str, model_name: str) -> dict[str, Any] | str:
    return await _run_search_agent(
        prompt=prompt,
        model_name=model_name,
        agent_name="restaurant_web_search_agent",
        instruction=(
            "You are a restaurant finder. Use Google Search to identify the exact restaurant and "
            "return JSON output only."
        ),
    )


async def _run_menu_item_verification_agent(prompt: str, model_name: str) -> dict[str, Any] | str:
    return await _run_search_agent(
        prompt=prompt,
        model_name=model_name,
        agent_name="menu_item_verification_agent",
        instruction=(
            "You verify if requested dishes are present in the provided menu sources. "
            "Use Google Search only when needed and return JSON output only."
        ),
    )


async def _run_search_agent(
    prompt: str,
    model_name: str,
    agent_name: str,
    instruction: str,
) -> dict[str, Any] | str:
    LOGGER.debug("Initializing ADK agent components")
    try:
        from google.adk.agents import Agent
        from google.adk.tools import google_search

        try:
            from google.adk.runners import InMemoryRunner
        except ImportError:
            InMemoryRunner = None
    except ImportError as exc:
        raise RestaurantWebSearchUpstreamError(
            "google-adk is not installed; cannot run web-search enrichment"
        ) from exc

    agent = Agent(
        name=agent_name,
        model=model_name,
        instruction=instruction,
        tools=[google_search],
    )
    LOGGER.debug("ADK agent initialized with google_search tool and output schema")

    if InMemoryRunner is not None:
        runner = InMemoryRunner(agent=agent)
        LOGGER.debug("Executing ADK InMemoryRunner.run_debug")
        try:
            events = await runner.run_debug(prompt, quiet=True)
        except Exception as exc:  # noqa: BLE001
            raise RestaurantWebSearchUpstreamError("ADK web search run failed") from exc
        LOGGER.debug(f"ADK run completed with event count: {len(events)}")

        text_parts: list[str] = []
        for event in events:
            content = getattr(event, "content", None)
            parts = getattr(content, "parts", None) or []
            for part in parts:
                text = getattr(part, "text", None)
                if text:
                    text_parts.append(text)
        LOGGER.debug(f"Collected textual ADK parts count: {len(text_parts)}")

        if not text_parts:
            raise RestaurantWebSearchParseError("web search agent returned no textual output")
        return "\n".join(text_parts)

    raise RestaurantWebSearchUpstreamError("InMemoryRunner is unavailable in installed ADK version")
