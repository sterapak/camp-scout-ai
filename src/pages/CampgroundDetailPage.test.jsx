import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CampgroundDetailPage from './CampgroundDetailPage'
import { campgrounds } from '../data/campgrounds'
import { getPrimaryImage } from '../data/campgroundData'

jest.mock('../api/summaryClient.js', () => ({
  postSummary: jest.fn(),
  SummaryApiError: class SummaryApiError extends Error {
    constructor(message, statusCode) {
      super(message)
      this.statusCode = statusCode
    }
  },
}))

import { postSummary } from '../api/summaryClient.js'

const summarySuccessPayload = {
  status: 'success',
  sections: {
    overview: 'Scenic campground overview.',
    amenities: 'Restrooms available.',
    restrictions: 'Follow posted rules.',
    reservations: 'Reserve online.',
    highlights: 'Near popular trails.',
  },
  citations: [
    {
      id: 'doc-1',
      title: 'Campground Description',
      sourceName: 'National Park Service',
      sourceUrl: 'https://example.com',
      documentType: 'description',
    },
  ],
  sources: [
    {
      sourceName: 'National Park Service',
      sourceUrl: 'https://example.com',
      authorityRank: 1,
    },
  ],
  confidence: 'high',
  model: 'fake-model',
  generatedAt: '2026-06-27T15:30:00.000Z',
  knowledgeSnapshot: {
    id: 'abc123',
    contentHash: 'abc123',
    lastFetchedAt: '2026-06-25T17:52:19.161Z',
    sourceName: 'National Park Service',
  },
}

describe('CampgroundDetailPage', () => {
  const sparseCampground = campgrounds.find((campground) => campground.id === 'emerald-bay-eagle-point')
  const yosemite = campgrounds.find((campground) => campground.id === 'yosemite-upper-pines')
  const silverLake = campgrounds.find((campground) => campground.id === 'silver-lake-west')
  const iceHouse = campgrounds.find((campground) => campground.id === 'ice-house-reservoir')

  beforeEach(() => {
    postSummary.mockImplementation(({ campgroundId }) =>
      Promise.resolve({
        ...summarySuccessPayload,
        campgroundId,
        campgroundName: campgrounds.find((campground) => campground.id === campgroundId)?.name ?? '',
      }),
    )
  })

  function renderDetail(id) {
    return render(
      <MemoryRouter initialEntries={[`/campgrounds/${id}`]}>
        <Routes>
          <Route path="/campgrounds/:id" element={<CampgroundDetailPage />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('shows sparse campground details with image placeholder and generated timestamp', async () => {
    renderDetail(sparseCampground.id)

    expect(screen.getByText(sparseCampground.name)).toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()
    expect(screen.getByText('Official image not available')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('AI summary')).toBeInTheDocument()
    })

    expect(screen.getByText(/Generated on/i)).toBeInTheDocument()
    expect(postSummary).toHaveBeenCalledWith({ campgroundId: sparseCampground.id })
  })

  it('shows Yosemite with official image and AI summary metadata', async () => {
    renderDetail(yosemite.id)

    await waitFor(() => {
      expect(screen.getByText('AI summary')).toBeInTheDocument()
    })

    const primaryImage = getPrimaryImage(yosemite)
    expect(
      screen.getByRole('img', { name: primaryImage.altText }),
    ).toHaveAttribute('src', primaryImage.url)
    expect(screen.getByText(/Knowledge snapshot from National Park Service/i)).toBeInTheDocument()
  })

  it('shows Silver Lake West with USFS-backed primary image', async () => {
    renderDetail(silverLake.id)

    await waitFor(() => {
      expect(screen.getByText('AI summary')).toBeInTheDocument()
    })

    const primaryImage = getPrimaryImage(silverLake)
    expect(screen.getByRole('img', { name: primaryImage.altText })).toBeInTheDocument()
    expect(screen.getByText('U.S. Forest Service')).toBeInTheDocument()
  })

  it('shows Ice House with official image linked to source page', async () => {
    renderDetail(iceHouse.id)

    await waitFor(() => {
      expect(screen.getByText('AI summary')).toBeInTheDocument()
    })

    const primaryImage = getPrimaryImage(iceHouse)
    expect(screen.getAllByRole('link', { name: /official source/i })[0]).toHaveAttribute(
      'href',
      primaryImage.sourceUrl,
    )
  })

  it('shows not found for unknown id', () => {
    renderDetail('unknown-campground')
    expect(screen.getByText('Campground not found.')).toBeInTheDocument()
  })
})
