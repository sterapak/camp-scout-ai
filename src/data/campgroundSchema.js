/**
 * Campground seed schema for Camp Scout AI.
 *
 * All seed records must include a real sourceUrl pointing to an official
 * park or agency page. Do not add mock availability fields.
 */

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
]

/**
 * @typedef {Object} Campground
 * @property {string} id - Stable slug identifier
 * @property {string} name - Official campground name
 * @property {string} region - Geographic area within Northern California
 * @property {string} sourceUrl - Official info page URL
 * @property {string} reservationUrl - Booking portal URL (may match sourceUrl)
 * @property {string[]} amenities - Listed amenities from official sources
 * @property {string[]} rules - Known rules and restrictions
 * @property {string} dogPolicy - Pet policy summary
 * @property {string} notes - Additional context from official sources
 * @property {string} lastVerifiedAt - ISO 8601 date when record was last checked
 * @property {string[]} tags - Searchable tags (e.g. "state-park", "redwoods")
 */

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

  return !Number.isNaN(Date.parse(campground.lastVerifiedAt))
}
