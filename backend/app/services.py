from app.models import Settlement


def settle(settlement: Settlement) -> list[dict]:
    if not settlement.users:
        raise ValueError("Settlement must have at least one user")
    if not settlement.items:
        raise ValueError("Settlement must have at least one item")
    if not settlement.assignments:
        raise ValueError("Settlement must have at least one assignment")

    all_user_ids = [str(user.id) for user in settlement.users]
    result: dict[str, float] = {user_id: 0.0 for user_id in all_user_ids}

    # invert assignments: item_id -> list of user_ids
    item_assignees: dict[str, list[str]] = {}
    for user_id, item_ids in settlement.assignments.items():
        for item_id in item_ids:
            item_assignees.setdefault(item_id, []).append(user_id)

    for item in settlement.items:
        item_id = str(item.id)
        cost = item.price * item.count
        assignees = item_assignees.get(item_id) or all_user_ids
        share = cost / len(assignees)
        for user_id in assignees:
            result[user_id] += share

    user_name = {str(user.id): user.name for user in settlement.users}
    return [
        {"user_id": user_id, "user_name": user_name[user_id], "amount": round(amount, 2)}
        for user_id, amount in result.items()
    ]
