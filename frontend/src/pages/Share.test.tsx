import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Share from './Share'
import { buildJoinSettlementUrl } from '@/lib/joinSettlementUrl'

describe('Share', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders QR section with join URL for settlement id', () => {
    const id = '00000000-0000-0000-0000-00000000ab12'
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://gmtm.app')

    render(
      <MemoryRouter initialEntries={[`/share/${id}`]}>
        <Routes>
          <Route path="/share/:settlementId" element={<Share />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: /share bill/i })).toBeInTheDocument()
    expect(screen.getByText(buildJoinSettlementUrl(id))).toBeInTheDocument()
    expect(screen.getByText(/share this code to split the bill/i)).toBeInTheDocument()
  })
})
