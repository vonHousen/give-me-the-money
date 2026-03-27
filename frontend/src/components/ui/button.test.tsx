import { render, screen } from '@testing-library/react'
import { Button } from './button'

describe('Button pill variant', () => {
  it('renders with rounded-full class when variant is pill', () => {
    render(<Button variant="pill">Pay Now</Button>)
    const btn = screen.getByRole('button', { name: 'Pay Now' })
    expect(btn.className).toMatch(/rounded-full/)
  })

  it('renders with pill-ghost variant', () => {
    render(<Button variant="pill-ghost">Cancel</Button>)
    const btn = screen.getByRole('button', { name: 'Cancel' })
    expect(btn.className).toMatch(/rounded-full/)
  })
})
