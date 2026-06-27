import { render, screen } from '@testing-library/react'
import CampgroundImage from './CampgroundImage'

describe('CampgroundImage', () => {
  it('renders a linked official image with alt text and source attribution', () => {
    render(
      <CampgroundImage
        campgroundName="Upper Pines Campground (Yosemite NP)"
        image={{
          url: 'https://www.nps.gov/yose/planyourvisit/images/pines-campgrounds-map.jpg',
          altText: 'Map of Upper Pines Campground in Yosemite Valley',
          sourceName: 'National Park Service',
          sourceUrl: 'https://www.nps.gov/yose/planyourvisit/pinescampgrounds.htm',
          priority: 1,
        }}
      />,
    )

    const image = screen.getByRole('img', {
      name: 'Map of Upper Pines Campground in Yosemite Valley',
    })
    expect(image).toHaveAttribute(
      'src',
      'https://www.nps.gov/yose/planyourvisit/images/pines-campgrounds-map.jpg',
    )

    expect(screen.getByText('National Park Service')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /official source/i })[0]).toHaveAttribute(
      'href',
      'https://www.nps.gov/yose/planyourvisit/pinescampgrounds.htm',
    )
  })

  it('shows a clean placeholder when no image is available', () => {
    render(
      <CampgroundImage
        campgroundName="Eagle Point Campground (Emerald Bay SP)"
        image={null}
      />,
    )

    expect(screen.getByLabelText(/no official image available/i)).toBeInTheDocument()
    expect(screen.getByText('Official image not available')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
