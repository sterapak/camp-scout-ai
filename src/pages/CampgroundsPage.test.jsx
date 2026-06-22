import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import CampgroundsPage from './CampgroundsPage'

describe('CampgroundsPage', () => {
  it('renders real seed campgrounds', () => {
    render(
      <MemoryRouter>
        <CampgroundsPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Browse Campgrounds')).toBeInTheDocument()
    expect(screen.getAllByText('Availability not connected').length).toBeGreaterThan(0)
    expect(screen.getByText(/Showing \d+ campground/)).toBeInTheDocument()
  })

  it('filters campgrounds by search query', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CampgroundsPage />
      </MemoryRouter>
    )

    const search = screen.getByRole('searchbox')
    await user.type(search, 'Yosemite')

    expect(screen.getByText(/Upper Pines Campground/)).toBeInTheDocument()
  })
})
