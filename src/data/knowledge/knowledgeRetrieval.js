/**
 * Retrieval service for campground knowledge documents.
 * Returns relevant documents with source attribution and relevance ordering.
 * No AI, embeddings, or vector database.
 */

import { getCampgroundById } from '../campgroundData.js'
import { getKnowledgeIndex, searchDocumentsByKeyword } from './knowledgeIndex.js'

/**
 * @typedef {Object} RetrievalResult
 * @property {import('../knowledgeSchema.js').KnowledgeDocument} document
 * @property {number} relevanceScore
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} [campgroundName]
 */

/**
 * Scores a document against a query for relevance ordering.
 * @param {import('../knowledgeSchema.js').KnowledgeDocument} document
 * @param {string} query
 * @param {string} [campgroundId]
 * @returns {number}
 */
export function scoreDocument(document, query, campgroundId = '') {
  let score = 0
  const normalizedQuery = query.trim().toLowerCase()
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean)

  if (campgroundId && document.campgroundId === campgroundId) {
    score += 100
  }

  const titleLower = document.title.toLowerCase()
  const contentLower = document.content.toLowerCase()

  for (const token of queryTokens) {
    if (titleLower.includes(token)) {
      score += 10
    }
    if (contentLower.includes(token)) {
      score += 5
    }
    if (document.documentType.includes(token)) {
      score += 3
    }
  }

  if (normalizedQuery && titleLower.includes(normalizedQuery)) {
    score += 15
  }

  return score
}

/**
 * Retrieves relevant knowledge documents for a campground query.
 * @param {{ query: string, campgroundId?: string, documentType?: string, limit?: number }} options
 * @returns {RetrievalResult[]}
 */
export function retrieveDocuments({ query, campgroundId = '', documentType = '', limit = 20 } = {}) {
  const normalizedQuery = (query ?? '').trim()
  const index = getKnowledgeIndex()

  let candidates = normalizedQuery
    ? searchDocumentsByKeyword(normalizedQuery)
    : [...index.documents]

  if (campgroundId) {
    candidates = candidates.filter((doc) => doc.campgroundId === campgroundId)
  }

  if (documentType) {
    candidates = candidates.filter((doc) => doc.documentType === documentType)
  }

  const results = candidates.map((document) => {
    const campground = getCampgroundById(document.campgroundId)
    return {
      document,
      relevanceScore: scoreDocument(document, normalizedQuery, campgroundId),
      sourceUrl: document.sourceUrl,
      sourceName: document.sourceName,
      campgroundName: campground?.name,
    }
  })

  results.sort((a, b) => b.relevanceScore - a.relevanceScore)

  return results.slice(0, limit)
}

/**
 * Retrieves all documents for a specific campground, ordered by document type.
 * @param {string} campgroundId
 * @returns {RetrievalResult[]}
 */
export function retrieveByCampground(campgroundId) {
  return retrieveDocuments({ query: '', campgroundId, limit: 100 })
}

/**
 * Retrieves documents matching a keyword across all campgrounds.
 * @param {string} keyword
 * @returns {RetrievalResult[]}
 */
export function retrieveByKeyword(keyword) {
  return retrieveDocuments({ query: keyword })
}
