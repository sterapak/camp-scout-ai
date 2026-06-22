import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CampgroundDetailPage from './CampgroundDetailPage'
import { campgrounds } from '../data/campgrounds'

describe('CampgroundDetailPage', () => {
  const campground = campgrounds[0]

  function renderDetail(id) {
    return render(
      <MemoryRouter initialEntries={[`/campgrounds/${id}`]}>
        <Routes>
          <Route path="/campgrounds/:id" element={<CampgroundDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('shows campground details and source links', () => {
    renderDetail(campground.id)

    expect(screen.getByText(campground.name)).toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view official info/i })).toHaveAttribute(
      'href',
      campground.sourceUrl
    )
    expect(screen.getByRole('link', { name: /reservation portal/i })).toHaveAttribute(
      'href',
      campground.reservationUrl
    )
  })

  it('shows not found for unknown id', () => {
    renderDetail('unknown-campground')
    expect(screen.getByText('Campground not found.')).toBeInTheDocument()
  })
})
