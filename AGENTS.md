# AGENTS.md

This file captures the working conventions for contributors/agents in this repo.

## Frontend (`frontend/`)

- Package manager: **Bun** (see `frontend/package.json` → `packageManager`)
- From `frontend/`: `bun install`, `bun run dev`, `bun run build`, `bun run test`
- Prefer `bun run <script>` over `npm` / `npx` for this app

## Backend Standards

- Target Python: `3.13`
- Dependency manager: `uv`
- API framework: `FastAPI`
- Test framework: `pytest`
- Keep backend code under `backend/app/`
- Keep backend tests under `backend/tests/`

## Run and test backend locally

### On bare metal
```bash
cd backend
uv run pytest -q
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
curl http://127.0.0.1:8000/health
```

### Using Docker
```bash
just up -d
just health
just down
```

Expected response:

```json
{"status":"ok"}
```

## Just Commands

See `justfile` for all available commands.
Prefer to use `just` commands for common tasks instead of running commands manually.

## Pre-commit Hooks / Linting

To run manually:

```bash
just pre-commit
```

## Notes

- Prefer editing files directly and keeping changes minimal and focused.
- Prefer to use `just` commands for common tasks or suggesting adding a new ones to the `justfile`.
- Validate with tests and pre-commit hooks before finalizing.
- If Docker is unavailable due socket permissions, verify app/test locally with `uv` commands.
- When running custom commands (without `just`) always prepend the command with `uv run` to ensure the correct Python executable is used (e.g. `uv run pytest` instead of bare `pytest`).
