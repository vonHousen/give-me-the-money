import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Summary from './Summary'

it('renders total amount and person split cards', () => {
  render(<MemoryRouter><Summary /></MemoryRouter>)
  expect(screen.getByText(/final split/i)).toBeInTheDocument()
  expect(screen.getByText(/done/i)).toBeInTheDocument()
})
