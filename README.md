# give-me-the-money

App consisting of:
- `backend/`: FastAPI managed with `uv`
- `frontend/`: placeholder directory (coming soon)

## Repository Structure

```text
.
├── backend/
│   ├── app/
│   │   └── main.py           # FastAPI app
│   ├── tests/                # Tests
│   ├── Dockerfile            # Backend image
│   ├── pyproject.toml        # Python deps (FastAPI, pytest, etc.)
│   └── uv.lock               # Locked dependency graph
├── frontend/
├── docker-compose.yml        # Runs backend service
└── justfile                  # Shortcuts for compose + healthcheck
```

## Prerequisites

- Python 3.13
- `uv` (package/dependency manager)
- Docker + Docker Compose plugin
- `just` (command runner)
- `curl` (for health check command)

## Pre-commit Hooks

Configured in `.pre-commit-config.yaml` with:
- basic hygiene checks (`yaml`, `toml`, EOF, trailing whitespace, merge conflicts)
- `ruff` linting (with auto-fix) for `backend/*.py`
- `ruff format` for `backend/*.py`

Run manually:

```bash
just pre-commit
```

Install git hook locally (only first time):

```bash
uv run --directory backend pre-commit install
```

## Backend Setup (without Docker)

Run from repository root (without Docker):

```bash
cd backend
uv venv --python 3.13 .venv
uv sync
cd ..
just test -q
just serve-backend
```

Send a health check request to the backend:

```bash
just health
```

Expected response:

```json
{"status":"ok"}
```

## Docker / Compose Usage

From repository root:

```bash
just up -d
```

Then:

```bash
just health
```

Stop:

```bash
just down
```

## `just` Usage

List commands:

```bash
just
```

Sample recipes (see `justfile` for all commands):

- `just up`
  Starts Docker Compose with `--build`.

- `just up -d`
  Runs in detached mode (passes extra args to compose).

- `just down`
  Stops and removes the Compose stack.

- `just rebuild`
  Rebuilds backend image without cache.

- `just pre-commit`
  Runs pre-commit hooks on all files.

- `just test -q`
  Runs backend tests (`uv run pytest`).

- `just serve-backend`
  Runs backend locally via uvicorn on `127.0.0.1:8000`.

- `just health`
  Calls local health endpoint (`http://127.0.0.1:8000/health`).

## Typical Flow

```bash
just up -d
just health
just down
```
