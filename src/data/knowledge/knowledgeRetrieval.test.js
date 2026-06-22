import {
  retrieveByCampground,
  retrieveByKeyword,
  retrieveDocuments,
  scoreDocument,
} from './knowledgeRetrieval'
import { getAllKnowledgeDocuments } from './documents'

describe('knowledgeRetrieval', () => {
  it('returns matching documents for a keyword query', () => {
    const results = retrieveByKeyword('bear')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.sourceUrl).toMatch(/^https:\/\//)
      expect(result.sourceName).toBeTruthy()
      expect(typeof result.relevanceScore).toBe('number')
    })
  })

  it('returns documents for a specific campground', () => {
    const results = retrieveByCampground('yosemite-upper-pines')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.document.campgroundId).toBe('yosemite-upper-pines')
      expect(result.campgroundName).toContain('Upper Pines')
    })
  })

  it('orders results by relevance score', () => {
    const results = retrieveDocuments({ query: 'bear food storage', campgroundId: 'yosemite-upper-pines' })
    expect(results.length).toBeGreaterThan(0)

    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore)
    }
  })

  it('boosts campground-specific matches', () => {
    const doc = getAllKnowledgeDocuments()[0]
    const campgroundScore = scoreDocument(doc, 'campground', doc.campgroundId)
    const genericScore = scoreDocument(doc, 'campground', '')
    expect(campgroundScore).toBeGreaterThan(genericScore)
  })

  it('includes source attribution in every result', () => {
    const results = retrieveDocuments({ query: 'reservation' })
    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.sourceUrl).toBe(result.document.sourceUrl)
      expect(result.sourceName).toBe(result.document.sourceName)
    })
  })

  it('respects result limit', () => {
    const results = retrieveDocuments({ query: '', limit: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('filters by document type', () => {
    const results = retrieveDocuments({ query: '', documentType: 'alert' })
    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.document.documentType).toBe('alert')
    })
  })
})
