/**
 * Knowledge document schema for Camp Scout AI.
 *
 * Stores campground knowledge sourced from official park and agency pages.
 * No AI, embeddings, or vector database — plain structured documents only.
 */

export const KNOWLEDGE_DOCUMENT_TYPES = [
  'description',
  'rules',
  'reservation',
  'alert',
]

export const KNOWLEDGE_DOCUMENT_FIELDS = [
  'id',
  'campgroundId',
  'title',
  'documentType',
  'content',
  'sourceUrl',
  'sourceName',
  'lastUpdatedAt',
]

/**
 * @typedef {'description' | 'rules' | 'reservation' | 'alert'} KnowledgeDocumentType
 */

/**
 * @typedef {Object} KnowledgeDocument
 * @property {string} id - Stable slug (e.g. "yosemite-upper-pines-description")
 * @property {string} campgroundId - References a campground seed record id
 * @property {string} title - Human-readable document title
 * @property {KnowledgeDocumentType} documentType - Category of knowledge
 * @property {string} content - Plain-text body from official sources
 * @property {string} sourceUrl - Official page URL this content was derived from
 * @property {string} sourceName - Agency or publisher name (e.g. "National Park Service")
 * @property {string} lastUpdatedAt - ISO 8601 date when content was last verified
 */

/**
 * Validates that a knowledge document conforms to the schema.
 * @param {unknown} document
 * @returns {document is KnowledgeDocument}
 */
export function isValidKnowledgeDocument(document) {
  if (!document || typeof document !== 'object') return false

  const requiredStrings = [
    'id',
    'campgroundId',
    'title',
    'documentType',
    'content',
    'sourceUrl',
    'sourceName',
    'lastUpdatedAt',
  ]

  for (const field of requiredStrings) {
    if (typeof document[field] !== 'string' || document[field].trim() === '') {
      return false
    }
  }

  if (!KNOWLEDGE_DOCUMENT_TYPES.includes(document.documentType)) {
    return false
  }

  try {
    new URL(document.sourceUrl)
  } catch {
    return false
  }

  return !Number.isNaN(Date.parse(document.lastUpdatedAt))
}

/**
 * Returns a human-readable label for a document type.
 * @param {KnowledgeDocumentType} documentType
 * @returns {string}
 */
export function getDocumentTypeLabel(documentType) {
  const labels = {
    description: 'Description',
    rules: 'Rules & Policies',
    reservation: 'Reservation Information',
    alert: 'Alerts & Notices',
  }

  return labels[documentType] ?? documentType
}
