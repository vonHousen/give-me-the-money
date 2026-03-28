import logging
import os

DEFAULT_FORMAT = "%(asctime)s %(levelname)s [%(name)s] %(message)s"
APP_LOGGER_NAME = "app"


def _resolve_level(env_var: str, default: str) -> int:
    level_name = os.getenv(env_var, default).upper()
    return getattr(logging, level_name, getattr(logging, default))


def configure_logging() -> None:
    """
    Configure logging for CLI/runtime use.

    Env vars:
    - ROOT_LOG_LEVEL: root logger level (default: INFO)
    - LOG_LEVEL: app logger level (default: INFO)
    """
    root_level = _resolve_level("ROOT_LOG_LEVEL", "INFO")
    app_level = _resolve_level("LOG_LEVEL", "INFO")

    logging.basicConfig(level=root_level, format=DEFAULT_FORMAT, force=True)
    logging.getLogger(APP_LOGGER_NAME).setLevel(app_level)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
