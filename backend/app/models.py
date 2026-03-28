from uuid import UUID

from pydantic import BaseModel


class ItemBase(BaseModel):
    id: UUID | None = None
    name: str
    price: float
    count: int = 1


class Item(ItemBase):
    id: UUID


class User(BaseModel):
    id: UUID
    name: str
    is_owner: bool = False
    swipe_finished: bool = False


class Settlement(BaseModel):
    id: UUID
    name: str
    items: list[Item]
    users: list[User]
    assignments: dict[str, list[str]]  # user id -> list of item ids
    claims: dict[str, dict[str, int]] = {}  # user id -> {item id -> quantity}
