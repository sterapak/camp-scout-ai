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
 *   region?: string
 *   amenities?: string[]
 *   tag?: string
 * }} filters
 * @returns {import('./campgroundSchema.js').Campground[]}
 */
export function searchCampgrounds({ query = '', region = '', amenities = [], tag = '' } = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  const selectedAmenities = amenities.filter(Boolean)

  return getAllCampgrounds().filter((campground) => {
    if (region && campground.region !== region) return false
    if (
      selectedAmenities.length > 0 &&
      !selectedAmenities.every((amenity) => campground.amenities.includes(amenity))
    ) {
      return false
    }
    if (tag && !campground.tags.includes(tag)) return false

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
