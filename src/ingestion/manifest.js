// @ts-nocheck
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const MANIFEST_VERSION = 1
const MANIFEST_RELATIVE_PATH = 'src/data/knowledge/ingestion-manifest.json'

export const DEFAULT_MANIFEST_PATH = join(process.cwd(), MANIFEST_RELATIVE_PATH)

/**
 * @typedef {import('../data/campgroundSchema.js').CampgroundSource} CampgroundSource
 */

/**
 * @typedef {Object} CampgroundIngestionRecord
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} lastFetchedAt
 * @property {string} contentHash
 * @property {CampgroundSource[]} [sources]
 * @property {string[]} [supplementalSourceUrls]
 */

/**
 * @typedef {Object} IngestionManifest
 * @property {number} version
 * @property {Record<string, CampgroundIngestionRecord>} campgrounds
 */

/**
 * @returns {IngestionManifest}
 */
export function createEmptyManifest() {
  return {
    version: MANIFEST_VERSION,
    campgrounds: {},
  }
}

/**
 * @param {string} [manifestPath]
 * @returns {IngestionManifest}
 */
export function readManifest(manifestPath = DEFAULT_MANIFEST_PATH) {
  if (!existsSync(manifestPath)) {
    return createEmptyManifest()
  }

  const raw = readFileSync(manifestPath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || typeof parsed !== 'object') {
    return createEmptyManifest()
  }

  return {
    version: typeof parsed.version === 'number' ? parsed.version : MANIFEST_VERSION,
    campgrounds: parsed.campgrounds && typeof parsed.campgrounds === 'object'
      ? parsed.campgrounds
      : {},
  }
}

/**
 * @param {IngestionManifest} manifest
 * @param {string} [manifestPath]
 */
export function writeManifest(manifest, manifestPath = DEFAULT_MANIFEST_PATH) {
  const normalized = {
    version: MANIFEST_VERSION,
    campgrounds: sortRecord(manifest.campgrounds),
  }

  writeFileSync(manifestPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8')
}

/**
 * @param {IngestionManifest} manifest
 * @param {string} campgroundId
 * @param {CampgroundIngestionRecord} record
 * @returns {IngestionManifest}
 */
export function upsertCampgroundRecord(manifest, campgroundId, record) {
  return {
    ...manifest,
    campgrounds: {
      ...manifest.campgrounds,
      [campgroundId]: record,
    },
  }
}

/**
 * @param {IngestionManifest} manifest
 * @param {string} campgroundId
 * @returns {CampgroundIngestionRecord | undefined}
 */
export function getCampgroundRecord(manifest, campgroundId) {
  return manifest.campgrounds[campgroundId]
}

/**
 * @param {Record<string, CampgroundIngestionRecord>} record
 * @returns {Record<string, CampgroundIngestionRecord>}
 */
function sortRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([leftId], [rightId]) => leftId.localeCompare(rightId)),
  )
}

/**
 * Converts an ISO timestamp to a YYYY-MM-DD date string.
 * @param {string} isoTimestamp
 * @returns {string}
 */
export function toKnowledgeUpdatedDate(isoTimestamp) {
  return isoTimestamp.slice(0, 10)
}
