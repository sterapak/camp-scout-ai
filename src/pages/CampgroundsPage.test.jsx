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

  it('filters campgrounds by multiple amenities', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <CampgroundsPage />
      </MemoryRouter>
    )

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(1)

    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
    expect(screen.getByText(/Clear amenities \(2\)/)).toBeInTheDocument()
  })
})
