import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'

it('renders without crashing and shows primary CTA', () => {
  render(<MemoryRouter><Home /></MemoryRouter>)
  expect(screen.getByText(/scan a receipt/i)).toBeInTheDocument()
  expect(screen.getByText(/join a split/i)).toBeInTheDocument()
})
