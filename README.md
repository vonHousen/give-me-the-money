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

## Backend Setup (without Docker)

Run from repository root:

```bash
cd backend
uv venv --python 3.13 .venv
uv sync
uv run pytest -q
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health endpoint:

```bash
curl http://127.0.0.1:8000/health
```

Expected response:

```json
{"status":"ok"}
```

## Docker / Compose Usage

From repository root:

```bash
docker compose up --build
```

Then:

```bash
curl http://127.0.0.1:8000/health
```

Stop:

```bash
docker compose down
```

## `just` Usage

List commands:

```bash
just
```

Available recipes (from `justfile`):

- `just up`  
  Starts Docker Compose with `--build`.

- `just up -d`  
  Runs in detached mode (passes extra args to compose).

- `just down`  
  Stops and removes the Compose stack.

- `just rebuild`  
  Rebuilds backend image without cache.

- `just health`  
  Calls local health endpoint (`http://127.0.0.1:8000/health`).

## Typical Flow

```bash
just up -d
just health
just down
```
