/**
 * Answer provider interface for server-side OpenAI Responses API integration.
 * Implementations must stay server-only; never import this module from React components.
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const DEFAULT_MAX_OUTPUT_TOKENS = 800

export interface AnswerGenerationRequest {
  instructions?: string
  input: string
  model?: string
  maxOutputTokens?: number
}

export interface AnswerGenerationResult {
  text: string
  model: string
  inputTokens?: number
  outputTokens?: number
  responseId?: string
}

export interface AnswerProvider {
  name: string
  generateAnswer: (request: AnswerGenerationRequest) => Promise<AnswerGenerationResult>
}

export function isAnswerProvider(value: unknown): value is AnswerProvider {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as AnswerProvider).name === 'string' &&
    (value as AnswerProvider).name.length > 0 &&
    typeof (value as AnswerProvider).generateAnswer === 'function'
  )
}
