// @ts-nocheck
/**
 * Campground seed schema for Camp Scout AI.
 *
 * All seed records must include a real sourceUrl pointing to an official
 * park or agency page. Multi-authority campgrounds may also define a sources
 * array with per-source attribution metadata for ingestion.
 * Do not add mock availability fields.
 */

export const CAMPGROUND_SOURCE_TYPES = [
  'operator',
  'government',
  'reservation',
  'alert',
  'map',
  'recreation-info',
]

export const CAMPGROUND_FIELDS = [
  'id',
  'name',
  'region',
  'sourceUrl',
  'reservationUrl',
  'amenities',
  'rules',
  'dogPolicy',
  'notes',
  'lastVerifiedAt',
  'tags',
  'sources',
  'images',
]

/**
 * @typedef {typeof CAMPGROUND_SOURCE_TYPES[number]} CampgroundSourceType
 */

/**
 * @typedef {Object} CampgroundSource
 * @property {string} name - Official publisher or agency name
 * @property {string} url - Official HTTPS page URL for this authority
 * @property {CampgroundSourceType} sourceType - Role of this source in the corpus
 * @property {number} priority - Fetch and display order (1 = primary)
 */

/**
 * @typedef {Object} CampgroundImage
 * @property {string} url - HTTPS image URL from an official or source-backed page
 * @property {string} altText - Accessible description of the image
 * @property {string} sourceName - Publisher or agency credited for the image
 * @property {string} sourceUrl - Official page where the image appears or is documented
 * @property {number} priority - Display order (1 = primary hero image)
 */

/**
 * @typedef {Object} Campground
 * @property {string} id - Stable slug identifier
 * @property {string} name - Official campground name
 * @property {string} region - Geographic area within Northern California
 * @property {string} sourceUrl - Primary official info page URL (matches priority 1 source)
 * @property {string} reservationUrl - Booking portal URL (may match sourceUrl)
 * @property {string[]} amenities - Listed amenities from official sources
 * @property {string[]} rules - Known rules and restrictions
 * @property {string} dogPolicy - Pet policy summary
 * @property {string} notes - Additional context from official sources
 * @property {string} lastVerifiedAt - ISO 8601 date when record was last checked
 * @property {string[]} tags - Searchable tags (e.g. "state-park", "redwoods")
 * @property {CampgroundSource[]} [sources] - Optional multi-authority source configuration
 * @property {CampgroundImage[]} [images] - Optional official or source-backed images
 */

/**
 * Validates a campground image entry.
 * @param {unknown} image
 * @returns {image is CampgroundImage}
 */
export function isValidCampgroundImage(image) {
  if (!image || typeof image !== 'object') return false

  const requiredStrings = ['url', 'altText', 'sourceName', 'sourceUrl']
  for (const field of requiredStrings) {
    if (typeof image[field] !== 'string' || image[field].trim() === '') {
      return false
    }
  }

  if (typeof image.priority !== 'number' || !Number.isInteger(image.priority) || image.priority < 1) {
    return false
  }

  try {
    const parsedUrl = new URL(image.url)
    const parsedSourceUrl = new URL(image.sourceUrl)
    if (parsedUrl.protocol !== 'https:' || parsedSourceUrl.protocol !== 'https:') {
      return false
    }
  } catch {
    return false
  }

  return true
}

/**
 * Validates a campground source entry.
 * @param {unknown} source
 * @returns {source is CampgroundSource}
 */
export function isValidCampgroundSource(source) {
  if (!source || typeof source !== 'object') return false

  if (typeof source.name !== 'string' || source.name.trim() === '') return false
  if (typeof source.url !== 'string' || source.url.trim() === '') return false
  if (typeof source.sourceType !== 'string' || !CAMPGROUND_SOURCE_TYPES.includes(source.sourceType)) {
    return false
  }
  if (typeof source.priority !== 'number' || !Number.isInteger(source.priority) || source.priority < 1) {
    return false
  }

  try {
    const parsed = new URL(source.url)
    if (parsed.protocol !== 'https:') return false
  } catch {
    return false
  }

  return true
}

/**
 * Validates that a campground object conforms to the seed schema.
 * @param {unknown} campground
 * @returns {campground is Campground}
 */
export function isValidCampground(campground) {
  if (!campground || typeof campground !== 'object') return false

  const requiredStrings = ['id', 'name', 'region', 'sourceUrl', 'reservationUrl', 'dogPolicy', 'notes', 'lastVerifiedAt']
  for (const field of requiredStrings) {
    if (typeof campground[field] !== 'string' || campground[field].trim() === '') {
      return false
    }
  }

  const requiredArrays = ['amenities', 'rules', 'tags']
  for (const field of requiredArrays) {
    if (!Array.isArray(campground[field])) return false
  }

  try {
    new URL(campground.sourceUrl)
    new URL(campground.reservationUrl)
  } catch {
    return false
  }

  if (!Number.isNaN(Date.parse(campground.lastVerifiedAt))) {
    // continue
  } else {
    return false
  }

  if (campground.sources !== undefined) {
    if (!Array.isArray(campground.sources) || campground.sources.length === 0) {
      return false
    }

    for (const source of campground.sources) {
      if (!isValidCampgroundSource(source)) return false
    }

    const priorities = campground.sources.map((source) => source.priority)
    if (new Set(priorities).size !== priorities.length) return false

    const primarySource = [...campground.sources].sort((left, right) => left.priority - right.priority)[0]
    if (primarySource.url !== campground.sourceUrl) return false
  }

  if (campground.images !== undefined) {
    if (!Array.isArray(campground.images) || campground.images.length === 0) {
      return false
    }

    for (const image of campground.images) {
      if (!isValidCampgroundImage(image)) return false
    }

    const priorities = campground.images.map((image) => image.priority)
    if (new Set(priorities).size !== priorities.length) return false
  }

  return true
}
