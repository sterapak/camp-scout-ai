import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  createZeroVector,
  isEmbeddingProvider,
} from './embeddingProvider'
import {
  createTestEmbeddingProvider,
  testEmbeddingProvider,
} from './testEmbeddingProvider'

describe('embeddingProvider interface', () => {
  it('defines the embedding provider contract', () => {
    expect(DEFAULT_EMBEDDING_DIMENSIONS).toBeGreaterThan(0)
    expect(isEmbeddingProvider(testEmbeddingProvider)).toBe(true)
    expect(testEmbeddingProvider.dimensions).toBe(DEFAULT_EMBEDDING_DIMENSIONS)
    expect(typeof testEmbeddingProvider.embed).toBe('function')
    expect(typeof testEmbeddingProvider.embedMany).toBe('function')
  })

  it('rejects invalid provider shapes', () => {
    expect(isEmbeddingProvider(null)).toBe(false)
    expect(isEmbeddingProvider({ dimensions: 4 })).toBe(false)
    expect(isEmbeddingProvider({
      dimensions: 4,
      embed: () => [],
      embedMany: undefined,
    })).toBe(false)
  })
})

describe('testEmbeddingProvider', () => {
  const provider = testEmbeddingProvider

  it('returns the same vector for the same input', () => {
    const first = provider.embed('campfire rules near bear lockers')
    const second = provider.embed('campfire rules near bear lockers')

    expect(first).toEqual(second)
    expect(first).toHaveLength(provider.dimensions)
  })

  it('returns different vectors for different inputs', () => {
    const first = provider.embed('reservation policy')
    const second = provider.embed('dog policy')

    expect(first).not.toEqual(second)
  })

  it('returns batch embeddings in input order', () => {
    const texts = ['alpha', 'beta', 'gamma']
    const batch = provider.embedMany(texts)

    expect(batch).toHaveLength(texts.length)
    expect(batch[0]).toEqual(provider.embed(texts[0]))
    expect(batch[1]).toEqual(provider.embed(texts[1]))
    expect(batch[2]).toEqual(provider.embed(texts[2]))
  })

  it('handles empty and invalid single inputs safely', () => {
    const zeroVector = createZeroVector(provider.dimensions)

    expect(provider.embed('')).toEqual(zeroVector)
    expect(provider.embed('   ')).toEqual(zeroVector)
    expect(provider.embed(null)).toEqual(zeroVector)
    expect(provider.embed(undefined)).toEqual(zeroVector)
    expect(provider.embed(42)).toEqual(zeroVector)
  })

  it('handles empty and invalid batch inputs safely', () => {
    expect(provider.embedMany([])).toEqual([])
    expect(provider.embedMany(null)).toEqual([])
    expect(provider.embedMany(undefined)).toEqual([])
    expect(provider.embedMany('not-an-array')).toEqual([])

    const zeroVector = createZeroVector(provider.dimensions)
    const batch = provider.embedMany(['valid', '', null, 'another'])

    expect(batch).toHaveLength(4)
    expect(batch[0]).toEqual(provider.embed('valid'))
    expect(batch[1]).toEqual(zeroVector)
    expect(batch[2]).toEqual(zeroVector)
    expect(batch[3]).toEqual(provider.embed('another'))
  })

  it('supports custom dimensions', () => {
    const customProvider = createTestEmbeddingProvider(4)

    expect(customProvider.dimensions).toBe(4)
    expect(customProvider.embed('test')).toHaveLength(4)
    expect(customProvider.embedMany(['a', 'b'])).toEqual([
      customProvider.embed('a'),
      customProvider.embed('b'),
    ])
  })
})
