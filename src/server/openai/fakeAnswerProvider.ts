/**
 * Deterministic fake answer provider for unit tests and local development.
 * No network calls, API keys, or paid token usage.
 */

import {
  DEFAULT_OPENAI_MODEL,
  type AnswerGenerationRequest,
  type AnswerProvider,
} from './answerProvider.js'

function buildFakeAnswer(request: AnswerGenerationRequest): string {
  const input = typeof request?.input === 'string' ? request.input.trim() : ''
  const instructions = typeof request?.instructions === 'string' ? request.instructions : ''

  if (input.length === 0) {
    return 'Fake provider: no input was provided.'
  }

  if (instructions.includes('campground summary')) {
    return [
      '## Overview',
      'This campground offers scenic camping with access to official park facilities [Source 1].',
      '',
      '## Amenities',
      'Restrooms, picnic tables, and fire rings are available according to official sources [Source 1].',
      '',
      '## Restrictions',
      'Follow posted quiet hours and food storage rules from the managing agency [Source 2].',
      '',
      '## Reservations',
      'Reservations may be required during peak season; check the official reservation portal [Source 3].',
      '',
      '## Highlights',
      'Popular for its location and access to nearby trails and water recreation [Source 1].',
    ].join('\n')
  }

  return `Fake provider answer for: ${input}`
}

export function createFakeAnswerProvider(): AnswerProvider {
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

export const fakeAnswerProvider = createFakeAnswerProvider()
