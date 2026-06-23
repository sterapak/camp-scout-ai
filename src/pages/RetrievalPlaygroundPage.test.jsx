import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RetrievalPlaygroundPage from './RetrievalPlaygroundPage'

describe('RetrievalPlaygroundPage', () => {
  it('renders the playground heading and search form', () => {
    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Retrieval Playground')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter a retrieval query/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('displays retrieval results with similarity scores and source metadata', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>,
    )

    const input = screen.getByPlaceholderText(/Enter a retrieval query/i)
    await user.type(input, 'bear food storage')
    await user.click(screen.getByRole('button', { name: /search/i }))

    const articles = await screen.findAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)
    expect(screen.getAllByText('Similarity').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Source:/).length).toBeGreaterThan(0)
  })

  it('does not display AI-generated answers', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>,
    )

    const input = screen.getByPlaceholderText(/Enter a retrieval query/i)
    await user.type(input, 'reservation policy')
    await user.click(screen.getByRole('button', { name: /search/i }))

    const articles = await screen.findAllByRole('article')
    expect(articles.length).toBeGreaterThan(0)

    expect(screen.queryByText(/^AI answer:/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/generated response/i)).not.toBeInTheDocument()
  })
})
