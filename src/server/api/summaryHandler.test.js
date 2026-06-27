/** @jest-environment node */

import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import { clearSummaryCache } from '../rag/campgroundSummaryService.js'
import { handleSummaryRequest } from './summaryHandler.js'

describe('handleSummaryRequest', () => {
  afterEach(() => {
    clearSummaryCache()
  })

  it('returns a structured summary for a valid campgroundId', async () => {
    const response = await handleSummaryRequest(
      { campgroundId: 'yosemite-upper-pines' },
      { answerProvider: fakeAnswerProvider },
    )

    expect(response.statusCode).toBe(200)
    expect(response.body.status).toBe('success')
    expect(response.body.sections.overview).toBeTruthy()
    expect(response.body.citations.length).toBeGreaterThan(0)
    expect(response.body.generatedAt).toBeTruthy()
    expect(response.body.knowledgeSnapshot?.contentHash).toBeTruthy()
  })

  it('returns cached summary with unchanged generatedAt on repeat requests', async () => {
    const first = await handleSummaryRequest(
      { campgroundId: 'yosemite-upper-pines' },
      { answerProvider: fakeAnswerProvider },
    )
    const second = await handleSummaryRequest(
      { campgroundId: 'yosemite-upper-pines' },
      { answerProvider: fakeAnswerProvider },
    )

    expect(first.body.generatedAt).toBe(second.body.generatedAt)
    expect(second.body.cached).toBe(true)
  })

  it('returns 400 when campgroundId is missing', async () => {
    const response = await handleSummaryRequest({})

    expect(response.statusCode).toBe(400)
    expect(response.body.error).toContain('campgroundId is required')
  })
})
