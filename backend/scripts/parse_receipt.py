from __future__ import annotations

import base64
import json
import mimetypes
import sys
from pathlib import Path

import typer

# Ensure local app imports work when invoked as a script.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from app.image_processing.parse_receipt import parse_receipt

app = typer.Typer(add_completion=False, help="Parse a receipt image and display parsed line items.")


def _detect_mime_type(image_path: Path) -> str:
    guessed, _ = mimetypes.guess_type(str(image_path))
    return guessed or "image/jpeg"


@app.command()
def main(
    image_path: Path = typer.Argument(..., exists=True, file_okay=True, dir_okay=False),
) -> None:
    """Parse receipt image with Gemini-powered parser."""
    image_bytes = image_path.read_bytes()
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = _detect_mime_type(image_path)

    result = parse_receipt(img_b64=img_b64, mime_type=mime_type)

    typer.echo(f"currency_code: {result.currency_code}")
    if not result.rows:
        typer.echo("rows: []")
    else:
        typer.echo("rows:")
        for idx, row in enumerate(result.rows, start=1):
            typer.echo(
                f"  {idx}. item_name={row.item_name!r}, "
                f"item_count={row.item_count}, total_cost={row.total_cost}"
            )

    typer.echo("\njson:")
    typer.echo(json.dumps(result.model_dump(), indent=2, default=str))


if __name__ == "__main__":
    app()
