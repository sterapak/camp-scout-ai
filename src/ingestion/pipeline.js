// @ts-nocheck
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { campgrounds } from '../data/campgrounds.js'
import { hasConfiguredSources, resolveCampgroundSources } from '../data/campgroundSources.js'
import { isValidKnowledgeDocument } from '../data/knowledgeSchema.js'
import { categorizeContent } from './categorizeContent.js'
import { computeContentHash } from './contentHash.js'
import { fetchCampgroundReadableText } from './fetchCampgroundContent.js'
import { formatKnowledgeDocumentFile } from './formatDocumentFile.js'
import {
  buildKnowledgeDocumentFileName,
  generateKnowledgeDocuments,
} from './generateDocuments.js'
import { getSupplementalSourceUrls } from './ingestionConfig.js'
import {
  DEFAULT_MANIFEST_PATH,
  getCampgroundRecord,
  readManifest,
  toKnowledgeUpdatedDate,
  upsertCampgroundRecord,
  writeManifest,
} from './manifest.js'
import { resolveSourceName } from './sourceName.js'
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

    const fileName = buildKnowledgeDocumentFileName(
      document.documentType,
      document.id,
      campground.id,
    )
    const filePath = join(campgroundDir, fileName)
    writeFileSync(filePath, formatKnowledgeDocumentFile(document), 'utf8')
  }
}

/**
 * Builds manifest metadata for an ingested campground.
 * @param {import('../data/campgroundSchema.js').Campground} campground
 * @param {string} nowIso
 * @param {string} contentHash
 * @returns {import('./manifest.js').CampgroundIngestionRecord}
 */
function buildManifestRecord(campground, nowIso, contentHash) {
  const primarySource = resolveCampgroundSources(campground)[0]
  const supplementalSourceUrls = getSupplementalSourceUrls(campground.id)

  return {
    sourceUrl: campground.sourceUrl,
    sourceName: resolveSourceName(primarySource),
    lastFetchedAt: nowIso,
    contentHash,
    ...(hasConfiguredSources(campground)
      ? {
          sources: resolveCampgroundSources(campground).map((source) => ({
            name: source.name,
            url: source.url,
            sourceType: source.sourceType,
            priority: source.priority,
          })),
        }
      : {}),
    ...(supplementalSourceUrls.length > 0 ? { supplementalSourceUrls } : {}),
  }
}

/**
 * Ingests one campground from its configured official source URLs.
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

  const readableText = contentResult.readableText ?? ''
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

  const lastUpdatedAt = toKnowledgeUpdatedDate(nowIso)
  const generatedDocuments = hasConfiguredSources(campground) && contentResult.fetchedSources
    ? generateKnowledgeDocuments({
        campground,
        fetchedSources: contentResult.fetchedSources,
        lastUpdatedAt,
      })
    : generateKnowledgeDocuments({
        campground,
        categorized: categorizeContent(readableText),
        lastUpdatedAt,
      })

  writeCampgroundDocuments(campground, generatedDocuments, knowledgeRoot)

  const updatedManifest = upsertCampgroundRecord(
    manifest,
    campground.id,
    buildManifestRecord(campground, nowIso, contentHash),
  )

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

    const configuredSources = resolveCampgroundSources(campground)
    logger(`[start] ${campgroundId}: fetching ${configuredSources.length} official source(s)`)

    if (configuredSources.length > 1 && !hasConfiguredSources(campground)) {
      logger(`[sources] ${campgroundId}: including ${configuredSources.length - 1} supplemental official source(s)`)
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
