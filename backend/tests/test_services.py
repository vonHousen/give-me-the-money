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
