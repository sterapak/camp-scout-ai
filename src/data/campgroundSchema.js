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
 */

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

  return true
}
