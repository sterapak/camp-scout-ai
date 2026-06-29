/**
 * Maps server-side OpenAI errors to safe HTTP responses for API handlers.
 */

import {
  MissingOpenAiApiKeyError,
  OpenAiResponseError,
  isOpenAiQuotaExceededError,
} from './errors.js'
import { logOpenAiDiagnostic } from './logOpenAiDiagnostic.js'

export const OPENAI_QUOTA_EXCEEDED_MESSAGE =
  'AI answer service is temporarily unavailable because API quota or credits are exhausted. Please try again later.'

/**
 * Maps an OpenAI-related error to a safe HTTP response payload.
 * @param {unknown} error
 * @param {{
 *   scope: string,
 *   provider?: string,
 *   model?: string,
 *   unavailableMessage: string,
 *   failedMessage: string,
 * }} options
 * @returns {{ statusCode: number, body: { error: string } }}
 */
export function mapOpenAiErrorToHttpResponse(error, options) {
  if (error instanceof MissingOpenAiApiKeyError) {
    return {
      statusCode: 503,
      body: { error: options.unavailableMessage },
    }
  }

  if (error instanceof OpenAiResponseError) {
    logOpenAiDiagnostic(options.scope, {
      provider: options.provider ?? 'openai',
      model: options.model ?? '(unknown)',
      responseStatus: error.status,
      errorCode: error.errorCode,
      errorMessage: error.message,
    })

    if (isOpenAiQuotaExceededError(error)) {
      return {
        statusCode: 503,
        body: { error: OPENAI_QUOTA_EXCEEDED_MESSAGE },
      }
    }

    return {
      statusCode: 502,
      body: { error: options.failedMessage },
    }
  }

  throw error
}
