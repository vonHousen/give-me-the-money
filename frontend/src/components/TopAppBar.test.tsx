import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { TopAppBar } from './TopAppBar'

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('TopAppBar', () => {
  it('renders the app title', () => {
    wrap(<TopAppBar />)
    expect(screen.getByText('Give Me The Money')).toBeInTheDocument()
  })

  it('renders a back button by default', () => {
    wrap(<TopAppBar />)
    expect(screen.getByLabelText('Go back')).toBeInTheDocument()
  })

  it('hides back button when hideBack is true', () => {
    wrap(<TopAppBar hideBack />)
    expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument()
  })

  it('renders a right action when provided', () => {
    wrap(<TopAppBar action={<button>Menu</button>} />)
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })
})
