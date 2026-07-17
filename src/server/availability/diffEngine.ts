/**
 * Diff engine: given the previous + fresh normalized availability for a
 * (facility, month) and a watch's constraints, return the newly-available
 * (site, date) matches — i.e. a slot that just flipped TO available (a
 * cancellation, or newly-released inventory) within the watch's date range and
 * site filters.
 *
 * First snapshot (prev = null): every currently-available matching slot is a
 * candidate (the alerts_sent dedup guarantees each fires at most once, so a
 * watch created on a wide-open campground can't spam).
 */
import type {
  NormalizedAvailability,
  NormalizedSite,
  SiteFilters,
} from './types.js'

export interface WatchMatch {
  siteId: string
  siteName: string
  loop?: string
  siteType?: string
  date: string // the newly-freed night, 'YYYY-MM-DD'
  nights: number // consecutive available nights from `date` (>= minNights)
}

export interface DiffConstraints {
  startDate: string // 'YYYY-MM-DD' inclusive
  endDate: string // 'YYYY-MM-DD' inclusive
  minNights: number
  filters?: SiteFilters | null
}

function passesFilters(site: NormalizedSite, filters?: SiteFilters | null): boolean {
  if (!filters) return true
  if (filters.siteIds?.length && !filters.siteIds.includes(site.siteId)) return false
  if (filters.loops?.length && !(site.loop && filters.loops.includes(site.loop))) return false
  if (
    filters.siteTypes?.length &&
    !(site.siteType && filters.siteTypes.includes(site.siteType))
  )
    return false
  if (filters.minPeople != null && (site.maxPeople ?? Infinity) < filters.minPeople) return false
  return true
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Consecutive available nights starting at `date` (bounded by endDate). */
function consecutiveAvailable(
  site: NormalizedSite,
  date: string,
  endDate: string,
): number {
  let n = 0
  let cur = date
  while (cur <= endDate && site.dates[cur] === 'available') {
    n += 1
    cur = addDays(cur, 1)
  }
  return n
}

export function diffAvailability(
  prev: NormalizedAvailability | null,
  fresh: NormalizedAvailability,
  c: DiffConstraints,
): WatchMatch[] {
  const matches: WatchMatch[] = []

  for (const site of Object.values(fresh)) {
    if (!passesFilters(site, c.filters)) continue

    for (const [date, status] of Object.entries(site.dates)) {
      if (status !== 'available') continue
      if (date < c.startDate || date > c.endDate) continue

      // Only NEWLY available: prev missing (first snapshot) or prev != available.
      const prevStatus = prev?.[site.siteId]?.dates?.[date]
      if (prev && prevStatus === 'available') continue

      const nights = consecutiveAvailable(site, date, c.endDate)
      if (nights < c.minNights) continue

      matches.push({
        siteId: site.siteId,
        siteName: site.siteName,
        loop: site.loop,
        siteType: site.siteType,
        date,
        nights,
      })
    }
  }

  return matches
}
