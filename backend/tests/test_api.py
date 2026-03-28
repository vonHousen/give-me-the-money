import pytest
from fastapi.testclient import TestClient

from app.api import _settlements
from app.main import app

client = TestClient(app)


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
            "items": [{"id": 1, "name": "Pizza", "price": 10.0}],
        },
    )

    assert response.status_code == 201


def test_create_settlement_response_schema() -> None:
    response = client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [
                {"id": 1, "name": "Pizza", "price": 10.0},
                {"id": 2, "name": "Cola", "price": 2.5},
            ],
        },
    )
    data = response.json()

    assert data["id"] == 1
    assert data["name"] == "Friday dinner"
    assert data["items"] == [
        {"id": 1, "name": "Pizza", "price": 10.0},
        {"id": 2, "name": "Cola", "price": 2.5},
    ]


def test_create_settlement_ids_increment() -> None:
    first = client.post("/settlements", json={"name": "A", "items": []})
    second = client.post("/settlements", json={"name": "B", "items": []})

    assert first.json()["id"] == 1
    assert second.json()["id"] == 2


# GET /settlements/{id}


def test_get_settlement_returns_created_settlement() -> None:
    client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": 1, "name": "Pizza", "price": 10.0}],
        },
    )

    response = client.get("/settlements/1")

    assert response.status_code == 200
    assert response.json()["name"] == "Friday dinner"


def test_get_settlement_not_found() -> None:
    response = client.get("/settlements/999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}


def test_get_settlement_returns_correct_one() -> None:
    client.post("/settlements", json={"name": "First", "items": []})
    client.post("/settlements", json={"name": "Second", "items": []})

    response = client.get("/settlements/2")

    assert response.json()["name"] == "Second"


# PUT /settlements/{id}/join


def test_join_settlement_returns_200() -> None:
    client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": 1, "name": "Pizza", "price": 10.0}],
        },
    )

    response = client.put("/settlements/1/join", json={"item_ids": [1]})

    assert response.status_code == 200


def test_join_settlement_returns_settlement() -> None:
    client.post(
        "/settlements",
        json={
            "name": "Friday dinner",
            "items": [{"id": 1, "name": "Pizza", "price": 10.0}],
        },
    )

    response = client.put("/settlements/1/join", json={"item_ids": [1]})
    data = response.json()

    assert data["id"] == 1
    assert data["name"] == "Friday dinner"


def test_join_settlement_not_found() -> None:
    response = client.put("/settlements/999/join", json={"item_ids": [1]})

    assert response.status_code == 404
    assert response.json() == {"detail": "Settlement not found"}
