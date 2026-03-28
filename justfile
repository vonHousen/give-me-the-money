set shell := ["bash", "-cu"]

default:
  @just --list

up *args:
  docker compose up --build {{args}}

down:
  docker compose down

rebuild:
  docker compose build --no-cache backend

pre-commit:
  uv run --directory backend pre-commit run --all-files

test *args:
  uv run --directory backend pytest {{args}}

serve-backend:
  uv run --directory backend uvicorn app.main:app --host 0.0.0.0 --port 8000

health:
  curl -fsS http://127.0.0.1:8000/health
