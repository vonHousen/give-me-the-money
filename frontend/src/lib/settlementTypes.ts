import { roundMoney } from '@/lib/utils'

// -- Backend wire types (snake_case, match real API responses) --

export type BackendItemWire = {
  id: string
  name: string
  price: number
  count: number
}

export type BackendUserWire = {
  id: string
  name: string
  is_owner: boolean
  swipe_finished: boolean
}

export type BackendSettlementWire = {
  id: string
  name: string
  items: BackendItemWire[]
  users: BackendUserWire[]
  assignments: Record<string, string[]>
  claims: Record<string, Record<string, number>>
}

export type BackendJoinResponseWire = {
  participant_id: string
  settlement: BackendSettlementWire
}

export type BackendStatusParticipantWire = {
  id: string
  name: string
  is_owner: boolean
  swipe_finished: boolean
}

export type BackendStatusResponseWire = {
  participants: BackendStatusParticipantWire[]
}

export type BackendSummaryLineWire = {
  name: string
  price: number
  quantity: number | null
}

export type BackendSummaryPersonWire = {
  id: string
  name: string
  is_owner: boolean
  items: BackendSummaryLineWire[]
}

export type BackendFinishResponseWire = {
  summary: {
    venue_name: string
    people: BackendSummaryPersonWire[]
    grand_total: number
  }
}

// -- Frontend types (camelCase) --

export type SettlementItemWire = {
  id: string
  name: string
  /** Line total (unitPrice x quantity). */
  price: number
  /** Units on the receipt line (>= 1). */
  quantity: number
  /** Pre-tax/unit price for one unit (for splitting claims). */
  unitPrice: number
}

/** Normalize items from API (with `count`) or legacy payloads missing quantity/unitPrice. */
export function normalizeSettlementItem(
  i: Pick<SettlementItemWire, 'id' | 'name' | 'price'> &
    Partial<Pick<SettlementItemWire, 'quantity' | 'unitPrice'>> &
  { count?: number },
): SettlementItemWire {
  const rawQty = typeof i.count === 'number' && i.count >= 1 ? i.count : i.quantity
  const q =
    typeof rawQty === 'number' && Number.isFinite(rawQty) && rawQty >= 1
      ? Math.floor(rawQty)
      : 1
  const price = roundMoney(i.price)
  const unitPrice =
    typeof i.unitPrice === 'number' && Number.isFinite(i.unitPrice) && i.unitPrice >= 0
      ? roundMoney(i.unitPrice)
      : roundMoney(q > 0 ? price / q : price)
  return {
    id: i.id,
    name: i.name,
    price,
    quantity: q,
    unitPrice,
  }
}

export type CreateSettlementRequest = {
  id: string
  name: string
  items: SettlementItemWire[]
  ownerName?: string
}

export type SettlementResponse = {
  id: string
  name: string
  items: SettlementItemWire[]
  users: { id: string; name: string }[]
  assignments: Record<string, string[]>
}

export type SettlementStatusParticipant = {
  id: string
  name: string
  isOwner: boolean
  swipeFinished: boolean
}

export type SettlementSummaryLine = { name: string; price: number; quantity?: number }

export type SettlementSummaryPerson = {
  id: string
  name: string
  isOwner: boolean
  items: SettlementSummaryLine[]
}

export type SettlementSummaryPayload = {
  venueName: string
  people: SettlementSummaryPerson[]
  grandTotal: number
}

// -- Conversion helpers (backend wire -> frontend types) --

export function backendSettlementToResponse(s: BackendSettlementWire): SettlementResponse {
  return {
    id: s.id,
    name: s.name,
    items: s.items.map((i) => normalizeSettlementItem(i)),
    users: s.users.map((u) => ({ id: u.id, name: u.name })),
    assignments: s.assignments,
  }
}

export function backendStatusToParticipants(
  wire: BackendStatusResponseWire,
): SettlementStatusParticipant[] {
  return wire.participants.map((p) => ({
    id: p.id,
    name: p.name,
    isOwner: p.is_owner,
    swipeFinished: p.swipe_finished,
  }))
}

export function backendFinishToSummary(wire: BackendFinishResponseWire): SettlementSummaryPayload {
  return {
    venueName: wire.summary.venue_name,
    grandTotal: wire.summary.grand_total,
    people: wire.summary.people.map((p) => ({
      id: p.id,
      name: p.name,
      isOwner: p.is_owner,
      items: p.items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity ?? undefined,
      })),
    })),
  }
}
