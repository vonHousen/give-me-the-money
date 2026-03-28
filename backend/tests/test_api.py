from decimal import Decimal
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.database.connection import write_db
from app.image_processing.model import ProcessedReceipt, ReceiptRow
from app.main import app

client = TestClient(app)

ANALYZE_REQUEST = {"image_base64": "aGVsbG8=", "mime_type": "image/jpeg"}

FAKE_RECEIPT = ProcessedReceipt(
    rows=[ReceiptRow(item_name="Pizza", item_count=1, total_cost=Decimal("12.50"))],
    currency_code="PLN",
)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    write_db({"settlements": []})


@pytest.fixture(autouse=True)
def mock_parse_receipt():
    with patch("app.api.parse_receipt", return_value=FAKE_RECEIPT) as mock:
        yield mock


# POST /analyze


def test_analyze_returns_200() -> None:
    response = client.post("/analyze", json=ANALYZE_REQUEST)

    assert response.status_code == 200


def test_analyze_response_schema() -> None:
    response = client.post("/analyze", json=ANALYZE_REQUEST)
    data = response.json()

    assert "name" in data
    assert "currency_code" in data
    assert isinstance(data["name"], str)
    assert "items" in data
    assert isinstance(data["items"], list)


def test_analyze_items_have_no_id() -> None:
    response = client.post("/analyze", json=ANALYZE_REQUEST)
    items = response.json()["items"]

    assert len(items) > 0
    for item in items:
        assert "id" not in item


# POST /settlements


def test_create_settlement_returns_201() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    )

    assert response.status_code == 201


def test_create_settlement_response_schema() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [
                {"name": "Pizza", "price": 10.0, "count": 1},
                {"name": "Cola", "price": 2.5, "count": 1},
            ],
        },
    )
    data = response.json()

    assert "id" in data
    assert data["name"] == "Friday dinner"
    assert len(data["items"]) == 2
    assert data["items"][0]["name"] == "Pizza"
    assert data["items"][0]["price"] == 10.0
    assert data["items"][1]["name"] == "Cola"
    assert data["items"][1]["price"] == 2.5
    assert len(data["users"]) == 1
    owner = data["users"][0]
    assert owner["name"] == "Owner"
    assert owner["is_owner"] is True
    assert owner["swipe_finished"] is False
    assert owner["id"] in data["assignments"]


def test_create_settlement_request_does_not_require_item_ids() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    )

    assert response.status_code == 201


# GET /settlements/{id}


def test_get_settlement_returns_created_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()

    response = client.get(f"/settlements/{created['id']}")

    assert response.status_code == 200
    assert response.json()["name"] == "Friday dinner"


def test_get_settlement_not_found() -> None:
    response = client.get("/settlements/00000000-0000-0000-0000-000000000000")

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}


def test_get_settlement_returns_correct_one() -> None:
    client.post("/settlements", json={"name": "First", "items": []})
    second = client.post("/settlements", json={"name": "Second", "items": []}).json()

    response = client.get(f"/settlements/{second['id']}")

    assert response.json()["name"] == "Second"


# POST /settlements/{id}/finish


def _create_settled_settlement() -> dict:
    created = client.post(
        "/settlements",
        json={"name": "Friday dinner", "items": [{"name": "Pizza", "price": 10.0, "count": 1}]},
    ).json()
    item_id = created["items"][0]["id"]
    join_resp = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    ).json()
    return join_resp["settlement"]


def test_finish_settlement_returns_200() -> None:
    settlement = _create_settled_settlement()

    response = client.post(f"/settlements/{settlement['id']}/finish")

    assert response.status_code == 200


def test_finish_settlement_returns_summary() -> None:
    settlement = _create_settled_settlement()

    response = client.post(f"/settlements/{settlement['id']}/finish")
    data = response.json()

    assert "summary" in data
    assert "venue_name" in data["summary"]
    assert "people" in data["summary"]
    assert "grand_total" in data["summary"]


def test_finish_settlement_not_found() -> None:
    response = client.post("/settlements/00000000-0000-0000-0000-000000000000/finish")

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}


def test_finish_settlement_returns_422_when_no_items() -> None:
    created = client.post(
        "/settlements",
        json={"name": "Friday dinner", "items": []},
    ).json()

    response = client.post(f"/settlements/{created['id']}/finish")

    assert response.status_code == 422


# GET /settlements/{id}/status


def test_get_settlement_status_returns_owner_participant() -> None:
    created = client.post(
        "/settlements",
        json={"name": "Friday dinner", "items": [{"name": "Pizza", "price": 10.0, "count": 1}]},
    ).json()

    response = client.get(f"/settlements/{created['id']}/status")

    assert response.status_code == 200
    data = response.json()
    assert len(data["participants"]) == 1
    assert data["participants"][0]["is_owner"] is True
    assert data["participants"][0]["name"] == "Owner"


def test_get_settlement_status_returns_joined_participants() -> None:
    created = client.post(
        "/settlements",
        json={"name": "Friday dinner", "items": [{"name": "Pizza", "price": 10.0, "count": 1}]},
    ).json()
    item_id = created["items"][0]["id"]
    client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    )
    client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Bob", "item_ids": [item_id]},
    )

    response = client.get(f"/settlements/{created['id']}/status")

    assert response.status_code == 200
    data = response.json()
    assert len(data["participants"]) == 3  # owner + Alice + Bob
    names = [p["name"] for p in data["participants"]]
    assert "Alice" in names
    assert "Bob" in names
    for p in data["participants"]:
        assert "id" in p
        assert "is_owner" in p
        assert "swipe_finished" in p


def test_get_settlement_status_not_found() -> None:
    response = client.get("/settlements/00000000-0000-0000-0000-000000000000/status")

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}


# PUT /settlements/{id}/join

ITEM_UUID_1 = "00000000-0000-0000-0000-000000000001"


def test_join_settlement_returns_200() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    response = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    )

    assert response.status_code == 200


def test_join_settlement_returns_participant_id() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()

    data = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice"},
    ).json()

    assert "participant_id" in data
    assert "settlement" in data


def test_join_settlement_adds_user() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    data = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    ).json()
    settlement = data["settlement"]

    assert len(settlement["users"]) == 2  # owner + Alice
    assert settlement["users"][0]["is_owner"] is True
    assert settlement["users"][1]["name"] == "Alice"
    assert "id" in settlement["users"][1]


def test_join_settlement_records_assignment() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    data = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    ).json()
    settlement = data["settlement"]

    alice_id = settlement["users"][1]["id"]
    assert alice_id in settlement["assignments"]
    assert settlement["assignments"][alice_id] == [item_id]


def test_join_settlement_returns_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0, "count": 1}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    data = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    ).json()

    assert data["settlement"]["id"] == created["id"]
    assert data["settlement"]["name"] == "Friday dinner"


def test_join_settlement_not_found() -> None:
    response = client.put(
        "/settlements/00000000-0000-0000-0000-000000000000/join",
        json={"user_name": "Alice", "item_ids": [ITEM_UUID_1]},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}


# POST /settlements/{id}/claims


def test_record_claim_returns_200() -> None:
    created = client.post(
        "/settlements",
        json={"name": "Dinner", "items": [{"name": "Pizza", "price": 10.0, "count": 2}]},
    ).json()
    join_resp = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice"},
    ).json()
    user_id = join_resp["participant_id"]
    item_id = created["items"][0]["id"]

    response = client.post(
        f"/settlements/{created['id']}/claims",
        json={"user_id": user_id, "item_id": item_id, "quantity_claimed": 1},
    )

    assert response.status_code == 200


def test_record_claim_not_found() -> None:
    response = client.post(
        "/settlements/00000000-0000-0000-0000-000000000000/claims",
        json={"user_id": "x", "item_id": "y", "quantity_claimed": 1},
    )

    assert response.status_code == 404


# POST /settlements/{id}/swipe-complete


def test_swipe_complete_returns_200() -> None:
    created = client.post(
        "/settlements",
        json={"name": "Dinner", "items": [{"name": "Pizza", "price": 10.0, "count": 1}]},
    ).json()
    join_resp = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice"},
    ).json()
    user_id = join_resp["participant_id"]

    response = client.post(
        f"/settlements/{created['id']}/swipe-complete",
        json={"user_id": user_id},
    )

    assert response.status_code == 200


def test_swipe_complete_not_found() -> None:
    response = client.post(
        "/settlements/00000000-0000-0000-0000-000000000000/swipe-complete",
        json={"user_id": "x"},
    )

    assert response.status_code == 404
