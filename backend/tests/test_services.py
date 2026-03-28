import pytest

from app.models import Item, Settlement, User
from app.services import settle

ITEM = Item(id="00000000-0000-0000-0000-000000000001", name="Pizza", price=10.0)
USER = User(id="00000000-0000-0000-0000-000000000002", name="Alice")

VALID_SETTLEMENT = Settlement(
    id="00000000-0000-0000-0000-000000000000",
    name="Friday dinner",
    items=[ITEM],
    users=[USER],
    assignments={str(USER.id): [str(ITEM.id)]},
)


def test_finish_settlement_returns_list() -> None:
    result = settle(VALID_SETTLEMENT)

    assert isinstance(result, list)


def test_settle_raises_when_users_empty() -> None:
    settlement = VALID_SETTLEMENT.model_copy(update={"users": []})

    with pytest.raises(ValueError, match="user"):
        settle(settlement)


def test_settle_raises_when_items_empty() -> None:
    settlement = VALID_SETTLEMENT.model_copy(update={"items": []})

    with pytest.raises(ValueError, match="item"):
        settle(settlement)


def test_settle_raises_when_assignments_empty() -> None:
    settlement = VALID_SETTLEMENT.model_copy(update={"assignments": {}})

    with pytest.raises(ValueError, match="assignment"):
        settle(settlement)
