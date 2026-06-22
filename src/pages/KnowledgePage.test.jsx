import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import KnowledgePage from './KnowledgePage'

describe('KnowledgePage', () => {
  it('renders knowledge documents', () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Knowledge Library')).toBeInTheDocument()
    expect(screen.getByText(/Showing \d+ document/)).toBeInTheDocument()
    expect(screen.getByText('Upper Pines Campground Overview')).toBeInTheDocument()
  })

  it('filters documents by search query', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    )

    const search = screen.getByRole('searchbox')
    await user.type(search, 'bear')

    expect(screen.getByText(/Showing \d+ document/)).toBeInTheDocument()
    const bearDocs = screen.getAllByText(/bear/i)
    expect(bearDocs.length).toBeGreaterThan(0)
  })

  it('displays source links', () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    )

    const sourceLinks = screen.getAllByText('View source')
    expect(sourceLinks.length).toBeGreaterThan(0)
    expect(sourceLinks[0].closest('a')).toHaveAttribute('href', expect.stringMatching(/^https:\/\//))
  })

  it('links back to campground', () => {
    render(
      <MemoryRouter>
        <KnowledgePage />
      </MemoryRouter>,
    )

    const campgroundLinks = screen.getAllByRole('link', { name: /Upper Pines Campground/ })
    const detailLink = campgroundLinks.find((link) =>
      link.getAttribute('href') === '/campgrounds/yosemite-upper-pines',
    )
    expect(detailLink).toBeDefined()
  })
})
