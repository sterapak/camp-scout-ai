/**
 * Ask question handler — validates input and returns grounded answers as JSON.
 * Server-only; never import from React client code.
 */

import { generateGroundedAnswer } from '../rag/groundedAnswerGenerator.js'
import { MissingOpenAiApiKeyError, OpenAiResponseError } from '../openai/errors.js'
import { logOpenAiDiagnostic } from '../openai/logOpenAiDiagnostic.js'

/**
 * @typedef {Object} AskRequestBody
 * @property {string} question
 * @property {string} [campgroundId]
 * @property {string} [documentType]
 * @property {number} [topDocumentCount]
 */

/**
 * @typedef {Object} AskValidationErrorBody
 * @property {string} error
 */

/**
 * @typedef {Object} AskHttpResponse
 * @property {number} statusCode
 * @property {import('../rag/groundedAnswerGenerator.js').GroundedAnswerResult | AskValidationErrorBody | { error: string }} body
 */

const EMPTY_QUESTION_ERROR = 'question is required and must be a non-empty string.'
const INVALID_BODY_ERROR = 'Request body must be a JSON object with a question field.'
const INVALID_JSON_ERROR = 'Invalid JSON body.'

/**
 * Validates an ask request body before calling the grounded answer generator.
 * @param {unknown} body
 * @returns {{ ok: true, value: AskRequestBody } | { ok: false, statusCode: number, body: AskValidationErrorBody }}
 */
export function validateAskRequestBody(body) {
  if (body === null || body === undefined || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: INVALID_BODY_ERROR },
    }
  }

  const { question } = body

  if (typeof question !== 'string' || question.trim().length === 0) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: EMPTY_QUESTION_ERROR },
    }
  }

  /** @type {AskRequestBody} */
  const value = {
    question: question.trim(),
  }

  if (typeof body.campgroundId === 'string') {
    value.campgroundId = body.campgroundId
  }

  if (typeof body.documentType === 'string') {
    value.documentType = body.documentType
  }

  if (typeof body.topDocumentCount === 'number' && Number.isFinite(body.topDocumentCount)) {
    value.topDocumentCount = body.topDocumentCount
  }

  return { ok: true, value }
}

/**
 * Processes an ask request and returns a safe JSON HTTP response payload.
 * @param {unknown} body
 * @param {{
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 * }} [options]
 * @returns {Promise<AskHttpResponse>}
 */
export async function handleAskRequest(body, options = {}) {
  const validation = validateAskRequestBody(body)
  if (!validation.ok) {
    return {
      statusCode: validation.statusCode,
      body: validation.body,
    }
  }

  try {
    const result = await generateGroundedAnswer({
      question: validation.value.question,
      campgroundId: validation.value.campgroundId ?? '',
      documentType: validation.value.documentType ?? '',
      topDocumentCount: validation.value.topDocumentCount,
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
        body: { error: 'Answer generation is not available.' },
      }
    }

    if (error instanceof OpenAiResponseError) {
      const configuredProvider = options.provider ?? process.env.OPENAI_ANSWER_PROVIDER ?? 'fake'
      logOpenAiDiagnostic('handleAskRequest.openAiResponseError', {
        provider: configuredProvider === 'openai' ? 'openai' : 'fake',
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        responseStatus: error.status,
        errorCode: error.errorCode,
        errorMessage: error.message,
      })
      return {
        statusCode: 502,
        body: { error: 'Answer generation failed. Please try again.' },
      }
    }

    throw error
  }
}

export {
  EMPTY_QUESTION_ERROR,
  INVALID_BODY_ERROR,
  INVALID_JSON_ERROR,
}
