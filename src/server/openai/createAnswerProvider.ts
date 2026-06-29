/**
 * Factory for server-side answer providers.
 * Defaults to the fake provider so tests and local runs stay free of paid API calls.
 */

import type { AnswerProvider } from './answerProvider.js'
import { createFakeAnswerProvider } from './fakeAnswerProvider.js'
import { logOpenAiDiagnostic } from './logOpenAiDiagnostic.js'
import { createOpenAiAnswerProvider, type OpenAiAnswerProviderOptions } from './openAiResponsesClient.js'

export const ANSWER_PROVIDER_ENV = 'OPENAI_ANSWER_PROVIDER'

export type AnswerProviderName = 'fake' | 'openai'

export interface CreateAnswerProviderOptions extends OpenAiAnswerProviderOptions {
  provider?: AnswerProviderName
  protectedAccess?: boolean
}

export function resolveAnswerProviderName(
  explicitProvider: string | undefined,
  options: { protectedAccess?: boolean } = {},
): AnswerProviderName {
  if (!options.protectedAccess) {
    return 'fake'
  }

  const configured = explicitProvider ?? process.env[ANSWER_PROVIDER_ENV] ?? 'fake'
  return configured === 'openai' ? 'openai' : 'fake'
}

export function createAnswerProvider(options: CreateAnswerProviderOptions = {}): AnswerProvider {
  const providerName = resolveAnswerProviderName(options.provider, {
    protectedAccess: options.protectedAccess === true,
  })

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
