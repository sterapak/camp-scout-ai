import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import CampgroundDetailPage from './CampgroundDetailPage'
import { campgrounds } from '../data/campgrounds'

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

describe('CampgroundDetailPage', () => {
  const campground = campgrounds[0]

  beforeEach(() => {
    postSummary.mockResolvedValue({
      status: 'success',
      campgroundId: campground.id,
      campgroundName: campground.name,
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
    })
  })

  function renderDetail(id) {
    return render(
      <MemoryRouter initialEntries={[`/campgrounds/${id}`]}>
        <Routes>
          <Route path="/campgrounds/:id" element={<CampgroundDetailPage />} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('shows campground details, source links, and AI summary', async () => {
    renderDetail(campground.id)

    expect(screen.getByText(campground.name)).toBeInTheDocument()
    expect(screen.getByText('Availability not connected')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('AI summary')).toBeInTheDocument()
    })

    expect(screen.getByText('Scenic campground overview.')).toBeInTheDocument()
    expect(postSummary).toHaveBeenCalledWith({ campgroundId: campground.id })
    expect(screen.getByRole('link', { name: /view official info/i })).toHaveAttribute(
      'href',
      campground.sourceUrl
    )
  })

  it('shows not found for unknown id', () => {
    renderDetail('unknown-campground')
    expect(screen.getByText('Campground not found.')).toBeInTheDocument()
  })
})
