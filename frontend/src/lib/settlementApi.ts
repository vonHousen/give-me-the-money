import {
  mockCreateSettlement,
  mockFinishSettlement,
  mockGetSettlementRecord,
  mockGetSettlementStatus,
  mockJoinSettlement,
  mockMarkSwipeComplete,
  mockRecordItemClaim,
  type SettlementStatusParticipant,
} from '@/lib/settlementMockStore'
import type {
  CreateSettlementRequest,
  SettlementResponse,
  SettlementSummaryPayload,
} from '@/lib/settlementTypes'

export type {
  CreateSettlementRequest,
  SettlementItemWire,
  SettlementResponse,
  SettlementSummaryLine,
  SettlementSummaryPayload,
  SettlementSummaryPerson,
} from '@/lib/settlementTypes'

export type { SettlementStatusParticipant } from '@/lib/settlementMockStore'

export { resetSettlementMockStore } from '@/lib/settlementMockStore'

const MOCK_DELAY_MS = 300

/** Empty or unset → use built-in mock (no HTTP). Base URL without trailing slash; POST goes to `{base}/settlements`. */
export function getSettlementApiBaseUrl(): string | undefined {
  const raw = import.meta.env.VITE_SETTLEMENT_API_URL
  if (typeof raw !== 'string') return undefined
  const u = raw.trim()
  return u === '' ? undefined : u.replace(/\/$/, '')
}

export async function createSettlement(
  body: CreateSettlementRequest,
): Promise<SettlementResponse> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    return mockCreateSettlement(body)
  }
  return postSettlement(base, body)
}

export async function joinSettlement(
  settlementId: string,
  name: string,
): Promise<{ participantId: string; settlement: SettlementResponse }> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    return mockJoinSettlement(settlementId, name)
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/join`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text ? `Join failed (${res.status}): ${text}` : `Join failed (${res.status})`)
  }
  return res.json() as Promise<{ participantId: string; settlement: SettlementResponse }>
}

export async function getSettlementStatus(settlementId: string): Promise<{
  participants: SettlementStatusParticipant[]
}> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    return mockGetSettlementStatus(settlementId)
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/status`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Status failed (${res.status}): ${text}` : `Status failed (${res.status})`,
    )
  }
  return res.json() as Promise<{ participants: SettlementStatusParticipant[] }>
}

export async function recordItemClaim(
  settlementId: string,
  participantId: string,
  itemId: string,
  claimed: boolean,
): Promise<void> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    mockRecordItemClaim(settlementId, participantId, itemId, claimed)
    return
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/claims`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participantId, itemId, claimed }),
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
    body: JSON.stringify({ participantId }),
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
    return mockFinishSettlement(settlementId)
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}/finish`
  const res = await fetch(url, { method: 'POST' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Finish failed (${res.status}): ${text}` : `Finish failed (${res.status})`,
    )
  }
  return res.json() as Promise<{ summary: SettlementSummaryPayload }>
}

/** For swipe UI: load items from mock store (mock mode) or GET settlement. */
export async function getSettlementForSwipe(settlementId: string): Promise<SettlementResponse | null> {
  const base = getSettlementApiBaseUrl()
  if (!base) {
    await delay()
    const rec = mockGetSettlementRecord(settlementId)
    if (!rec) {
      return null
    }
    return {
      id: rec.id,
      name: rec.name,
      items: rec.items.map((i) => ({ ...i })),
      users: rec.participants.map((p) => ({ id: p.id, name: p.name })),
      assignments: { ...rec.assignments },
    }
  }
  const url = `${base}/settlements/${encodeURIComponent(settlementId)}`
  const res = await fetch(url)
  if (!res.ok) {
    return null
  }
  return res.json() as Promise<SettlementResponse>
}

async function delay(): Promise<void> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
}

async function postSettlement(
  base: string,
  body: CreateSettlementRequest,
): Promise<SettlementResponse> {
  const url = `${base}/settlements`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text
        ? `Create settlement failed (${res.status}): ${text}`
        : `Create settlement failed (${res.status})`,
    )
  }
  return res.json() as Promise<SettlementResponse>
}
