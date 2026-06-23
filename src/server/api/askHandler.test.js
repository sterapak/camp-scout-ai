/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import {
  EMPTY_QUESTION_ERROR,
  handleAskRequest,
  validateAskRequestBody,
} from './askHandler.js'
import {
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
} from '../rag/groundedAnswerGenerator.js'

describe('validateAskRequestBody', () => {
  it('accepts a valid question', () => {
    const result = validateAskRequestBody({ question: 'What are the bear rules?' })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.question).toBe('What are the bear rules?')
    }
  })

  it('rejects an empty question with a validation error', () => {
    const result = validateAskRequestBody({ question: '   ' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.statusCode).toBe(400)
      expect(result.body.error).toBe(EMPTY_QUESTION_ERROR)
    }
  })

  it('rejects a missing question with a validation error', () => {
    const result = validateAskRequestBody({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.statusCode).toBe(400)
      expect(result.body.error).toBe(EMPTY_QUESTION_ERROR)
    }
  })
})

describe('handleAskRequest', () => {
  it('returns a grounded answer on the happy path', async () => {
    const response = await handleAskRequest(
      {
        question: 'What are the bear food storage rules?',
        campgroundId: 'yosemite-upper-pines',
      },
      { answerProvider: fakeAnswerProvider },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe(SUCCESS_STATUS)
    expect(response.body.answer).toContain('Fake provider answer for:')
    expect(response.body.citations.length).toBeGreaterThan(0)
    expect(response.body.model).toBeTruthy()
    expect(response.body).not.toHaveProperty('instructions')
    expect(response.body).not.toHaveProperty('promptContext')
    expect(JSON.stringify(response.body)).not.toMatch(/OPENAI_API_KEY|sk-proj-|sk-live-/)
  })

  it('returns a safe validation error for an empty question', async () => {
    const response = await handleAskRequest({ question: '' })

    expect(response.statusCode).toBe(400)
    expect(response.body).toEqual({ error: EMPTY_QUESTION_ERROR })
  })

  it('returns insufficient_context as a normal JSON response', async () => {
    const response = await handleAskRequest(
      { question: 'zzzznonexistenttopicqwerty' },
      { answerProvider: fakeAnswerProvider },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe(INSUFFICIENT_CONTEXT_STATUS)
    expect(response.body.message).toContain('campground knowledge base')
    expect(response.body.citations).toEqual([])
  })
})

describe('ask handler safety', () => {
  const apiDir = path.resolve(__dirname)

  it('does not import the OpenAI client directly from ask API modules', () => {
    const apiFiles = ['askHandler.js', 'askRoute.js', 'askApiPlugin.js']

    for (const fileName of apiFiles) {
      const source = fs.readFileSync(path.join(apiDir, fileName), 'utf8')
      const importLines = source.split('\n').filter((line) => /^\s*import\s/.test(line))

      for (const importLine of importLines) {
        expect(importLine).not.toMatch(/openAiResponsesClient|createAnswerProvider/)
      }
    }
  })
})
