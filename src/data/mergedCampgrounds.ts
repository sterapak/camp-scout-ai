/**
 * Merge the hand-curated campgrounds with the full CA Recreation.gov set
 * imported from RIDB, so Browse + detail pages show the same universe the watch
 * picker does. Imported campgrounds carry a lighter shape (no curated
 * amenities/rules/AI knowledge) — pages guard for that.
 */
import { getAllCampgrounds } from './campgroundData.js'
import { fetchRecgovCampgrounds, type RecgovCampground } from '../api/campgroundMediaClient.js'
import { parseRecGovCampgroundId } from '../utils/recgov'

export interface DisplayCampground {
  id: string
  name: string
  region: string
  sourceUrl: string
  reservationUrl: string
  amenities: string[]
  rules: string[]
  dogPolicy: string
  notes: string
  tags: string[]
  lastVerifiedAt: string
  /** True for RIDB-imported campgrounds (lighter metadata). */
  imported?: boolean
}

export function mapRecgovCampground(c: RecgovCampground): DisplayCampground {
  return {
    id: c.id,
    name: c.name,
    region: c.region,
    sourceUrl: c.reservationUrl,
    reservationUrl: c.reservationUrl,
    amenities: [],
    rules: [],
    dogPolicy: '',
    notes: c.description || '',
    tags: [],
    lastVerifiedAt: '',
    imported: true,
  }
}

/** Curated campgrounds (rich metadata), always available synchronously. */
export function curatedCampgrounds(): DisplayCampground[] {
  return getAllCampgrounds() as DisplayCampground[]
}

/** Fetch + map the imported CA Recreation.gov campgrounds (empty on static build). */
export async function loadImportedCampgrounds(): Promise<DisplayCampground[]> {
  const list = await fetchRecgovCampgrounds('CA')
  return list.map(mapRecgovCampground)
}

/** Curated first (their names/data win); imported ones not already curated appended. */
export function mergeCampgrounds(imported: DisplayCampground[]): DisplayCampground[] {
  const curated = curatedCampgrounds()
  const curatedFacilityIds = new Set(
    curated.map((c) => parseRecGovCampgroundId(c.reservationUrl)).filter(Boolean) as string[],
  )
  const extras = imported.filter((c) => !curatedFacilityIds.has(c.id))
  return [...curated, ...extras]
}
