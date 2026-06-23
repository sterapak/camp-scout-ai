/**
 * Knowledge document chunking for Camp Scout AI RAG pipeline.
 * Converts CS-002 knowledge documents into searchable text chunks.
 * No embeddings, vector storage, or external API calls.
 */

import { getAllKnowledgeDocuments } from '../data/knowledge/documents.js'
import { isValidKnowledgeDocument } from '../data/knowledgeSchema.js'

/** @type {number} */
export const DEFAULT_MAX_CHUNK_CHARS = 800

/**
 * @typedef {Object} KnowledgeChunk
 * @property {string} id - Stable chunk identifier
 * @property {string} documentId - Original knowledge document id
 * @property {string} title
 * @property {string} campgroundId
 * @property {import('../data/knowledgeSchema.js').KnowledgeDocumentType} documentType
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} lastUpdatedAt
 * @property {number} chunkIndex - Zero-based index within the source document
 * @property {string} text - Plain text suitable for future embedding
 */

/**
 * Builds a stable chunk identifier from document id and chunk index.
 * @param {string} documentId
 * @param {number} chunkIndex
 * @returns {string}
 */
export function buildChunkId(documentId, chunkIndex) {
  return `${documentId}::chunk-${chunkIndex}`
}

/**
 * Formats chunk text with document context for embedding quality.
 * @param {import('../data/knowledgeSchema.js').KnowledgeDocument} document
 * @param {string} contentPart
 * @returns {string}
 */
export function buildChunkText(document, contentPart) {
  return `${document.title} (${document.documentType}): ${contentPart.trim()}`
}

/**
 * Splits document content into parts that fit within maxChunkChars.
 * @param {string} content
 * @param {number} [maxChunkChars]
 * @returns {string[]}
 */
export function splitDocumentContent(content, maxChunkChars = DEFAULT_MAX_CHUNK_CHARS) {
  const trimmed = content.trim()
  if (trimmed === '') return []

  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  if (paragraphs.length === 0) return []

  /** @type {string[]} */
  const parts = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChunkChars) {
      if (current) {
        parts.push(current)
        current = ''
      }
      parts.push(...splitLongText(paragraph, maxChunkChars))
      continue
    }

    const combined = current ? `${current}\n\n${paragraph}` : paragraph
    if (combined.length <= maxChunkChars) {
      current = combined
    } else {
      parts.push(current)
      current = paragraph
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Splits long text on sentence boundaries when possible.
 * @param {string} text
 * @param {number} maxChunkChars
 * @returns {string[]}
 */
function splitLongText(text, maxChunkChars) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [text]
  /** @type {string[]} */
  const parts = []
  let current = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (!trimmedSentence) continue

    if (trimmedSentence.length > maxChunkChars) {
      if (current) {
        parts.push(current)
        current = ''
      }
      parts.push(...splitByLength(trimmedSentence, maxChunkChars))
      continue
    }

    const combined = current ? `${current} ${trimmedSentence}` : trimmedSentence
    if (combined.length <= maxChunkChars) {
      current = combined
    } else {
      parts.push(current)
      current = trimmedSentence
    }
  }

  if (current) {
    parts.push(current)
  }

  return parts
}

/**
 * Splits text into fixed-size segments as a last resort.
 * @param {string} text
 * @param {number} maxChunkChars
 * @returns {string[]}
 */
function splitByLength(text, maxChunkChars) {
  /** @type {string[]} */
  const parts = []

  for (let start = 0; start < text.length; start += maxChunkChars) {
    parts.push(text.slice(start, start + maxChunkChars).trim())
  }

  return parts.filter(Boolean)
}

/**
 * Converts a single knowledge document into searchable chunks.
 * Invalid documents and empty content produce no chunks.
 * @param {unknown} document
 * @returns {KnowledgeChunk[]}
 */
export function chunkKnowledgeDocument(document) {
  if (!isValidKnowledgeDocument(document)) {
    return []
  }

  const contentParts = splitDocumentContent(document.content)
  if (contentParts.length === 0) {
    return []
  }

  return contentParts.map((contentPart, chunkIndex) => ({
    id: buildChunkId(document.id, chunkIndex),
    documentId: document.id,
    title: document.title,
    campgroundId: document.campgroundId,
    documentType: document.documentType,
    sourceUrl: document.sourceUrl,
    sourceName: document.sourceName,
    lastUpdatedAt: document.lastUpdatedAt,
    chunkIndex,
    text: buildChunkText(document, contentPart),
  }))
}

/**
 * Chunks all validated knowledge documents from the CS-002 repository.
 * @param {import('../data/knowledgeSchema.js').KnowledgeDocument[]} [documents]
 * @returns {KnowledgeChunk[]}
 */
export function chunkAllKnowledgeDocuments(documents = getAllKnowledgeDocuments()) {
  return documents.flatMap((document) => chunkKnowledgeDocument(document))
}
