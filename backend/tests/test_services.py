import pytest

from app.models import Item, Settlement, User
from app.services import settle

ITEM = Item(id="00000000-0000-0000-0000-000000000001", name="Pizza", price=10.0, count=1)
USER = User(id="00000000-0000-0000-0000-000000000002", name="Alice", is_owner=True)

VALID_SETTLEMENT = Settlement(
    id="00000000-0000-0000-0000-000000000000",
    name="Friday dinner",
    items=[ITEM],
    users=[USER],
    assignments={str(USER.id): [str(ITEM.id)]},
    claims={str(USER.id): {str(ITEM.id): 1}},
)


def test_finish_settlement_returns_summary() -> None:
    result = settle(VALID_SETTLEMENT)

    assert hasattr(result, "summary")
    assert result.summary.venue_name == "Friday dinner"
    assert result.summary.grand_total == 10.0
    assert len(result.summary.people) == 1
    assert result.summary.people[0].name == "Alice"


def test_settle_raises_when_users_empty() -> None:
    settlement = VALID_SETTLEMENT.model_copy(update={"users": []})

    with pytest.raises(ValueError, match="user"):
        settle(settlement)


def test_settle_raises_when_items_empty() -> None:
    settlement = VALID_SETTLEMENT.model_copy(update={"items": []})

    with pytest.raises(ValueError, match="item"):
        settle(settlement)


def test_two_people_claim_same_item_splits_evenly() -> None:
    """When two people each claim 1 of a count=1 item, they split the price 50/50."""
    alice = User(id="00000000-0000-0000-0000-000000000010", name="Alice", is_owner=True)
    bob = User(id="00000000-0000-0000-0000-000000000011", name="Bob")
    pizza = Item(id="00000000-0000-0000-0000-000000000020", name="Pizza", price=30.0, count=1)

    settlement = Settlement(
        id="00000000-0000-0000-0000-000000000099",
        name="Dinner",
        items=[pizza],
        users=[alice, bob],
        assignments={},
        claims={
            str(alice.id): {str(pizza.id): 1},
            str(bob.id): {str(pizza.id): 1},
        },
    )

    result = settle(settlement)
    alice_total = sum(line.price for line in result.summary.people[0].items)
    bob_total = sum(line.price for line in result.summary.people[1].items)

    assert alice_total == 15.0
    assert bob_total == 15.0
    assert alice_total + bob_total == pizza.price


def test_weighted_quantity_split() -> None:
    """When Alice claims 4 beers and Bob claims 1, costs split 4:1."""
    alice = User(id="00000000-0000-0000-0000-000000000010", name="Alice", is_owner=True)
    bob = User(id="00000000-0000-0000-0000-000000000011", name="Bob")
    beer = Item(id="00000000-0000-0000-0000-000000000030", name="Beer", price=50.0, count=5)

    settlement = Settlement(
        id="00000000-0000-0000-0000-000000000099",
        name="Pub night",
        items=[beer],
        users=[alice, bob],
        assignments={},
        claims={
            str(alice.id): {str(beer.id): 4},
            str(bob.id): {str(beer.id): 1},
        },
    )

    result = settle(settlement)
    alice_total = sum(line.price for line in result.summary.people[0].items)
    bob_total = sum(line.price for line in result.summary.people[1].items)

    assert alice_total == 40.0
    assert bob_total == 10.0
    assert alice_total + bob_total == beer.price


def test_unclaimed_items_are_ignored() -> None:
    """Items nobody claims should not be charged to anyone."""
    alice = User(id="00000000-0000-0000-0000-000000000010", name="Alice", is_owner=True)
    pizza = Item(id="00000000-0000-0000-0000-000000000020", name="Pizza", price=30.0, count=1)
    salad = Item(id="00000000-0000-0000-0000-000000000021", name="Salad", price=12.0, count=1)

    settlement = Settlement(
        id="00000000-0000-0000-0000-000000000099",
        name="Dinner",
        items=[pizza, salad],
        users=[alice],
        assignments={},
        claims={str(alice.id): {str(pizza.id): 1}},
    )

    result = settle(settlement)
    alice_items = result.summary.people[0].items
    alice_total = sum(line.price for line in alice_items)

    assert len(alice_items) == 1
    assert alice_items[0].name == "Pizza"
    assert alice_total == 30.0
    assert result.summary.grand_total == 42.0


def test_three_people_split_with_different_quantities() -> None:
    """Three claimants with quantities 2, 2, 1 on a 5-count item."""
    alice = User(id="00000000-0000-0000-0000-000000000010", name="Alice", is_owner=True)
    bob = User(id="00000000-0000-0000-0000-000000000011", name="Bob")
    carol = User(id="00000000-0000-0000-0000-000000000012", name="Carol")
    beer = Item(id="00000000-0000-0000-0000-000000000030", name="Beer", price=100.0, count=5)

    settlement = Settlement(
        id="00000000-0000-0000-0000-000000000099",
        name="Party",
        items=[beer],
        users=[alice, bob, carol],
        assignments={},
        claims={
            str(alice.id): {str(beer.id): 2},
            str(bob.id): {str(beer.id): 2},
            str(carol.id): {str(beer.id): 1},
        },
    )

    result = settle(settlement)
    alice_total = sum(line.price for line in result.summary.people[0].items)
    bob_total = sum(line.price for line in result.summary.people[1].items)
    carol_total = sum(line.price for line in result.summary.people[2].items)

    assert alice_total == 40.0
    assert bob_total == 40.0
    assert carol_total == 20.0
    assert alice_total + bob_total + carol_total == beer.price
