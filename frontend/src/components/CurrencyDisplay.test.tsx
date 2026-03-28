import { render, screen } from '@testing-library/react'
import { CurrencyDisplay } from './CurrencyDisplay'

describe('CurrencyDisplay', () => {
  it('renders whole and decimal parts of an amount', () => {
    render(<CurrencyDisplay amount={428.5} />)
    expect(screen.getByText('428')).toBeInTheDocument()
    expect(screen.getByText('.50')).toBeInTheDocument()
    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('pads single-digit cents to two digits', () => {
    render(<CurrencyDisplay amount={12.05} />)
    expect(screen.getByText('.05')).toBeInTheDocument()
  })

  it('derives symbol from an ISO currency code', () => {
    render(<CurrencyDisplay amount={10} currencyCode="EUR" />)
    expect(screen.getByText(/€/)).toBeInTheDocument()
  })

  it('defaults to USD when no currencyCode is provided', () => {
    render(<CurrencyDisplay amount={5} />)
    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('handles floating point edge cases (amount with 3 decimal places)', () => {
    render(<CurrencyDisplay amount={10.999} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    const centsEl = screen.getByText(/^\.\d{2}$/)
    expect(centsEl.textContent).not.toBe('.100')
  })
})
