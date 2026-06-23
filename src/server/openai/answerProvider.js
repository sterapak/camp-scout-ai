/**
 * Answer provider interface for server-side OpenAI Responses API integration.
 * Implementations must stay server-only; never import this module from React components.
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
export const DEFAULT_MAX_OUTPUT_TOKENS = 512

/**
 * @typedef {Object} AnswerGenerationRequest
 * @property {string} [instructions] - System-level guidance for the model
 * @property {string} input - User question or prompt input
 * @property {string} [model] - OpenAI model id
 * @property {number} [maxOutputTokens] - Upper bound on generated tokens
 */

/**
 * @typedef {Object} AnswerGenerationResult
 * @property {string} text - Generated answer text
 * @property {string} model - Model used for generation
 * @property {number} [inputTokens] - Estimated or reported input tokens
 * @property {number} [outputTokens] - Estimated or reported output tokens
 * @property {string} [responseId] - OpenAI response id when available
 */

/**
 * @typedef {Object} AnswerProvider
 * @property {string} name - Provider identifier for logging and tests
 * @property {(request: AnswerGenerationRequest) => Promise<AnswerGenerationResult>} generateAnswer
 */

/**
 * Checks that a value implements the answer provider contract.
 * @param {unknown} value
 * @returns {value is AnswerProvider}
 */
export function isAnswerProvider(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value.name === 'string' &&
    value.name.length > 0 &&
    typeof value.generateAnswer === 'function'
  )
}
