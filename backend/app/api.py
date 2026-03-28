from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database.settlement_repository import SettlementRepository
from app.image_processing import parse_receipt
from app.models import ItemBase, Settlement
from app.services import settle

router = APIRouter()


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
    owner_name: str = "Owner"


class JoinRequest(BaseModel):
    user_name: str = "Restauracja"
    item_ids: list[UUID] = []


class JoinResponse(BaseModel):
    participant_id: str
    settlement: Settlement


class ClaimRequest(BaseModel):
    user_id: str
    item_id: str
    quantity_claimed: int


class SwipeCompleteRequest(BaseModel):
    user_id: str


class StatusParticipant(BaseModel):
    id: str
    name: str
    is_owner: bool
    swipe_finished: bool


class StatusResponse(BaseModel):
    participants: list[StatusParticipant]


class SummaryLine(BaseModel):
    name: str
    price: float
    quantity: int | None = None


class SummaryPerson(BaseModel):
    id: str
    name: str
    is_owner: bool
    items: list[SummaryLine]


class SummaryPayload(BaseModel):
    venue_name: str
    people: list[SummaryPerson]
    grand_total: float


class FinishResponse(BaseModel):
    summary: SummaryPayload


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
        owner_name=body.owner_name,
    )


@router.get("/settlements/{id}", response_model=Settlement)
def get_settlement(id: UUID) -> Settlement:
    settlement = _settlement_repository.get_settlement(str(id))
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return settlement


@router.post("/settlements/{id}/finish", response_model=FinishResponse)
def finish_settlement(id: UUID) -> FinishResponse:
    settlement = _settlement_repository.get_settlement(str(id))
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    try:
        return settle(settlement)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e)) from None


@router.get("/settlements/{id}/status", response_model=StatusResponse)
def get_settlement_status(id: UUID) -> StatusResponse:
    participants = _settlement_repository.get_settlement_status(str(id))
    if participants is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return StatusResponse(participants=[StatusParticipant(**p) for p in participants])


@router.put("/settlements/{id}/join", response_model=JoinResponse)
def join_settlement(id: UUID, body: JoinRequest) -> JoinResponse:
    result = _settlement_repository.join_settlement(
        settlement_id=str(id),
        user_name=body.user_name,
        item_ids=[str(item_id) for item_id in body.item_ids],
    )
    if result is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    settlement, user_id = result
    return JoinResponse(participant_id=user_id, settlement=settlement)


@router.post("/settlements/{id}/claims", response_model=Settlement)
def record_claim(id: UUID, body: ClaimRequest) -> Settlement:
    settlement = _settlement_repository.record_claim(
        settlement_id=str(id),
        user_id=body.user_id,
        item_id=body.item_id,
        quantity_claimed=body.quantity_claimed,
    )
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement not found")
    return settlement


@router.post("/settlements/{id}/swipe-complete", response_model=Settlement)
def mark_swipe_complete(id: UUID, body: SwipeCompleteRequest) -> Settlement:
    settlement = _settlement_repository.mark_swipe_complete(
        settlement_id=str(id),
        user_id=body.user_id,
    )
    if settlement is None:
        raise HTTPException(status_code=404, detail="Settlement or user not found")
    return settlement
