/** @jest-environment node */
import {
  checkFacilityWatchable,
  fetchMonthAvailability,
  mapFlybookStatus,
  buildFlybookBookingLink,
} from './flybookAdapter.js'

/** Mock fetch that returns a RoomFinder array (or an error), and records calls. */
function fetchReturning(
  sites: unknown[],
  opts: { ok?: boolean; status?: number } = {},
): { fetchImpl: typeof fetch; calls: Array<{ url: string; body: any }> } {
  const calls: Array<{ url: string; body: any }> = []
  const { ok = true, status = 200 } = opts
  const fetchImpl = (async (url: string, init: any) => {
    calls.push({ url, body: init?.body ? JSON.parse(init.body) : null })
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Err',
      json: async () => sites,
    }
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

const SITES = [
  { roomId: 10, name: '010 Pinecone', capacity: 6, categoryFilters: ['Waterview'], isRoomBookable: true },
  { roomId: 20, name: '020 Sierra', capacity: 6, isRoomBookable: false },
  { roomId: 30, name: 'Inactive', inactive: true, isRoomBookable: true },
]

describe('flybookAdapter', () => {
  it('maps isRoomBookable → available, else reserved; inactive/disabled → closed', () => {
    expect(mapFlybookStatus({ isRoomBookable: true })).toBe('available')
    expect(mapFlybookStatus({ isRoomBookable: false })).toBe('reserved')
    expect(mapFlybookStatus({ isRoomBookable: true, inactive: true })).toBe('closed')
    expect(mapFlybookStatus({ isRoomBookable: true, frontEndEnabled: false })).toBe('closed')
  })

  it('sweeps one RoomFinder POST per night and assembles the per-date grid', async () => {
    const { fetchImpl, calls } = fetchReturning(SITES)
    const res = await fetchMonthAvailability('356', '2026-02', { fetchImpl, perNightDelayMs: 0 })

    expect(res.ok).toBe(true)
    // Feb 2026 = 28 nights → 28 POSTs, all to RoomFinder with accountId 356.
    expect(calls).toHaveLength(28)
    expect(calls[0].url).toContain('/vX/lodging/RoomFinder')
    expect(calls[0].body).toMatchObject({ accountId: 356, numberOfGuests: 1 })
    expect(calls[0].body.start.slice(0, 10)).toBe('2026-02-01')

    const avail = res.availability!
    // Active bookable site present on every night; inactive site dropped entirely.
    expect(Object.keys(avail).sort()).toEqual(['10', '20'])
    expect(avail['30']).toBeUndefined()
    expect(Object.keys(avail['10'].dates)).toHaveLength(28)
    expect(avail['10'].dates['2026-02-01']).toBe('available')
    expect(avail['10'].dates['2026-02-28']).toBe('available')
    expect(avail['20'].dates['2026-02-15']).toBe('reserved')
    expect(avail['10'].siteName).toBe('010 Pinecone')
    expect(avail['10'].siteType).toBe('Waterview')
    expect(avail['10'].maxPeople).toBe(6)
  })

  it('fails fast (ok:false) when the first night errors — no 30-request hammer', async () => {
    const { fetchImpl, calls } = fetchReturning([], { ok: false, status: 500 })
    const res = await fetchMonthAvailability('356', '2026-02', { fetchImpl, perNightDelayMs: 0 })
    expect(res.ok).toBe(false)
    expect(res.status).toBe(500)
    expect(calls).toHaveLength(1)
  })

  it('rejects a non-numeric account id without any fetch', async () => {
    const { fetchImpl, calls } = fetchReturning(SITES)
    const res = await fetchMonthAvailability('not-a-number', '2026-02', { fetchImpl, perNightDelayMs: 0 })
    expect(res.ok).toBe(false)
    expect(calls).toHaveLength(0)
  })

  it('checkFacilityWatchable: array → watchable, 404 → not_found', async () => {
    const okr = await checkFacilityWatchable('356', '2026-02', {
      fetchImpl: fetchReturning(SITES).fetchImpl,
      perNightDelayMs: 0,
    })
    expect(okr).toEqual({ watchable: true, reason: 'ok' })

    const nf = await checkFacilityWatchable('356', '2026-02', {
      fetchImpl: fetchReturning([], { ok: false, status: 404 }).fetchImpl,
      perNightDelayMs: 0,
    })
    expect(nf).toMatchObject({ watchable: false, reason: 'not_found', status: 404 })
  })

  it('builds an account booking link', () => {
    expect(buildFlybookBookingLink('356')).toBe('https://go.theflybook.com/Book/356')
  })
})
