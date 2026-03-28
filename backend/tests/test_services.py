import pytest

from app.models import Item, Settlement, User
from app.services import settle

ITEM_1 = Item(id="00000000-0000-0000-0000-000000000001", name="Pizza", price=10.0, count=1)
ITEM_2 = Item(id="00000000-0000-0000-0000-000000000002", name="Cola", price=2.0, count=2)
ALICE = User(id="00000000-0000-0000-0000-000000000010", name="Alice")
BOB = User(id="00000000-0000-0000-0000-000000000011", name="Bob")

ITEM_1_ID = str(ITEM_1.id)
ITEM_2_ID = str(ITEM_2.id)
ALICE_ID = str(ALICE.id)
BOB_ID = str(BOB.id)


def make_settlement(**kwargs) -> Settlement:
    base = dict(
        id="00000000-0000-0000-0000-000000000000",
        name="Friday dinner",
        items=[ITEM_1],
        users=[ALICE],
        assignments={ALICE_ID: [ITEM_1_ID]},
    )
    return Settlement(**{**base, **kwargs})


def test_settle_returns_list() -> None:
    result = settle(make_settlement())

    assert isinstance(result, list)


def test_settle_returns_entry_per_user() -> None:
    result = settle(make_settlement(users=[ALICE, BOB], assignments={ALICE_ID: [ITEM_1_ID], BOB_ID: [ITEM_1_ID]}))

    assert len(result) == 2


def test_settle_result_contains_user_id_name_amount() -> None:
    result = settle(make_settlement())
    entry = result[0]

    assert "user_id" in entry
    assert "user_name" in entry
    assert "amount" in entry


def test_settle_single_user_pays_full_item_cost() -> None:
    result = settle(make_settlement(items=[ITEM_1], users=[ALICE], assignments={ALICE_ID: [ITEM_1_ID]}))
    alice = next(e for e in result if e["user_id"] == ALICE_ID)

    assert alice["amount"] == 10.0


def test_settle_uses_count_in_cost() -> None:
    # ITEM_2: price=2.0, count=2 -> cost=4.0
    result = settle(make_settlement(items=[ITEM_2], assignments={ALICE_ID: [ITEM_2_ID]}))
    alice = next(e for e in result if e["user_id"] == ALICE_ID)

    assert alice["amount"] == 4.0


def test_settle_splits_cost_between_assigned_users() -> None:
    result = settle(make_settlement(
        items=[ITEM_1],
        users=[ALICE, BOB],
        assignments={ALICE_ID: [ITEM_1_ID], BOB_ID: [ITEM_1_ID]},
    ))
    alice = next(e for e in result if e["user_id"] == ALICE_ID)
    bob = next(e for e in result if e["user_id"] == BOB_ID)

    assert alice["amount"] == 5.0
    assert bob["amount"] == 5.0


def test_settle_unassigned_item_split_evenly() -> None:
    # ITEM_2 has no assignment -> split between Alice and Bob
    result = settle(make_settlement(
        items=[ITEM_2],
        users=[ALICE, BOB],
        assignments={ALICE_ID: [], BOB_ID: []},
    ))
    alice = next(e for e in result if e["user_id"] == ALICE_ID)
    bob = next(e for e in result if e["user_id"] == BOB_ID)

    assert alice["amount"] == 2.0
    assert bob["amount"] == 2.0


def test_settle_mixed_assignments() -> None:
    # ITEM_1 (10.0) -> Alice only; ITEM_2 (2.0 * 2 = 4.0) -> Alice and Bob
    result = settle(make_settlement(
        items=[ITEM_1, ITEM_2],
        users=[ALICE, BOB],
        assignments={ALICE_ID: [ITEM_1_ID, ITEM_2_ID], BOB_ID: [ITEM_2_ID]},
    ))
    alice = next(e for e in result if e["user_id"] == ALICE_ID)
    bob = next(e for e in result if e["user_id"] == BOB_ID)

    assert alice["amount"] == 12.0  # 10.0 + 2.0
    assert bob["amount"] == 2.0


def test_settle_raises_when_users_empty() -> None:
    with pytest.raises(ValueError, match="user"):
        settle(make_settlement(users=[]))


def test_settle_raises_when_items_empty() -> None:
    with pytest.raises(ValueError, match="item"):
        settle(make_settlement(items=[]))


def test_settle_raises_when_assignments_empty() -> None:
    with pytest.raises(ValueError, match="assignment"):
        settle(make_settlement(assignments={}))
