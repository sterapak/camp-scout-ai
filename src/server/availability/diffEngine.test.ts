/** @jest-environment node */
import { diffAvailability } from './diffEngine.js'
import type { NormalizedAvailability } from './types.js'

function site(
  id: string,
  dates: Record<string, 'available' | 'reserved' | 'closed'>,
  extra: Partial<{ loop: string; siteType: string; maxPeople: number }> = {},
): NormalizedAvailability {
  return {
    [id]: { siteId: id, siteName: id, dates, ...extra },
  }
}

const range = { startDate: '2026-08-01', endDate: '2026-08-31', minNights: 1 }

describe('diffAvailability', () => {
  it('detects a reserved -> available flip within the range', () => {
    const prev = site('A', { '2026-08-10': 'reserved' })
    const fresh = site('A', { '2026-08-10': 'available' })
    const matches = diffAvailability(prev, fresh, range)
    expect(matches).toHaveLength(1)
    expect(matches[0]).toMatchObject({ siteId: 'A', date: '2026-08-10' })
  })

  it('does NOT re-fire when already available in the previous snapshot', () => {
    const prev = site('A', { '2026-08-10': 'available' })
    const fresh = site('A', { '2026-08-10': 'available' })
    expect(diffAvailability(prev, fresh, range)).toHaveLength(0)
  })

  it('surfaces currently-available slots on the first snapshot (prev = null)', () => {
    const fresh = site('A', { '2026-08-10': 'available' })
    expect(diffAvailability(null, fresh, range)).toHaveLength(1)
  })

  it('ignores availability outside the watch date range', () => {
    const fresh = site('A', { '2026-09-05': 'available' })
    expect(diffAvailability(null, fresh, range)).toHaveLength(0)
  })

  it('respects site-type filters', () => {
    const fresh = site('A', { '2026-08-10': 'available' }, { siteType: 'RV' })
    expect(
      diffAvailability(null, fresh, { ...range, filters: { siteTypes: ['TENT'] } }),
    ).toHaveLength(0)
    expect(
      diffAvailability(null, fresh, { ...range, filters: { siteTypes: ['RV'] } }),
    ).toHaveLength(1)
  })

  it('requires minNights consecutive available nights', () => {
    const fresh = site('A', { '2026-08-10': 'available', '2026-08-11': 'reserved' })
    expect(diffAvailability(null, fresh, { ...range, minNights: 2 })).toHaveLength(0)
    const twoNights = site('A', { '2026-08-10': 'available', '2026-08-11': 'available' })
    const m = diffAvailability(null, twoNights, { ...range, minNights: 2 })
    expect(m).toHaveLength(1)
    expect(m[0].nights).toBeGreaterThanOrEqual(2)
  })
})
