import { roundMoney } from '@/lib/utils'
import type {
  CreateSettlementRequest,
  SettlementItemWire,
  SettlementResponse,
  SettlementSummaryPayload,
  SettlementSummaryPerson,
  SettlementSummaryLine,
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
  /** participantId -> claimed item ids */
  claims: Record<string, string[]>
}

const store = new Map<string, MockSettlementRecord>()

export function resetSettlementMockStore(): void {
  store.clear()
}

function recordToResponse(rec: MockSettlementRecord): SettlementResponse {
  return {
    id: rec.id,
    name: rec.name,
    items: rec.items.map((i) => ({ ...i })),
    users: rec.participants.map((p) => ({ id: p.id, name: p.name })),
    assignments: { ...rec.assignments },
  }
}

export function mockCreateSettlement(body: CreateSettlementRequest): SettlementResponse {
  const id = crypto.randomUUID()
  const ownerId = crypto.randomUUID()
  const title = body.name.trim() || 'Receipt'
  const rec: MockSettlementRecord = {
    id,
    name: title,
    items: body.items.map((i) => ({ ...i })),
    participants: [{ id: ownerId, name: title, isOwner: true, swipeFinished: false }],
    assignments: {},
    claims: { [ownerId]: [] },
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
  const participantId = crypto.randomUUID()
  rec.participants.push({
    id: participantId,
    name: trimmed,
    isOwner: false,
    swipeFinished: false,
  })
  rec.claims[participantId] = []
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
  claimed: boolean,
): void {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  if (!rec.claims[participantId]) {
    rec.claims[participantId] = []
  }
  const arr = rec.claims[participantId]
  if (claimed) {
    if (!arr.includes(itemId)) {
      arr.push(itemId)
    }
  } else {
    rec.claims[participantId] = arr.filter((id) => id !== itemId)
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

  const itemById = new Map(rec.items.map((i) => [i.id, i]))
  const claimantsByItem = new Map<string, string[]>()

  for (const [pid, itemIds] of Object.entries(rec.claims)) {
    for (const iid of itemIds) {
      if (!claimantsByItem.has(iid)) {
        claimantsByItem.set(iid, [])
      }
      claimantsByItem.get(iid)!.push(pid)
    }
  }

  const people: SettlementSummaryPerson[] = rec.participants.map((p) => {
    const myItems: SettlementSummaryLine[] = []
    for (const [itemId, pids] of claimantsByItem) {
      if (!pids.includes(p.id)) {
        continue
      }
      const item = itemById.get(itemId)
      if (!item) {
        continue
      }
      const share = item.price / pids.length
      myItems.push({ name: item.name, price: roundMoney(share) })
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
