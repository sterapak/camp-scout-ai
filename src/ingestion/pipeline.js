import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { campgrounds } from '../data/campgrounds.js'
import { isValidKnowledgeDocument } from '../data/knowledgeSchema.js'
import { categorizeContent } from './categorizeContent.js'
import { computeContentHash } from './contentHash.js'
import { fetchCampgroundReadableText } from './fetchCampgroundContent.js'
import { formatKnowledgeDocumentFile } from './formatDocumentFile.js'
import { generateKnowledgeDocuments } from './generateDocuments.js'
import { getSupplementalSourceUrls } from './ingestionConfig.js'
import {
  DEFAULT_MANIFEST_PATH,
  getCampgroundRecord,
  readManifest,
  toKnowledgeUpdatedDate,
  upsertCampgroundRecord,
  writeManifest,
} from './manifest.js'
import { deriveSourceName } from './sourceName.js'
import { updateDocumentsRegistry } from './registryUpdater.js'

const KNOWLEDGE_RELATIVE_ROOT = 'src/data/knowledge'

export const DEFAULT_KNOWLEDGE_ROOT = join(process.cwd(), KNOWLEDGE_RELATIVE_ROOT)
export const DEFAULT_DOCUMENTS_FILE_PATH = join(DEFAULT_KNOWLEDGE_ROOT, 'documents.js')

/**
 * @param {Object} [options]
 * @param {string} [options.knowledgeRoot]
 * @returns {{ knowledgeRoot: string, documentsFilePath: string }}
 */
export function resolveKnowledgePaths(options = {}) {
  const knowledgeRoot = options.knowledgeRoot ?? DEFAULT_KNOWLEDGE_ROOT

  return {
    knowledgeRoot,
    documentsFilePath: join(knowledgeRoot, 'documents.js'),
  }
}

/**
 * @typedef {Object} IngestionCampgroundResult
 * @property {string} campgroundId
 * @property {'success' | 'skipped' | 'failed'} status
 * @property {string} [message]
 * @property {number} [documentsWritten]
 */

/**
 * @typedef {Object} IngestionRunResult
 * @property {IngestionCampgroundResult[]} results
 * @property {number} succeeded
 * @property {number} skipped
 * @property {number} failed
 */

/**
 * Writes knowledge documents for one campground.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {import('../data/knowledgeSchema.js').KnowledgeDocument[]} documents
 * @param {string} knowledgeRoot
 */
function writeCampgroundDocuments(campground, documents, knowledgeRoot) {
  const campgroundDir = join(knowledgeRoot, 'campgrounds', campground.id)
  mkdirSync(campgroundDir, { recursive: true })

  for (const document of documents) {
    if (!isValidKnowledgeDocument(document)) {
      throw new Error(`Generated invalid knowledge document for ${campground.id}/${document.documentType}.`)
    }

    const filePath = join(campgroundDir, `${document.documentType}.js`)
    writeFileSync(filePath, formatKnowledgeDocumentFile(document), 'utf8')
  }
}

/**
 * Ingests one campground from its configured official source URL.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {string} [options.manifestPath]
 * @param {string} [options.knowledgeRoot]
 * @param {() => string} [options.nowIso]
 * @returns {Promise<IngestionCampgroundResult>}
 */
export async function ingestCampground(campground, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const manifestPath = options.manifestPath ?? DEFAULT_MANIFEST_PATH
  const { knowledgeRoot } = resolveKnowledgePaths(options)
  const nowIso = options.nowIso?.() ?? new Date().toISOString()

  const contentResult = await fetchCampgroundReadableText(campground, { fetchImpl })

  if (!contentResult.ok) {
    return {
      campgroundId: campground.id,
      status: 'failed',
      message: contentResult.error,
    }
  }

  const readableText = contentResult.readableText
  const contentHash = computeContentHash(readableText)

  if (readableText.trim().length === 0) {
    return {
      campgroundId: campground.id,
      status: 'failed',
      message: `No readable content extracted from "${campground.sourceUrl}".`,
    }
  }

  const manifest = readManifest(manifestPath)
  const existingRecord = getCampgroundRecord(manifest, campground.id)

  if (existingRecord?.contentHash === contentHash) {
    return {
      campgroundId: campground.id,
      status: 'skipped',
      message: 'Source content unchanged; skipped regeneration.',
    }
  }

  const categorized = categorizeContent(readableText)
  const lastUpdatedAt = toKnowledgeUpdatedDate(nowIso)
  const generatedDocuments = generateKnowledgeDocuments({
    campground,
    categorized,
    lastUpdatedAt,
  })

  writeCampgroundDocuments(campground, generatedDocuments, knowledgeRoot)

  const supplementalSourceUrls = getSupplementalSourceUrls(campground.id)
  const updatedManifest = upsertCampgroundRecord(manifest, campground.id, {
    sourceUrl: campground.sourceUrl,
    sourceName: deriveSourceName(campground.sourceUrl),
    lastFetchedAt: nowIso,
    contentHash,
    ...(supplementalSourceUrls.length > 0 ? { supplementalSourceUrls } : {}),
  })

  writeManifest(updatedManifest, manifestPath)

  return {
    campgroundId: campground.id,
    status: 'success',
    message: `Wrote ${generatedDocuments.length} knowledge documents.`,
    documentsWritten: generatedDocuments.length,
  }
}

/**
 * Runs ingestion for one or more campground definitions.
 * @param {string[]} campgroundIds
 * @param {Object} [options]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {string} [options.manifestPath]
 * @param {string} [options.knowledgeRoot]
 * @param {(message: string) => void} [options.logger]
 * @param {() => string} [options.nowIso]
 * @returns {Promise<IngestionRunResult>}
 */
export async function runIngestionPipeline(campgroundIds, options = {}) {
  const logger = options.logger ?? console.log
  const { knowledgeRoot, documentsFilePath } = resolveKnowledgePaths(options)
  /** @type {IngestionCampgroundResult[]} */
  const results = []
  let registryUpdated = false

  for (const campgroundId of campgroundIds) {
    const campground = campgrounds.find((record) => record.id === campgroundId)

    if (!campground) {
      const message = `Unknown campground id "${campgroundId}".`
      logger(`[failed] ${campgroundId}: ${message}`)
      results.push({
        campgroundId,
        status: 'failed',
        message,
      })
      continue
    }

    logger(`[start] ${campgroundId}: fetching ${campground.sourceUrl}`)

    const supplementalUrls = getSupplementalSourceUrls(campgroundId)
    if (supplementalUrls.length > 0) {
      logger(`[sources] ${campgroundId}: including ${supplementalUrls.length} supplemental official source(s)`)
    }

    try {
      const result = await ingestCampground(campground, options)
      logger(`[${result.status}] ${campgroundId}: ${result.message}`)

      if (result.status === 'success') {
        registryUpdated = true
      }

      results.push(result)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger(`[failed] ${campgroundId}: ${message}`)
      results.push({
        campgroundId,
        status: 'failed',
        message,
      })
    }
  }

  if (registryUpdated) {
    updateDocumentsRegistry(knowledgeRoot, documentsFilePath)
    logger('[registry] Updated src/data/knowledge/documents.js')
  }

  return {
    results,
    succeeded: results.filter((result) => result.status === 'success').length,
    skipped: results.filter((result) => result.status === 'skipped').length,
    failed: results.filter((result) => result.status === 'failed').length,
  }
}

/**
 * Resolves campground records for ingestion.
 * @param {string[]} campgroundIds
 * @returns {import('../data/campgroundSchema.js').Campground[]}
 */
export function resolveCampgrounds(campgroundIds) {
  return campgroundIds
    .map((campgroundId) => campgrounds.find((record) => record.id === campgroundId))
    .filter(Boolean)
}
