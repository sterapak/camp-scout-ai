/**
 * Persists recent question history in localStorage.
 */

const STORAGE_KEY = 'camp-scout-ai:question-history'
const MAX_HISTORY_ITEMS = 10

/**
 * @typedef {{ question: string, campgroundId?: string, askedAt: string }} QuestionHistoryEntry
 */

/**
 * @returns {QuestionHistoryEntry[]}
 */
export function loadQuestionHistory() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return []
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.question === 'string' &&
        entry.question.trim().length > 0 &&
        typeof entry.askedAt === 'string'
    )
  } catch {
    return []
  }
}

/**
 * Adds a question to history and returns the updated list.
 * @param {{ question: string, campgroundId?: string }} entry
 * @returns {QuestionHistoryEntry[]}
 */
export function addQuestionToHistory({ question, campgroundId }) {
  const trimmedQuestion = question.trim()
  if (trimmedQuestion.length === 0 || typeof window === 'undefined' || !window.localStorage) {
    return loadQuestionHistory()
  }

  const existing = loadQuestionHistory().filter(
    (entry) =>
      entry.question.toLowerCase() !== trimmedQuestion.toLowerCase() ||
      (entry.campgroundId ?? '') !== (campgroundId ?? '')
  )

  const updated = [
    {
      question: trimmedQuestion,
      campgroundId: campgroundId || undefined,
      askedAt: new Date().toISOString(),
    },
    ...existing,
  ].slice(0, MAX_HISTORY_ITEMS)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  return updated
}

/**
 * Clears all question history.
 */
export function clearQuestionHistory() {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}
