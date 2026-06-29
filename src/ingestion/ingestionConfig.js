// @ts-nocheck
import { campgrounds } from '../data/campgrounds.js'

/**
 * Campground IDs processed by the official source ingestion pipeline.
 * Defaults to every campground in the seed catalog.
 */
export const INGESTION_CAMPGROUND_IDS = campgrounds.map((campground) => campground.id)

/**
 * Resolves campground IDs from CLI arguments.
 * @param {string[]} cliArgs
 * @returns {string[] | null}
 */
export function resolveCampgroundIdsFromArgs(cliArgs) {
  const campgroundFlagIndex = cliArgs.indexOf('--campground')

  if (campgroundFlagIndex === -1) {
    return null
  }

  const campgroundId = cliArgs[campgroundFlagIndex + 1]

  if (!campgroundId || campgroundId.startsWith('--')) {
    throw new Error('Missing value for --campground. Example: npm run ingest:campgrounds -- --campground mount-tamalpais-pantoll')
  }

  return [campgroundId]
}

/**
 * Returns the default campground IDs for a full-catalog ingestion run.
 * @returns {string[]}
 */
export function getAllIngestionCampgroundIds() {
  return [...INGESTION_CAMPGROUND_IDS]
}

/**
 * Additional official source pages merged during ingestion for specific campgrounds.
 * Keys are campground IDs; values must be HTTPS official agency URLs.
 */
export const INGESTION_SUPPLEMENTAL_SOURCES = {
  'yosemite-upper-pines': [
    'https://www.nps.gov/yose/planyourvisit/bears.htm',
  ],
}

/**
 * Returns supplemental official source URLs for a campground, if configured.
 * @param {string} campgroundId
 * @returns {string[]}
 */
export function getSupplementalSourceUrls(campgroundId) {
  return INGESTION_SUPPLEMENTAL_SOURCES[campgroundId] ?? []
}
