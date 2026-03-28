import { randomUuid, roundMoney } from '@/lib/utils'
import type {
  BackendFinishResponseWire,
  BackendItemWire,
  BackendJoinResponseWire,
  BackendSettlementWire,
  BackendStatusResponseWire,
  BackendSummaryLineWire,
  BackendSummaryPersonWire,
} from '@/lib/settlementTypes'

type MockSettlementRecord = BackendSettlementWire & {
  participants_meta: {
    id: string
    name: string
    is_owner: boolean
    swipe_finished: boolean
  }[]
}

const store = new Map<string, MockSettlementRecord>()

export function resetSettlementMockStore(): void {
  store.clear()
}

function recordToWire(rec: MockSettlementRecord): BackendSettlementWire {
  return {
    id: rec.id,
    name: rec.name,
    items: rec.items.map((i) => ({ ...i })),
    users: rec.participants_meta.map((p) => ({
      id: p.id,
      name: p.name,
      is_owner: p.is_owner,
      swipe_finished: p.swipe_finished,
    })),
    assignments: { ...rec.assignments },
    claims: JSON.parse(JSON.stringify(rec.claims)),
  }
}

export function mockCreateSettlement(body: {
  name: string
  items: { name: string; price: number; count: number }[]
  owner_name?: string
}): BackendSettlementWire {
  const id = randomUuid()
  const ownerId = randomUuid()
  const title = body.name.trim() || 'Receipt'
  const ownerName = body.owner_name ?? 'Owner'
  const items: BackendItemWire[] = body.items.map((i) => ({
    id: randomUuid(),
    name: i.name,
    price: i.price,
    count: i.count,
  }))
  const rec: MockSettlementRecord = {
    id,
    name: title,
    items,
    users: [{ id: ownerId, name: ownerName, is_owner: true, swipe_finished: false }],
    assignments: { [ownerId]: [] },
    claims: { [ownerId]: {} },
    participants_meta: [{ id: ownerId, name: ownerName, is_owner: true, swipe_finished: false }],
  }
  store.set(id, rec)
  return recordToWire(rec)
}

export function mockGetSettlementRecord(settlementId: string): BackendSettlementWire | undefined {
  const rec = store.get(settlementId)
  return rec ? recordToWire(rec) : undefined
}

export function mockJoinSettlement(
  settlementId: string,
  userName: string,
): BackendJoinResponseWire {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  const trimmed = userName.trim()
  if (!trimmed) {
    throw new Error('Name is required')
  }
  const participantId = randomUuid()
  const participant = {
    id: participantId,
    name: trimmed,
    is_owner: false,
    swipe_finished: false,
  }
  rec.participants_meta.push(participant)
  rec.claims[participantId] = {}
  return {
    participant_id: participantId,
    settlement: recordToWire(rec),
  }
}

export function mockGetSettlementStatus(settlementId: string): BackendStatusResponseWire {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  return {
    participants: rec.participants_meta.map((p) => ({
      id: p.id,
      name: p.name,
      is_owner: p.is_owner,
      swipe_finished: p.swipe_finished,
    })),
  }
}

export function mockRecordItemClaim(
  settlementId: string,
  userId: string,
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
  const q = Math.floor(quantityClaimed)
  if (!Number.isFinite(q) || q < 0 || q > item.count) {
    throw new Error('Invalid claim quantity')
  }
  if (!rec.claims[userId]) {
    rec.claims[userId] = {}
  }
  const map = rec.claims[userId]
  if (q === 0) {
    delete map[itemId]
  } else {
    map[itemId] = q
  }
}

export function mockMarkSwipeComplete(settlementId: string, userId: string): void {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }
  const p = rec.participants_meta.find((x) => x.id === userId)
  if (!p) {
    throw new Error('Participant not found')
  }
  p.swipe_finished = true
}

export function mockFinishSettlement(settlementId: string): BackendFinishResponseWire {
  const rec = store.get(settlementId)
  if (!rec) {
    throw new Error('Settlement not found')
  }

  const itemById = new Map(rec.items.map((i) => [i.id, i]))

  const totalClaimed = new Map<string, number>()
  for (const userClaims of Object.values(rec.claims)) {
    for (const [itemId, qty] of Object.entries(userClaims)) {
      if (qty > 0) {
        totalClaimed.set(itemId, (totalClaimed.get(itemId) ?? 0) + qty)
      }
    }
  }

  const people: BackendSummaryPersonWire[] = rec.participants_meta.map((p) => {
    const myItems: BackendSummaryLineWire[] = []
    const byItem = rec.claims[p.id] ?? {}
    for (const item of itemById.values()) {
      const qty = byItem[item.id] ?? 0
      if (qty <= 0) {
        continue
      }
      const totalQty = totalClaimed.get(item.id) ?? qty
      const linePrice = roundMoney((qty / totalQty) * item.price)
      myItems.push({
        name: qty > 1 ? `${item.name} x${qty}` : item.name,
        price: linePrice,
        quantity: qty,
      })
    }
    return {
      id: p.id,
      name: p.name,
      is_owner: p.is_owner,
      items: myItems,
    }
  })

  const grandTotal = roundMoney(rec.items.reduce((s, i) => s + i.price, 0))

  return {
    summary: {
      venue_name: rec.name,
      people,
      grand_total: grandTotal,
    },
  }
}
