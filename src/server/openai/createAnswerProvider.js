/**
 * Factory for server-side answer providers.
 * Defaults to the fake provider so tests and local runs stay free of paid API calls.
 */

import { createFakeAnswerProvider } from './fakeAnswerProvider.js'
import { logOpenAiDiagnostic } from './logOpenAiDiagnostic.js'
import { createOpenAiAnswerProvider } from './openAiResponsesClient.js'

export const ANSWER_PROVIDER_ENV = 'OPENAI_ANSWER_PROVIDER'

/**
 * @typedef {'fake' | 'openai'} AnswerProviderName
 */

/**
 * Resolves which answer provider to use.
 * @param {string | undefined} explicitProvider
 * @returns {AnswerProviderName}
 */
export function resolveAnswerProviderName(explicitProvider) {
  const configured = explicitProvider ?? process.env[ANSWER_PROVIDER_ENV] ?? 'fake'
  return configured === 'openai' ? 'openai' : 'fake'
}

/**
 * Creates the configured answer provider for server-side use.
 * @param {{
 *   provider?: AnswerProviderName,
 *   apiKey?: string,
 *   baseUrl?: string,
 *   fetchImpl?: typeof fetch,
 *   defaultModel?: string,
 *   defaultMaxOutputTokens?: number,
 * }} [options]
 * @returns {import('./answerProvider.js').AnswerProvider}
 */
export function createAnswerProvider(options = {}) {
  const providerName = resolveAnswerProviderName(options.provider)

  logOpenAiDiagnostic('createAnswerProvider', {
    explicitProvider: options.provider ?? null,
    envProvider: process.env[ANSWER_PROVIDER_ENV] ?? '(unset)',
    resolvedProvider: providerName,
  })

  if (providerName === 'openai') {
    return createOpenAiAnswerProvider(options)
  }

  return createFakeAnswerProvider()
}
