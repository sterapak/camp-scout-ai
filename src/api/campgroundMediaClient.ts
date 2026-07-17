/**
 * Fetches an official Recreation.gov campground photo (resolved server-side via
 * RIDB). Returns null on any failure so callers keep their placeholder.
 */
export interface CampgroundPhoto {
  url: string
  altText: string
  sourceName: string
  sourceUrl: string
  priority: number
}

export async function fetchCampgroundPhoto(facilityId: string): Promise<CampgroundPhoto | null> {
  try {
    const res = await fetch(`/api/campgrounds/${facilityId}/photo`, { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = (await res.json()) as { photo?: CampgroundPhoto | null }
    return data.photo ?? null
  } catch {
    return null
  }
}
