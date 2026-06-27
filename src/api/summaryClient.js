export const SUMMARY_API_PATH = '/api/summary'

export class SummaryApiError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode) {
    super(message)
    this.name = 'SummaryApiError'
    this.statusCode = statusCode
  }
}

/**
 * @typedef {import('../server/rag/campgroundSummaryGenerator.js').CampgroundSummarySuccess} CampgroundSummarySuccess
 */

/**
 * @typedef {import('../server/rag/campgroundSummaryGenerator.js').CampgroundSummaryInsufficient} CampgroundSummaryInsufficient
 */

/**
 * @typedef {CampgroundSummarySuccess | CampgroundSummaryInsufficient} SummaryApiResult
 */

/**
 * Fetches an AI campground summary from official knowledge documents.
 * @param {{ campgroundId: string }} params
 * @returns {Promise<SummaryApiResult>}
 */
export async function postSummary({ campgroundId }) {
  const response = await fetch(SUMMARY_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campgroundId: campgroundId.trim() }),
  })

  /** @type {SummaryApiResult | { error?: string }} */
  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed.'
    throw new SummaryApiError(message, response.status)
  }

  return /** @type {SummaryApiResult} */ (data)
}
