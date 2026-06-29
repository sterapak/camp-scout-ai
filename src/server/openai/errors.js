/**
 * Server-side OpenAI boundary errors.
 * These errors are safe to surface to callers without exposing secrets.
 */

export class MissingOpenAiApiKeyError extends Error {
  constructor(message = 'OPENAI_API_KEY is not configured. Set it in your server environment to use the OpenAI answer provider.') {
    super(message)
    this.name = 'MissingOpenAiApiKeyError'
  }
}

export class OpenAiResponseError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, errorCode?: string }} [details]
   */
  constructor(message, details = {}) {
    super(message)
    this.name = 'OpenAiResponseError'
    this.status = details.status
    this.errorCode = details.errorCode
  }
}

/**
 * Returns true when OpenAI reported exhausted quota or credits.
 * @param {unknown} error
 * @returns {boolean}
 */
export function isOpenAiQuotaExceededError(error) {
  if (!(error instanceof OpenAiResponseError)) {
    return false
  }

  if (error.errorCode === 'insufficient_quota') {
    return true
  }

  return error.status === 429 && error.errorCode === 'insufficient_quota'
}
