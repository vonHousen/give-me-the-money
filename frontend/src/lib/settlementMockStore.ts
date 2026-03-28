import { randomUuid, roundMoney } from '@/lib/utils'
import {
  normalizeSettlementItem,
  type CreateSettlementRequest,
  type SettlementItemWire,
  type SettlementResponse,
  type SettlementSummaryPayload,
  type SettlementSummaryPerson,
  type SettlementSummaryLine,
} from '@/lib/settlementTypes'

export type MockParticipant = {
  id: string
  name: string
  isOwner: boolean
  swipeFinished: boolean
}

type MockSettlementRecord = {
  id: string
  name: string
  items: SettlementItemWire[]
  participants: MockParticipant[]
  assignments: Record<string, string[]>
  /** participantId -> itemId -> quantity claimed (0 = omit key) */
  claims: Record<string, Record<string, number>>
}

const store = new Map<string, MockSettlementRecord>()

export function resetSettlementMockStore(): void {
  store.clear()
}

function recordToResponse(rec: MockSettlementRecord): SettlementResponse {
  return {
    id: rec.id,
    name: rec.name,
    items: rec.items.map((i) => normalizeSettlementItem(i)),
    users: rec.participants.map((p) => ({ id: p.id, name: p.name })),
    assignments: { ...rec.assignments },
  }
}

export function mockCreateSettlement(body: CreateSettlementRequest): SettlementResponse {
  const id = randomUuid()
  const ownerId = randomUuid()
  const title = body.name.trim() || 'Receipt'
  const rec: MockSettlementRecord = {
    id,
    name: title,
    items: body.items.map((i) => normalizeSettlementItem(i)),
    participants: [{ id: ownerId, name: title, isOwner: true, swipeFinished: false }],
    assignments: {},
    claims: { [ownerId]: {} },
  }
  store.set(id, rec)
  return recordToResponse(rec)
}

export function mockGetSettlementRecord(settlementId: string): MockSettlementRecord | undefined {
  return store.get(settlementId)
}

export function mockJoinSettlement(
  settlementId: string,
  name: string,
): { participantId: string; settlement: SettlementResponse } {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('Name is required')
  }
  const participantId = randomUuid()
  rec.participants.push({
    id: participantId,
    name: trimmed,
    isOwner: false,
    swipeFinished: false,
  })
  rec.claims[participantId] = {}
  return { participantId, settlement: recordToResponse(rec) }
}

export type SettlementStatusParticipant = {
  id: string
  name: string
  isOwner: boolean
  swipeFinished: boolean
}

export function mockGetSettlementStatus(settlementId: string): {
  participants: SettlementStatusParticipant[]
} {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  return {
    participants: rec.participants.map((p) => ({
      id: p.id,
      name: p.name,
      isOwner: p.isOwner,
      swipeFinished: p.swipeFinished,
    })),
  }
}

export function mockRecordItemClaim(
  settlementId: string,
  participantId: string,
  itemId: string,
  quantityClaimed: number,
): void {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  const item = rec.items.find((x) => x.id === itemId)
  if (!item) {
    throw new Error('Item not found')
  }
  const n = normalizeSettlementItem(item)
  const q = Math.floor(quantityClaimed)
  if (!Number.isFinite(q) || q < 0 || q > n.quantity) {
    throw new Error('Invalid claim quantity')
  }
  if (!rec.claims[participantId]) {
    rec.claims[participantId] = {}
  }
  const map = rec.claims[participantId]
  if (q === 0) {
    delete map[itemId]
  } else {
    map[itemId] = q
  }
}

export function mockMarkSwipeComplete(settlementId: string, participantId: string): void {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  const p = rec.participants.find((x) => x.id === participantId)
  if (!p) {
    throw new Error('Participant not found')
  }
  p.swipeFinished = true
}

export function mockFinishSettlement(settlementId: string): { summary: SettlementSummaryPayload } {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }

  const itemById = new Map(rec.items.map((i) => [i.id, normalizeSettlementItem(i)]))

  for (const item of itemById.values()) {
    let sum = 0
    for (const pid of Object.keys(rec.claims)) {
      const q = rec.claims[pid]?.[item.id] ?? 0
      sum += q
    }
    if (sum > item.quantity) {
      throw new Error(
        `Claims for "${item.name}" exceed the quantity on the bill (${sum} > ${item.quantity}).`,
      )
    }
  }

  const people: SettlementSummaryPerson[] = rec.participants.map((p) => {
    const myItems: SettlementSummaryLine[] = []
    const byItem = rec.claims[p.id] ?? {}
    for (const item of itemById.values()) {
      const qty = byItem[item.id] ?? 0
      if (qty <= 0) {
        continue
      }
      const linePrice = roundMoney(item.unitPrice * qty)
      myItems.push({
        name: qty > 1 ? `${item.name} ×${qty}` : item.name,
        price: linePrice,
        quantity: qty,
      })
    }
    return {
      id: p.id,
      name: p.name,
      isOwner: p.isOwner,
      items: myItems,
    }
  })

  const grandTotal = roundMoney(rec.items.reduce((s, i) => s + i.price, 0))

  return {
    summary: {
      venueName: rec.name,
      people,
      grandTotal,
    },
  }
}
