from uuid import UUID

from pydantic import BaseModel


class ItemBase(BaseModel):
    name: str
    price: float
    count: int = 1


class Item(ItemBase):
    id: UUID


class User(BaseModel):
    id: UUID
    name: str


class Settlement(BaseModel):
    id: UUID
    name: str
    items: list[Item]
    users: list[User]
    assignments: dict[str, list[str]]  # user id -> list of item ids
