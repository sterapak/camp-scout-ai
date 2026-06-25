import { getDocumentTypesToWrite } from './categorizeContent.js'
import { deriveSourceName } from './sourceName.js'

/**
 * @typedef {import('../data/knowledgeSchema.js').KnowledgeDocument} KnowledgeDocument
 * @typedef {import('../data/knowledgeSchema.js').KnowledgeDocumentType} KnowledgeDocumentType
 * @typedef {import('../data/campgroundSchema.js').Campground} Campground
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
 * @returns {string}
 */
export function buildDocumentId(campgroundId, documentType) {
  return `${campgroundId}-${documentType}`
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
 * Generates knowledge documents from categorized source content.
 * @param {Object} params
 * @param {Campground} params.campground
 * @param {Record<KnowledgeDocumentType, string[]>} params.categorized
 * @param {string} params.lastUpdatedAt
 * @returns {KnowledgeDocument[]}
 */
export function generateKnowledgeDocuments({ campground, categorized, lastUpdatedAt }) {
  const sourceUrl = campground.sourceUrl
  const sourceName = deriveSourceName(sourceUrl)
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
