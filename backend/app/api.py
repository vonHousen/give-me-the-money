from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class Item(BaseModel):
    id: UUID
    name: str
    price: float


class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded image


class AnalyzeResponse(BaseModel):
    name: str
    items: list[Item]


class User(BaseModel):
    id: UUID
    name: str


class SettlementRequest(BaseModel):
    name: str
    items: list[Item]


class Settlement(BaseModel):
    id: UUID
    name: str
    items: list[Item]
    users: list[User]
    assignments: dict[str, list[UUID]]  # user uuid -> list of item uuids


class JoinRequest(BaseModel):
    item_ids: list[UUID]


_settlements: list[Settlement] = []


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    return AnalyzeResponse(
        name="Pizzeria",
        items=[
            Item(
                id=UUID("00000000-0000-0000-0000-000000000001"),
                name="Pizza Margherita",
                price=12.50,
            ),
            Item(id=UUID("00000000-0000-0000-0000-000000000002"), name="Cola", price=2.00),
        ],
    )


@router.post("/settlements", response_model=Settlement, status_code=201)
def create_settlement(body: SettlementRequest) -> Settlement:
    settlement = Settlement(
        id=uuid4(),
        name=body.name,
        items=body.items,
        users=[],
        assignments={},
    )
    _settlements.append(settlement)
    return settlement


@router.get("/settlements/{id}", response_model=Settlement)
def get_settlement(id: UUID) -> Settlement:
    for settlement in _settlements:
        if settlement.id == id:
            return settlement
    raise HTTPException(status_code=404, detail="Settlement not found")


@router.put("/settlements/{id}/join", response_model=Settlement)
def join_settlement(id: UUID, body: JoinRequest) -> Settlement:
    for settlement in _settlements:
        if settlement.id == id:
            return settlement
    raise HTTPException(status_code=404, detail="Settlement not found")
