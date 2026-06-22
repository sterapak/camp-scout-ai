import { retrieveDocuments } from '../data/knowledge/knowledgeRetrieval'
import { createTestEmbeddingProvider } from './testEmbeddingProvider'
import {
  buildSemanticIndex,
  metadataToChunk,
  resetSemanticIndex,
  retrieveSemanticChunks,
} from './semanticRetrieval'

describe('semanticRetrieval', () => {
  beforeEach(() => {
    resetSemanticIndex()
  })

  it('builds a vector index from knowledge document chunks', () => {
    const store = buildSemanticIndex()
    expect(store.size()).toBeGreaterThan(0)
  })

  it('returns ranked chunks by similarity score', () => {
    const results = retrieveSemanticChunks({ query: 'bear food storage lockers' })

    expect(results.length).toBeGreaterThan(0)
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].similarityScore).toBeGreaterThanOrEqual(results[i].similarityScore)
    }
  })

  it('preserves source attribution in every result', () => {
    const results = retrieveSemanticChunks({ query: 'reservation policy' })

    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.sourceUrl).toMatch(/^https:\/\//)
      expect(result.sourceName).toBeTruthy()
      expect(result.chunk.sourceUrl).toBe(result.sourceUrl)
      expect(result.chunk.sourceName).toBe(result.sourceName)
      expect(result.chunk.text.trim().length).toBeGreaterThan(0)
    })
  })

  it('filters by campground and document type', () => {
    const results = retrieveSemanticChunks({
      query: 'campground rules',
      campgroundId: 'yosemite-upper-pines',
      documentType: 'rules',
    })

    expect(results.length).toBeGreaterThan(0)
    results.forEach((result) => {
      expect(result.chunk.campgroundId).toBe('yosemite-upper-pines')
      expect(result.chunk.documentType).toBe('rules')
    })
  })

  it('respects result limit', () => {
    const results = retrieveSemanticChunks({ query: 'campground', limit: 3 })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('returns empty results for empty queries', () => {
    expect(retrieveSemanticChunks({ query: '' })).toEqual([])
    expect(retrieveSemanticChunks({ query: '   ' })).toEqual([])
  })

  it('returns empty results for an empty store', () => {
    const provider = createTestEmbeddingProvider()
    const store = buildSemanticIndex(provider)
    store.clear()

    expect(retrieveSemanticChunks({ query: 'bear', store, embeddingProvider: provider })).toEqual([])
  })

  it('converts metadata back to a knowledge chunk', () => {
    const metadata = {
      documentId: 'doc-1',
      title: 'Rules',
      campgroundId: 'test-campground',
      documentType: 'rules',
      sourceUrl: 'https://www.nps.gov/test/rules.htm',
      sourceName: 'National Park Service',
      lastUpdatedAt: '2025-06-01',
      chunkIndex: 0,
      text: 'Sample chunk text',
    }

    const chunk = metadataToChunk(metadata, 'doc-1::chunk-0')
    expect(chunk.id).toBe('doc-1::chunk-0')
    expect(chunk.text).toBe('Sample chunk text')
  })

  it('does not generate AI answers — only returns retrieved chunks', () => {
    const results = retrieveSemanticChunks({ query: 'What are the bear rules?' })

    results.forEach((result) => {
      expect(result).not.toHaveProperty('answer')
      expect(result).not.toHaveProperty('generatedText')
      expect(result.chunk).toBeDefined()
    })
  })
})

describe('semantic vs keyword retrieval', () => {
  beforeEach(() => {
    resetSemanticIndex()
  })

  it('both retrieval paths return source-attributed results', () => {
    const keywordResults = retrieveDocuments({ query: 'bear' })
    const semanticResults = retrieveSemanticChunks({ query: 'bear food storage' })

    expect(keywordResults.length).toBeGreaterThan(0)
    expect(semanticResults.length).toBeGreaterThan(0)

    keywordResults.forEach((result) => {
      expect(result.sourceUrl).toMatch(/^https:\/\//)
    })
    semanticResults.forEach((result) => {
      expect(result.sourceUrl).toMatch(/^https:\/\//)
    })
  })
})
