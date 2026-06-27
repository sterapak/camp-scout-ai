/** @jest-environment jsdom */

import {
  addQuestionToHistory,
  clearQuestionHistory,
  loadQuestionHistory,
} from './questionHistory.js'

describe('questionHistory', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('persists recent questions across reloads', () => {
    addQuestionToHistory({ question: 'Are dogs allowed?', campgroundId: 'example' })

    expect(loadQuestionHistory()).toEqual([
      expect.objectContaining({
        question: 'Are dogs allowed?',
        campgroundId: 'example',
      }),
    ])
  })

  it('deduplicates repeated questions and keeps the newest entry first', () => {
    addQuestionToHistory({ question: 'Are dogs allowed?' })
    addQuestionToHistory({ question: 'Are dogs allowed?' })

    expect(loadQuestionHistory()).toHaveLength(1)
  })

  it('clears history', () => {
    addQuestionToHistory({ question: 'Are dogs allowed?' })
    clearQuestionHistory()

    expect(loadQuestionHistory()).toEqual([])
  })
})
