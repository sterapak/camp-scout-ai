/**
 * In-memory vector store for semantic search.
 * No database, external services, or OpenAI calls.
 */

/**
 * @typedef {Object} ChunkMetadata
 * @property {string} documentId
 * @property {string} title
 * @property {string} campgroundId
 * @property {string} documentType
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} lastUpdatedAt
 * @property {number} chunkIndex
 * @property {string} text
 */

/**
 * @typedef {Object} VectorRecord
 * @property {string} chunkId
 * @property {number[]} vector
 * @property {ChunkMetadata} metadata
 */

/**
 * @typedef {Object} VectorSearchResult
 * @property {string} chunkId
 * @property {number} similarity
 * @property {ChunkMetadata} metadata
 */

/**
 * Computes cosine similarity between two vectors.
 * Returns 0 when either vector has zero magnitude.
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || b.length === 0) {
    return 0
  }

  const length = Math.min(a.length, b.length)
  let dotProduct = 0
  let magnitudeA = 0
  let magnitudeB = 0

  for (let i = 0; i < length; i++) {
    dotProduct += a[i] * b[i]
    magnitudeA += a[i] * a[i]
    magnitudeB += b[i] * b[i]
  }

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0
  }

  return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB))
}

/**
 * In-memory vector store with cosine similarity search.
 */
export class InMemoryVectorStore {
  constructor() {
    /** @type {Map<string, VectorRecord>} */
    this.records = new Map()
  }

  /**
   * Inserts or updates vector records.
   * @param {VectorRecord[]} records
   */
  upsert(records) {
    if (!Array.isArray(records)) {
      return
    }

    for (const record of records) {
      if (!record?.chunkId || !Array.isArray(record.vector) || !record.metadata) {
        continue
      }
      this.records.set(record.chunkId, {
        chunkId: record.chunkId,
        vector: [...record.vector],
        metadata: { ...record.metadata },
      })
    }
  }

  /**
   * Returns a record by chunk ID.
   * @param {string} chunkId
   * @returns {VectorRecord | undefined}
   */
  get(chunkId) {
    return this.records.get(chunkId)
  }

  /**
   * Returns the number of stored records.
   * @returns {number}
   */
  size() {
    return this.records.size
  }

  /**
   * Removes all records.
   */
  clear() {
    this.records.clear()
  }

  /**
   * Searches for the most similar vectors to a query vector.
   * @param {number[]} queryVector
   * @param {{ limit?: number, filter?: (metadata: ChunkMetadata) => boolean }} [options]
   * @returns {VectorSearchResult[]}
   */
  search(queryVector, { limit = 10, filter } = {}) {
    if (!Array.isArray(queryVector) || queryVector.length === 0 || this.records.size === 0) {
      return []
    }

    const safeLimit = Math.max(0, limit)
    if (safeLimit === 0) {
      return []
    }

    /** @type {VectorSearchResult[]} */
    const results = []

    for (const record of this.records.values()) {
      if (filter && !filter(record.metadata)) {
        continue
      }

      results.push({
        chunkId: record.chunkId,
        similarity: cosineSimilarity(queryVector, record.vector),
        metadata: record.metadata,
      })
    }

    results.sort((a, b) => b.similarity - a.similarity)

    return results.slice(0, safeLimit)
  }
}
