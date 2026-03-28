import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Review from './Review'

it('renders editable bill table and Share action without QR', () => {
  render(
    <MemoryRouter>
      <Review />
    </MemoryRouter>,
  )
  expect(screen.getByRole('heading', { name: /bill overview/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /^share$/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /add new row/i })).toBeInTheDocument()
  expect(screen.getAllByText(/^subtotal$/i).length).toBeGreaterThanOrEqual(1)
  expect(screen.getByText(/^total balance$/i)).toBeInTheDocument()
  expect(screen.getByDisplayValue('Garden Harvest Bowl')).toBeInTheDocument()
  expect(screen.queryByText(/share this code to split the bill/i)).not.toBeInTheDocument()
})
