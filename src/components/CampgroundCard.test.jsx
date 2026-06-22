import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CampgroundCard from './CampgroundCard'
import { campgrounds } from '../data/campgrounds'

describe('CampgroundCard', () => {
  const campground = campgrounds[0]

  it('renders campground info and availability notice', () => {
    render(
      <MemoryRouter>
        <CampgroundCard campground={campground} />
      </MemoryRouter>
    )

    expect(screen.getByText(campground.name)).toBeInTheDocument()
    expect(screen.getByText(campground.region)).toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /official source/i })).toHaveAttribute(
      'href',
      campground.sourceUrl
    )
  })
})
