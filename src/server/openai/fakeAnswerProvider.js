/**
 * Deterministic fake answer provider for unit tests and local development.
 * No network calls, API keys, or paid token usage.
 */

import { DEFAULT_OPENAI_MODEL } from './answerProvider.js'

/**
 * Builds a stable fake answer from request input.
 * @param {import('./answerProvider.js').AnswerGenerationRequest} request
 * @returns {string}
 */
function buildFakeAnswer(request) {
  const input = typeof request?.input === 'string' ? request.input.trim() : ''

  if (input.length === 0) {
    return 'Fake provider: no input was provided.'
  }

  return `Fake provider answer for: ${input}`
}

/**
 * Creates a deterministic fake answer provider.
 * @returns {import('./answerProvider.js').AnswerProvider}
 */
export function createFakeAnswerProvider() {
  return {
    name: 'fake',
    async generateAnswer(request) {
      const input = typeof request?.input === 'string' ? request.input : ''
      const model = typeof request?.model === 'string' && request.model.trim().length > 0
        ? request.model.trim()
        : DEFAULT_OPENAI_MODEL

      return {
        text: buildFakeAnswer(request),
        model,
        inputTokens: Math.max(1, Math.ceil(input.length / 4)),
        outputTokens: Math.max(1, Math.ceil(buildFakeAnswer(request).length / 4)),
        responseId: 'fake-response-id',
      }
    },
  }
}

/** Shared fake provider for unit tests. */
export const fakeAnswerProvider = createFakeAnswerProvider()
