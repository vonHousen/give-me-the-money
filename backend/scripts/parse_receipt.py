from __future__ import annotations
# ruff: noqa: I001

import asyncio
import base64
import mimetypes
import sys
from decimal import Decimal
from pathlib import Path

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.image_processing.parse_receipt import parse_receipt  # noqa: E402
from app.image_processing.verify_restaurant_lookup import verify_restaurant_lookup_info  # noqa: E402
from app.logging import configure_logging  # noqa: E402

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
    verify_restaurant: bool = typer.Option(
        False,
        "--verify-restaurant",
        help="Run async restaurant verification on extracted restaurant info.",
    ),
) -> None:
    """Parse receipt image with Gemini-powered parser."""
    load_dotenv(PROJECT_ROOT / ".env")
    configure_logging()

    image_bytes = image_path.read_bytes()
    img_b64 = base64.b64encode(image_bytes).decode("utf-8")
    mime_type = _detect_mime_type(image_path)

    result = parse_receipt(img_b64=img_b64, mime_type=mime_type)

    console.rule("[bold cyan]ProcessedReceipt[/bold cyan]")
    console.print(f"[bold]File:[/bold] {image_path}")
    console.print(f"[bold]Currency:[/bold] {result.currency_code}")
    console.print(f"[bold]Calculated total:[/bold] {_format_money(result.calculated_total)}")
    console.print(f"[bold]Restaurant NIP:[/bold] {result.restaurant_info.nip or '-'}")
    console.print(f"[bold]Restaurant name:[/bold] {result.restaurant_info.restaurant_name or '-'}")
    console.print(
        f"[bold]Restaurant address:[/bold] {result.restaurant_info.restaurant_address or '-'}"
    )

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

    if verify_restaurant:
        enriched = asyncio.run(verify_restaurant_lookup_info(result))
        console.rule("[bold green]EnrichedProcessedReceipt[/bold green]")
        console.print(f"[bold]Currency:[/bold] {enriched.currency_code}")
        console.print(f"[bold]Calculated total:[/bold] {_format_money(enriched.calculated_total)}")
        console.print(f"[bold]NIP:[/bold] {enriched.restaurant_info.nip or '-'}")
        console.print(
            f"[bold]Restaurant name:[/bold] {enriched.restaurant_info.restaurant_name or '-'}"
        )
        console.print(
            f"[bold]Restaurant address:[/bold] {enriched.restaurant_info.restaurant_address or '-'}"
        )
        console.print(f"[bold]Website:[/bold] {enriched.restaurant_info.website_url or '-'}")
        console.print(f"[bold]Evidence URLs:[/bold] {len(enriched.restaurant_info.evidence_urls)}")
        for url in enriched.restaurant_info.evidence_urls:
            console.print(f"  - {url}")
        console.print(
            f"[bold]Menu source URLs:[/bold] {len(enriched.restaurant_info.menu_source_urls)}"
        )
        for url in enriched.restaurant_info.menu_source_urls:
            console.print(f"  - {url}")

        enriched_table = Table(
            title=f"Enriched Rows ({len(enriched.rows)} rows)", header_style="bold green"
        )
        enriched_table.add_column("#", justify="right")
        enriched_table.add_column("item_name")
        enriched_table.add_column("item_count", justify="right")
        enriched_table.add_column("total_cost", justify="right")
        enriched_table.add_column("is_menu_match", justify="center")
        enriched_table.add_column("matched_menu_item")
        enriched_table.add_column("matched_description")
        enriched_table.add_column("matched_image_url")
        enriched_table.add_column("matched_price", justify="right")
        enriched_table.add_column("match_confidence", justify="right")

        for idx, row in enumerate(enriched.rows, start=1):
            enriched_table.add_row(
                str(idx),
                row.item_name,
                str(row.item_count),
                _format_money(row.total_cost),
                "yes" if row.is_menu_match else "no",
                row.matched_menu_item_name or "-",
                row.matched_menu_item_description or "-",
                row.matched_menu_item_image_url or "-",
                _format_money(row.matched_menu_item_price)
                if row.matched_menu_item_price is not None
                else "-",
                f"{row.match_confidence:.2f}" if row.match_confidence is not None else "-",
            )

        console.print(enriched_table)


if __name__ == "__main__":
    app()
