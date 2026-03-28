import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Review from './Review'

it('renders bill items and QR section', () => {
  render(<MemoryRouter><Review /></MemoryRouter>)
  expect(screen.getByText(/lock & share/i)).toBeInTheDocument()
  expect(screen.getByText(/share this code/i)).toBeInTheDocument()
})
