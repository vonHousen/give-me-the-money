import { afterEach, describe, expect, it, vi } from 'vitest'
import { getReceiptScanApiUrl, submitReceiptScan } from './receiptScanApi'

describe('getReceiptScanApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns undefined when unset or blank', () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '')
    expect(getReceiptScanApiUrl()).toBeUndefined()
  })

  it('returns trimmed URL when set', () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '  http://localhost:8000/scan  ')
    expect(getReceiptScanApiUrl()).toBe('http://localhost:8000/scan')
  })
})

describe('submitReceiptScan', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('uses mock without calling fetch when URL is empty', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.useFakeTimers()
    const p = submitReceiptScan({ image_base64: 'YQ==', mime_type: 'image/png' })
    await vi.advanceTimersByTimeAsync(400)
    const res = await p
    vi.useRealTimers()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.receipt_id).toBe('mock-receipt-id')
    expect(res.status).toBe('accepted')
  })

  it('POSTs JSON when URL is set', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', 'http://example.test/api/scan')
    const payload = { image_base64: 'YQ==', mime_type: 'image/png' }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ receipt_id: 'srv-1', status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await submitReceiptScan(payload)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.test/api/scan',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    )
    expect(res).toEqual({ receipt_id: 'srv-1', status: 'ok' })
  })

  it('throws on non-OK response', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', 'http://example.test/api/scan')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad', { status: 500 }))

    await expect(
      submitReceiptScan({ image_base64: 'YQ==', mime_type: 'image/png' }),
    ).rejects.toThrow(/500/)
  })
})
