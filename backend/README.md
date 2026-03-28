# Backend

FastAPI backend for receipt parsing and settlement APIs.

## Requirements

- Python `3.13`
- `uv`
- Gemini API key (`GEMINI_API_KEY`) for live receipt parsing

## Setup

From `backend/`:

```bash
uv sync
cp .env.example .env
```

Set your key in `.env`:

```env
GEMINI_API_KEY=your_key_here
# optional override
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

From repo root, available helper commands are in `justfile`:

```bash
just
```

## `image_processing` Module

Main package: `app/image_processing/`

- `parse_receipt.py`: orchestration layer; calls Gemini with image + prompt and returns normalized `ProcessedReceipt`
- `prompts.py`: receipt extraction prompt and output rules
- `response_formats.py`: structured output schema sent to Gemini (`rows` shape)
- `utils.py`: base64/data-url decode, schema coercion, decimal normalization, row normalization
- `model.py`: final domain models used by the app (`ReceiptRow`, `ProcessedReceipt`)
- `exceptions.py`: typed errors for config/parse/upstream failures

### Parsing Flow

1. Decode input image payload (`base64` or `data:*;base64,...`).
2. Send image + structured prompt to Gemini.
3. Validate/coerce Gemini JSON response.
4. Normalize rows (`item_name`, `item_count`, `total_cost`).
5. Return `ProcessedReceipt(rows, currency_code)`.

## Test `image_processing` With Script

The quickest manual test is the helper script:

```bash
uv run --directory backend python scripts/parse_receipt.py data/receipt_rico.jpeg
```

Expected behavior:

- Prints a rich table of extracted rows (`item_name`, `item_count`, `total_cost`)
- Prints detected currency separately

You can also run with your own receipt image path.

## Automated Tests

Prefer `just` from repo root:

```bash
just test -q tests/image_processing
```

Run all backend tests:

```bash
just test -q
```

Fallback from `backend/` (without `just`):

```bash
uv run pytest -q tests/image_processing
uv run pytest -q
```

## Run API Locally

Prefer `just` from repo root:

```bash
just serve-backend
just health
```

Fallback from `backend/`:

```bash
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000
curl -fsS http://127.0.0.1:8000/health
```
