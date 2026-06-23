import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CampgroundsPage from './CampgroundsPage'
import { getAllRegions, getAllTags } from '../data/campgroundData'

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
    renderCampgroundsPage()

    const amenitiesFieldset = screen.getByLabelText('Filter by amenities')
    const checkboxes = within(amenitiesFieldset).getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(1)

    await user.click(checkboxes[0])
    await user.click(checkboxes[1])

    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).toBeChecked()
    expect(screen.getByText(/Clear amenities \(2\)/)).toBeInTheDocument()
  })

  it('filters campgrounds by multiple regions', async () => {
    const user = userEvent.setup()
    renderCampgroundsPage()

    const [firstRegion, secondRegion] = getAllRegions().slice(0, 2)
    const regionFieldset = screen.getByLabelText('Filter by region')

    await user.click(within(regionFieldset).getByRole('checkbox', { name: firstRegion }))
    await user.click(within(regionFieldset).getByRole('checkbox', { name: secondRegion }))

    expect(screen.getByLabelText('Selected regions')).toHaveTextContent(firstRegion)
    expect(screen.getByLabelText('Selected regions')).toHaveTextContent(secondRegion)
    expect(screen.getByText(/Clear regions \(2\)/)).toBeInTheDocument()
  })

  it('removes an individual region chip', async () => {
    const user = userEvent.setup()
    renderCampgroundsPage()

    const [firstRegion, secondRegion] = getAllRegions().slice(0, 2)
    const regionFieldset = screen.getByLabelText('Filter by region')

    await user.click(within(regionFieldset).getByRole('checkbox', { name: firstRegion }))
    await user.click(within(regionFieldset).getByRole('checkbox', { name: secondRegion }))
    await user.click(screen.getByRole('button', { name: `Remove ${firstRegion}` }))

    expect(screen.queryByRole('button', { name: `Remove ${firstRegion}` })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Remove ${secondRegion}` })).toBeInTheDocument()
    expect(screen.getByText(/Clear regions \(1\)/)).toBeInTheDocument()
  })

  it('filters campgrounds by multiple tags', async () => {
    const user = userEvent.setup()
    renderCampgroundsPage()

    const [firstTag, secondTag] = getAllTags().slice(0, 2)
    const tagFieldset = screen.getByLabelText('Filter by tag')

    await user.click(within(tagFieldset).getByRole('checkbox', { name: firstTag }))
    await user.click(within(tagFieldset).getByRole('checkbox', { name: secondTag }))

    expect(screen.getByLabelText('Selected tags')).toHaveTextContent(firstTag)
    expect(screen.getByLabelText('Selected tags')).toHaveTextContent(secondTag)
    expect(screen.getByText(/Clear tags \(2\)/)).toBeInTheDocument()
  })

  it('removes an individual tag chip', async () => {
    const user = userEvent.setup()
    renderCampgroundsPage()

    const [firstTag, secondTag] = getAllTags().slice(0, 2)
    const tagFieldset = screen.getByLabelText('Filter by tag')

    await user.click(within(tagFieldset).getByRole('checkbox', { name: firstTag }))
    await user.click(within(tagFieldset).getByRole('checkbox', { name: secondTag }))
    await user.click(screen.getByRole('button', { name: `Remove ${firstTag}` }))

    expect(screen.queryByRole('button', { name: `Remove ${firstTag}` })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Remove ${secondTag}` })).toBeInTheDocument()
    expect(screen.getByText(/Clear tags \(1\)/)).toBeInTheDocument()
  })

  it('restores selected filters from repeated URL params', () => {
    const [firstRegion, secondRegion] = getAllRegions().slice(0, 2)
    const [firstTag, secondTag] = getAllTags().slice(0, 2)
    const params = new URLSearchParams()
    params.append('region', firstRegion)
    params.append('region', secondRegion)
    params.append('amenity', 'Showers')
    params.append('amenity', 'Restrooms')
    params.append('tag', firstTag)
    params.append('tag', secondTag)

    renderCampgroundsPage(`/campgrounds?${params.toString()}`)

    expect(
      within(screen.getByLabelText('Filter by region')).getByRole('checkbox', { name: firstRegion })
    ).toBeChecked()
    expect(
      within(screen.getByLabelText('Filter by region')).getByRole('checkbox', { name: secondRegion })
    ).toBeChecked()
    expect(
      within(screen.getByLabelText('Filter by amenities')).getByRole('checkbox', { name: 'Showers' })
    ).toBeChecked()
    expect(
      within(screen.getByLabelText('Filter by amenities')).getByRole('checkbox', {
        name: 'Restrooms',
      })
    ).toBeChecked()
    expect(
      within(screen.getByLabelText('Filter by tag')).getByRole('checkbox', { name: firstTag })
    ).toBeChecked()
    expect(
      within(screen.getByLabelText('Filter by tag')).getByRole('checkbox', { name: secondTag })
    ).toBeChecked()
  })
})
