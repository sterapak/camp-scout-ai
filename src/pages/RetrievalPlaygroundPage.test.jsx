import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import * as askClient from '../api/askClient.js'
import RetrievalPlaygroundPage from './RetrievalPlaygroundPage'

describe('RetrievalPlaygroundPage', () => {
  beforeEach(() => {
    jest.spyOn(askClient, 'askQuestion').mockResolvedValue({
      status: 'success',
      answer: 'Store all scented items in bear-proof lockers.',
      citations: [
        {
          id: 'yosemite-upper-pines-rules',
          title: 'Food Storage Rules',
          sourceName: 'National Park Service',
          sourceUrl: 'https://www.nps.gov/yose/planyourvisit/bears.htm',
          campgroundName: 'Upper Pines Campground',
          documentType: 'rules',
        },
      ],
      model: 'gpt-4o-mini',
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
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
    expect(screen.getByRole('button', { name: 'Generate answer' })).toBeInTheDocument()
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

  it('disables Generate answer when the question is empty', () => {
    render(
      <MemoryRouter>
        <RetrievalPlaygroundPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: 'Generate answer' })).toBeDisabled()
  })

  it('posts to /api/ask and renders the generated answer, citations, and model', async () => {
    let resolveAsk
    askClient.askQuestion.mockImplementation(
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
    await user.click(screen.getByRole('button', { name: 'Generate answer' }))

    expect(screen.getByRole('status')).toHaveTextContent('Generating answer…')
    expect(screen.getByRole('button', { name: 'Generating answer…' })).toBeDisabled()

    resolveAsk({
      status: 'success',
      answer: 'Store all scented items in bear-proof lockers.',
      citations: [
        {
          id: 'yosemite-upper-pines-rules',
          title: 'Food Storage Rules',
          sourceName: 'National Park Service',
          sourceUrl: 'https://www.nps.gov/yose/planyourvisit/bears.htm',
          campgroundName: 'Upper Pines Campground',
          documentType: 'rules',
        },
      ],
      model: 'gpt-4o-mini',
    })

    await waitFor(() => {
      expect(askClient.askQuestion).toHaveBeenCalledWith({
        question: 'bear food storage',
        campgroundId: '',
        documentType: '',
      })
    })

    expect(await screen.findByText('Generated answer')).toBeInTheDocument()
    expect(
      screen.getByText('Store all scented items in bear-proof lockers.')
    ).toBeInTheDocument()
    expect(screen.getByText('Model: gpt-4o-mini')).toBeInTheDocument()
    const answerSection = screen.getByLabelText('Generated answer')
    expect(within(answerSection).getByText('Food Storage Rules')).toBeInTheDocument()
    expect(within(answerSection).getByText('Upper Pines Campground')).toBeInTheDocument()
    expect(within(answerSection).getByText('Rules & Policies')).toBeInTheDocument()
    expect(within(answerSection).getByText('National Park Service')).toBeInTheDocument()
    expect(within(answerSection).getByRole('link', { name: 'Source link' })).toHaveAttribute(
      'href',
      'https://www.nps.gov/yose/planyourvisit/bears.htm'
    )
    expect(screen.getByText('Prepared LLM context')).toBeInTheDocument()
  })

  it('includes optional filters in the ask request', async () => {
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
    await user.selectOptions(screen.getByLabelText('Filter by campground'), 'yosemite-upper-pines')
    await user.selectOptions(screen.getByLabelText('Filter by document type'), 'rules')
    await user.click(screen.getByRole('button', { name: 'Generate answer' }))

    await waitFor(() => {
      expect(askClient.askQuestion).toHaveBeenCalledWith({
        question: 'bear food storage',
        campgroundId: 'yosemite-upper-pines',
        documentType: 'rules',
      })
    })
  })

  it('keeps retrieval results visible after generating an answer', async () => {
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
    await user.click(screen.getByRole('button', { name: 'Generate answer' }))

    expect(screen.getByText('Retrieved sources')).toBeInTheDocument()
    expect(screen.getByText('Source 1')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Generated answer')).toBeInTheDocument()
    })

    expect(screen.getByText('Retrieved sources')).toBeInTheDocument()
    expect(screen.getByLabelText('Prepared LLM context preview')).toHaveTextContent(
      'User question: bear food storage'
    )
  })

  it('renders a safe error message when answer generation fails', async () => {
    askClient.askQuestion.mockRejectedValueOnce(
      new askClient.AskApiError('Answer generation failed. Please try again.', 502)
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
    await user.click(screen.getByRole('button', { name: 'Generate answer' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Answer generation failed. Please try again.'
    )
    expect(screen.getByText('Prepared LLM context')).toBeInTheDocument()
  })
})
