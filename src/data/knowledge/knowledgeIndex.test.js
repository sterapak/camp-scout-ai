import {
  buildKnowledgeIndex,
  getDocumentById,
  getDocumentsByCampground,
  getDocumentsByType,
  getIndexStats,
  resetKnowledgeIndex,
  searchDocuments,
  searchDocumentsByKeyword,
} from './knowledgeIndex'
import { getAllKnowledgeDocuments } from './documents'

describe('knowledgeIndex', () => {
  beforeEach(() => {
    resetKnowledgeIndex()
  })

  it('builds index successfully', () => {
    const documents = getAllKnowledgeDocuments()
    const index = buildKnowledgeIndex(documents)

    expect(index.documents.length).toBeGreaterThan(0)
    expect(index.byId.size).toBe(documents.length)
    expect(index.byCampground.size).toBeGreaterThanOrEqual(10)
    expect(index.keywordIndex.size).toBeGreaterThan(0)
  })

  it('returns index statistics', () => {
    const stats = getIndexStats()
    expect(stats.documentCount).toBeGreaterThan(0)
    expect(stats.campgroundCount).toBeGreaterThanOrEqual(10)
    expect(stats.keywordCount).toBeGreaterThan(0)
  })

  it('looks up documents by campground', () => {
    const docs = getDocumentsByCampground('yosemite-upper-pines')
    expect(docs.length).toBeGreaterThan(0)
    docs.forEach((doc) => {
      expect(doc.campgroundId).toBe('yosemite-upper-pines')
    })
  })

  it('looks up documents by type', () => {
    const descriptions = getDocumentsByType('description')
    expect(descriptions.length).toBeGreaterThan(0)
    descriptions.forEach((doc) => {
      expect(doc.documentType).toBe('description')
    })
  })

  it('looks up a document by id', () => {
    const doc = getDocumentById('yosemite-upper-pines-description')
    expect(doc).toBeDefined()
    expect(doc.title).toContain('Upper Pines')
  })

  it('searches documents by keyword', () => {
    const results = searchDocumentsByKeyword('bear')
    expect(results.length).toBeGreaterThan(0)
    const hasBearContent = results.some(
      (doc) =>
        doc.content.toLowerCase().includes('bear') ||
        doc.title.toLowerCase().includes('bear'),
    )
    expect(hasBearContent).toBe(true)
  })

  it('supports combined search with filters', () => {
    const results = searchDocuments({
      query: 'reservation',
      campgroundId: 'yosemite-upper-pines',
      documentType: 'reservation',
    })
    expect(results.length).toBe(1)
    expect(results[0].id).toBe('yosemite-upper-pines-reservation')
  })

  it('returns all documents when query is empty', () => {
    const all = searchDocuments({})
    expect(all.length).toBe(getAllKnowledgeDocuments().length)
  })
})
