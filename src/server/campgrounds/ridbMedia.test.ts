/** @jest-environment node */
import { fetchFacilityPhoto, __resetRidbCacheForTests } from './ridbMedia.js'

function jsonFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({
    ok,
    status,
    json: async () => body,
  })) as unknown as typeof fetch
}

const RECDATA = {
  RECDATA: [
    { MediaType: 'Image', URL: 'https://cdn.recreation.gov/a.jpg', Title: 'Lake view', IsPrimary: false },
    { MediaType: 'Image', URL: 'https://cdn.recreation.gov/primary.jpg', Title: 'Hero', IsPrimary: true, Credits: 'NPS' },
    { MediaType: 'Video', URL: 'https://cdn.recreation.gov/v.mp4', IsPrimary: false },
  ],
}

describe('fetchFacilityPhoto (RIDB)', () => {
  const prevKey = process.env.RIDB_API_KEY
  beforeEach(() => {
    __resetRidbCacheForTests()
    process.env.RIDB_API_KEY = 'test-key'
  })
  afterAll(() => {
    if (prevKey === undefined) delete process.env.RIDB_API_KEY
    else process.env.RIDB_API_KEY = prevKey
  })

  it('returns the primary image with attribution', async () => {
    const photo = await fetchFacilityPhoto('232447', jsonFetch(RECDATA))
    expect(photo).toEqual({
      url: 'https://cdn.recreation.gov/primary.jpg',
      altText: 'Hero',
      sourceName: 'NPS',
      sourceUrl: 'https://www.recreation.gov/camping/campgrounds/232447',
      priority: 1,
    })
  })

  it('falls back to the first image when none is marked primary', async () => {
    const body = { RECDATA: [{ MediaType: 'Image', URL: 'https://cdn.recreation.gov/only.jpg' }] }
    const photo = await fetchFacilityPhoto('999', jsonFetch(body))
    expect(photo?.url).toBe('https://cdn.recreation.gov/only.jpg')
    expect(photo?.sourceName).toBe('Recreation.gov')
  })

  it('returns null when the facility has no image media', async () => {
    const photo = await fetchFacilityPhoto('111', jsonFetch({ RECDATA: [{ MediaType: 'Video', URL: 'x' }] }))
    expect(photo).toBeNull()
  })

  it('returns null (no fetch) when no API key is configured', async () => {
    delete process.env.RIDB_API_KEY
    const spy = jest.fn()
    const photo = await fetchFacilityPhoto('232447', spy as unknown as typeof fetch)
    expect(photo).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('rejects non-numeric facility ids without calling out', async () => {
    const spy = jest.fn()
    expect(await fetchFacilityPhoto('../secrets', spy as unknown as typeof fetch)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('caches a resolved photo (second call does not re-fetch)', async () => {
    const spy = jest.fn(async () => ({ ok: true, status: 200, json: async () => RECDATA }))
    await fetchFacilityPhoto('232447', spy as unknown as typeof fetch)
    await fetchFacilityPhoto('232447', spy as unknown as typeof fetch)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('degrades to null on a network error', async () => {
    const throwing = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await fetchFacilityPhoto('232447', throwing)).toBeNull()
  })
})
