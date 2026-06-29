/**
 * Summary handler — validates input and returns AI campground summaries as JSON.
 * Server-only; never import from React client code.
 */

import { getCampgroundSummary } from '../rag/campgroundSummaryService.js'
import { mapOpenAiErrorToHttpResponse } from '../openai/mapOpenAiHttpError.js'
import { validateSummaryRequestGuardrails } from './requestGuardrails.js'

/**
 * @typedef {Object} SummaryRequestBody
 * @property {string} campgroundId
 * @property {boolean} [forceRegenerate]
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

  /** @type {SummaryRequestBody} */
  const value = { campgroundId: campgroundId.trim() }

  if (typeof body.forceRegenerate === 'boolean') {
    value.forceRegenerate = body.forceRegenerate
  }

  const guardrails = validateSummaryRequestGuardrails(value)
  if (!guardrails.ok) {
    return guardrails
  }

  return { ok: true, value }
}

/**
 * Processes a summary request and returns a safe JSON HTTP response payload.
 * @param {unknown} body
 * @param {{
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 *   protectedAccess?: boolean,
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
    const result = await getCampgroundSummary({
      campgroundId: validation.value.campgroundId,
      forceRegenerate: validation.value.forceRegenerate ?? false,
      answerProvider: options.answerProvider,
      provider: options.provider,
      protectedAccess: options.protectedAccess === true,
    })

    return {
      statusCode: 200,
      body: result,
    }
  } catch (error) {
    const configuredProvider = options.provider ?? process.env.OPENAI_ANSWER_PROVIDER ?? 'fake'
    return mapOpenAiErrorToHttpResponse(error, {
      scope: 'handleSummaryRequest.openAiResponseError',
      provider: configuredProvider === 'openai' ? 'openai' : 'fake',
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      unavailableMessage: 'Summary generation is not available.',
      failedMessage: 'Summary generation failed. Please try again.',
    })
  }
}

export { EMPTY_CAMPGROUND_ID_ERROR, INVALID_BODY_ERROR }
