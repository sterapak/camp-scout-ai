/** @jest-environment node */

import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import {
  buildGroundedAnswerInstructions,
  buildInsufficientContextResponse,
  filterRelevantResults,
  generateGroundedAnswer,
  GROUNDED_ANSWER_MAX_OUTPUT_TOKENS,
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
  toGroundedAnswerCitation,
} from './groundedAnswerGenerator.js'
import { retrieveDocuments } from '../../data/knowledge/knowledgeRetrieval.js'

describe('groundedAnswerGenerator helpers', () => {
  it('builds instructions that require citations for each source', () => {
    const instructions = buildGroundedAnswerInstructions(2)

    expect(instructions).toContain('Answer using ONLY the retrieved source excerpts')
    expect(instructions).toContain('[Source N] where N is 1 through 2')
    expect(instructions).toContain('Sources:')
  })

  it('maps retrieval sources to citation metadata', () => {
    const citation = toGroundedAnswerCitation({
      id: 'doc-1',
      title: 'Campground Rules',
      sourceName: 'National Park Service',
      sourceUrl: 'https://example.com/rules',
      campgroundName: 'Upper Pines',
      documentType: 'rules',
      relevanceScore: 10,
    })

    expect(citation).toEqual({
      id: 'doc-1',
      title: 'Campground Rules',
      sourceName: 'National Park Service',
      sourceUrl: 'https://example.com/rules',
      campgroundName: 'Upper Pines',
      documentType: 'rules',
    })
  })

  it('filters out zero-score retrieval results', () => {
    const results = retrieveDocuments({ query: 'zzzznonexistenttopicqwerty', limit: 5 })
    expect(filterRelevantResults(results)).toEqual([])
  })

  it('returns the insufficient-context response shape', () => {
    const response = buildInsufficientContextResponse('No matching sources.')

    expect(response).toEqual({
      status: INSUFFICIENT_CONTEXT_STATUS,
      message: 'No matching sources.',
      citations: [],
    })
  })
})

describe('generateGroundedAnswer', () => {
  it('returns an answer with citations on the happy path', async () => {
    const result = await generateGroundedAnswer({
      question: 'What are the bear food storage rules?',
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
    })

    expect(result.status).toBe(SUCCESS_STATUS)
    expect(result.answer).toContain('Fake provider answer for:')
    expect(result.citations.length).toBeGreaterThan(0)
    expect(result.citations.length).toBeLessThanOrEqual(3)

    for (const citation of result.citations) {
      expect(citation.sourceName).toBeTruthy()
      expect(citation.sourceUrl).toMatch(/^https:\/\//)
    }

    expect(result.model).toBeTruthy()
  })

  it('passes retrieved context and citation instructions to the provider', async () => {
    const generateAnswer = jest.fn(async () => ({
      text: 'Grounded answer with [Source 1] citation.',
      model: 'fake-model',
      inputTokens: 10,
      outputTokens: 5,
    }))

    await generateGroundedAnswer({
      question: 'What are the reservation rules?',
      campgroundId: 'yosemite-upper-pines',
      answerProvider: { name: 'fake', generateAnswer },
    })

    expect(generateAnswer).toHaveBeenCalledTimes(1)

    const request = generateAnswer.mock.calls[0][0]
    expect(request.instructions).toContain('[Source N]')
    expect(request.instructions).toContain('Sources:')
    expect(request.input).toContain('User question: What are the reservation rules?')
    expect(request.input).toContain('The following official campground knowledge')
    expect(request.maxOutputTokens).toBe(GROUNDED_ANSWER_MAX_OUTPUT_TOKENS)
  })

  it('returns insufficient context when retrieval finds no relevant documents', async () => {
    const generateAnswer = jest.fn()

    const result = await generateGroundedAnswer({
      question: 'zzzznonexistenttopicqwerty',
      answerProvider: { name: 'fake', generateAnswer },
    })

    expect(result.status).toBe(INSUFFICIENT_CONTEXT_STATUS)
    expect(result.message).toContain('campground knowledge base')
    expect(result.citations).toEqual([])
    expect(generateAnswer).not.toHaveBeenCalled()
  })

  it('returns insufficient context for an empty question without calling the provider', async () => {
    const generateAnswer = jest.fn()

    const result = await generateGroundedAnswer({
      question: '   ',
      answerProvider: { name: 'fake', generateAnswer },
    })

    expect(result.status).toBe(INSUFFICIENT_CONTEXT_STATUS)
    expect(result.message).toContain('question is required')
    expect(result.citations).toEqual([])
    expect(generateAnswer).not.toHaveBeenCalled()
  })

  it('uses the fake provider by default without network calls', async () => {
    const result = await generateGroundedAnswer({
      question: 'What are the bear rules?',
      campgroundId: 'yosemite-upper-pines',
    })

    expect(result.status).toBe(SUCCESS_STATUS)
    expect(result.answer).toContain('Fake provider answer for:')
  })
})
