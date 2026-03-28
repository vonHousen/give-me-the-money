from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database.settlement_repository import SettlementRepository
from app.image_processing import parse_receipt
from app.models import ItemBase, Settlement
from app.services import settle

router = APIRouter()


class ItemBase(BaseModel):
    name: str
    price: float
    count: int


class Item(ItemBase):
    id: UUID


class AnalyzeRequest(BaseModel):
    image_base64: str
    mime_type: str


class AnalyzeResponse(BaseModel):
    name: str
    currency_code: str
    items: list[ItemBase]


class SettlementRequest(BaseModel):
    name: str
    items: list[ItemBase]


class JoinRequest(BaseModel):
    user_name: str = "Restauracja"
    item_ids: list[UUID]


_settlement_repository = SettlementRepository()


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(body: AnalyzeRequest) -> AnalyzeResponse:
    processed_receipt = parse_receipt(img_b64=body.image_base64, mime_type=body.mime_type)

    items = [
        ItemBase(name=row.item_name, price=float(row.total_cost), count=row.item_count)
        for row in processed_receipt.rows
    ]

    return AnalyzeResponse(
        name="Pizzeria",
        currency_code=processed_receipt.currency_code,
        items=items,
    )


@router.post("/settlements", response_model=Settlement, status_code=201)
def create_settlement(body: SettlementRequest) -> Settlement:
    return _settlement_repository.create_settlement(
        name=body.name,
        items=body.items,
    )


@router.get("/settlements/{id}", response_model=Settlement)
def get_settlement(id: UUID) -> Settlement:
    settlement = _settlement_repository.get_settlement(str(id))
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return settlement


@router.post("/settlements/{id}/finish")
def finish_settlement(id: UUID) -> list[dict]:
    settlement = _settlement_repository.get_settlement(str(id))
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    try:
        return settle(settlement)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.get("/settlements/{id}/status")
def get_settlement_status(id: UUID) -> dict[str, list[str]]:
    users = _settlement_repository.get_settlement_status(str(id))
    if users is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return {"users": users}


@router.put("/settlements/{id}/join", response_model=Settlement)
def join_settlement(id: UUID, body: JoinRequest) -> Settlement:
    settlement = _settlement_repository.join_settlement(
        settlement_id=str(id),
        user_name=body.user_name,
        item_ids=[str(item_id) for item_id in body.item_ids],
    )
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return settlement
