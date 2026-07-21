/** @jest-environment node */
import { generateCampgroundSummary } from './campgroundSummaryGenerator.js'
import type { RetrievalResult } from '../../data/knowledge/knowledgeRetrieval.js'

// Minimal answer provider so no real OpenAI call happens.
function fakeProvider() {
  return {
    name: 'fake',
    generateAnswer: async () => ({
      text: '## Overview\nA nice campground.\n## Amenities\nRestrooms and water.',
      model: 'fake-model',
      inputTokens: 10,
      outputTokens: 5,
    }),
  } as unknown as import('../openai/answerProvider.js').AnswerProvider
}

function ridbResults(): RetrievalResult[] {
  return [
    {
      document: {
        id: 'ridb-999999-description',
        campgroundId: '999999',
        title: 'Test CG — Recreation.gov overview',
        documentType: 'description',
        content: 'A nice campground near a lake with restrooms and drinking water.',
        sourceUrl: 'https://www.recreation.gov/camping/campgrounds/999999',
        sourceName: 'Recreation.gov',
        lastUpdatedAt: '2026-07-21T00:00:00.000Z',
      },
      relevanceScore: 100,
      sourceUrl: 'https://www.recreation.gov/camping/campgrounds/999999',
      sourceName: 'Recreation.gov',
      campgroundName: 'Test CG',
    },
  ]
}

describe('generateCampgroundSummary — RIDB campground not in the static list', () => {
  // Regression: campgroundName came from `campground.name`, but getCampgroundById
  // returns undefined for a browsed (non-curated) recreation.gov id, so this threw
  // "Cannot read properties of null (reading 'name')" AFTER the paid OpenAI call.
  it('succeeds via campgroundName override when the campground is not curated', async () => {
    const result = (await generateCampgroundSummary({
      campgroundId: '999999',
      overrideResults: ridbResults(),
      campgroundName: 'Test CG',
      answerProvider: fakeProvider(),
    })) as { status: string; campgroundName?: string; campgroundId?: string }

    expect(result.status).toBe('success')
    expect(result.campgroundName).toBe('Test CG')
    expect(result.campgroundId).toBe('999999')
  })
})
