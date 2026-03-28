import { afterEach, describe, expect, it, vi } from 'vitest'
import { analyzeReceipt, getReceiptScanApiUrl } from './receiptScanApi'

describe('getReceiptScanApiUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns undefined when unset or blank', () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '')
    expect(getReceiptScanApiUrl()).toBeUndefined()
  })

  it('returns trimmed URL without trailing slash when set', () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '  http://localhost:8000/  ')
    expect(getReceiptScanApiUrl()).toBe('http://localhost:8000')
  })
})

describe('analyzeReceipt', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('uses mock without calling fetch when URL is empty', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.useFakeTimers()
    const p = analyzeReceipt({ image_base64: 'YQ==', mime_type: 'image/png' })
    await vi.advanceTimersByTimeAsync(400)
    const res = await p
    vi.useRealTimers()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.name).toBe('Le Bistro Central')
    expect(res.currency_code).toBe('USD')
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.items[0]).toHaveProperty('name')
    expect(res.items[0]).toHaveProperty('price')
    expect(res.items[0]).toHaveProperty('count')
  })

  it('POSTs JSON to {base}/analyze when URL is set', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', 'http://example.test')
    const payload = { image_base64: 'YQ==', mime_type: 'image/png' }
    const backendResponse = {
      name: 'Pizzeria',
      currency_code: 'PLN',
      items: [{ name: 'Pizza', price: 12.5, count: 1 }],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(backendResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await analyzeReceipt(payload)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.test/analyze',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    )
    expect(res).toEqual(backendResponse)
  })

  it('throws on non-OK response', async () => {
    vi.stubEnv('VITE_RECEIPT_SCAN_API_URL', 'http://example.test')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad', { status: 500 }))

    await expect(
      analyzeReceipt({ image_base64: 'YQ==', mime_type: 'image/png' }),
    ).rejects.toThrow(/500/)
  })
})
