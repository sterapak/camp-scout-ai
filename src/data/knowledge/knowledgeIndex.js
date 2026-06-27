/**
 * Searchable index for campground knowledge documents.
 * Uses plain keyword matching — no AI, embeddings, or vector database.
 */

import { KNOWLEDGE_DOCUMENT_TYPES } from '../knowledgeSchema.js'
import { getAllKnowledgeDocuments } from './documents.js'
import {
  getMeaningfulQueryTokens,
  requiresExactTokenMatch,
  tokenizeText,
} from './queryTokens.js'

/**
 * Tokenizes text into lowercase search terms.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  return tokenizeText(text).filter((token) => token.length > 1)
}

/**
 * Builds a searchable index from knowledge documents.
 * @param {import('../knowledgeSchema.js').KnowledgeDocument[]} documents
 */
export function buildKnowledgeIndex(documents) {
  const byId = new Map()
  const byCampground = new Map()
  const byType = new Map()
  const keywordIndex = new Map()

  for (const doc of documents) {
    byId.set(doc.id, doc)

    if (!byCampground.has(doc.campgroundId)) {
      byCampground.set(doc.campgroundId, [])
    }
    byCampground.get(doc.campgroundId).push(doc)

    if (!byType.has(doc.documentType)) {
      byType.set(doc.documentType, [])
    }
    byType.get(doc.documentType).push(doc)

    const searchableText = [doc.title, doc.content, doc.sourceName, doc.documentType].join(' ')
    const tokens = tokenize(searchableText)

    for (const token of tokens) {
      if (!keywordIndex.has(token)) {
        keywordIndex.set(token, new Set())
      }
      keywordIndex.get(token).add(doc.id)
    }
  }

  return { byId, byCampground, byType, keywordIndex, documents }
}

let cachedIndex = null

/**
 * Returns the built knowledge index, caching after first build.
 * @returns {ReturnType<typeof buildKnowledgeIndex>}
 */
export function getKnowledgeIndex() {
  if (!cachedIndex) {
    cachedIndex = buildKnowledgeIndex(getAllKnowledgeDocuments())
  }
  return cachedIndex
}

/**
 * Resets the cached index (for testing).
 */
export function resetKnowledgeIndex() {
  cachedIndex = null
}

/**
 * Looks up a document by its id.
 * @param {string} id
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument | undefined}
 */
export function getDocumentById(id) {
  return getKnowledgeIndex().byId.get(id)
}

/**
 * Returns all documents for a campground.
 * @param {string} campgroundId
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function getDocumentsByCampground(campgroundId) {
  return getKnowledgeIndex().byCampground.get(campgroundId) ?? []
}

/**
 * Returns all documents of a given type.
 * @param {string} documentType
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function getDocumentsByType(documentType) {
  return getKnowledgeIndex().byType.get(documentType) ?? []
}

/**
 * Returns true when an index token matches a query token.
 * @param {string} indexToken
 * @param {string} queryToken
 * @returns {boolean}
 */
export function indexTokenMatchesQueryToken(indexToken, queryToken) {
  if (indexToken === queryToken) {
    return true
  }

  if (requiresExactTokenMatch(queryToken) || requiresExactTokenMatch(indexToken)) {
    return false
  }

  return indexToken.includes(queryToken) || queryToken.includes(indexToken)
}

/**
 * Searches documents by keyword using the inverted index.
 * @param {string} keyword
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function searchDocumentsByKeyword(keyword) {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) {
    return getKnowledgeIndex().documents
  }

  const queryTokens = getMeaningfulQueryTokens(normalized)
  if (queryTokens.length === 0) {
    return []
  }

  const { keywordIndex, byId } = getKnowledgeIndex()
  const matchingIds = new Set()

  for (const token of queryTokens) {
    for (const [indexToken, docIds] of keywordIndex.entries()) {
      if (indexTokenMatchesQueryToken(indexToken, token)) {
        for (const docId of docIds) {
          matchingIds.add(docId)
        }
      }
    }
  }

  return [...matchingIds].map((id) => byId.get(id)).filter(Boolean)
}

/**
 * Combined search with optional campground and document type filters.
 * @param {{ query?: string, campgroundId?: string, documentType?: string }} options
 * @returns {import('../knowledgeSchema.js').KnowledgeDocument[]}
 */
export function searchDocuments({ query = '', campgroundId = '', documentType = '' } = {}) {
  let results = query.trim()
    ? searchDocumentsByKeyword(query)
    : getKnowledgeIndex().documents

  if (campgroundId) {
    results = results.filter((doc) => doc.campgroundId === campgroundId)
  }

  if (documentType) {
    results = results.filter((doc) => doc.documentType === documentType)
  }

  return results
}

/**
 * Returns all document types present in the index.
 * @returns {string[]}
 */
export function getIndexedDocumentTypes() {
  return KNOWLEDGE_DOCUMENT_TYPES.filter((type) =>
    getKnowledgeIndex().byType.has(type),
  )
}

/**
 * Returns index statistics for diagnostics.
 * @returns {{ documentCount: number, campgroundCount: number, keywordCount: number }}
 */
export function getIndexStats() {
  const index = getKnowledgeIndex()
  return {
    documentCount: index.documents.length,
    campgroundCount: index.byCampground.size,
    keywordCount: index.keywordIndex.size,
  }
}
