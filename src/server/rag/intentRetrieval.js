/**
 * Intent-aware retrieval ranking and classification logging.
 * Server-only; never import from React client code.
 */

import { retrieveDocuments } from '../../data/knowledge/knowledgeRetrieval.js'
import { getQueryIntent } from '../../data/knowledge/queryTokens.js'
import {
  QUERY_CATEGORY_COMPARISON,
  QUERY_CATEGORY_FACTUAL,
  QUERY_CATEGORY_RECOMMENDATION,
} from './queryClassifier.js'

/** @typedef {import('./queryClassifier.js').QueryCategory} QueryCategory */

/**
 * Maps query categories to document types that should rank higher during retrieval.
 * @type {Record<QueryCategory, string[]>}
 */
const INTENT_DOCUMENT_TYPE_BOOSTS = {
  [QUERY_CATEGORY_FACTUAL]: [],
  [QUERY_CATEGORY_COMPARISON]: ['description', 'rules', 'reservation'],
  [QUERY_CATEGORY_RECOMMENDATION]: ['description', 'reservation', 'rules'],
  ratings_opinion: [],
}

const INTENT_BOOST_SCORE = 12

/**
 * Applies intent-based score boosts to retrieval results.
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @param {QueryCategory} queryCategory
 * @param {string} [query]
 * @returns {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]}
 */
export function applyIntentBoosts(results, queryCategory, query = '') {
  const boostedTypes = INTENT_DOCUMENT_TYPE_BOOSTS[queryCategory] ?? []
  const queryIntent = getQueryIntent(query)

  return results
    .map((result) => {
      let boostedScore = result.relevanceScore

      if (boostedTypes.includes(result.document.documentType)) {
        boostedScore += INTENT_BOOST_SCORE
      }

      if (queryIntent.isCountQuestion && result.document.documentType === 'description') {
        boostedScore += 5
      }

      return {
        ...result,
        relevanceScore: boostedScore,
      }
    })
    .sort((left, right) => right.relevanceScore - left.relevanceScore)
}

/**
 * Retrieves documents with intent-aware ranking.
 * @param {{
 *   query: string,
 *   campgroundId?: string,
 *   documentType?: string,
 *   limit?: number,
 *   queryCategory?: QueryCategory,
 * }} options
 * @returns {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]}
 */
export function retrieveDocumentsWithIntent({
  query,
  campgroundId = '',
  documentType = '',
  limit = 20,
  queryCategory = QUERY_CATEGORY_FACTUAL,
} = {}) {
  const results = retrieveDocuments({ query, campgroundId, documentType, limit: limit * 2 })
  const boosted = applyIntentBoosts(results, queryCategory, query)
  return boosted.slice(0, limit)
}

/**
 * Logs query classification results for evaluation.
 * @param {{
 *   question: string,
 *   queryCategory: QueryCategory,
 *   campgroundNames: string[],
 *   resultCount: number,
 * }} entry
 */
export function logIntentClassification(entry) {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  console.info('[intent-classification]', JSON.stringify({
    question: entry.question,
    category: entry.queryCategory,
    campgroundNames: entry.campgroundNames,
    resultCount: entry.resultCount,
    timestamp: new Date().toISOString(),
  }))
}
