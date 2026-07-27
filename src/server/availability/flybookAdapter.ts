/**
 * The Flybook availability adapter (captured live against Sly Park / EID 2026-07-27).
 *
 * Sly Park (and other EID sites) reserve through The Flybook, NOT Recreation.gov.
 * The booking widget's availability endpoint:
 *
 *   POST https://go.theflybook.com/vX/lodging/RoomFinder
 *   Content-Type: application/json
 *   { accountId: <number>, numberOfGuests: <number>, start: <ISO>, end: <ISO> }
 *
 * Returns a JSON ARRAY of every site for the account, each with `isRoomBookable`
 * for the requested stay. It is STAY-based (one contiguous start→end), not a
 * month calendar — so to produce the month grid the scheduler/diff-engine expect,
 * we query one night at a time (start=D, end=D+1) and assemble per-date statuses.
 *
 * `facilityId` for this platform is the Flybook ACCOUNT id as a string (e.g. "356").
 * The account already scopes to a single property, so no entity id is needed in
 * the request body (it lives only in the widget URL).
 *
 * NOTE: this is The Flybook's private widget endpoint (no official API access for
 * us). Keep the footprint small — requests are serialized with a per-night delay,
 * and the scheduler owns the outer per-platform spacing/backoff.
 */
import { politeFetchJson, type PoliteFetchOptions } from './politeFetch.js'
import type {
  FetchAvailabilityResult,
  NormalizedAvailability,
  NormalizedSite,
  SiteStatus,
} from './types.js'

const FLYBOOK_BASE = 'https://go.theflybook.com'
const ROOMFINDER_URL = `${FLYBOOK_BASE}/vX/lodging/RoomFinder`

// Descriptive UA (the endpoint tolerates it) — same posture as the other adapters.
const FLYBOOK_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

/** Space out the per-night POSTs so a month sweep isn't a burst on a third-party endpoint. */
const DEFAULT_PER_NIGHT_DELAY_MS = 350

export interface FlybookFetchOptions extends PoliteFetchOptions {
  /** Guests to search for (some sites gate on capacity). Default 1. */
  numberOfGuests?: number
  /** Delay between the per-night requests. Tests pass 0. */
  perNightDelayMs?: number
  /** The account's `x-fb-api-key`. Tests inject; prod reads FLYBOOK_API_KEY_<accountId>. */
  apiKey?: string
}

/**
 * RoomFinder requires an `x-fb-api-key` header (the account's Flybook embed key);
 * a bare POST 403s "No authorization provided". The key is per-account, so it's
 * read from env `FLYBOOK_API_KEY_<accountId>` (a Fly secret) — never committed.
 */
function resolveApiKey(accountId: number, override?: string): string | undefined {
  if (override) return override
  return process.env[`FLYBOOK_API_KEY_${accountId}`]
}

/** One site as returned by RoomFinder (only the fields we consume). */
interface RoomFinderSite {
  roomId?: number | string
  name?: string
  capacity?: number
  categoryFilters?: string[]
  inactive?: boolean
  frontEndEnabled?: boolean
  isRoomBookable?: boolean
}

/** RoomFinder returns a bare array; `isRoomBookable` is the availability signal. */
export function mapFlybookStatus(site: RoomFinderSite): SiteStatus {
  if (site.inactive === true || site.frontEndEnabled === false) return 'closed'
  return site.isRoomBookable === true ? 'available' : 'reserved'
}

const sleep = (ms: number) =>
  ms > 0 ? new Promise<void>((r) => setTimeout(r, ms)) : Promise.resolve()

/** monthKey 'YYYY-MM' -> number of days in that month (UTC-safe). */
function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  // Day 0 of the next month = last day of this month.
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/**
 * ISO for `${monthKey}-${dd}` at NOON UTC. Noon (not midnight) keeps the UTC date
 * equal to the intended calendar date regardless of the property's timezone — the
 * live widget sends a mid-day-UTC stamp for the same reason.
 */
function nightIso(monthKey: string, day: number): { start: string; end: string } {
  const [y, m] = monthKey.split('-').map(Number)
  const startMs = Date.UTC(y, m - 1, day, 12, 0, 0, 0)
  const start = new Date(startMs).toISOString()
  const end = new Date(startMs + 24 * 60 * 60 * 1000).toISOString()
  return { start, end }
}

async function fetchNight(
  accountId: number,
  apiKey: string,
  start: string,
  end: string,
  numberOfGuests: number,
  options: PoliteFetchOptions,
) {
  return politeFetchJson<RoomFinderSite[]>(ROOMFINDER_URL, {
    method: 'POST',
    userAgent: FLYBOOK_UA,
    headers: { 'x-fb-api-key': apiKey },
    body: JSON.stringify({ accountId, numberOfGuests, start, end }),
    ...options,
  })
}

/**
 * monthKey is 'YYYY-MM'. Sweeps every night of the month via RoomFinder and
 * assembles the normalized per-site, per-date grid.
 */
export async function fetchMonthAvailability(
  facilityId: string,
  monthKey: string,
  options: FlybookFetchOptions = {},
): Promise<FetchAvailabilityResult> {
  const accountId = Number(facilityId)
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return { ok: false, status: 0, error: `invalid flybook accountId: ${facilityId}` }
  }
  const { numberOfGuests = 1, perNightDelayMs = DEFAULT_PER_NIGHT_DELAY_MS, apiKey, ...fetchOpts } =
    options
  const key = resolveApiKey(accountId, apiKey)
  if (!key) {
    return { ok: false, status: 0, error: `missing FLYBOOK_API_KEY_${accountId}` }
  }
  const nights = daysInMonth(monthKey)
  const out: NormalizedAvailability = {}
  let anyOk = false
  let lastStatus: number | undefined
  let lastError: string | undefined

  for (let day = 1; day <= nights; day++) {
    if (day > 1) await sleep(perNightDelayMs)
    const { start, end } = nightIso(monthKey, day)
    const res = await fetchNight(accountId, key, start, end, numberOfGuests, fetchOpts)

    if (!res.ok || !Array.isArray(res.data)) {
      lastStatus = res.status
      lastError = res.error || 'fetch failed'
      // Fail fast if the very first night errors (endpoint down / bad account) —
      // don't hammer 30 more times. A later transient miss just skips that date.
      if (day === 1) return { ok: false, status: lastStatus, error: lastError }
      continue
    }
    anyOk = true
    const dateKey = start.slice(0, 10)
    for (const site of res.data) {
      if (site.roomId === undefined || site.roomId === null) continue
      if (site.inactive === true || site.frontEndEnabled === false) continue
      const siteId = String(site.roomId)
      const existing: NormalizedSite =
        out[siteId] ||
        (out[siteId] = {
          siteId,
          siteName: site.name || siteId,
          siteType: site.categoryFilters?.[0],
          maxPeople: site.capacity,
          dates: {},
        })
      existing.dates[dateKey] = mapFlybookStatus(site)
    }
  }

  if (!anyOk) {
    return { ok: false, status: lastStatus, error: lastError || 'no nights fetched' }
  }
  return { ok: true, status: 200, availability: out }
}

export type WatchableCheck =
  | { watchable: true; reason: 'ok' }
  | { watchable: false; reason: 'not_found'; status: number }
  | { watchable: false; reason: 'probe_error'; status: number; detail?: string }

/**
 * Confirm a Flybook account actually returns lodging before we let someone watch
 * it. Probes a single upcoming night; a valid array (even if fully booked) means
 * it's watchable. Non-array/HTTP failure is treated as transient (fail open).
 */
export async function checkFacilityWatchable(
  facilityId: string,
  monthKey: string,
  options: FlybookFetchOptions = {},
): Promise<WatchableCheck> {
  const accountId = Number(facilityId)
  if (!Number.isInteger(accountId) || accountId <= 0) {
    return { watchable: false, reason: 'not_found', status: 0 }
  }
  const { numberOfGuests = 1, apiKey, ...fetchOpts } = options
  const key = resolveApiKey(accountId, apiKey)
  if (!key) {
    // No key configured — can't verify, but don't hard-reject; treat as transient.
    return { watchable: false, reason: 'probe_error', status: 0, detail: `missing FLYBOOK_API_KEY_${accountId}` }
  }
  const { start, end } = nightIso(monthKey, 1)
  const res = await fetchNight(accountId, key, start, end, numberOfGuests, fetchOpts)
  if (res.ok && Array.isArray(res.data)) return { watchable: true, reason: 'ok' }
  if (res.status === 404) return { watchable: false, reason: 'not_found', status: 404 }
  return { watchable: false, reason: 'probe_error', status: res.status ?? 0, detail: res.error }
}

/**
 * Booking deep link from the Flybook account id (the watch's facilityId). Lands
 * on the operator's Flybook booking widget. There is no per-site URL param, so
 * this is the campground-level book page.
 */
export function buildFlybookBookingLink(facilityId: string): string {
  return `${FLYBOOK_BASE}/Book/${encodeURIComponent(facilityId)}`
}
