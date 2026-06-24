const ASK_API_PATH = '/api/ask'

/**
 * @typedef {Object} AskCitation
 * @property {string} id
 * @property {string} title
 * @property {string} sourceName
 * @property {string} sourceUrl
 * @property {string} [campgroundName]
 * @property {string} documentType
 */

/**
 * @typedef {Object} AskSuccessResponse
 * @property {'success'} status
 * @property {string} answer
 * @property {AskCitation[]} citations
 * @property {string} model
 * @property {number} [inputTokens]
 * @property {number} [outputTokens]
 */

/**
 * @typedef {Object} AskInsufficientContextResponse
 * @property {'insufficient_context'} status
 * @property {string} message
 * @property {AskCitation[]} citations
 */

/**
 * @typedef {AskSuccessResponse | AskInsufficientContextResponse} AskResponse
 */

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
 * Posts a grounded answer request to the server-side /api/ask endpoint.
 * @param {{
 *   question: string
 *   campgroundId?: string
 *   documentType?: string
 * }} params
 * @returns {Promise<AskResponse>}
 */
export async function askQuestion({ question, campgroundId, documentType }) {
  /** @type {Record<string, string>} */
  const body = { question: question.trim() }

  if (campgroundId) {
    body.campgroundId = campgroundId
  }

  if (documentType) {
    body.documentType = documentType
  }

  let response
  try {
    response = await fetch(ASK_API_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AskApiError('Unable to reach the answer service. Please try again.', 0)
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new AskApiError('Received an invalid response from the answer service.', response.status)
  }

  if (!response.ok) {
    const message =
      typeof data?.error === 'string' ? data.error : 'An unexpected error occurred.'
    throw new AskApiError(message, response.status)
  }

  return data
}
