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
