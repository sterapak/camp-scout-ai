/** @jest-environment node */

import {
  buildSummaryCacheKey,
  clearSummaryCache,
  getCachedSummary,
  setCachedSummary,
} from './campgroundSummaryCache.js'

describe('campgroundSummaryCache', () => {
  afterEach(() => {
    clearSummaryCache()
  })

  it('stores and retrieves summaries by campground and snapshot id', () => {
    const knowledgeSnapshot = {
      id: 'abc123',
      contentHash: 'abc123',
      lastFetchedAt: '2026-06-25T12:00:00.000Z',
      sourceName: 'National Park Service',
    }

    setCachedSummary({
      campgroundId: 'yosemite-upper-pines',
      knowledgeSnapshot,
      generatedAt: '2026-06-27T10:00:00.000Z',
      summary: {
        status: 'success',
        campgroundId: 'yosemite-upper-pines',
        campgroundName: 'Upper Pines',
        sections: {
          overview: 'Overview text',
          amenities: '',
          restrictions: '',
          reservations: '',
          highlights: '',
        },
        citations: [],
        sources: [],
        evidence: [],
        confidence: 'high',
        model: 'fake',
      },
    })

    expect(buildSummaryCacheKey('yosemite-upper-pines', 'abc123')).toBe('yosemite-upper-pines:abc123')
    expect(getCachedSummary('yosemite-upper-pines', knowledgeSnapshot)?.generatedAt).toBe(
      '2026-06-27T10:00:00.000Z',
    )
  })
})
