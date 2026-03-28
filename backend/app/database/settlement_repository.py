from uuid import uuid4

from app.database.connection import read_db, write_db


class SettlementRepository:
    def get_settlement(self, settlement_id: str) -> dict | None:
        db = read_db()
        for settlement in db["settlements"]:
            if settlement["id"] == settlement_id:
                return settlement
        return None

    def get_settlement_status(self, settlement_id: str) -> list[str] | None:
        settlement = self.get_settlement(settlement_id)
        if settlement is None:
            return None
        return [user["name"] for user in settlement["users"]]

    def join_settlement(
        self, settlement_id: str, user_name: str, item_ids: list[str]
    ) -> dict | None:
        db = read_db()
        for settlement in db["settlements"]:
            if settlement["id"] == settlement_id:
                user = {"id": str(uuid4()), "name": user_name}
                settlement["users"].append(user)
                settlement["assignments"][user["id"]] = item_ids
                write_db(db)
                return settlement
        return None

    def finish_settlement(self, settlement: dict) -> list[dict]:
        # TODO: implement it
        return []

    def create_settlement(self, name: str, items: list[dict]) -> dict:
        settlement = {
            "id": str(uuid4()),
            "name": name,
            "items": [{"id": str(uuid4()), **item} for item in items],
            "users": [],
            "assignments": {},
        }
        db = read_db()
        db["settlements"].append(settlement)
        write_db(db)
        return settlement
