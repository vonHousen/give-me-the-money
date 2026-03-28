import json
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "db.json"


def read_db() -> dict:
    if not DB_PATH.exists():
        return {}
    with open(DB_PATH) as f:
        return json.load(f)


def write_db(data: dict) -> None:
    with open(DB_PATH, "w") as f:
        json.dump(data, f, indent=2)
