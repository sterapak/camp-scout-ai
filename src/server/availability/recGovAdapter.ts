/**
 * Recreation.gov availability adapter (validated against live data 2026-07-17).
 *
 * Availability endpoint (per campground, per month):
 *   GET https://www.recreation.gov/api/camps/availability/campground/{id}/month
 *       ?start_date=<URL-ENCODED YYYY-MM-01T00:00:00.000Z>
 * The ONE gotcha: start_date must be URL-encoded (the ':' chars) or the API
 * returns 400 {"error":"query not encoded"}. Requires a browser-like User-Agent
 * (it sits behind Akamai). Response: { campsites: { [id]: { campsite_id, site,
 * loop, campsite_type, max_num_people, availabilities: { '<ISO>': 'Reserved' |
 * 'Available' | 'Closed' | ... } } } }.
 *
 * Deep link to a specific bookable site: https://www.recreation.gov/camping/campsites/{campsite_id}
 */
import { politeFetchJson, type PoliteFetchOptions } from './politeFetch.js'
import type {
  FetchAvailabilityResult,
  NormalizedAvailability,
  NormalizedSite,
  SiteStatus,
} from './types.js'

const RECGOV_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

const BASE = 'https://www.recreation.gov'

interface RawCampsite {
  campsite_id?: string
  site?: string
  loop?: string
  campsite_type?: string
  max_num_people?: number
  availabilities?: Record<string, string>
}
interface RawResponse {
  campsites?: Record<string, RawCampsite>
}

/** Recreation.gov status string -> our normalized status. Only 'Available' is bookable. */
export function mapRecGovStatus(raw: string): SiteStatus {
  const s = (raw || '').toLowerCase()
  if (s === 'available') return 'available'
  if (s === 'reserved') return 'reserved'
  return 'closed'
}

/** '2026-08-01T00:00:00Z' -> '2026-08-01'. */
function isoToDate(iso: string): string {
  return iso.slice(0, 10)
}

export function normalizeRecGov(raw: RawResponse): NormalizedAvailability {
  const out: NormalizedAvailability = {}
  const campsites = raw.campsites || {}
  for (const [id, cs] of Object.entries(campsites)) {
    const dates: Record<string, SiteStatus> = {}
    for (const [iso, status] of Object.entries(cs.availabilities || {})) {
      dates[isoToDate(iso)] = mapRecGovStatus(status)
    }
    const site: NormalizedSite = {
      siteId: cs.campsite_id || id,
      siteName: cs.site || cs.campsite_id || id,
      siteType: cs.campsite_type,
      loop: cs.loop,
      maxPeople: cs.max_num_people,
      dates,
    }
    out[site.siteId] = site
  }
  return out
}

/** monthKey is 'YYYY-MM'. Fetches + normalizes one campground-month. */
export async function fetchMonthAvailability(
  campgroundId: string,
  monthKey: string,
  options: PoliteFetchOptions = {},
): Promise<FetchAvailabilityResult> {
  const startDate = `${monthKey}-01T00:00:00.000Z`
  const url = `${BASE}/api/camps/availability/campground/${encodeURIComponent(
    campgroundId,
  )}/month?start_date=${encodeURIComponent(startDate)}`

  const res = await politeFetchJson<RawResponse>(url, {
    userAgent: RECGOV_UA,
    ...options,
  })

  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error || 'fetch failed' }
  }
  return { ok: true, status: res.status, availability: normalizeRecGov(res.data) }
}

/** Deep link straight to a specific bookable campsite. */
export function buildSiteDeepLink(siteId: string): string {
  return `${BASE}/camping/campsites/${siteId}`
}

/** Secondary link: the campground's availability grid. */
export function buildCampgroundLink(campgroundId: string): string {
  return `${BASE}/camping/campgrounds/${campgroundId}/availability`
}

/**
 * Extract a Recreation.gov campground id from a URL like
 * https://www.recreation.gov/camping/campgrounds/232447 (used to seed a watch
 * from the existing campground detail pages).
 */
export function parseRecGovCampgroundId(url: string): string | null {
  const m = /recreation\.gov\/camping\/campgrounds\/(\d+)/i.exec(url || '')
  return m ? m[1] : null
}
