import { campgrounds } from './campgrounds.js'
import { isValidCampground } from './campgroundSchema.js'

/** @returns {import('./campgroundSchema.js').Campground[]} */
export function getAllCampgrounds() {
  return campgrounds.filter(isValidCampground)
}

/** @param {string} id */
export function getCampgroundById(id) {
  return getAllCampgrounds().find((c) => c.id === id) ?? null
}

/**
 * Returns campground images sorted by priority (1 = primary).
 * @param {import('./campgroundSchema.js').Campground | null | undefined} campground
 * @returns {import('./campgroundSchema.js').CampgroundImage[]}
 */
export function getCampgroundImages(campground) {
  if (!campground?.images?.length) {
    return []
  }

  return [...campground.images].sort((left, right) => left.priority - right.priority)
}

/**
 * Returns the primary (lowest priority number) campground image, if any.
 * @param {import('./campgroundSchema.js').Campground | null | undefined} campground
 * @returns {import('./campgroundSchema.js').CampgroundImage | null}
 */
export function getPrimaryImage(campground) {
  const images = getCampgroundImages(campground)
  return images[0] ?? null
}

/**
 * Returns a branded placeholder (operator label + domain) for campgrounds that
 * have no curated/official photo, so the empty state reads as intentional rather
 * than broken. Detected from the campground's source/reservation URLs. Returns
 * null for operators without a brand tile (those fall back to a plain gray tile).
 * @param {import('./campgroundSchema.js').Campground | null | undefined} campground
 * @returns {{ label: string, domain: string } | null}
 */
export function getBrandPlaceholder(campground) {
  if (!campground) return null
  const urls = [
    campground.sourceUrl,
    campground.reservationUrl,
    ...(campground.sources ?? []).map((source) => source?.url),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (/eid\.org/.test(urls)) return { label: 'EID Parks', domain: 'eid.org' }
  if (/parks\.ca\.gov|reservecalifornia/.test(urls)) {
    return { label: 'California State Parks', domain: 'parks.ca.gov' }
  }
  return null
}

/** @returns {string[]} */
export function getAllRegions() {
  return [...new Set(getAllCampgrounds().map((c) => c.region))].sort()
}

/** @returns {string[]} */
export function getAllAmenities() {
  const amenities = getAllCampgrounds().flatMap((c) => c.amenities)
  return [...new Set(amenities)].sort()
}

/** @returns {string[]} */
export function getAllTags() {
  const tags = getAllCampgrounds().flatMap((c) => c.tags)
  return [...new Set(tags)].sort()
}

/**
 * @param {{
 *   query?: string
 *   regions?: string[]
 *   amenities?: string[]
 *   tags?: string[]
 * }} filters
 * @returns {import('./campgroundSchema.js').Campground[]}
 */
export function searchCampgrounds(filters = {}) {
  return filterCampgrounds(getAllCampgrounds(), filters)
}

/**
 * Same filtering as searchCampgrounds, but over an explicit list — used to
 * filter the merged (curated + Recreation.gov-imported) set. Tolerates
 * imported campgrounds that lack amenities/tags.
 * @param {Array<import('./campgroundSchema.js').Campground>} list
 * @param {{ query?: string, regions?: string[], amenities?: string[], tags?: string[] }} filters
 */
export function filterCampgrounds(list, { query = '', regions = [], amenities = [], tags = [] } = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  const selectedRegions = regions.filter(Boolean)
  const selectedAmenities = amenities.filter(Boolean)
  const selectedTags = tags.filter(Boolean)

  return list.filter((campground) => {
    const cgAmenities = campground.amenities ?? []
    const cgTags = campground.tags ?? []
    if (selectedRegions.length > 0 && !selectedRegions.includes(campground.region)) return false
    if (
      selectedAmenities.length > 0 &&
      !selectedAmenities.every((amenity) => cgAmenities.includes(amenity))
    ) {
      return false
    }
    if (selectedTags.length > 0 && !selectedTags.some((tag) => cgTags.includes(tag))) {
      return false
    }

    if (!normalizedQuery) return true

    const haystack = [campground.name, campground.region, campground.notes, ...cgAmenities, ...cgTags]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}
