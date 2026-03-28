from app.models import Settlement


def settle(settlement: Settlement):
    """Compute settlement summary from claims.

    Returns a FinishResponse-compatible object (imported in api.py).
    """
    if not settlement.users:
        raise ValueError("Settlement must have at least one user")
    if not settlement.items:
        raise ValueError("Settlement must have at least one item")

    from app.api import FinishResponse, SummaryLine, SummaryPayload, SummaryPerson

    item_by_id = {str(item.id): item for item in settlement.items}

    people = []
    for user in settlement.users:
        uid = str(user.id)
        user_claims = settlement.claims.get(uid, {})
        lines: list[SummaryLine] = []
        for item_id, qty in user_claims.items():
            if qty <= 0:
                continue
            item = item_by_id.get(item_id)
            if item is None:
                continue
            unit_price = item.price / item.count if item.count > 0 else item.price
            line_price = round(unit_price * qty, 2)
            name = f"{item.name} x{qty}" if qty > 1 else item.name
            lines.append(SummaryLine(name=name, price=line_price, quantity=qty))

        people.append(
            SummaryPerson(
                id=uid,
                name=user.name,
                is_owner=user.is_owner,
                items=lines,
            )
        )

    grand_total = round(sum(item.price for item in settlement.items), 2)

    return FinishResponse(
        summary=SummaryPayload(
            venue_name=settlement.name,
            people=people,
            grand_total=grand_total,
        )
    )
