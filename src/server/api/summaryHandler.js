/**
 * Summary handler — validates input and returns AI campground summaries as JSON.
 * Server-only; never import from React client code.
 */

import { generateCampgroundSummary } from '../rag/campgroundSummaryGenerator.js'
import { MissingOpenAiApiKeyError, OpenAiResponseError } from '../openai/errors.js'
import { logOpenAiDiagnostic } from '../openai/logOpenAiDiagnostic.js'

/**
 * @typedef {Object} SummaryRequestBody
 * @property {string} campgroundId
 */

const INVALID_BODY_ERROR = 'Request body must be a JSON object with a campgroundId field.'
const EMPTY_CAMPGROUND_ID_ERROR = 'campgroundId is required and must be a non-empty string.'

/**
 * Validates a summary request body.
 * @param {unknown} body
 * @returns {{ ok: true, value: SummaryRequestBody } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function validateSummaryRequestBody(body) {
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: INVALID_BODY_ERROR },
    }
  }

  const { campgroundId } = body

  if (typeof campgroundId !== 'string' || campgroundId.trim().length === 0) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: EMPTY_CAMPGROUND_ID_ERROR },
    }
  }

  return {
    ok: true,
    value: { campgroundId: campgroundId.trim() },
  }
}

/**
 * Processes a summary request and returns a safe JSON HTTP response payload.
 * @param {unknown} body
 * @param {{
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 * }} [options]
 * @returns {Promise<{ statusCode: number, body: import('../rag/campgroundSummaryGenerator.js').CampgroundSummaryResult | { error: string } }>}
 */
export async function handleSummaryRequest(body, options = {}) {
  const validation = validateSummaryRequestBody(body)
  if (!validation.ok) {
    return {
      statusCode: validation.statusCode,
      body: validation.body,
    }
  }

  try {
    const result = await generateCampgroundSummary({
      campgroundId: validation.value.campgroundId,
      answerProvider: options.answerProvider,
      provider: options.provider,
    })

    return {
      statusCode: 200,
      body: result,
    }
  } catch (error) {
    if (error instanceof MissingOpenAiApiKeyError) {
      return {
        statusCode: 503,
        body: { error: 'Summary generation is not available.' },
      }
    }

    if (error instanceof OpenAiResponseError) {
      const configuredProvider = options.provider ?? process.env.OPENAI_ANSWER_PROVIDER ?? 'fake'
      logOpenAiDiagnostic('handleSummaryRequest.openAiResponseError', {
        provider: configuredProvider === 'openai' ? 'openai' : 'fake',
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        responseStatus: error.status,
        errorCode: error.errorCode,
        errorMessage: error.message,
      })
      return {
        statusCode: 502,
        body: { error: 'Summary generation failed. Please try again.' },
      }
    }

    throw error
  }
}

export { EMPTY_CAMPGROUND_ID_ERROR, INVALID_BODY_ERROR }
