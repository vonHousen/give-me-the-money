from app.models import Settlement


def settle(settlement: Settlement):
    """Compute settlement summary from claims.

    Each item's full price is split among everyone who claimed it,
    weighted by claimed quantity: person_share = (qty / total_claimed) * item.price.
    Items nobody claimed are ignored (not charged to anyone).

    Returns a FinishResponse-compatible object (imported in api.py).
    """
    if not settlement.users:
        raise ValueError("Settlement must have at least one user")
    if not settlement.items:
        raise ValueError("Settlement must have at least one item")

    from app.api import FinishResponse, SummaryLine, SummaryPayload, SummaryPerson

    item_by_id = {str(item.id): item for item in settlement.items}

    total_claimed: dict[str, int] = {}
    for user_claims in settlement.claims.values():
        for item_id, qty in user_claims.items():
            if qty > 0:
                total_claimed[item_id] = total_claimed.get(item_id, 0) + qty

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
            total_qty = total_claimed.get(item_id, qty)
            line_price = round((qty / total_qty) * item.price, 2)
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
