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

  it('ranks Silver Lake West docs above unrelated campgrounds for silver lake campsite questions', () => {
    const results = retrieveDocuments({
      query: 'how many camping sites at silver lake?',
      limit: 3,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].document.campgroundId).toBe('silver-lake-west')

    const combinedContent = results.map((result) => result.document.content).join(' ')
    expect(combinedContent).toMatch(/forty-two \(42\) campsites|42 campsites/i)
  })

  it('ranks Silver Lake West docs for silver lake campground count questions', () => {
    const results = retrieveDocuments({
      query: 'how many campgrounds at silver lake?',
      limit: 3,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results.every((result) => result.document.campgroundId === 'silver-lake-west')).toBe(true)
  })

  it('prioritizes reservation documents with camping fees for price questions', () => {
    const results = retrieveDocuments({
      query: 'What is the site fee at Ice House Campground?',
      limit: 5,
    })

    expect(results.length).toBeGreaterThan(0)
    expect(results[0].document.documentType).toBe('reservation')
    expect(results[0].document.content).toMatch(/Single site fee is \$36/)
  })

  it('does not boost description documents above reservation docs for cheapest campground questions', () => {
    const results = retrieveDocuments({
      query: 'What is the cheapest campground?',
      limit: 5,
    })

    const topReservationIndex = results.findIndex(
      (result) => result.document.documentType === 'reservation',
    )
    const topDescriptionIndex = results.findIndex(
      (result) => result.document.documentType === 'description',
    )

    if (topReservationIndex !== -1 && topDescriptionIndex !== -1) {
      expect(topReservationIndex).toBeLessThan(topDescriptionIndex)
    }
  })
})
