/**
 * Client-safe Recreation.gov URL helpers. Kept dependency-free so it can be
 * imported into the browser bundle (the server's recGovAdapter pulls server-only
 * deps and must not be imported client-side). Mirrors the regex in
 * src/server/availability/recGovAdapter.ts.
 */

/** Extract a campground id from e.g. https://www.recreation.gov/camping/campgrounds/232447 */
export function parseRecGovCampgroundId(url: string | null | undefined): string | null {
  const m = /recreation\.gov\/camping\/campgrounds\/(\d+)/i.exec(url ?? '')
  return m ? m[1] : null
}

/** A campground is watchable in Phase 1 only if it's a Recreation.gov campground. */
export function isWatchable(reservationUrl: string | null | undefined): boolean {
  return parseRecGovCampgroundId(reservationUrl) !== null
}
