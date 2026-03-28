from uuid import uuid4

from app.database.connection import read_db, write_db
from app.models import ItemBase, Settlement


class SettlementRepository:
    def get_settlement(self, settlement_id: str) -> Settlement | None:
        db = read_db()
        for settlement in db.get("settlements", []):
            if settlement["id"] == settlement_id:
                return Settlement(**settlement)
        return None

    def get_settlement_status(self, settlement_id: str) -> list[dict] | None:
        settlement = self.get_settlement(settlement_id)
        if settlement is None:
            return None
        return [
            {
                "id": str(user.id),
                "name": user.name,
                "is_owner": user.is_owner,
                "swipe_finished": user.swipe_finished,
            }
            for user in settlement.users
        ]

    def join_settlement(
        self, settlement_id: str, user_name: str, item_ids: list[str]
    ) -> tuple[Settlement, str] | None:
        """Returns (settlement, new_user_id) or None if not found."""
        db = read_db()
        for settlement in db.get("settlements", []):
            if settlement["id"] == settlement_id:
                user_id = str(uuid4())
                user = {
                    "id": user_id,
                    "name": user_name,
                    "is_owner": False,
                    "swipe_finished": False,
                }
                settlement["users"].append(user)
                settlement["assignments"][user_id] = item_ids
                settlement.setdefault("claims", {})[user_id] = {}
                write_db(db)
                return Settlement(**settlement), user_id
        return None

    def create_settlement(
        self, name: str, items: list[ItemBase], owner_name: str = "Owner"
    ) -> Settlement:
        owner_id = str(uuid4())
        settlement = {
            "id": str(uuid4()),
            "name": name,
            "items": [
                {
                    "id": str(item.id) if item.id else str(uuid4()),
                    **{k: v for k, v in item.model_dump().items() if k != "id"},
                }
                for item in items
            ],
            "users": [
                {
                    "id": owner_id,
                    "name": owner_name,
                    "is_owner": True,
                    "swipe_finished": False,
                }
            ],
            "assignments": {owner_id: []},
            "claims": {owner_id: {}},
        }
        db = read_db()
        db.setdefault("settlements", []).append(settlement)
        write_db(db)
        return Settlement(**settlement)

    def record_claim(
        self,
        settlement_id: str,
        user_id: str,
        item_id: str,
        quantity_claimed: int,
    ) -> Settlement | None:
        db = read_db()
        for settlement in db.get("settlements", []):
            if settlement["id"] == settlement_id:
                claims = settlement.setdefault("claims", {})
                user_claims = claims.setdefault(user_id, {})
                if quantity_claimed <= 0:
                    user_claims.pop(item_id, None)
                else:
                    user_claims[item_id] = quantity_claimed
                write_db(db)
                return Settlement(**settlement)
        return None

    def mark_swipe_complete(self, settlement_id: str, user_id: str) -> Settlement | None:
        db = read_db()
        for settlement in db.get("settlements", []):
            if settlement["id"] == settlement_id:
                for user in settlement.get("users", []):
                    if user["id"] == user_id:
                        user["swipe_finished"] = True
                        write_db(db)
                        return Settlement(**settlement)
                return None
        return None
