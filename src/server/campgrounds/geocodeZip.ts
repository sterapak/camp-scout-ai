/**
 * Geocode a US ZIP to coordinates via zippopotam.us (free, no API key). Used to
 * filter campgrounds by distance from a ZIP. Server-side so the browser doesn't
 * call a third party; cached (ZIP centroids never move). Degrades to null.
 */

export interface ZipLocation {
  lat: number
  lng: number
  place: string
}

interface CacheEntry {
  loc: ZipLocation | null
  expiresAt: number
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000 // ZIP centroids are static
const cache = new Map<string, CacheEntry>()

/** Test-only: clear the ZIP cache. */
export function __resetZipCacheForTests(): void {
  cache.clear()
}

export async function geocodeZip(
  zip: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<ZipLocation | null> {
  if (!/^\d{5}$/.test(zip)) return null

  const cached = cache.get(zip)
  if (cached && cached.expiresAt > Date.now()) return cached.loc

  try {
    const res = await fetchImpl(`https://api.zippopotam.us/us/${zip}`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      // 404 = no such ZIP; cache the miss briefly.
      cache.set(zip, { loc: null, expiresAt: Date.now() + 60 * 60 * 1000 })
      return null
    }
    const data = (await res.json()) as {
      places?: Array<{
        latitude?: string
        longitude?: string
        'place name'?: string
        'state abbreviation'?: string
      }>
    }
    const p = data.places?.[0]
    const lat = Number(p?.latitude)
    const lng = Number(p?.longitude)
    if (!p || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      cache.set(zip, { loc: null, expiresAt: Date.now() + 60 * 60 * 1000 })
      return null
    }
    const loc: ZipLocation = {
      lat,
      lng,
      place: `${p['place name'] ?? ''}, ${p['state abbreviation'] ?? ''}`.replace(/^, |, $/g, ''),
    }
    cache.set(zip, { loc, expiresAt: Date.now() + CACHE_TTL_MS })
    return loc
  } catch {
    cache.set(zip, { loc: null, expiresAt: Date.now() + 5 * 60 * 1000 })
    return null
  }
}
