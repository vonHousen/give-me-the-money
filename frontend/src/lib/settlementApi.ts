export type SettlementItemWire = {
  id: string
  name: string
  price: number
}

export type CreateSettlementRequest = {
  name: string
  items: SettlementItemWire[]
}

export type SettlementResponse = {
  id: string
  name: string
  items: SettlementItemWire[]
  users: { id: string; name: string }[]
  assignments: Record<string, string[]>
}

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
    return mockCreateSettlement(body)
  }
  return postSettlement(base, body)
}

async function mockCreateSettlement(body: CreateSettlementRequest): Promise<SettlementResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
  return {
    id: crypto.randomUUID(),
    name: body.name,
    items: body.items.map((i) => ({ ...i })),
    users: [],
    assignments: {},
  }
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
