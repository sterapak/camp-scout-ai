/**
 * Prompt size limits and token estimation for OpenAI answer generation.
 * Uses a conservative character-based estimate to avoid oversized API requests.
 */

import { DEFAULT_MAX_OUTPUT_TOKENS } from './answerProvider.js'

export const CHARS_PER_TOKEN_ESTIMATE = 4
export const DEFAULT_MAX_CONTEXT_TOKENS = 2000
export const OPENAI_MAX_CONTEXT_TOKENS_ENV = 'OPENAI_MAX_CONTEXT_TOKENS'
export const OPENAI_MAX_OUTPUT_TOKENS_ENV = 'OPENAI_MAX_OUTPUT_TOKENS'

export interface TruncationResult {
  text: string
  truncated: boolean
  estimatedTokens: number
}

export function estimateTokenCount(text: string): number {
  const normalized = (text ?? '').trim()
  if (normalized.length === 0) {
    return 0
  }

  return Math.ceil(normalized.length / CHARS_PER_TOKEN_ESTIMATE)
}

export function resolveMaxContextTokens(explicitMaxTokens?: number): number {
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

export function resolveMaxOutputTokens(
  explicitMaxTokens?: number,
  defaultValue: number = DEFAULT_MAX_OUTPUT_TOKENS,
): number {
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

export function truncateTextToTokenBudget(text: string, maxTokens: number): TruncationResult {
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
