/** @jest-environment node */

import {
  MissingOpenAiApiKeyError,
  OpenAiResponseError,
} from './errors.js'
import {
  mapOpenAiErrorToHttpResponse,
  OPENAI_QUOTA_EXCEEDED_MESSAGE,
} from './mapOpenAiHttpError.js'

describe('mapOpenAiErrorToHttpResponse', () => {
  it('maps missing API key errors to 503', () => {
    const response = mapOpenAiErrorToHttpResponse(new MissingOpenAiApiKeyError(), {
      scope: 'test.missingKey',
      unavailableMessage: 'Not available.',
      failedMessage: 'Failed.',
    })

    expect(response.statusCode).toBe(503)
    expect(response.body.error).toBe('Not available.')
  })

  it('maps insufficient quota errors to a clear non-502 response', () => {
    const response = mapOpenAiErrorToHttpResponse(
      new OpenAiResponseError('You exceeded your current quota.', {
        status: 429,
        errorCode: 'insufficient_quota',
      }),
      {
        scope: 'test.quota',
        unavailableMessage: 'Not available.',
        failedMessage: 'Failed.',
      },
    )

    expect(response.statusCode).toBe(503)
    expect(response.statusCode).not.toBe(502)
    expect(response.body.error).toBe(OPENAI_QUOTA_EXCEEDED_MESSAGE)
    expect(response.body.error).toMatch(/quota|credits/i)
    expect(JSON.stringify(response.body)).not.toMatch(/sk-proj-|sk-live-|You exceeded/)
  })

  it('maps other OpenAI errors to 502', () => {
    const response = mapOpenAiErrorToHttpResponse(
      new OpenAiResponseError('Upstream failure', { status: 500 }),
      {
        scope: 'test.failure',
        unavailableMessage: 'Not available.',
        failedMessage: 'Answer generation failed. Please try again.',
      },
    )

    expect(response.statusCode).toBe(502)
    expect(response.body.error).toBe('Answer generation failed. Please try again.')
  })
})
