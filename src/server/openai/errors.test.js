/** @jest-environment node */

import { OpenAiResponseError, isOpenAiQuotaExceededError } from './errors.js'

describe('isOpenAiQuotaExceededError', () => {
  it('returns true for insufficient_quota errors', () => {
    const error = new OpenAiResponseError('Quota exceeded', {
      status: 429,
      errorCode: 'insufficient_quota',
    })

    expect(isOpenAiQuotaExceededError(error)).toBe(true)
  })

  it('returns false for other OpenAI errors', () => {
    const error = new OpenAiResponseError('Rate limited', {
      status: 429,
      errorCode: 'rate_limit_exceeded',
    })

    expect(isOpenAiQuotaExceededError(error)).toBe(false)
  })
})
