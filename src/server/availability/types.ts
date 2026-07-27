/**
 * Normalized availability shapes shared across platform adapters (Recreation.gov
 * now; ReserveCalifornia in Phase 2). Adapters convert each platform's raw
 * response into this common form so the diff engine + scheduler are
 * platform-agnostic.
 */

export type SiteStatus = 'available' | 'reserved' | 'closed'

export interface NormalizedSite {
  siteId: string
  siteName: string
  siteType?: string
  loop?: string
  maxPeople?: number
  /** 'YYYY-MM-DD' -> status */
  dates: Record<string, SiteStatus>
}

/** siteId -> site, for a single (facility, month). */
export type NormalizedAvailability = Record<string, NormalizedSite>

export interface FetchAvailabilityResult {
  ok: boolean
  status?: number
  availability?: NormalizedAvailability
  error?: string
}

/** Optional per-watch site filters (stored as JSON on the watch row). */
export interface SiteFilters {
  siteTypes?: string[]
  loops?: string[]
  siteIds?: string[]
  minPeople?: number
  /** Only alert for freed nights on these weekdays (0=Sun … 6=Sat). Empty/absent = any day. */
  weekdays?: number[]
}

export type Platform = 'recgov' | 'reservecalifornia' | 'flybook'
