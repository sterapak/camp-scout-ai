import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { getAllAmenities, searchCampgrounds } from '../data/campgroundData'
import CampgroundsPage from './CampgroundsPage'

function renderCampgroundsPage(initialEntry = '/campgrounds') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/campgrounds" element={<CampgroundsPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CampgroundsPage', () => {
  it('renders real seed campgrounds', () => {
    renderCampgroundsPage()

    expect(screen.getByText('Browse Campgrounds')).toBeInTheDocument()
    expect(screen.getAllByText('Availability not connected').length).toBeGreaterThan(0)
    expect(screen.getByText(/Showing \d+ campground/)).toBeInTheDocument()
  })

  it('filters campgrounds by search query', async () => {
    const user = userEvent.setup()
    renderCampgroundsPage()

    const search = screen.getByRole('searchbox')
    await user.type(search, 'Yosemite')

    expect(screen.getByText(/Upper Pines Campground/)).toBeInTheDocument()
  })

  it('filters campgrounds by multiple amenities', async () => {
    const user = userEvent.setup()
    const [first, second] = getAllAmenities()
    renderCampgroundsPage()

    await user.click(screen.getByRole('checkbox', { name: first }))
    await user.click(screen.getByRole('checkbox', { name: second }))

    expect(screen.getByRole('checkbox', { name: first })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: second })).toBeChecked()
    expect(screen.getByLabelText('Selected amenities')).toHaveTextContent(first)
    expect(screen.getByLabelText('Selected amenities')).toHaveTextContent(second)
    expect(screen.getByText(/Clear amenities \(2\)/)).toBeInTheDocument()
  })

  it('removes an individual amenity chip', async () => {
    const user = userEvent.setup()
    const [first, second] = getAllAmenities()
    renderCampgroundsPage()

    await user.click(screen.getByRole('checkbox', { name: first }))
    await user.click(screen.getByRole('checkbox', { name: second }))
    await user.click(screen.getByRole('button', { name: `Remove ${first}` }))

    expect(screen.getByRole('checkbox', { name: first })).not.toBeChecked()
    expect(screen.getByRole('checkbox', { name: second })).toBeChecked()
    expect(screen.queryByRole('button', { name: `Remove ${first}` })).not.toBeInTheDocument()
    expect(screen.getByText(/Clear amenities \(1\)/)).toBeInTheDocument()
  })

  it('restores selected amenities from URL query params', () => {
    const [first, second] = getAllAmenities()
    renderCampgroundsPage(
      `/campgrounds?amenity=${encodeURIComponent(first)}&amenity=${encodeURIComponent(second)}`
    )

    expect(screen.getByRole('checkbox', { name: first })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: second })).toBeChecked()
    expect(screen.getByLabelText('Selected amenities')).toHaveTextContent(first)
    expect(screen.getByLabelText('Selected amenities')).toHaveTextContent(second)
  })

  it('shows empty state when no campgrounds match all selected amenities', async () => {
    const user = userEvent.setup()
    const allAmenities = getAllAmenities()
    let firstAmenity
    let secondAmenity

    for (let i = 0; i < allAmenities.length; i += 1) {
      for (let j = i + 1; j < allAmenities.length; j += 1) {
        if (searchCampgrounds({ amenities: [allAmenities[i], allAmenities[j]] }).length === 0) {
          firstAmenity = allAmenities[i]
          secondAmenity = allAmenities[j]
          break
        }
      }
      if (firstAmenity) break
    }

    expect(firstAmenity).toBeDefined()
    expect(secondAmenity).toBeDefined()

    renderCampgroundsPage()

    await user.click(screen.getByRole('checkbox', { name: firstAmenity }))
    await user.click(screen.getByRole('checkbox', { name: secondAmenity }))

    expect(
      screen.getByText('No campgrounds match your search. Try adjusting your filters.')
    ).toBeInTheDocument()
  })
})
