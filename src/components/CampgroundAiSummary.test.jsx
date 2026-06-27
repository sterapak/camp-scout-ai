import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CampgroundAiSummary from './CampgroundAiSummary'

describe('CampgroundAiSummary', () => {
  it('shows a loading skeleton while generating', () => {
    render(<CampgroundAiSummary status="loading" />)
    expect(screen.getByRole('status')).toHaveTextContent('Summarizing official sources')
  })

  it('renders Google Maps-style summary sections with citations', async () => {
    const user = userEvent.setup()

    render(
      <CampgroundAiSummary
        status="success"
        confidence="high"
        sections={{
          overview: 'Scenic valley camping near Yosemite landmarks.',
          amenities: 'Restrooms and fire rings available.',
          restrictions: 'Store food in bear-resistant lockers.',
          reservations: 'Reservations required during peak season.',
          highlights: 'Close to trailheads and shuttle access.',
        }}
        sources={[
          {
            sourceName: 'National Park Service',
            sourceUrl: 'https://example.com/nps',
            authorityRank: 1,
          },
        ]}
        citations={[
          {
            id: 'doc-1',
            title: 'Campground Rules',
            sourceName: 'National Park Service',
            sourceUrl: 'https://example.com/nps',
            documentType: 'rules',
          },
        ]}
      />
    )

    expect(screen.getByText('AI summary')).toBeInTheDocument()
    expect(screen.getByText('High confidence')).toBeInTheDocument()
    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Scenic valley camping near Yosemite landmarks.')).toBeInTheDocument()
    expect(screen.getByText('National Park Service')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show citations' }))
    expect(screen.getByText('[1] Campground Rules')).toBeInTheDocument()
  })
})
