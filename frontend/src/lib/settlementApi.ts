import {
  mockCreateSettlement,
  mockFinishSettlement,
  mockGetSettlementRecord,
  mockGetSettlementStatus,
  mockJoinSettlement,
  mockMarkSwipeComplete,
  mockRecordItemClaim,
} from '@/lib/settlementMockStore'
import {
  backendFinishToSummary,
  backendSettlementToResponse,
  backendStatusToParticipants,
  type BackendFinishResponseWire,
  type BackendJoinResponseWire,
  type BackendSettlementWire,
  type BackendStatusResponseWire,
  type CreateSettlementRequest,
  type SettlementResponse,
  type SettlementStatusParticipant,
  type SettlementSummaryPayload,
} from '@/lib/settlementTypes'

export type {
  CreateSettlementRequest,
  SettlementItemWire,
  SettlementResponse,
  SettlementStatusParticipant,
  SettlementSummaryLine,
  SettlementSummaryPayload,
  SettlementSummaryPerson,
} from '@/lib/settlementTypes'
export { normalizeSettlementItem } from '@/lib/settlementTypes'

export { resetSettlementMockStore } from '@/lib/settlementMockStore'

const MOCK_DELAY_MS = 300

/** Empty or unset -> use built-in mock (no HTTP). Base URL without trailing slash. */
export function getSettlementApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_SETTLEMENT_API_URL
  if (typeof raw !== 'string') return undefined
  const u = raw.trim()
  return u === '' ? undefined : u.replace(/\/$/, '')
}

export async function createSettlement(
  body: CreateSettlementRequest,
): Promise<SettlementResponse> {
  const ownerName = body.ownerName ?? 'Owner'
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const wire = mockCreateSettlement({
      name: body.name,
      items: body.items.map((i) => ({ id: i.id, name: i.name, price: i.price, count: i.quantity })),
      owner_name: ownerName,
    })
    return backendSettlementToResponse(wire)
  }
  const url = `${base}/settlements`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: body.name,
      items: body.items.map((i) => ({ id: i.id, name: i.name, price: i.price, count: i.quantity })),
      owner_name: ownerName,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text
        ? `Create settlement failed (${res.status}): ${text}`
        : `Create settlement failed (${res.status})`,
    )
  }
  const wire = (await res.json()) as BackendSettlementWire
  return backendSettlementToResponse(wire)
}

export async function joinSettlement(
  settlementId: string,
  name: string,
): Promise<{ participantId: string; settlement: SettlementResponse }> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const wire = mockJoinSettlement(settlementId, name)
    return {
      participantId: wire.participant_id,
      settlement: backendSettlementToResponse(wire.settlement),
    }
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/join`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_name: name, item_ids: [] }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text ? `Join failed (${res.status}): ${text}` : `Join failed (${res.status})`)
  }
  const wire = (await res.json()) as BackendJoinResponseWire
  return {
    participantId: wire.participant_id,
    settlement: backendSettlementToResponse(wire.settlement),
  }
}

export async function getSettlementStatus(settlementId: string): Promise<{
  participants: SettlementStatusParticipant[]
}> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const wire = mockGetSettlementStatus(settlementId)
    return { participants: backendStatusToParticipants(wire) }
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/status`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Status failed (${res.status}): ${text}` : `Status failed (${res.status})`,
    )
  }
  const wire = (await res.json()) as BackendStatusResponseWire
  return { participants: backendStatusToParticipants(wire) }
}

export async function recordItemClaim(
  settlementId: string,
  participantId: string,
  itemId: string,
  quantityClaimed: number,
): Promise<void> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    mockRecordItemClaim(settlementId, participantId, itemId, quantityClaimed)
    return
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/claims`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: participantId,
      item_id: itemId,
      quantity_claimed: quantityClaimed,
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Claim failed (${res.status}): ${text}` : `Claim failed (${res.status})`,
    )
  }
}

export async function markSwipeComplete(settlementId: string, participantId: string): Promise<void> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    mockMarkSwipeComplete(settlementId, participantId)
    return
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/swipe-complete`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: participantId }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Swipe complete failed (${res.status}): ${text}` : `Swipe complete failed (${res.status})`,
    )
  }
}

export async function finishSettlement(settlementId: string): Promise<{
  summary: SettlementSummaryPayload
}> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const wire = mockFinishSettlement(settlementId)
    return { summary: backendFinishToSummary(wire) }
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/finish`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Finish failed (${res.status}): ${text}` : `Finish failed (${res.status})`,
    )
  }
  const wire = (await res.json()) as BackendFinishResponseWire
  return { summary: backendFinishToSummary(wire) }
}

/** For swipe UI: load items from mock store (mock mode) or GET settlement. */
export async function getSettlementForSwipe(settlementId: string): Promise<SettlementResponse | null> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const wire = mockGetSettlementRecord(settlementId)
    if (!wire) {
      return null
    }
    return backendSettlementToResponse(wire)
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}`
  const res = await fetch(url)
  if (!res.ok) {
    return null
  }
  const wire = (await res.json()) as BackendSettlementWire
  return backendSettlementToResponse(wire)
}

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
}
