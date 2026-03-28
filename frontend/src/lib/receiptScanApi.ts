export type ReceiptScanRequest = {
  image_base64: string
  mime_type: string
}

export type ReceiptScanResponse = {
  receipt_id: string
  status: string
}

const MOCK_DELAY_MS = 300

/** Empty or unset → use built-in mock (no HTTP). */
export function getReceiptScanApiUrl(): string | undefined {
  const raw = import.meta.env.VITE_RECEIPT_SCAN_API_URL
  if (typeof raw !== 'string') return undefined
  const u = raw.trim()
  return u === '' ? undefined : u
}

export async function submitReceiptScan(req: ReceiptScanRequest): Promise<ReceiptScanResponse> {
  const url = getReceiptScanApiUrl()
  if (!url) {
    return mockReceiptScan()
  }
  return postReceiptScan(url, req)
}

async function mockReceiptScan(): Promise<ReceiptScanResponse> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS))
  return {
    receipt_id: 'mock-receipt-id',
    status: 'accepted',
  }
}

async function postReceiptScan(url: string, req: ReceiptScanRequest): Promise<ReceiptScanResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      text ? `Receipt scan failed (${res.status}): ${text}` : `Receipt scan failed (${res.status})`,
    )
  }
  return res.json() as Promise<ReceiptScanResponse>
}
