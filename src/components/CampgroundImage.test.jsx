import { fireEvent, render, screen } from '@testing-library/react'
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

  // Regression: five of nine curated image urls were dead as of 2026-07-19 (NPS,
  // two Forest Service, EID). The page's Recreation.gov fallback only fired when a
  // curated image was ABSENT, so a present-but-broken url rendered "image not
  // available" forever. The parent needs to hear about the failure to recover.
  it('reports a load failure so the parent can fall back to an official photo', () => {
    const onLoadError = jest.fn()
    render(
      <CampgroundImage
        campgroundName="Upper Pines Campground (Yosemite NP)"
        onLoadError={onLoadError}
        image={{
          url: 'https://www.nps.gov/yose/planyourvisit/images/pines-campgrounds-map.jpg',
          altText: 'Map of Upper Pines Campground in Yosemite Valley',
          sourceName: 'National Park Service',
          priority: 1,
        }}
      />,
    )

    fireEvent.error(screen.getByRole('img'))

    expect(onLoadError).toHaveBeenCalledTimes(1)
    // and it still degrades gracefully on its own
    expect(screen.getByText('Official image not available')).toBeInTheDocument()
  })

  it('does not blow up when a broken image has no onLoadError handler', () => {
    render(
      <CampgroundImage
        campgroundName="Test"
        image={{ url: 'https://example.test/gone.jpg', altText: 'x', sourceName: 'Test', priority: 1 }}
      />,
    )

    expect(() => fireEvent.error(screen.getByRole('img'))).not.toThrow()
    expect(screen.getByText('Official image not available')).toBeInTheDocument()
  })
})
