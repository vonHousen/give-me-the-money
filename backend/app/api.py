from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database.settlement_repository import SettlementRepository

router = APIRouter()


class ItemBase(BaseModel):
    name: str
    price: float


class Item(ItemBase):
    id: UUID


class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded image


class AnalyzeResponse(BaseModel):
    name: str
    items: list[ItemBase]


class User(BaseModel):
    id: UUID
    name: str


class SettlementRequest(BaseModel):
    name: str
    items: list[ItemBase]


class Settlement(BaseModel):
    id: UUID
    name: str
    items: list[Item]
    users: list[User]
    assignments: dict[str, list[UUID]]  # user uuid -> list of item uuids


class JoinRequest(BaseModel):
    user_name: str
    item_ids: list[UUID]


_settlements: list[Settlement] = []
_settlement_repository = SettlementRepository()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    return AnalyzeResponse(
        name="Pizzeria",
        items=[
            ItemBase(
                name="Pizza Margherita",
                price=12.50,
            ),
            ItemBase(name="Cola", price=2.00),
        ],
    )


@router.post("/settlements", response_model=Settlement, status_code=201)
def create_settlement(body: SettlementRequest) -> Settlement:
    data = _settlement_repository.create_settlement(
        name=body.name,
        items=[item.model_dump() for item in body.items],
    )
    return Settlement(**data)


@router.get("/settlements/{id}", response_model=Settlement)
def get_settlement(id: UUID) -> Settlement:
    data = _settlement_repository.get_settlement(str(id))
    if data is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return Settlement(**data)


@router.put("/settlements/{id}/join", response_model=Settlement)
def join_settlement(id: UUID, body: JoinRequest) -> Settlement:
    data = _settlement_repository.join_settlement(
        settlement_id=str(id),
        user_name=body.user_name,
        item_ids=[str(item_id) for item_id in body.item_ids],
    )
    if data is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return Settlement(**data)
