import pytest
from fastapi.testclient import TestClient

from app.database.connection import write_db
from app.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    write_db({"settlements": []})


# POST /analyze


def test_analyze_returns_200() -> None:
    response = client.post("/analyze", json={"image": "aGVsbG8="})

    assert response.status_code == 200


def test_analyze_response_schema() -> None:
    response = client.post("/analyze", json={"image": "aGVsbG8="})
    data = response.json()

    assert "name" in data
    assert isinstance(data["name"], str)
    assert "items" in data
    assert isinstance(data["items"], list)


def test_analyze_items_have_no_id() -> None:
    response = client.post("/analyze", json={"image": "aGVsbG8="})
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
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    )

    assert response.status_code == 201


def test_create_settlement_response_schema() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [
                {"name": "Pizza", "price": 10.0},
                {"name": "Cola", "price": 2.5},
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
    assert data["users"] == []
    assert data["assignments"] == {}


def test_create_settlement_request_does_not_require_item_ids() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    )

    assert response.status_code == 201


# GET /settlements/{id}


def test_get_settlement_returns_created_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
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


# PUT /settlements/{id}/join

ITEM_UUID_1 = "00000000-0000-0000-0000-000000000001"


def test_join_settlement_returns_200() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    response = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    )

    assert response.status_code == 200


def test_join_settlement_adds_user() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    response = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    )
    data = response.json()

    assert len(data["users"]) == 1
    assert data["users"][0]["name"] == "Alice"
    assert "id" in data["users"][0]


def test_join_settlement_records_assignment() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    data = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    ).json()

    user_id = data["users"][0]["id"]
    assert user_id in data["assignments"]
    assert data["assignments"][user_id] == [item_id]


def test_join_settlement_returns_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"name": "Pizza", "price": 10.0}],
        },
    ).json()
    item_id = created["items"][0]["id"]

    response = client.put(
        f"/settlements/{created['id']}/join",
        json={"user_name": "Alice", "item_ids": [item_id]},
    )
    data = response.json()

    assert data["id"] == created["id"]
    assert data["name"] == "Friday dinner"


def test_join_settlement_not_found() -> None:
    response = client.put(
        "/settlements/00000000-0000-0000-0000-000000000000/join",
        json={"user_name": "Alice", "item_ids": [ITEM_UUID_1]},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}
