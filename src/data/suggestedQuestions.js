/**
 * Configurable suggested questions for campground search.
 */

/** @typedef {{ id: string, text: string, campgroundId?: string }} SuggestedQuestion */

/** @type {SuggestedQuestion[]} */
export const DEFAULT_SUGGESTED_QUESTIONS = [
  {
    id: 'bear-rules',
    text: 'What are the bear food storage rules?',
  },
  {
    id: 'reservations',
    text: 'How do reservations work at this campground?',
  },
  {
    id: 'dog-policy',
    text: 'Are dogs allowed at this campground?',
  },
  {
    id: 'fire-rules',
    text: 'What are the fire restrictions?',
  },
  {
    id: 'amenities',
    text: 'What amenities are available?',
  },
  {
    id: 'check-in',
    text: 'What are the check-in and check-out times?',
  },
]

/**
 * Returns suggested questions, optionally scoped to a campground.
 * @param {string} [campgroundId]
 * @returns {SuggestedQuestion[]}
 */
export function getSuggestedQuestions(campgroundId = '') {
  if (!campgroundId) {
    return DEFAULT_SUGGESTED_QUESTIONS
  }

  return DEFAULT_SUGGESTED_QUESTIONS.map((question) => ({
    ...question,
    campgroundId,
  }))
}
