import pytest
from fastapi.testclient import TestClient

from app.api import _settlements
from app.main import app

client = TestClient(app)

ITEM_UUID_1 = "00000000-0000-0000-0000-000000000001"
ITEM_UUID_2 = "00000000-0000-0000-0000-000000000002"


@pytest.fixture(autouse=True)
def clear_settlements() -> None:
    _settlements.clear()


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


# POST /settlements


def test_create_settlement_returns_201() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0}],
        },
    )

    assert response.status_code == 201


def test_create_settlement_response_schema() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [
                {"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0},
                {"id": ITEM_UUID_2, "name": "Cola", "price": 2.5},
            ],
        },
    )
    data = response.json()

    assert "id" in data
    assert data["name"] == "Friday dinner"
    assert data["items"] == [
        {"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0},
        {"id": ITEM_UUID_2, "name": "Cola", "price": 2.5},
    ]
    assert data["users"] == []
    assert data["assignments"] == {}


# GET /settlements/{id}


def test_get_settlement_returns_created_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0}],
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


def test_join_settlement_returns_200() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0}],
        },
    ).json()

    response = client.put(f"/settlements/{created['id']}/join", json={"item_ids": [ITEM_UUID_1]})

    assert response.status_code == 200


def test_join_settlement_returns_settlement() -> None:
    created = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": ITEM_UUID_1, "name": "Pizza", "price": 10.0}],
        },
    ).json()

    response = client.put(f"/settlements/{created['id']}/join", json={"item_ids": [ITEM_UUID_1]})
    data = response.json()

    assert data["id"] == created["id"]
    assert data["name"] == "Friday dinner"


def test_join_settlement_not_found() -> None:
    response = client.put(
        "/settlements/00000000-0000-0000-0000-000000000000/join",
        json={"item_ids": [ITEM_UUID_1]},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}
