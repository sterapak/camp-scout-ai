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

export interface ZipLocation {
  lat: number
  lng: number
  place: string
}

/** Geocode a US ZIP to coordinates (server-proxied to zippopotam.us). */
export async function geocodeZip(zip: string): Promise<ZipLocation | null> {
  try {
    const res = await fetch(`/api/geocode/zip?zip=${encodeURIComponent(zip)}`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    const data = (await res.json()) as { location?: ZipLocation | null }
    return data.location ?? null
  } catch {
    return null
  }
}

/** All Recreation.gov campgrounds for a state (default CA), imported from RIDB. */
export async function fetchRecgovCampgrounds(state = 'CA'): Promise<RecgovCampground[]> {
  try {
    const res = await fetch(`/api/campgrounds/recgov?state=${encodeURIComponent(state)}`, {
      credentials: 'same-origin',
    })
    if (!res.ok) return []
    const data = (await res.json()) as { campgrounds?: RecgovCampground[] }
    return Array.isArray(data.campgrounds) ? data.campgrounds : []
  } catch {
    return []
  }
}
