/** @jest-environment node */

import fs from 'fs'
import path from 'path'
import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import { MissingOpenAiApiKeyError, OpenAiResponseError } from '../openai/errors.js'
import {
  EMPTY_QUESTION_ERROR,
  handleAskRequest,
  validateAskRequestBody,
} from './askHandler.js'
import {
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
} from '../rag/groundedAnswerGenerator.js'
import { retrieveDocuments } from '../../data/knowledge/knowledgeRetrieval.js'

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

  it('returns a safe 503 when the provider is missing an API key', async () => {
    const response = await handleAskRequest(
      {
        question: 'What are the bear food storage rules?',
        campgroundId: 'yosemite-upper-pines',
      },
      {
        answerProvider: {
          name: 'openai',
          async generateAnswer() {
            throw new MissingOpenAiApiKeyError()
          },
        },
      },
    )

    expect(response.statusCode).toBe(503)
    expect(response.body).toEqual({ error: 'Answer generation is not available.' })
    expect(JSON.stringify(response.body)).not.toMatch(/OPENAI_API_KEY|sk-proj-|sk-live-/)
  })

  it('returns a safe 502 when the provider fails', async () => {
    const response = await handleAskRequest(
      {
        question: 'What are the bear food storage rules?',
        campgroundId: 'yosemite-upper-pines',
      },
      {
        answerProvider: {
          name: 'openai',
          async generateAnswer() {
            throw new OpenAiResponseError('Upstream failure', { status: 500 })
          },
        },
      },
    )

    expect(response.statusCode).toBe(502)
    expect(response.body).toEqual({ error: 'Answer generation failed. Please try again.' })
    expect(JSON.stringify(response.body)).not.toMatch(/OPENAI_API_KEY|Upstream failure|sk-proj-|sk-live-/)
  })

  it('returns a clear quota error instead of 502 when OpenAI quota is exhausted', async () => {
    const response = await handleAskRequest(
      {
        question: 'What are the bear food storage rules?',
        campgroundId: 'yosemite-upper-pines',
      },
      {
        answerProvider: {
          name: 'openai',
          async generateAnswer() {
            throw new OpenAiResponseError('You exceeded your current quota.', {
              status: 429,
              errorCode: 'insufficient_quota',
            })
          },
        },
      },
    )

    expect(response.statusCode).toBe(503)
    expect(response.statusCode).not.toBe(502)
    expect(response.body.error).toMatch(/quota|credits/i)
    expect(JSON.stringify(response.body)).not.toMatch(/OPENAI_API_KEY|You exceeded|sk-proj-|sk-live-/)
  })

  it('retrieves Silver Lake West campsite count for camping site questions', () => {
    const results = retrieveDocuments({
      query: 'how many camping sites at silver lake?',
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].document.campgroundId).toBe('silver-lake-west')

    const combinedContent = results.slice(0, 3).map((result) => result.document.content).join(' ')
    expect(combinedContent).toMatch(/forty-two \(42\) campsites|42 campsites/i)
  })

  it('answers Silver Lake West campsite count questions with grounded context', async () => {
    const response = await handleAskRequest(
      {
        question: 'how many camping sites at silver lake?',
      },
      { answerProvider: fakeAnswerProvider },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe(SUCCESS_STATUS)
    expect(response.body.citations.length).toBeGreaterThan(0)
    expect(response.body.citations.some((citation) => citation.sourceName === 'El Dorado Irrigation District')).toBe(true)
  })

  it('returns ratings-unavailable for unsupported ratings questions', async () => {
    const response = await handleAskRequest(
      { question: 'What is the star rating for Silver Lake West?' },
      { answerProvider: fakeAnswerProvider },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe(SUCCESS_STATUS)
    expect(response.body.answer).toContain('Review ratings are not available yet')
    expect(response.body.citations).toEqual([])
    expect(response.body.model).toBe('capability-guardrail')
  })

  it('applies comparison guardrails for campground comparison questions', async () => {
    const generateAnswer = jest.fn(async () => ({
      text: 'I can compare Silver Lake West and Silver Lake East by official facts like operator, reservations, water, and campsite type, but I do not have review ratings yet.',
      model: 'fake-model',
      inputTokens: 10,
      outputTokens: 5,
    }))

    const response = await handleAskRequest(
      { question: 'Compare Silver Lake West and Silver Lake East' },
      { answerProvider: { name: 'fake', generateAnswer } },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe(SUCCESS_STATUS)
    expect(generateAnswer).toHaveBeenCalledTimes(1)

    const request = generateAnswer.mock.calls[0][0]
    expect(request.instructions).toContain('comparison question')
    expect(request.instructions).toContain('review ratings are not available')
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
