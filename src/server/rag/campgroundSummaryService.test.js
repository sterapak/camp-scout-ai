/** @jest-environment node */

import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import { clearSummaryCache, getCampgroundSummary } from './campgroundSummaryService.js'

describe('getCampgroundSummary caching', () => {
  afterEach(() => {
    clearSummaryCache()
  })

  it('stores generatedAt on first generation', async () => {
    const fixedNow = () => new Date('2026-06-27T15:30:00.000Z')

    const result = await getCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
      now: fixedNow,
    })

    expect(result.status).toBe('success')
    expect(result.generatedAt).toBe('2026-06-27T15:30:00.000Z')
    expect(result.knowledgeSnapshot?.contentHash).toBeTruthy()
    expect(result.cached).toBe(false)
  })

  it('returns the same generatedAt for cached summaries without silently changing timestamps', async () => {
    const firstNow = () => new Date('2026-06-27T15:30:00.000Z')
    const secondNow = () => new Date('2026-06-27T18:45:00.000Z')

    const first = await getCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
      now: firstNow,
    })

    const second = await getCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
      now: secondNow,
    })

    expect(first.generatedAt).toBe('2026-06-27T15:30:00.000Z')
    expect(second.generatedAt).toBe('2026-06-27T15:30:00.000Z')
    expect(second.cached).toBe(true)
  })

  it('updates generatedAt when forceRegenerate is true', async () => {
    const firstNow = () => new Date('2026-06-27T15:30:00.000Z')
    const secondNow = () => new Date('2026-06-27T18:45:00.000Z')

    await getCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
      now: firstNow,
    })

    const regenerated = await getCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
      forceRegenerate: true,
      now: secondNow,
    })

    expect(regenerated.generatedAt).toBe('2026-06-27T18:45:00.000Z')
    expect(regenerated.cached).toBe(false)
  })
})
