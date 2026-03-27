import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Scan from './Scan'

it('renders viewfinder and action buttons', () => {
  render(<MemoryRouter><Scan /></MemoryRouter>)
  expect(screen.getByText(/take photo/i)).toBeInTheDocument()
  expect(screen.getByText(/upload/i)).toBeInTheDocument()
})
