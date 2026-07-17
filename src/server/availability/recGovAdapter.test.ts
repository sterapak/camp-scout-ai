/** @jest-environment node */
import {
  checkCampgroundWatchable,
  fetchMonthAvailability,
  mapRecGovStatus,
  normalizeRecGov,
  parseRecGovCampgroundId,
} from './recGovAdapter.js'

const fetchWith = (ok: boolean, status: number): typeof fetch =>
  (async () => ({
    ok,
    status,
    statusText: ok ? 'OK' : 'Err',
    json: async () => (ok ? { campsites: {} } : {}),
  })) as unknown as typeof fetch

describe('recGovAdapter', () => {
  it('maps only "Available" to available', () => {
    expect(mapRecGovStatus('Available')).toBe('available')
    expect(mapRecGovStatus('Reserved')).toBe('reserved')
    expect(mapRecGovStatus('Closed')).toBe('closed')
    expect(mapRecGovStatus('Not Reservable')).toBe('closed')
  })

  it('normalizes the recreation.gov shape (dates trimmed, statuses mapped)', () => {
    const raw = {
      campsites: {
        '100': {
          campsite_id: '100',
          site: '044',
          loop: 'Upper Pines',
          campsite_type: 'STANDARD NONELECTRIC',
          max_num_people: 6,
          availabilities: {
            '2026-08-01T00:00:00Z': 'Reserved',
            '2026-08-02T00:00:00Z': 'Available',
          },
        },
      },
    }
    const norm = normalizeRecGov(raw)
    expect(norm['100']).toMatchObject({
      siteId: '100',
      siteName: '044',
      loop: 'Upper Pines',
      maxPeople: 6,
    })
    expect(norm['100'].dates).toEqual({ '2026-08-01': 'reserved', '2026-08-02': 'available' })
  })

  it('fetches with a URL-encoded start_date and returns normalized availability', async () => {
    let calledUrl = ''
    const fakeFetch = (async (url: string) => {
      calledUrl = url
      return {
        ok: true,
        status: 200,
        json: async () => ({
          campsites: { '1': { campsite_id: '1', site: 'A', availabilities: { '2026-08-05T00:00:00Z': 'Available' } } },
        }),
      }
    }) as unknown as typeof fetch

    const res = await fetchMonthAvailability('232447', '2026-08', { fetchImpl: fakeFetch })
    expect(res.ok).toBe(true)
    // the ':' in the timestamp must be percent-encoded (the 400 gotcha)
    expect(calledUrl).toContain('start_date=2026-08-01T00%3A00%3A00.000Z')
    expect(res.availability?.['1'].dates['2026-08-05']).toBe('available')
  })

  it('parses a campground id from a recreation.gov URL', () => {
    expect(
      parseRecGovCampgroundId('https://www.recreation.gov/camping/campgrounds/232447'),
    ).toBe('232447')
    expect(parseRecGovCampgroundId('https://example.com/nope')).toBeNull()
  })

  describe('checkCampgroundWatchable', () => {
    it('accepts a campground with a 200 availability feed', async () => {
      expect(await checkCampgroundWatchable('232447', '2026-08', { fetchImpl: fetchWith(true, 200) })).toEqual({
        watchable: true,
        reason: 'ok',
      })
    })

    it('rejects a 404 facility as not_found (the Gold Bluffs case)', async () => {
      expect(await checkCampgroundWatchable('232495', '2026-08', { fetchImpl: fetchWith(false, 404) })).toEqual({
        watchable: false,
        reason: 'not_found',
        status: 404,
      })
    })

    it('rejects a non-numeric id without any network call', async () => {
      const spy = jest.fn()
      const result = await checkCampgroundWatchable('abc', '2026-08', { fetchImpl: spy as unknown as typeof fetch })
      expect(result).toEqual({ watchable: false, reason: 'not_found', status: 0 })
      expect(spy).not.toHaveBeenCalled()
    })

    it('fails open (probe_error) on a 5xx so a blip does not block a valid campground', async () => {
      const result = await checkCampgroundWatchable('232447', '2026-08', { fetchImpl: fetchWith(false, 503) })
      expect(result).toMatchObject({ watchable: false, reason: 'probe_error', status: 503 })
    })
  })
})
