from app.models import Settlement


def settle(settlement: Settlement) -> list[dict]:
    if not settlement.users:
        raise ValueError("Settlement must have at least one user")
    if not settlement.items:
        raise ValueError("Settlement must have at least one item")
    if not settlement.assignments:
        raise ValueError("Settlement must have at least one assignment")
    # TODO: implement it
    return []
