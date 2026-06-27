import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GeneratedAnswerPanel from './GeneratedAnswerPanel'

describe('GeneratedAnswerPanel', () => {
  it('renders nothing when idle', () => {
    const { container } = render(<GeneratedAnswerPanel status="idle" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows loading state', () => {
    render(<GeneratedAnswerPanel status="loading" />)
    expect(screen.getByRole('status')).toHaveTextContent('Generating answer')
  })

  it('shows a success answer with confidence, sources, citations, and evidence', async () => {
    const user = userEvent.setup()

    render(
      <GeneratedAnswerPanel
        status="success"
        answer="According to the National Park Service, store food in bear boxes."
        model="gpt-4o-mini"
        confidence="high"
        sources={[
          {
            sourceName: 'National Park Service',
            sourceUrl: 'https://example.com/bears',
            authorityRank: 1,
          },
        ]}
        citations={[
          {
            id: 'doc-1',
            title: 'Bear Safety',
            sourceName: 'National Park Service',
            sourceUrl: 'https://example.com/bears',
            campgroundName: 'Upper Pines',
            documentType: 'regulation',
          },
        ]}
        evidence={[
          {
            citationId: 'doc-1',
            citationIndex: 1,
            excerpt: 'Store food in bear-resistant lockers.',
            sourceName: 'National Park Service',
            sourceUrl: 'https://example.com/bears',
            title: 'Bear Safety',
            campgroundName: 'Upper Pines',
            documentType: 'regulation',
          },
        ]}
      />
    )

    expect(
      screen.getByText('According to the National Park Service, store food in bear boxes.')
    ).toBeInTheDocument()
    expect(screen.getByText('High confidence')).toBeInTheDocument()
    expect(screen.getByText('Model: gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('Sources')).toBeInTheDocument()
    expect(screen.getByText('National Park Service')).toBeInTheDocument()
    expect(screen.getByText('[1] Bear Safety')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show Evidence' }))
    expect(screen.getByText('Store food in bear-resistant lockers.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Citation [1]' })).toHaveAttribute(
      'href',
      '#citation-doc-1'
    )
  })

  it('shows contradiction warnings', () => {
    render(
      <GeneratedAnswerPanel
        status="success"
        answer="Official sources disagree."
        confidence="medium"
        contradictionWarning={{
          topic: 'Dogs allowed',
          message: 'Official sources disagree about dogs allowed.',
          conflictingSources: [],
        }}
      />
    )

    expect(screen.getByText('Conflicting official sources detected')).toBeInTheDocument()
  })

  it('shows insufficient context message and citations', () => {
    render(
      <GeneratedAnswerPanel
        status="insufficient_context"
        message="I don't have information about that."
        citations={[
          {
            id: 'doc-1',
            title: 'General Info',
            sourceName: 'NPS',
            sourceUrl: 'https://example.com/info',
            documentType: 'overview',
          },
        ]}
      />
    )

    expect(screen.getByText("I don't have information about that.")).toBeInTheDocument()
    expect(screen.getByText('[1] General Info')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(
      <GeneratedAnswerPanel status="error" errorMessage="Answer generation is not available." />
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Answer generation is not available.')
  })
})
