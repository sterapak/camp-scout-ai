/**
 * Campground IDs processed by the official source ingestion pipeline.
 * Add IDs here to ingest or refresh knowledge documents from seed records.
 */
export const INGESTION_CAMPGROUND_IDS = [
  'mount-tamalpais-pantoll',
]

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
