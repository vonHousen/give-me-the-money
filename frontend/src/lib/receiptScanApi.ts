export type AnalyzeRequest = {
  image_base64: string
  mime_type: string
}

export type AnalyzeItemWire = {
  id: string
  name: string
  price: number
  count: number
}

export type AnalyzeResponse = {
  name: string
  currency_code: string
  items: AnalyzeItemWire[]
}

const MOCK_DELAY_MS = 300

const MOCK_ITEMS: AnalyzeItemWire[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Garden Harvest Bowl', price: 18.5, count: 1 },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Truffle Fries', price: 9.0, count: 1 },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Lemon Tart', price: 8.0, count: 1 },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Sparkling Water', price: 7.5, count: 3 },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Service Charge (10%)', price: 4.3, count: 1 },
]

/** Empty or unset -> use built-in mock (no HTTP). */
export function getReceiptScanApiUrl(): string | undefined {
  const raw = import.meta.env.VITE_RECEIPT_SCAN_API_URL
  if (typeof raw !== 'string') return undefined
  const u = raw.trim()
  return u === '' ? undefined : u.replace(/\/$/, '')
}

export async function analyzeReceipt(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const base = getReceiptScanApiUrl()
  if (!base) {
    return mockAnalyze()
  }
  return postAnalyze(base, req)
}

async function mockAnalyze(): Promise<AnalyzeResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
  return {
    name: 'Le Bistro Central',
    currency_code: 'USD',
    items: MOCK_ITEMS.map((i) => ({ ...i })),
  }
}

async function postAnalyze(base: string, req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const url = `${base}/analyze`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Receipt analysis failed (${res.status}): ${text}` : `Receipt analysis failed (${res.status})`,
    )
  }
  return res.json() as Promise<AnalyzeResponse>
}
