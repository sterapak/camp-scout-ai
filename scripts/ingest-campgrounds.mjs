#!/usr/bin/env node

import { INGESTION_CAMPGROUND_IDS, resolveCampgroundIdsFromArgs } from '../src/ingestion/ingestionConfig.js'
import { runIngestionPipeline } from '../src/ingestion/pipeline.js'

async function main() {
  let campgroundIds = INGESTION_CAMPGROUND_IDS

  try {
    const cliCampgroundIds = resolveCampgroundIdsFromArgs(process.argv.slice(2))
    if (cliCampgroundIds) {
      campgroundIds = cliCampgroundIds
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
    return
  }

  if (campgroundIds.length === 0) {
    console.error('No campground IDs configured for ingestion.')
    process.exitCode = 1
    return
  }

  console.log(`Campground ingestion starting for ${campgroundIds.length} campground(s)...`)

  const summary = await runIngestionPipeline(campgroundIds)

  console.log('')
  console.log('Ingestion summary:')
  console.log(`  succeeded: ${summary.succeeded}`)
  console.log(`  skipped:   ${summary.skipped}`)
  console.log(`  failed:    ${summary.failed}`)

  if (summary.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
