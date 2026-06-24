import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RetrievalPlaygroundPage from './RetrievalPlaygroundPage'

jest.mock('../api/askClient.js', () => ({
  AskApiError: class AskApiError extends Error {
    constructor(message, statusCode) {
      super(message)
      this.name = 'AskApiError'
      this.statusCode = statusCode
    }
  },
  postAsk: jest.fn(),
}))

import { postAsk } from '../api/askClient.js'

describe('RetrievalPlaygroundPage', () => {
  beforeEach(() => {
    jest.mocked(postAsk).mockReset()
  })

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

  it('generates and displays an answer from the ask API', async () => {
    jest.mocked(postAsk).mockResolvedValue({
      status: 'success',
      answer: 'Store all scented items in bear-resistant lockers.',
      citations: [
        {
          id: 'doc-1',
          title: 'Bear Safety Rules',
          sourceName: 'NPS',
          sourceUrl: 'https://example.com/bears',
          campgroundName: 'Upper Pines Campground',
          documentType: 'regulation',
        },
      ],
      model: 'gpt-4o-mini',
    })

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
    await user.click(screen.getByRole('button', { name: 'Generate Answer' }))

    expect(postAsk).toHaveBeenCalledWith({
      question: 'bear food storage',
      campgroundId: '',
    })

    await waitFor(() => {
      expect(screen.getByText('Store all scented items in bear-resistant lockers.')).toBeInTheDocument()
    })
    expect(screen.getByText('Model: gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('[1] Bear Safety Rules')).toBeInTheDocument()
  })

  it('shows loading and error states for answer generation', async () => {
    let resolveAsk
    jest.mocked(postAsk).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAsk = resolve
        })
    )

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
    await user.click(screen.getByRole('button', { name: 'Generate Answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Generating answer')
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled()

    resolveAsk({
      status: 'success',
      answer: 'Done',
      citations: [],
      model: 'gpt-4o-mini',
    })

    await waitFor(() => {
      expect(screen.getByText('Done')).toBeInTheDocument()
    })

    jest.mocked(postAsk).mockRejectedValue(
      new (class extends Error {
        constructor(message, statusCode) {
          super(message)
          this.name = 'AskApiError'
          this.statusCode = statusCode
        }
      })('Answer generation failed. Please try again.', 502)
    )

    await user.click(screen.getByRole('button', { name: 'Generate Answer' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Answer generation failed. Please try again.'
      )
    })
  })

  it('keeps retrieval debug panels below the generated answer', async () => {
    jest.mocked(postAsk).mockResolvedValue({
      status: 'success',
      answer: 'Generated answer text.',
      citations: [],
      model: 'gpt-4o-mini',
    })

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
    await user.click(screen.getByRole('button', { name: 'Generate Answer' }))
    await user.click(screen.getByRole('button', { name: 'Retrieve knowledge' }))

    await waitFor(() => {
      expect(screen.getByText('Generated answer text.')).toBeInTheDocument()
    })

    const generatedAnswer = screen.getByLabelText('Generated answer')
    const retrievedSources = screen.getByText('Retrieved sources')
    const contextPreview = screen.getByText('Prepared LLM context')

    expect(
      generatedAnswer.compareDocumentPosition(retrievedSources) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(
      retrievedSources.compareDocumentPosition(contextPreview) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})
