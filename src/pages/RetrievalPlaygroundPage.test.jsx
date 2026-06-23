import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RetrievalPlaygroundPage from './RetrievalPlaygroundPage'

describe('RetrievalPlaygroundPage', () => {
  it('renders the playground heading and empty context preview', () => {
    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>
    )

    expect(screen.getByText('Knowledge Retrieval Playground')).toBeInTheDocument()
    expect(screen.getByText('Prepared LLM context')).toBeInTheDocument()
    expect(
      screen.getByText(/Enter a question and retrieve knowledge to preview/)
    ).toBeInTheDocument()
  })

  it('retrieves and displays knowledge documents for a question', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>
    )

    await user.type(
      screen.getByLabelText('Enter a question to retrieve knowledge'),
      'bear food storage'
    )
    await user.click(screen.getByRole('button', { name: 'Retrieve knowledge' }))

    expect(screen.getByText(/Retrieved \d+ document/)).toBeInTheDocument()
    expect(screen.getByText('Retrieved sources')).toBeInTheDocument()
    expect(screen.getByText('Source 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Prepared LLM context preview')).toHaveTextContent(
      'User question: bear food storage'
    )
  })

  it('shows no results message when nothing matches', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>
    )

    await user.type(
      screen.getByLabelText('Enter a question to retrieve knowledge'),
      'qqqqqqqqqqqq'
    )
    await user.click(screen.getByRole('button', { name: 'Retrieve knowledge' }))

    expect(screen.getByText('No matching documents found.')).toBeInTheDocument()
    expect(screen.getByLabelText('Prepared LLM context preview')).toHaveTextContent(
      'No matching knowledge documents were found.'
    )
  })
})
