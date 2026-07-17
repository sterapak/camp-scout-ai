/**
 * Resolve an official campground photo from the Recreation.gov RIDB API
 * (Recreation Information Database). Server-only: the RIDB_API_KEY must never
 * reach the browser. We only resolve facilityId -> image URL + attribution; the
 * browser then loads the image directly from recreation.gov's CDN (allowed by
 * the img-src https: CSP).
 *
 * Degrades gracefully: with no key configured, or on any RIDB error, returns
 * null so the UI simply keeps its "Official image not available" placeholder.
 * Raw fetch (no SDK), matching the repo's lean-deps ethos.
 */

export interface FacilityPhoto {
  url: string
  altText: string
  sourceName: string
  sourceUrl: string
  priority: number
}

interface RidbMedia {
  MediaType?: string
  URL?: string
  Title?: string
  Credits?: string
  IsPrimary?: boolean
}

interface CacheEntry {
  photo: FacilityPhoto | null
  expiresAt: number
}

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // photos are effectively static
const cache = new Map<string, CacheEntry>()

/** Test-only: clear the in-memory photo cache. */
export function __resetRidbCacheForTests(): void {
  cache.clear()
}

function pickImage(media: RidbMedia[]): RidbMedia | null {
  const images = media.filter((m) => m.MediaType === 'Image' && typeof m.URL === 'string' && m.URL)
  if (images.length === 0) return null
  return images.find((m) => m.IsPrimary) ?? images[0]
}

export async function fetchFacilityPhoto(
  facilityId: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<FacilityPhoto | null> {
  if (!/^\d+$/.test(facilityId)) return null

  const cached = cache.get(facilityId)
  if (cached && cached.expiresAt > Date.now()) return cached.photo

  const apiKey = process.env.RIDB_API_KEY
  if (!apiKey) return null // feature off until a key is configured

  let photo: FacilityPhoto | null = null
  try {
    const res = await fetchImpl(`${RIDB_BASE}/facilities/${facilityId}/media`, {
      headers: { apikey: apiKey, Accept: 'application/json' },
    })
    if (res.ok) {
      const data = (await res.json()) as { RECDATA?: RidbMedia[] }
      const best = pickImage(data.RECDATA ?? [])
      if (best?.URL) {
        photo = {
          url: best.URL,
          altText: best.Title?.trim() || 'Official Recreation.gov campground photo',
          sourceName: best.Credits?.trim() || 'Recreation.gov',
          sourceUrl: `https://www.recreation.gov/camping/campgrounds/${facilityId}`,
          priority: 1,
        }
      }
    }
    // Non-OK (e.g. 404 no media, 401 bad key) falls through to a cached null.
  } catch {
    // Network error — cache a short-lived null so we retry sooner than a hit.
    cache.set(facilityId, { photo: null, expiresAt: Date.now() + 5 * 60 * 1000 })
    return null
  }

  cache.set(facilityId, { photo, expiresAt: Date.now() + CACHE_TTL_MS })
  return photo
}
