from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()


class Item(BaseModel):
    id: int
    name: str
    price: float


class AnalyzeRequest(BaseModel):
    image: str  # base64-encoded image


class AnalyzeResponse(BaseModel):
    name: str
    items: list[Item]


class SettlementRequest(BaseModel):
    name: str
    items: list[Item]


class Settlement(BaseModel):
    id: int
    name: str
    items: list[Item]


class JoinRequest(BaseModel):
    item_ids: list[int]


_settlements: list[Settlement] = []


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    return AnalyzeResponse(
        name="Pizzeria",
        items=[
            Item(id=1, name="Pizza Margherita", price=12.50),
            Item(id=2, name="Cola", price=2.00),
        ],
    )


@router.post("/settlements", response_model=Settlement, status_code=201)
def create_settlement(body: SettlementRequest) -> Settlement:
    settlement = Settlement(
        id=len(_settlements) + 1,
        name=body.name,
        items=body.items,
    )
    _settlements.append(settlement)
    return settlement


@router.get("/settlements/{id}", response_model=Settlement)
def get_settlement(id: int) -> Settlement:
    for settlement in _settlements:
        if settlement.id == id:
            return settlement
    raise HTTPException(status_code=404, detail="Settlement not found")


@router.put("/settlements/{id}/join", response_model=Settlement)
def join_settlement(id: int, body: JoinRequest) -> Settlement:
    for settlement in _settlements:
        if settlement.id == id:
            return settlement
    raise HTTPException(status_code=404, detail="Settlement not found")
