/** @jest-environment node */
import { geocodeZip, __resetZipCacheForTests } from './geocodeZip.js'

const okFetch = (lat: string, lng: string): typeof fetch =>
  (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      places: [{ latitude: lat, longitude: lng, 'place name': 'Camino', 'state abbreviation': 'CA' }],
    }),
  })) as unknown as typeof fetch

describe('geocodeZip', () => {
  beforeEach(() => __resetZipCacheForTests())

  it('maps a zippopotam response to lat/lng/place', async () => {
    const loc = await geocodeZip('95709', okFetch('38.747', '-120.6743'))
    expect(loc).toEqual({ lat: 38.747, lng: -120.6743, place: 'Camino, CA' })
  })

  it('rejects a non-5-digit ZIP without any fetch', async () => {
    const spy = jest.fn()
    expect(await geocodeZip('abc', spy as unknown as typeof fetch)).toBeNull()
    expect(await geocodeZip('9570', spy as unknown as typeof fetch)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('returns null on a 404 (unknown ZIP)', async () => {
    const notFound = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch
    expect(await geocodeZip('00000', notFound)).toBeNull()
  })

  it('caches a resolved ZIP', async () => {
    const spy = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ places: [{ latitude: '1', longitude: '2', 'place name': 'X', 'state abbreviation': 'CA' }] }),
    }))
    await geocodeZip('95709', spy as unknown as typeof fetch)
    await geocodeZip('95709', spy as unknown as typeof fetch)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
