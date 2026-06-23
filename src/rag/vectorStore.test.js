import { InMemoryVectorStore, cosineSimilarity } from './vectorStore'

describe('cosineSimilarity', () => {
  it('returns 1 for identical non-zero vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
  })

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('returns 0 for empty or invalid vectors', () => {
    expect(cosineSimilarity([], [1, 2])).toBe(0)
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0)
    expect(cosineSimilarity(null, [1])).toBe(0)
  })
})

describe('InMemoryVectorStore', () => {
  const metadata = {
    documentId: 'doc-1',
    title: 'Test Document',
    campgroundId: 'test-campground',
    documentType: 'rules',
    sourceUrl: 'https://www.nps.gov/test/rules.htm',
    sourceName: 'National Park Service',
    lastUpdatedAt: '2025-06-01',
    chunkIndex: 0,
    text: 'Bear food storage is required.',
  }

  it('stores chunk ID, vector, and metadata', () => {
    const store = new InMemoryVectorStore()
    store.upsert([{ chunkId: 'chunk-1', vector: [0.1, 0.2, 0.3], metadata }])

    const record = store.get('chunk-1')
    expect(record).toBeDefined()
    expect(record.chunkId).toBe('chunk-1')
    expect(record.vector).toEqual([0.1, 0.2, 0.3])
    expect(record.metadata).toEqual(metadata)
    expect(store.size()).toBe(1)
  })

  it('returns ranked results by cosine similarity', () => {
    const store = new InMemoryVectorStore()
    store.upsert([
      { chunkId: 'a', vector: [1, 0, 0], metadata: { ...metadata, text: 'alpha' } },
      { chunkId: 'b', vector: [0.9, 0.1, 0], metadata: { ...metadata, text: 'beta' } },
      { chunkId: 'c', vector: [0, 1, 0], metadata: { ...metadata, text: 'gamma' } },
    ])

    const results = store.search([1, 0, 0], { limit: 3 })

    expect(results).toHaveLength(3)
    expect(results[0].chunkId).toBe('a')
    expect(results[0].similarity).toBeGreaterThan(results[1].similarity)
    expect(results[1].similarity).toBeGreaterThanOrEqual(results[2].similarity)
    expect(results[0].metadata.text).toBe('alpha')
  })

  it('preserves source attribution in search results', () => {
    const store = new InMemoryVectorStore()
    store.upsert([{ chunkId: 'chunk-1', vector: [1, 0], metadata }])

    const [result] = store.search([1, 0])
    expect(result.metadata.sourceUrl).toBe(metadata.sourceUrl)
    expect(result.metadata.sourceName).toBe(metadata.sourceName)
    expect(result.metadata.campgroundId).toBe(metadata.campgroundId)
  })

  it('handles an empty store safely', () => {
    const store = new InMemoryVectorStore()

    expect(store.size()).toBe(0)
    expect(store.search([1, 0, 0])).toEqual([])
    expect(store.get('missing')).toBeUndefined()
  })

  it('handles empty query vectors safely', () => {
    const store = new InMemoryVectorStore()
    store.upsert([{ chunkId: 'chunk-1', vector: [1, 0], metadata }])

    expect(store.search([])).toEqual([])
    expect(store.search(null)).toEqual([])
  })

  it('supports metadata filters', () => {
    const store = new InMemoryVectorStore()
    store.upsert([
      {
        chunkId: 'yosemite',
        vector: [1, 0],
        metadata: { ...metadata, campgroundId: 'yosemite-upper-pines' },
      },
      {
        chunkId: 'lassen',
        vector: [0.9, 0.1],
        metadata: { ...metadata, campgroundId: 'lassen-manzanita-lake' },
      },
    ])

    const results = store.search([1, 0], {
      filter: (meta) => meta.campgroundId === 'yosemite-upper-pines',
    })

    expect(results).toHaveLength(1)
    expect(results[0].chunkId).toBe('yosemite')
  })

  it('ignores invalid upsert records', () => {
    const store = new InMemoryVectorStore()
    store.upsert([
      null,
      { chunkId: 'bad' },
      { chunkId: 'also-bad', vector: [1], metadata: null },
    ])

    expect(store.size()).toBe(0)
  })

  it('updates existing records on upsert', () => {
    const store = new InMemoryVectorStore()
    store.upsert([{ chunkId: 'chunk-1', vector: [1, 0], metadata }])
    store.upsert([{ chunkId: 'chunk-1', vector: [0, 1], metadata: { ...metadata, text: 'updated' } }])

    expect(store.size()).toBe(1)
    expect(store.get('chunk-1').vector).toEqual([0, 1])
    expect(store.get('chunk-1').metadata.text).toBe('updated')
  })

  it('clears all records', () => {
    const store = new InMemoryVectorStore()
    store.upsert([{ chunkId: 'chunk-1', vector: [1], metadata }])
    store.clear()

    expect(store.size()).toBe(0)
  })
})
