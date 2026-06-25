import { deriveSourceName } from '../ingestion/sourceName.js'
import { getSupplementalSourceUrls } from '../ingestion/ingestionConfig.js'

/** @typedef {import('./campgroundSchema.js').Campground} Campground */
/** @typedef {import('./campgroundSchema.js').CampgroundSource} CampgroundSource */

/**
 * Returns true when a campground uses explicit multi-source configuration.
 * @param {Campground} campground
 * @returns {boolean}
 */
export function hasConfiguredSources(campground) {
  return Array.isArray(campground.sources) && campground.sources.length > 0
}

/**
 * Resolves configured sources for a campground, sorted by priority ascending.
 * Legacy campgrounds without a sources array synthesize a single primary source
 * plus any supplemental URLs from ingestion config.
 * @param {Campground} campground
 * @returns {CampgroundSource[]}
 */
export function resolveCampgroundSources(campground) {
  if (hasConfiguredSources(campground)) {
    return [...campground.sources].sort((left, right) => left.priority - right.priority)
  }

  /** @type {CampgroundSource[]} */
  const sources = [
    {
      name: deriveSourceName(campground.sourceUrl),
      url: campground.sourceUrl,
      sourceType: 'government',
      priority: 1,
    },
  ]

  getSupplementalSourceUrls(campground.id).forEach((url, index) => {
    sources.push({
      name: deriveSourceName(url),
      url,
      sourceType: 'alert',
      priority: index + 2,
    })
  })

  return sources
}

/**
 * Returns the primary official source URL for a campground record.
 * @param {Campground} campground
 * @returns {string}
 */
export function getPrimarySourceUrl(campground) {
  const [primarySource] = resolveCampgroundSources(campground)
  return primarySource?.url ?? campground.sourceUrl
}
