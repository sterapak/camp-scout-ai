import { render, screen } from '@testing-library/react'
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

  it('shows a success answer with model and citations', () => {
    render(
      <GeneratedAnswerPanel
        status="success"
        answer="Store food in bear boxes."
        model="gpt-4o-mini"
        citations={[
          {
            id: 'doc-1',
            title: 'Bear Safety',
            sourceName: 'NPS',
            sourceUrl: 'https://example.com/bears',
            campgroundName: 'Upper Pines',
            documentType: 'regulation',
          },
        ]}
      />
    )

    expect(screen.getByText('Store food in bear boxes.')).toBeInTheDocument()
    expect(screen.getByText('Model: gpt-4o-mini')).toBeInTheDocument()
    expect(screen.getByText('[1] Bear Safety')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Source' })).toHaveAttribute(
      'href',
      'https://example.com/bears'
    )
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
