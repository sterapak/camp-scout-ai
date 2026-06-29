/**
 * Prompt size limits and token estimation for OpenAI answer generation.
 * Uses a conservative character-based estimate to avoid oversized API requests.
 */

import { DEFAULT_MAX_OUTPUT_TOKENS } from './answerProvider.js'

export const CHARS_PER_TOKEN_ESTIMATE = 4
export const DEFAULT_MAX_CONTEXT_TOKENS = 2000
export const OPENAI_MAX_CONTEXT_TOKENS_ENV = 'OPENAI_MAX_CONTEXT_TOKENS'
export const OPENAI_MAX_OUTPUT_TOKENS_ENV = 'OPENAI_MAX_OUTPUT_TOKENS'

/**
 * Estimates token count from plain text using a fixed chars-per-token ratio.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text) {
  const normalized = (text ?? '').trim()
  if (normalized.length === 0) {
    return 0
  }

  return Math.ceil(normalized.length / CHARS_PER_TOKEN_ESTIMATE)
}

/**
 * Resolves the max retrieved-context token budget from explicit config or env.
 * @param {number | undefined} explicitMaxTokens
 * @returns {number}
 */
export function resolveMaxContextTokens(explicitMaxTokens) {
  if (typeof explicitMaxTokens === 'number' && explicitMaxTokens > 0) {
    return explicitMaxTokens
  }

  const envValue = process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV]
  const parsed = envValue ? Number.parseInt(envValue, 10) : Number.NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return DEFAULT_MAX_CONTEXT_TOKENS
}

/**
 * Resolves the max output token cap from explicit config or env.
 * @param {number | undefined} explicitMaxTokens
 * @param {number} [defaultValue]
 * @returns {number}
 */
export function resolveMaxOutputTokens(
  explicitMaxTokens,
  defaultValue = DEFAULT_MAX_OUTPUT_TOKENS,
) {
  if (typeof explicitMaxTokens === 'number' && explicitMaxTokens > 0) {
    return explicitMaxTokens
  }

  const envValue = process.env[OPENAI_MAX_OUTPUT_TOKENS_ENV]
  const parsed = envValue ? Number.parseInt(envValue, 10) : Number.NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }

  return defaultValue
}

/**
 * Truncates text to fit within an estimated token budget.
 * @param {string} text
 * @param {number} maxTokens
 * @returns {{ text: string, truncated: boolean, estimatedTokens: number }}
 */
export function truncateTextToTokenBudget(text, maxTokens) {
  const normalized = (text ?? '').trim()
  const estimatedTokens = estimateTokenCount(normalized)

  if (estimatedTokens <= maxTokens) {
    return {
      text: normalized,
      truncated: false,
      estimatedTokens,
    }
  }

  const maxChars = maxTokens * CHARS_PER_TOKEN_ESTIMATE
  const truncatedSlice = normalized.slice(0, maxChars)
  const lastSpace = truncatedSlice.lastIndexOf(' ')
  const safeLength = lastSpace > maxChars * 0.6 ? lastSpace : maxChars
  const truncatedText = `${truncatedSlice.slice(0, safeLength).trim()}…`

  return {
    text: truncatedText,
    truncated: true,
    estimatedTokens: estimateTokenCount(truncatedText),
  }
}
