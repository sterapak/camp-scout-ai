import { categorizeContent, getDocumentTypesToWrite } from './categorizeContent.js'
import { resolveSourceName } from './sourceName.js'

/**
 * @typedef {import('../data/knowledgeSchema.js').KnowledgeDocument} KnowledgeDocument
 * @typedef {import('../data/knowledgeSchema.js').KnowledgeDocumentType} KnowledgeDocumentType
 * @typedef {import('../data/campgroundSchema.js').Campground} Campground
 * @typedef {import('../data/campgroundSchema.js').CampgroundSource} CampgroundSource
 * @typedef {import('./fetchCampgroundContent.js').FetchedCampgroundSourceContent} FetchedCampgroundSourceContent
 */

const DOCUMENT_TITLE_SUFFIX = {
  description: 'Overview',
  rules: 'Rules',
  reservation: 'Reservation Information',
  alert: 'Alerts & Notices',
}

/**
 * Builds a short display name for titles from a campground record.
 * @param {Campground} campground
 * @returns {string}
 */
export function buildCampgroundDisplayName(campground) {
  const withoutParenthetical = campground.name.replace(/\s*\([^)]*\)\s*$/, '').trim()
  return withoutParenthetical || campground.name
}

/**
 * Builds a stable knowledge document ID.
 * @param {string} campgroundId
 * @param {KnowledgeDocumentType} documentType
 * @param {CampgroundSource | null | undefined} [source]
 * @returns {string}
 */
export function buildDocumentId(campgroundId, documentType, source = undefined) {
  if (source) {
    return `${campgroundId}-source-${source.priority}-${documentType}`
  }

  return `${campgroundId}-${documentType}`
}

/**
 * Builds the on-disk filename for a generated knowledge document module.
 * @param {KnowledgeDocumentType} documentType
 * @param {string} documentId
 * @param {string} campgroundId
 * @returns {string}
 */
export function buildKnowledgeDocumentFileName(documentType, documentId, campgroundId) {
  const multiSourceMatch = documentId.match(
    new RegExp(`^${campgroundId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-source-(\\d+)-`),
  )

  if (multiSourceMatch) {
    return `${documentType}--source-${multiSourceMatch[1]}.js`
  }

  return `${documentType}.js`
}

/**
 * Builds a human-readable document title.
 * @param {Campground} campground
 * @param {KnowledgeDocumentType} documentType
 * @returns {string}
 */
export function buildDocumentTitle(campground, documentType) {
  const displayName = buildCampgroundDisplayName(campground)
  const suffix = DOCUMENT_TITLE_SUFFIX[documentType]

  if (documentType === 'description') {
    return `${displayName} Overview`
  }

  return `${displayName} ${suffix}`
}

/**
 * Joins categorized paragraphs into document body text.
 * @param {string[]} paragraphs
 * @returns {string}
 */
export function joinDocumentContent(paragraphs) {
  return paragraphs.join(' ')
}

/**
 * Generates knowledge documents from categorized legacy merged content.
 * @param {Object} params
 * @param {Campground} params.campground
 * @param {Record<KnowledgeDocumentType, string[]>} params.categorized
 * @param {string} params.lastUpdatedAt
 * @returns {KnowledgeDocument[]}
 */
export function generateKnowledgeDocumentsFromCategorized({ campground, categorized, lastUpdatedAt }) {
  const sourceUrl = campground.sourceUrl
  const sourceName = resolveSourceName({
    name: '',
    url: sourceUrl,
    sourceType: 'government',
    priority: 1,
  })
  const documentTypes = getDocumentTypesToWrite(categorized)

  return documentTypes.map((documentType) => ({
    id: buildDocumentId(campground.id, documentType),
    campgroundId: campground.id,
    title: buildDocumentTitle(campground, documentType),
    documentType,
    content: joinDocumentContent(categorized[documentType]),
    sourceUrl,
    sourceName,
    lastUpdatedAt,
  }))
}

/**
 * Generates knowledge documents from per-source fetched content.
 * @param {Object} params
 * @param {Campground} params.campground
 * @param {FetchedCampgroundSourceContent[]} params.fetchedSources
 * @param {string} params.lastUpdatedAt
 * @returns {KnowledgeDocument[]}
 */
export function generateKnowledgeDocumentsFromSources({ campground, fetchedSources, lastUpdatedAt }) {
  /** @type {KnowledgeDocument[]} */
  const documents = []

  for (const fetchedSource of fetchedSources) {
    const categorized = categorizeContent(fetchedSource.readableText)
    const documentTypes = getDocumentTypesToWrite(categorized)
    const sourceName = resolveSourceName(fetchedSource.source)

    for (const documentType of documentTypes) {
      documents.push({
        id: buildDocumentId(campground.id, documentType, fetchedSource.source),
        campgroundId: campground.id,
        title: buildDocumentTitle(campground, documentType),
        documentType,
        content: joinDocumentContent(categorized[documentType]),
        sourceUrl: fetchedSource.url,
        sourceName,
        lastUpdatedAt,
      })
    }
  }

  return documents
}

/**
 * Generates knowledge documents from categorized source content.
 * @param {Object} params
 * @param {Campground} params.campground
 * @param {Record<KnowledgeDocumentType, string[]>} [params.categorized]
 * @param {FetchedCampgroundSourceContent[]} [params.fetchedSources]
 * @param {string} params.lastUpdatedAt
 * @returns {KnowledgeDocument[]}
 */
export function generateKnowledgeDocuments({ campground, categorized, fetchedSources, lastUpdatedAt }) {
  if (fetchedSources && fetchedSources.length > 0) {
    return generateKnowledgeDocumentsFromSources({ campground, fetchedSources, lastUpdatedAt })
  }

  if (!categorized) {
    throw new Error('generateKnowledgeDocuments requires categorized content or fetchedSources.')
  }

  return generateKnowledgeDocumentsFromCategorized({ campground, categorized, lastUpdatedAt })
}
