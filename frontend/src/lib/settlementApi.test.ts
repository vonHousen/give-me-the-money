import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSettlement, getSettlementApiBaseUrl } from './settlementApi'

describe('getSettlementApiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns undefined when unset or blank', () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    expect(getSettlementApiBaseUrl()).toBeUndefined()
  })

  it('returns trimmed URL without trailing slash when set', () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '  http://localhost:8000/  ')
    expect(getSettlementApiBaseUrl()).toBe('http://localhost:8000')
  })
})

describe('createSettlement', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  const body = {
    name: 'Test',
    items: [
      { id: '00000000-0000-0000-0000-000000000001', name: 'A', price: 10.5 },
    ],
  }

  it('uses mock without calling fetch when URL is empty', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    vi.useFakeTimers()
    const p = createSettlement(body)
    await vi.advanceTimersByTimeAsync(400)
    const res = await p
    vi.useRealTimers()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.name).toBe('Test')
    expect(res.items).toEqual(body.items)
    expect(res.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
  })

  it('POSTs JSON to {base}/settlements when URL is set', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    const created = {
      id: '00000000-0000-0000-0000-000000000099',
      name: 'Test',
      items: body.items,
      users: [],
      assignments: {},
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(created), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const res = await createSettlement(body)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.test/settlements',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
    )
    expect(res).toEqual(created)
  })

  it('throws on non-OK response', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad', { status: 500 }))

    await expect(createSettlement(body)).rejects.toThrow(/500/)
  })
})
