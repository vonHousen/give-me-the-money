import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Swipe from './Swipe'
import { mockCreateSettlement, resetSettlementMockStore } from '@/lib/settlementMockStore'
import { markSettlementOwnerSession } from '@/lib/settlementSession'

describe('Swipe', () => {
  let settlementId: string

  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('VITE_SETTLEMENT_API_URL', '')
    resetSettlementMockStore()
    const res = mockCreateSettlement({
      name: 'Test bill',
      items: [{ name: 'Item one', price: 5, count: 1 }],
    })
    settlementId = res.id
    markSettlementOwnerSession(res.id, res.users[0].id)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders a swipeable card with accept/decline buttons', async () => {
    render(
      <MemoryRouter initialEntries={[`/swipe/${settlementId}`]}>
        <Routes>
          <Route path="/swipe/:settlementId" element={<Swipe />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(
      () => {
        expect(screen.getByLabelText(/decline/i)).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
    expect(screen.getByLabelText(/accept/i)).toBeInTheDocument()
    expect(screen.getByText('Item one')).toBeInTheDocument()
  })
})
