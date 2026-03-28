import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Swipe from './Swipe'

it('renders a swipeable card with accept/decline buttons', () => {
  render(<MemoryRouter><Swipe /></MemoryRouter>)
  expect(screen.getByLabelText(/decline/i)).toBeInTheDocument()
  expect(screen.getByLabelText(/accept/i)).toBeInTheDocument()
})
