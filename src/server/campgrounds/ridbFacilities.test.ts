/** @jest-environment node */
import {
  californiaRegion,
  fetchFacilityCoords,
  fetchStateCampgrounds,
  titleCaseName,
  __resetFacilitiesCacheForTests,
} from './ridbFacilities.js'

function pagedFetch(pages: unknown[][], total: number): { impl: typeof fetch; calls: () => number } {
  let calls = 0
  const impl = (async (url: string) => {
    calls += 1
    const offset = Number(new URL(url).searchParams.get('offset') ?? '0')
    const page = pages[offset / 50] ?? []
    return {
      ok: true,
      status: 200,
      json: async () => ({ RECDATA: page, METADATA: { RESULTS: { TOTAL_COUNT: total } } }),
    }
  }) as unknown as typeof fetch
  return { impl, calls: () => calls }
}

const CG = (id: number, name: string, extra = {}) => ({
  FacilityID: id,
  FacilityName: name,
  FacilityTypeDescription: 'Campground',
  FacilityLatitude: 39,
  FacilityLongitude: -120,
  Reservable: true,
  Enabled: true,
  ...extra,
})

describe('fetchStateCampgrounds (RIDB facilities)', () => {
  const prevKey = process.env.RIDB_API_KEY
  beforeEach(() => {
    __resetFacilitiesCacheForTests()
    process.env.RIDB_API_KEY = 'test-key'
  })
  afterAll(() => {
    if (prevKey === undefined) delete process.env.RIDB_API_KEY
    else process.env.RIDB_API_KEY = prevKey
  })

  it('maps reservable campgrounds and builds a watchable reservation url', async () => {
    const { impl } = pagedFetch([[CG(232447, 'Upper Pines')]], 1)
    const list = await fetchStateCampgrounds('CA', impl)
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      id: '232447',
      facilityId: '232447',
      name: 'Upper Pines',
      reservationUrl: 'https://www.recreation.gov/camping/campgrounds/232447',
    })
  })

  it('filters out non-campgrounds, disabled, and non-reservable facilities', async () => {
    const { impl } = pagedFetch(
      [
        [
          CG(1, 'Real CG'),
          CG(2, 'A Day Use Area', { FacilityTypeDescription: 'Day Use Area' }),
          CG(3, 'Disabled CG', { Enabled: false }),
          CG(4, 'First-come CG', { Reservable: false }),
        ],
      ],
      4,
    )
    const list = await fetchStateCampgrounds('CA', impl)
    expect(list.map((c) => c.name)).toEqual(['Real Cg'])
  })

  it('title-cases ALL-CAPS RIDB names, keeping known acronyms', () => {
    expect(titleCaseName('ACKERMAN CAMPGROUND')).toBe('Ackerman Campground')
    expect(titleCaseName('SILVER CREEK-TRUCKEE')).toBe('Silver Creek-Truckee')
    expect(titleCaseName('ASPEN GROUP (INYO)')).toBe('Aspen Group (Inyo)')
    expect(titleCaseName('UPPER PINES RV AREA')).toBe('Upper Pines RV Area')
  })

  it('paginates until the reported total is covered and dedups', async () => {
    const page0 = Array.from({ length: 50 }, (_, i) => CG(1000 + i, `CG ${1000 + i}`))
    const page1 = [CG(1000, 'CG 1000 dup'), CG(2000, 'CG 2000')]
    const { impl, calls } = pagedFetch([page0, page1], 52)
    const list = await fetchStateCampgrounds('CA', impl)
    expect(calls()).toBe(2)
    expect(list).toHaveLength(51) // 50 + 1 new (dup dropped)
  })

  it('returns [] and does not fetch when no API key is set', async () => {
    delete process.env.RIDB_API_KEY
    const spy = jest.fn()
    expect(await fetchStateCampgrounds('CA', spy as unknown as typeof fetch)).toEqual([])
    expect(spy).not.toHaveBeenCalled()
  })

  it('degrades to [] on an RIDB error', async () => {
    const failing = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as typeof fetch
    expect(await fetchStateCampgrounds('CA', failing)).toEqual([])
  })

  it('caches results (second call does not re-fetch)', async () => {
    const { impl, calls } = pagedFetch([[CG(232447, 'Upper Pines')]], 1)
    await fetchStateCampgrounds('CA', impl)
    await fetchStateCampgrounds('CA', impl)
    expect(calls()).toBe(1)
  })

  it('resolves coords for any facility id via RIDB (curated campgrounds not in the list)', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ FacilityLatitude: 37.7455, FacilityLongitude: -119.5581 }),
    })) as unknown as typeof fetch
    expect(await fetchFacilityCoords('232447', fetchImpl)).toEqual({ lat: 37.7455, lng: -119.5581 })
  })

  it('returns null coords for 0,0 or non-numeric ids', async () => {
    const zero = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ FacilityLatitude: 0, FacilityLongitude: 0 }),
    })) as unknown as typeof fetch
    expect(await fetchFacilityCoords('999', zero)).toBeNull()
    const spy = jest.fn()
    expect(await fetchFacilityCoords('abc', spy as unknown as typeof fetch)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('buckets coordinates into coarse California regions', () => {
    expect(californiaRegion(40, -124)).toBe('Northern California')
    expect(californiaRegion(37, -119)).toBe('Sierra Nevada')
    expect(californiaRegion(34, -116)).toBe('Southern California (Desert)')
    expect(californiaRegion(null, null)).toBe('California')
  })
})
