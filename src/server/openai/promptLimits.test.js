/** @jest-environment node */

import {
  DEFAULT_MAX_CONTEXT_TOKENS,
  estimateTokenCount,
  resolveMaxContextTokens,
  resolveMaxOutputTokens,
  truncateTextToTokenBudget,
  OPENAI_MAX_CONTEXT_TOKENS_ENV,
  OPENAI_MAX_OUTPUT_TOKENS_ENV,
} from './promptLimits.js'

describe('promptLimits', () => {
  const originalContextEnv = process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV]
  const originalOutputEnv = process.env[OPENAI_MAX_OUTPUT_TOKENS_ENV]

  afterEach(() => {
    if (originalContextEnv === undefined) {
      delete process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV]
    } else {
      process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV] = originalContextEnv
    }

    if (originalOutputEnv === undefined) {
      delete process.env[OPENAI_MAX_OUTPUT_TOKENS_ENV]
    } else {
      process.env[OPENAI_MAX_OUTPUT_TOKENS_ENV] = originalOutputEnv
    }
  })

  it('estimates token count from text length', () => {
    expect(estimateTokenCount('')).toBe(0)
    expect(estimateTokenCount('abcd')).toBe(1)
    expect(estimateTokenCount('a'.repeat(40))).toBe(10)
  })

  it('defaults max context tokens when env is unset', () => {
    delete process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV]
    expect(resolveMaxContextTokens()).toBe(DEFAULT_MAX_CONTEXT_TOKENS)
  })

  it('reads max context tokens from env', () => {
    process.env[OPENAI_MAX_CONTEXT_TOKENS_ENV] = '1500'
    expect(resolveMaxContextTokens()).toBe(1500)
  })

  it('reads max output tokens from env', () => {
    process.env[OPENAI_MAX_OUTPUT_TOKENS_ENV] = '500'
    expect(resolveMaxOutputTokens()).toBe(500)
  })

  it('truncates oversized text to the token budget', () => {
    const oversized = 'word '.repeat(500)
    const result = truncateTextToTokenBudget(oversized, 50)

    expect(result.truncated).toBe(true)
    expect(result.estimatedTokens).toBeLessThanOrEqual(50)
    expect(result.text.endsWith('…')).toBe(true)
  })

  it('returns original text when within budget', () => {
    const text = 'Short prompt context'
    const result = truncateTextToTokenBudget(text, 100)

    expect(result).toEqual({
      text,
      truncated: false,
      estimatedTokens: estimateTokenCount(text),
    })
  })
})
