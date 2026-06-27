/** @jest-environment node */

import { retrieveDocuments } from '../../data/knowledge/knowledgeRetrieval.js'
import {
  applyIntentBoosts,
  retrieveDocumentsWithIntent,
} from './intentRetrieval.js'
import { QUERY_CATEGORY_COMPARISON } from './queryClassifier.js'

describe('intentRetrieval', () => {
  it('boosts comparison-relevant document types for comparison questions', () => {
    const results = retrieveDocuments({ query: 'Silver Lake campground rules', limit: 5 })
    const boosted = applyIntentBoosts(results, QUERY_CATEGORY_COMPARISON, 'Silver Lake campground rules')

    const descriptionBoost = boosted.find(
      (result) => result.document.documentType === 'description'
    )?.relevanceScore ?? 0
    const originalDescription = results.find(
      (result) => result.document.documentType === 'description'
    )?.relevanceScore ?? 0

    expect(descriptionBoost).toBeGreaterThanOrEqual(originalDescription)
  })

  it('returns intent-ranked documents through retrieveDocumentsWithIntent', () => {
    const results = retrieveDocumentsWithIntent({
      query: 'Compare Silver Lake West and Silver Lake East',
      queryCategory: QUERY_CATEGORY_COMPARISON,
      limit: 3,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(3)
  })
})
