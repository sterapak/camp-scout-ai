/** @jest-environment node */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { campgrounds } from '../src/data/campgrounds.js'
import { ingestCampground } from '../src/ingestion/pipeline.js'
import { updateDocumentsRegistry } from '../src/ingestion/registryUpdater.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixtureDir = join(__dirname, '../src/ingestion/__fixtures__')

const fixtureHtmlByUrl = {
  'https://www.eid.org/recreation/silver-lake': readFileSync(
    join(fixtureDir, 'silver-lake-west-eid.html'),
    'utf8',
  ),
  'https://www.fs.usda.gov/r05/eldorado/recreation/silver-lake-campground-east': readFileSync(
    join(fixtureDir, 'silver-lake-east-usfs.html'),
    'utf8',
  ),
  'https://www.pge.com/en/about/in-your-community/recreational-areas.html': readFileSync(
    join(fixtureDir, 'ice-house-pge.html'),
    'utf8',
  ),
  'https://www.fs.usda.gov/r05/eldorado/recreation/ice-house-campground': readFileSync(
    join(fixtureDir, 'ice-house-usfs.html'),
    'utf8',
  ),
  'https://www.recreation.gov/camping/campgrounds/232061': readFileSync(
    join(fixtureDir, 'ice-house-recreation-gov.html'),
    'utf8',
  ),
}

const targetIds = ['silver-lake-west', 'ice-house-reservoir']

for (const campgroundId of targetIds) {
  const campground = campgrounds.find((record) => record.id === campgroundId)
  if (!campground) {
    throw new Error(`Missing campground ${campgroundId}`)
  }

  const result = await ingestCampground(campground, {
    nowIso: () => '2025-06-25T12:00:00.000Z',
    fetchImpl: async (url) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => fixtureHtmlByUrl[url] ?? '<html><body><main><p>No fixture content.</p></main></body></html>',
    }),
  })

  console.log(`${campgroundId}: ${result.status} - ${result.message}`)
}

updateDocumentsRegistry(
  join(process.cwd(), 'src/data/knowledge'),
  join(process.cwd(), 'src/data/knowledge/documents.js'),
)

console.log('Updated documents registry.')
