/**
 * Import Recreation.gov campgrounds for a state from the RIDB facilities API
 * (Recreation Information Database). Server-only: RIDB_API_KEY must not reach the
 * browser. Every imported campground is, by construction, watchable (it has a
 * recreation.gov facility id) and photo-enabled (same RIDB pipeline).
 *
 * Degrades gracefully: no key or any error -> empty list, so the app just keeps
 * its hand-curated seed set. Lazy + cached (24h) so we don't re-page RIDB per
 * request. Raw fetch (no SDK), matching the repo's lean-deps ethos.
 */

export interface RecgovCampground {
  id: string
  facilityId: string
  name: string
  region: string
  latitude: number | null
  longitude: number | null
  reservationUrl: string
  description: string
}

interface RidbFacility {
  FacilityID?: string | number
  FacilityName?: string
  FacilityTypeDescription?: string
  FacilityLatitude?: number
  FacilityLongitude?: number
  FacilityDescription?: string
  Reservable?: boolean
  Enabled?: boolean
}

interface CacheEntry {
  campgrounds: RecgovCampground[]
  expiresAt: number
}

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1'
const CAMPING_ACTIVITY_ID = 9 // RIDB activity id for "CAMPING"
const PAGE_SIZE = 50
const MAX_PAGES = 40 // safety cap (~2000 facilities)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const cache = new Map<string, CacheEntry>()

/** Test-only: clear the in-memory facilities cache. */
export function __resetFacilitiesCacheForTests(): void {
  cache.clear()
  coordsCache.clear()
}

interface CoordsEntry {
  coords: { lat: number; lng: number } | null
  expiresAt: number
}
const coordsCache = new Map<string, CoordsEntry>()

/**
 * Coordinates for ANY Recreation.gov facility id (via RIDB's per-facility
 * endpoint) — works for facilities not in the imported state list (e.g. curated
 * campgrounds like Upper Pines). Cached; null with no key / on error.
 */
export async function fetchFacilityCoords(
  facilityId: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<{ lat: number; lng: number } | null> {
  if (!/^\d+$/.test(facilityId)) return null
  const cached = coordsCache.get(facilityId)
  if (cached && cached.expiresAt > Date.now()) return cached.coords

  const apiKey = process.env.RIDB_API_KEY
  if (!apiKey) return null

  const valid = (a: number, b: number): boolean =>
    Number.isFinite(a) && Number.isFinite(b) && a !== 0 && b !== 0

  let coords: { lat: number; lng: number } | null = null
  try {
    const res = await fetchImpl(`${RIDB_BASE}/facilities/${facilityId}`, {
      headers: { apikey: apiKey, Accept: 'application/json' },
    })
    if (res.ok) {
      const f = (await res.json()) as RidbFacility
      const lat = Number(f.FacilityLatitude)
      const lng = Number(f.FacilityLongitude)
      if (valid(lat, lng)) {
        coords = { lat, lng }
      } else if (f.FacilityName) {
        // RIDB has no coords for this facility (data gap) — match by name in the
        // imported state list, which has good coordinates.
        const target = f.FacilityName.toLowerCase().replace(/\bcampground\b/g, '').trim()
        const hit = (await fetchStateCampgrounds('CA')).find((c) => {
          if (c.latitude == null || c.longitude == null) return false
          const n = c.name.toLowerCase()
          return n === target || n.startsWith(target) || target.startsWith(n)
        })
        if (hit && hit.latitude != null && hit.longitude != null) {
          coords = { lat: hit.latitude, lng: hit.longitude }
        }
      }
    }
  } catch {
    coordsCache.set(facilityId, { coords: null, expiresAt: Date.now() + 5 * 60 * 1000 })
    return null
  }
  coordsCache.set(facilityId, { coords, expiresAt: Date.now() + CACHE_TTL_MS })
  return coords
}

// Acronyms to keep uppercase after title-casing RIDB's ALL-CAPS names.
const KEEP_UPPER = new Set(['RV', 'NP', 'SP', 'SRA', 'OHV', 'ATV', 'USFS', 'BLM', 'NF', 'ADA'])

/** Title-case an ALL-CAPS RIDB name ("ACKERMAN CAMPGROUND" -> "Ackerman Campground"). */
export function titleCaseName(name: string): string {
  const titled = name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
  return titled.replace(/\b[A-Za-z]{2,5}\b/g, (w) => (KEEP_UPPER.has(w.toUpperCase()) ? w.toUpperCase() : w))
}

/** Coarse California region buckets for browse/filter, derived from coordinates. */
export function californiaRegion(lat: number | null, lon: number | null): string {
  if (lat == null || lon == null) return 'California'
  if (lat >= 38.5) return lon >= -119.5 ? 'Northeastern California' : 'Northern California'
  if (lat >= 36) return lon >= -119.5 ? 'Sierra Nevada' : 'Central California'
  return lon >= -117.5 ? 'Southern California (Desert)' : 'Southern California'
}

function cleanDescription(html: string | undefined): string {
  if (!html) return ''
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 280 ? `${text.slice(0, 277)}…` : text
}

function mapFacility(f: RidbFacility): RecgovCampground | null {
  const facilityId = f.FacilityID != null ? String(f.FacilityID) : ''
  if (!/^\d+$/.test(facilityId)) return null
  if (f.Reservable === false || f.Enabled === false) return null
  const type = (f.FacilityTypeDescription ?? '').toLowerCase()
  if (!type.includes('campground')) return null
  const name = f.FacilityName?.trim()
  if (!name) return null

  const latitude = typeof f.FacilityLatitude === 'number' && f.FacilityLatitude !== 0 ? f.FacilityLatitude : null
  const longitude = typeof f.FacilityLongitude === 'number' && f.FacilityLongitude !== 0 ? f.FacilityLongitude : null

  return {
    id: facilityId,
    facilityId,
    name: titleCaseName(name),
    region: californiaRegion(latitude, longitude),
    latitude,
    longitude,
    reservationUrl: `https://www.recreation.gov/camping/campgrounds/${facilityId}`,
    description: cleanDescription(f.FacilityDescription),
  }
}

async function fetchPage(
  state: string,
  offset: number,
  apiKey: string,
  fetchImpl: typeof fetch,
): Promise<{ facilities: RidbFacility[]; total: number }> {
  const params = new URLSearchParams({
    state,
    activity: String(CAMPING_ACTIVITY_ID),
    limit: String(PAGE_SIZE),
    offset: String(offset),
  })
  const res = await fetchImpl(`${RIDB_BASE}/facilities?${params.toString()}`, {
    headers: { apikey: apiKey, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`RIDB facilities HTTP ${res.status}`)
  const data = (await res.json()) as {
    RECDATA?: RidbFacility[]
    METADATA?: { RESULTS?: { TOTAL_COUNT?: number } }
  }
  return {
    facilities: data.RECDATA ?? [],
    total: data.METADATA?.RESULTS?.TOTAL_COUNT ?? 0,
  }
}

export async function fetchStateCampgrounds(
  state = 'CA',
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<RecgovCampground[]> {
  const cached = cache.get(state)
  if (cached && cached.expiresAt > Date.now()) return cached.campgrounds

  const apiKey = process.env.RIDB_API_KEY
  if (!apiKey) return []

  try {
    const out: RecgovCampground[] = []
    const seen = new Set<string>()
    let offset = 0
    let total = Infinity
    for (let page = 0; page < MAX_PAGES && offset < total; page += 1) {
      const { facilities, total: reported } = await fetchPage(state, offset, apiKey, fetchImpl)
      total = reported || facilities.length
      if (facilities.length === 0) break
      for (const f of facilities) {
        const mapped = mapFacility(f)
        if (mapped && !seen.has(mapped.id)) {
          seen.add(mapped.id)
          out.push(mapped)
        }
      }
      offset += PAGE_SIZE
    }
    out.sort((a, b) => a.name.localeCompare(b.name))
    cache.set(state, { campgrounds: out, expiresAt: Date.now() + CACHE_TTL_MS })
    return out
  } catch {
    // Cache an empty result briefly so a transient RIDB outage doesn't hammer it.
    cache.set(state, { campgrounds: [], expiresAt: Date.now() + 5 * 60 * 1000 })
    return []
  }
}
