import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Scan from './Scan'

function stubMatchMedia(coarseMatches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: coarse)' ? coarseMatches : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

const mockAnalyzeReceipt = vi.fn()

vi.mock('@/lib/receiptScanApi', () => ({
  analyzeReceipt: (...args: unknown[]) => mockAnalyzeReceipt(...args),
}))

function ReviewStub() {
  return <div>Review stub</div>
}

describe('Scan', () => {
  beforeEach(() => {
    mockAnalyzeReceipt.mockReset()
    mockAnalyzeReceipt.mockResolvedValue({
      name: 'Test Restaurant',
      currency_code: 'USD',
      items: [{ name: 'Pizza', price: 12.5, count: 1 }],
    })
    stubMatchMedia(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders viewfinder; on fine pointer only Upload (no Take Photo)', () => {
    render(
      <MemoryRouter>
        <Scan />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/take photo/i)).not.toBeInTheDocument()
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('shows Take Photo when pointer is coarse', async () => {
    stubMatchMedia(true)
    render(
      <MemoryRouter>
        <Scan />
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByText(/take photo/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('enables Analyze after image upload and navigates with scan result', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/scan']}>
        <Routes>
          <Route path="/scan" element={<Scan />} />
          <Route path="/review" element={<ReviewStub />} />
        </Routes>
      </MemoryRouter>,
    )

    const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const file = new File([pngBytes], 'r.png', { type: 'image/png' })
    await user.upload(screen.getByTestId('scan-upload-input'), file)

    expect(screen.getByRole('img', { name: /receipt preview/i })).toBeInTheDocument()

    const analyze = screen.getByRole('button', { name: /analyze receipt/i })
    expect(analyze).not.toBeDisabled()

    await user.click(analyze)

    expect(mockAnalyzeReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        mime_type: 'image/png',
        image_base64: expect.any(String),
      }),
    )

    expect(await screen.findByText(/review stub/i)).toBeInTheDocument()
  })

  it('keeps Analyze disabled until a file is selected', () => {
    render(
      <MemoryRouter>
        <Scan />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /analyze receipt/i })).toBeDisabled()
  })
})
