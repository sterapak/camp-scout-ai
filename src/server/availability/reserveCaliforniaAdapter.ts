/**
 * ReserveCalifornia (California State Parks) availability adapter.
 *
 * ReserveCalifornia has NO official/public API. Its browsing backend runs on
 * Tyler Technologies' "RDR" platform, which serves availability UNauthenticated
 * (you only log in to book, not to view). This adapter reads that public grid.
 * It is a personal-tool integration: unsanctioned, best-effort, and fragile —
 * if Tyler adds tokens/rate-limits/bot-protection it will break. We poll gently
 * (browser UA, spacing/backoff in the scheduler, shared per-facility caching).
 *
 * Flow: place search (PlaceId -> facilities) then grid (FacilityId + dates ->
 * per-site, per-night availability). This module handles the grid; place search
 * lives in reserveCaliforniaSearch.ts.
 */
import { politeFetchJson, type PoliteFetchOptions } from './politeFetch.js'
import type { FetchAvailabilityResult, NormalizedAvailability } from './types.js'

const RC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'

export const RC_BASE =
  'https://california-rdr.prod.cali.rd12.recreation-management.tylerapp.com/rdr'

// Browser-like headers so a datacenter request looks like the real site's calls
// (Tyler's WAF 403s bare requests from server IPs).
const RC_HEADERS: Record<string, string> = {
  Origin: 'https://www.reservecalifornia.com',
  Referer: 'https://www.reservecalifornia.com/',
  'Accept-Language': 'en-US,en;q=0.9',
  'sec-ch-ua': '"Chromium";v="126", "Not.A/Brand";v="24"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
}

interface RcSlice {
  Date?: string
  IsFree?: boolean
  IsBlocked?: boolean
}
interface RcUnit {
  UnitId?: number | string
  Name?: string
  Slices?: Record<string, RcSlice> | RcSlice[]
}
interface RcGridResponse {
  Facility?: { Name?: string; Units?: Record<string, RcUnit> | RcUnit[] }
}

function asArray<T>(v: Record<string, T> | T[] | undefined): T[] {
  if (!v) return []
  return Array.isArray(v) ? v : Object.values(v)
}

/** '2026-08-...' -> last calendar day of that month, 'YYYY-MM-DD'. */
export function monthEndDate(monthKey: string): string {
  const y = Number(monthKey.slice(0, 4))
  const m = Number(monthKey.slice(5, 7))
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate() // day 0 of next month
  return `${monthKey}-${String(last).padStart(2, '0')}`
}

export function normalizeRcGrid(raw: RcGridResponse): NormalizedAvailability {
  const out: NormalizedAvailability = {}
  for (const unit of asArray(raw.Facility?.Units)) {
    const siteId = unit.UnitId != null ? String(unit.UnitId) : ''
    if (!siteId) continue
    const dates: Record<string, 'available' | 'reserved' | 'closed'> = {}
    for (const slice of asArray(unit.Slices)) {
      const date = (slice.Date ?? '').slice(0, 10)
      if (!date) continue
      dates[date] = slice.IsFree ? 'available' : 'reserved'
    }
    out[siteId] = { siteId, siteName: unit.Name ?? siteId, dates }
  }
  return out
}

/** Fetch + normalize one facility for a date window (inclusive). */
export async function fetchFacilityGrid(
  facilityId: string,
  startDate: string,
  endDate: string,
  options: PoliteFetchOptions = {},
): Promise<FetchAvailabilityResult> {
  const body = JSON.stringify({
    FacilityId: Number(facilityId),
    StartDate: startDate,
    EndDate: endDate,
    UnitCategoryId: 1, // Camping
    UnitTypesGroupIds: [],
    SleepingUnitId: 0,
    MinVehicleLength: 0,
    InSeasonOnly: false,
    WebOnly: true,
    IsADA: false,
  })
  const res = await politeFetchJson<RcGridResponse>(`${RC_BASE}/search/grid`, {
    method: 'POST',
    userAgent: RC_UA,
    headers: RC_HEADERS,
    body,
    ...options,
  })
  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error || 'fetch failed' }
  }
  if (!res.data.Facility) {
    return { ok: false, status: res.status, error: 'facility not found' }
  }
  return { ok: true, status: res.status, availability: normalizeRcGrid(res.data) }
}

/** monthKey 'YYYY-MM'. Matches the recGov adapter's signature for the scheduler. */
export async function fetchMonthAvailability(
  facilityId: string,
  monthKey: string,
  options: PoliteFetchOptions = {},
): Promise<FetchAvailabilityResult> {
  return fetchFacilityGrid(facilityId, `${monthKey}-01`, monthEndDate(monthKey), options)
}

/** Best-effort deep link (RC can't deep-link a facility cleanly; land on search). */
export function buildReserveCaliforniaLink(): string {
  return 'https://www.reservecalifornia.com/'
}

export type RcWatchableCheck =
  | { watchable: true; reason: 'ok' }
  | { watchable: false; reason: 'not_found' | 'probe_error'; status: number }

/** Confirm a facility id returns a real grid before saving a watch. */
export async function checkFacilityWatchable(
  facilityId: string,
  monthKey: string,
  options: PoliteFetchOptions = {},
): Promise<RcWatchableCheck> {
  if (!/^\d+$/.test(facilityId)) return { watchable: false, reason: 'not_found', status: 0 }
  const res = await fetchMonthAvailability(facilityId, monthKey, options)
  if (res.ok) return { watchable: true, reason: 'ok' }
  if (res.status === 404 || res.error === 'facility not found') {
    return { watchable: false, reason: 'not_found', status: res.status ?? 0 }
  }
  return { watchable: false, reason: 'probe_error', status: res.status ?? 0 }
}
