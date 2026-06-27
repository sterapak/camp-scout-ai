import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SuggestedQuestions from './SuggestedQuestions'

describe('SuggestedQuestions', () => {
  it('populates the search box when a suggestion is selected', async () => {
    const user = userEvent.setup()
    const onSelect = jest.fn()

    render(
      <SuggestedQuestions
        questions={[{ id: 'dogs', text: 'Are dogs allowed?' }]}
        onSelect={onSelect}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Are dogs allowed?' }))
    expect(onSelect).toHaveBeenCalledWith('Are dogs allowed?')
  })
})
