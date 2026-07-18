/** @jest-environment node */
import {
  checkFacilityWatchable,
  fetchMonthAvailability,
  monthEndDate,
  normalizeRcGrid,
} from './reserveCaliforniaAdapter.js'

const GRID = {
  Facility: {
    Name: 'Lower Eagle Point',
    Units: {
      '40939': {
        UnitId: 40939,
        Name: 'Tent Campsite #34',
        Slices: {
          '2026-08-01': { Date: '2026-08-01T00:00:00', IsFree: false },
          '2026-08-05': { Date: '2026-08-05T00:00:00', IsFree: true },
        },
      },
    },
  },
}

function gridFetch(ok = true, status = 200, body: unknown = GRID): typeof fetch {
  return (async () => ({ ok, status, statusText: 'OK', json: async () => body })) as unknown as typeof fetch
}

describe('reserveCaliforniaAdapter', () => {
  it('computes the last day of a month', () => {
    expect(monthEndDate('2026-08')).toBe('2026-08-31')
    expect(monthEndDate('2026-02')).toBe('2026-02-28')
    expect(monthEndDate('2026-11')).toBe('2026-11-30')
  })

  it('normalizes the grid: IsFree -> available, else reserved', () => {
    const norm = normalizeRcGrid(GRID)
    expect(norm['40939']).toMatchObject({ siteId: '40939', siteName: 'Tent Campsite #34' })
    expect(norm['40939'].dates).toEqual({ '2026-08-01': 'reserved', '2026-08-05': 'available' })
  })

  it('fetches + normalizes a month', async () => {
    const res = await fetchMonthAvailability('472', '2026-08', { fetchImpl: gridFetch() })
    expect(res.ok).toBe(true)
    expect(res.availability?.['40939'].dates['2026-08-05']).toBe('available')
  })

  it('flags a missing Facility as an error', async () => {
    const res = await fetchMonthAvailability('999', '2026-08', { fetchImpl: gridFetch(true, 200, {}) })
    expect(res.ok).toBe(false)
  })

  it('validates a watchable facility, rejects a non-numeric id without fetching', async () => {
    expect(await checkFacilityWatchable('472', '2026-08', { fetchImpl: gridFetch() })).toEqual({
      watchable: true,
      reason: 'ok',
    })
    const spy = jest.fn()
    expect(await checkFacilityWatchable('abc', '2026-08', { fetchImpl: spy as unknown as typeof fetch })).toMatchObject(
      { watchable: false, reason: 'not_found' },
    )
    expect(spy).not.toHaveBeenCalled()
  })
})
