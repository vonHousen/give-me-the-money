from __future__ import annotations

import base64
import mimetypes
from decimal import Decimal
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from app.image_processing.parse_receipt import parse_receipt
from app.logging import configure_logging

app = typer.Typer(add_completion=False, help="Parse a receipt image and display parsed line items.")
console = Console()
IMAGE_PATH_ARG = typer.Argument(..., exists=True, file_okay=True, dir_okay=False)


def _detect_mime_type(image_path: Path) -> str:
    guessed, _ = mimetypes.guess_type(str(image_path))
    return guessed or "image/jpeg"


def _format_money(value: Decimal) -> str:
    return f"{value:.2f}"


@app.command()
def main(
    image_path: Path = IMAGE_PATH_ARG,
) -> None:
    """Parse receipt image with Gemini-powered parser."""
    configure_logging()

    image_bytes = image_path.read_bytes()
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = _detect_mime_type(image_path)

    result = parse_receipt(img_b64=img_b64, mime_type=mime_type)

    console.rule("[bold cyan]Receipt Parse Result[/bold cyan]")
    console.print(f"[bold]File:[/bold] {image_path}")
    console.print(f"[bold]Currency:[/bold] {result.currency_code}")
    console.print(f"[bold]Calculated total:[/bold] {_format_money(result.calculated_total)}")

    if not result.rows:
        console.print("[yellow]No rows found.[/yellow]")
    else:
        table = Table(
            title=f"Extracted Fields ({len(result.rows)} rows)", header_style="bold magenta"
        )
        table.add_column("#", justify="right")
        table.add_column("item_name")
        table.add_column("item_count", justify="right")
        table.add_column("total_cost", justify="right")

        for idx, row in enumerate(result.rows, start=1):
            table.add_row(
                str(idx),
                row.item_name,
                str(row.item_count),
                _format_money(row.total_cost),
            )

        console.print(table)


if __name__ == "__main__":
    app()
