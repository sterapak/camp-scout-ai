/**
 * Resolves the knowledge snapshot identity for a campground summary.
 * Prefers ingestion manifest content hashes; falls back to document fingerprints.
 * Server-only.
 */

import { createHash } from 'node:crypto'

import { getDocumentsByCampground } from '../../data/knowledge/knowledgeIndex.js'
import { getCampgroundRecord, readManifest } from '../../ingestion/manifest.js'

/**
 * @typedef {Object} KnowledgeSnapshot
 * @property {string} id - Stable snapshot identifier (content hash)
 * @property {string} contentHash - SHA-256 fingerprint of underlying knowledge
 * @property {string} [lastFetchedAt] - ISO timestamp when sources were last ingested
 * @property {string} [sourceName] - Primary official source name when known
 */

/**
 * Builds a fallback snapshot hash from indexed knowledge documents.
 * @param {string} campgroundId
 * @returns {string}
 */
export function buildDocumentFingerprint(campgroundId) {
  const documents = getDocumentsByCampground(campgroundId)

  const fingerprint = documents
    .map((document) => `${document.id}:${document.lastUpdatedAt}:${document.content.length}`)
    .sort()
    .join('|')

  return createHash('sha256').update(fingerprint).digest('hex')
}

/**
 * Resolves the current knowledge snapshot for a campground.
 * @param {string} campgroundId
 * @param {{ manifest?: import('../../ingestion/manifest.js').IngestionManifest }} [options]
 * @returns {KnowledgeSnapshot | null}
 */
export function resolveKnowledgeSnapshot(campgroundId, options = {}) {
  const trimmedId = (campgroundId ?? '').trim()
  if (trimmedId.length === 0) {
    return null
  }

  const manifest = options.manifest ?? readManifest()
  const manifestRecord = getCampgroundRecord(manifest, trimmedId)

  if (manifestRecord?.contentHash) {
    return {
      id: manifestRecord.contentHash,
      contentHash: manifestRecord.contentHash,
      lastFetchedAt: manifestRecord.lastFetchedAt,
      sourceName: manifestRecord.sourceName,
    }
  }

  const documents = getDocumentsByCampground(trimmedId)
  if (documents.length === 0) {
    return null
  }

  const contentHash = buildDocumentFingerprint(trimmedId)
  const primaryDocument = documents[0]

  return {
    id: contentHash,
    contentHash,
    lastFetchedAt: primaryDocument.lastUpdatedAt,
    sourceName: primaryDocument.sourceName,
  }
}
