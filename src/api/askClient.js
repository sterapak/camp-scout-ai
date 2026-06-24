export const ASK_API_PATH = '/api/ask'

export class AskApiError extends Error {
  /**
   * @param {string} message
   * @param {number} statusCode
   */
  constructor(message, statusCode) {
    super(message)
    this.name = 'AskApiError'
    this.statusCode = statusCode
  }
}

/**
 * @typedef {import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerCitation} GroundedAnswerCitation
 */

/**
 * @typedef {import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerSuccess} GroundedAnswerSuccess
 */

/**
 * @typedef {import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerInsufficient} GroundedAnswerInsufficient
 */

/**
 * @typedef {GroundedAnswerSuccess | GroundedAnswerInsufficient} AskApiResult
 */

/**
 * Sends a grounded question to the ask API.
 * @param {{ question: string, campgroundId?: string }} params
 * @returns {Promise<AskApiResult>}
 */
export async function postAsk({ question, campgroundId }) {
  /** @type {{ question: string, campgroundId?: string }} */
  const body = { question: question.trim() }

  if (campgroundId) {
    body.campgroundId = campgroundId
  }

  const response = await fetch(ASK_API_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  /** @type {AskApiResult | { error?: string }} */
  const data = await response.json()

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'Request failed.'
    throw new AskApiError(message, response.status)
  }

  return /** @type {AskApiResult} */ (data)
}
