import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import QuestionHistoryPanel from './QuestionHistoryPanel'

describe('QuestionHistoryPanel', () => {
  it('reruns a previous question when selected', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()

    render(
      <QuestionHistoryPanel
        history={[
          {
            question: 'Are dogs allowed?',
            campgroundId: 'example',
            askedAt: '2025-06-01T00:00:00.000Z',
          },
        ]}
        onSelect={onSelect}
        onClear={jest.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Are dogs allowed?' }))
    expect(onSelect).toHaveBeenCalledWith({
      question: 'Are dogs allowed?',
      campgroundId: 'example',
      askedAt: '2025-06-01T00:00:00.000Z',
    })
  })

  it('clears history', async () => {
    const user = userEvent.setup()
    const onClear = jest.fn()

    render(
      <QuestionHistoryPanel
        history={[
          {
            question: 'Are dogs allowed?',
            askedAt: '2025-06-01T00:00:00.000Z',
          },
        ]}
        onSelect={jest.fn()}
        onClear={onClear}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(onClear).toHaveBeenCalled()
  })
})
