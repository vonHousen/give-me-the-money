import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createSettlement,
  finishSettlement,
  getSettlementApiBaseUrl,
  getSettlementStatus,
  joinSettlement,
  markSwipeComplete,
  recordItemClaim,
  resetSettlementMockStore,
} from './settlementApi'

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
    resetSettlementMockStore()
  })

  const body = {
    name: 'Test',
    items: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        name: 'A',
        price: 10.5,
        quantity: 1,
        unitPrice: 10.5,
      },
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
    expect(res.items[0].name).toBe('A')
    expect(res.items[0].price).toBe(10.5)
    expect(res.items[0].quantity).toBe(1)
    expect(res.items[0].unitPrice).toBe(10.5)
    expect(res.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )
    expect(res.users).toHaveLength(1)
    expect(res.users[0].name).toBe('Owner')
  })

  it('POSTs JSON to {base}/settlements with backend-compatible shape when URL is set', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    const backendResponse = {
      id: '00000000-0000-0000-0000-000000000099',
      name: 'Test',
      items: [{ id: 'item-1', name: 'A', price: 10.5, count: 1 }],
      users: [],
      assignments: {},
      claims: {},
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(backendResponse), {
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
        body: JSON.stringify({
          name: 'Test',
          items: [{ name: 'A', price: 10.5, count: 1 }],
          owner_name: 'Owner',
        }),
      }),
    )
    expect(res.id).toBe('00000000-0000-0000-0000-000000000099')
    expect(res.items[0].quantity).toBe(1)
    expect(res.items[0].unitPrice).toBe(10.5)
  })

  it('throws on non-OK response', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('bad', { status: 500 }))

    await expect(createSettlement(body)).rejects.toThrow(/500/)
  })
})

describe('joinSettlement with real API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('sends PUT with user_name and parses participant_id', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    const backendResponse = {
      participant_id: 'user-42',
      settlement: {
        id: 'settle-1',
        name: 'Dinner',
        items: [{ id: 'i1', name: 'Pizza', price: 10, count: 1 }],
        users: [{ id: 'user-42', name: 'Sam', is_owner: false, swipe_finished: false }],
        assignments: {},
        claims: {},
      },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(backendResponse), { status: 200 }),
    )

    const res = await joinSettlement('settle-1', 'Sam')

    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://example.test/settlements/settle-1/join',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ user_name: 'Sam', item_ids: [] }),
      }),
    )
    expect(res.participantId).toBe('user-42')
    expect(res.settlement.id).toBe('settle-1')
  })
})

describe('getSettlementStatus with real API', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('parses backend snake_case participants into camelCase', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', 'http://example.test')
    const backendResponse = {
      participants: [
        { id: 'u1', name: 'Alice', is_owner: true, swipe_finished: true },
        { id: 'u2', name: 'Bob', is_owner: false, swipe_finished: false },
      ],
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(backendResponse), { status: 200 }),
    )

    const res = await getSettlementStatus('s1')

    expect(res.participants).toHaveLength(2)
    expect(res.participants[0]).toEqual({
      id: 'u1',
      name: 'Alice',
      isOwner: true,
      swipeFinished: true,
    })
    expect(res.participants[1]).toEqual({
      id: 'u2',
      name: 'Bob',
      isOwner: false,
      swipeFinished: false,
    })
  })
})

describe('mock settlement lifecycle', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetSettlementMockStore()
  })

  it('join adds status participant and finish returns summary', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    const created = await createSettlement({
      name: 'Cafe',
      items: [{ id: 'x', name: 'Coffee', price: 4, quantity: 1, unitPrice: 4 }],
    })
    const { participantId } = await joinSettlement(created.id, 'Sam')
    expect(participantId).toMatch(/^[0-9a-f-]{36}$/i)

    const status = await getSettlementStatus(created.id)
    expect(status.participants).toHaveLength(2)
    expect(status.participants.some((x) => x.name === 'Sam' && !x.isOwner)).toBe(true)

    await markSwipeComplete(created.id, created.users[0].id)
    await markSwipeComplete(created.id, participantId)

    const { summary } = await finishSettlement(created.id)
    expect(summary.venueName).toBe('Cafe')
    expect(summary.people.some((x) => x.isOwner)).toBe(true)
  })

  it('finish allocates by claimed quantity per person', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    const created = await createSettlement({
      name: 'Bar',
      items: [{ id: 'x', name: 'Beer', price: 50, quantity: 5, unitPrice: 10 }],
    })
    const beerItem = created.items[0]
    const { participantId } = await joinSettlement(created.id, 'Sam')
    const ownerId = created.users[0].id
    await recordItemClaim(created.id, ownerId, beerItem.id, 4)
    await recordItemClaim(created.id, participantId, beerItem.id, 1)
    await markSwipeComplete(created.id, ownerId)
    await markSwipeComplete(created.id, participantId)
    const { summary } = await finishSettlement(created.id)
    const owner = summary.people.find((p) => p.id === ownerId)
    const guest = summary.people.find((p) => p.id === participantId)
    const ownerBeer = owner?.items.find((i) => i.name.includes('Beer'))
    const guestBeer = guest?.items.find((i) => i.name.includes('Beer'))
    expect(ownerBeer?.price).toBe(40)
    expect(guestBeer?.price).toBe(10)
  })

  it('finish splits price proportionally when claims overlap', async () => {
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    const created = await createSettlement({
      name: 'Bar',
      items: [{ id: 'x', name: 'Beer', price: 50, quantity: 5, unitPrice: 10 }],
    })
    const beerItem = created.items[0]
    const { participantId } = await joinSettlement(created.id, 'Sam')
    const ownerId = created.users[0].id
    await recordItemClaim(created.id, ownerId, beerItem.id, 4)
    await recordItemClaim(created.id, participantId, beerItem.id, 4)
    await markSwipeComplete(created.id, ownerId)
    await markSwipeComplete(created.id, participantId)
    const { summary } = await finishSettlement(created.id)
    const owner = summary.people.find((p) => p.id === ownerId)
    const guest = summary.people.find((p) => p.id === participantId)
    expect(owner?.items[0].price).toBe(25)
    expect(guest?.items[0].price).toBe(25)
  })
})
