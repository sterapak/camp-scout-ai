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
export function searchCampgrounds({ query = '', regions = [], amenities = [], tags = [] } = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  const selectedRegions = regions.filter(Boolean)
  const selectedAmenities = amenities.filter(Boolean)
  const selectedTags = tags.filter(Boolean)

  return getAllCampgrounds().filter((campground) => {
    if (selectedRegions.length > 0 && !selectedRegions.includes(campground.region)) return false
    if (
      selectedAmenities.length > 0 &&
      !selectedAmenities.every((amenity) => campground.amenities.includes(amenity))
    ) {
      return false
    }
    if (
      selectedTags.length > 0 &&
      !selectedTags.some((tag) => campground.tags.includes(tag))
    ) {
      return false
    }

    if (!normalizedQuery) return true

    const haystack = [
      campground.name,
      campground.region,
      campground.notes,
      ...campground.amenities,
      ...campground.tags,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
}
