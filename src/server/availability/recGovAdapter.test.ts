/** @jest-environment node */
import {
  fetchMonthAvailability,
  mapRecGovStatus,
  normalizeRecGov,
  parseRecGovCampgroundId,
} from './recGovAdapter.js'

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
})
