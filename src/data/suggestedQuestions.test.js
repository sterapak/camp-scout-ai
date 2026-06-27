import { getSuggestedQuestions, DEFAULT_SUGGESTED_QUESTIONS } from './suggestedQuestions.js'

describe('suggestedQuestions', () => {
  it('returns default suggestions when no campground is selected', () => {
    expect(getSuggestedQuestions()).toEqual(DEFAULT_SUGGESTED_QUESTIONS)
  })

  it('scopes suggestions to the selected campground', () => {
    const suggestions = getSuggestedQuestions('yosemite-upper-pines')

    expect(suggestions.every((question) => question.campgroundId === 'yosemite-upper-pines')).toBe(
      true
    )
  })
})
