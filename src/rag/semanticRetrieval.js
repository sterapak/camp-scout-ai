/**
 * Semantic retrieval service combining chunking, embeddings, and vector search.
 * Returns ranked chunks with source attribution — no AI-generated answers.
 */

import { getCampgroundById } from '../data/campgroundData.js'
import { chunkAllKnowledgeDocuments } from './chunking.js'
import { testEmbeddingProvider } from './testEmbeddingProvider.js'
import { InMemoryVectorStore } from './vectorStore.js'

/**
 * @typedef {import('./chunking.js').KnowledgeChunk} KnowledgeChunk
 */

/**
 * @typedef {Object} SemanticRetrievalResult
 * @property {KnowledgeChunk} chunk
 * @property {number} similarityScore
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} [campgroundName]
 */

/** @type {InMemoryVectorStore | null} */
let cachedStore = null

/**
 * Builds an in-memory vector index from knowledge document chunks.
 * @param {import('./embeddingProvider.js').EmbeddingProvider} [embeddingProvider]
 * @returns {InMemoryVectorStore}
 */
export function buildSemanticIndex(embeddingProvider = testEmbeddingProvider) {
  const store = new InMemoryVectorStore()
  const chunks = chunkAllKnowledgeDocuments()

  if (chunks.length === 0) {
    return store
  }

  const vectors = embeddingProvider.embedMany(chunks.map((chunk) => chunk.text))
  const records = chunks.map((chunk, index) => ({
    chunkId: chunk.id,
    vector: vectors[index],
    metadata: {
      documentId: chunk.documentId,
      title: chunk.title,
      campgroundId: chunk.campgroundId,
      documentType: chunk.documentType,
      sourceUrl: chunk.sourceUrl,
      sourceName: chunk.sourceName,
      lastUpdatedAt: chunk.lastUpdatedAt,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
    },
  }))

  store.upsert(records)
  return store
}

/**
 * Returns the cached semantic index, building it on first access.
 * @param {import('./embeddingProvider.js').EmbeddingProvider} [embeddingProvider]
 * @returns {InMemoryVectorStore}
 */
export function getSemanticIndex(embeddingProvider = testEmbeddingProvider) {
  if (!cachedStore) {
    cachedStore = buildSemanticIndex(embeddingProvider)
  }
  return cachedStore
}

/**
 * Resets the cached semantic index (for testing).
 */
export function resetSemanticIndex() {
  cachedStore = null
}

/**
 * Converts vector store metadata back to a KnowledgeChunk.
 * @param {import('./vectorStore.js').ChunkMetadata} metadata
 * @param {string} chunkId
 * @returns {KnowledgeChunk}
 */
export function metadataToChunk(metadata, chunkId) {
  return {
    id: chunkId,
    documentId: metadata.documentId,
    title: metadata.title,
    campgroundId: metadata.campgroundId,
    documentType: metadata.documentType,
    sourceUrl: metadata.sourceUrl,
    sourceName: metadata.sourceName,
    lastUpdatedAt: metadata.lastUpdatedAt,
    chunkIndex: metadata.chunkIndex,
    text: metadata.text,
  }
}

/**
 * Retrieves semantically similar knowledge chunks for a query.
 * @param {{
 *   query: string,
 *   campgroundId?: string,
 *   documentType?: string,
 *   limit?: number,
 *   store?: InMemoryVectorStore,
 *   embeddingProvider?: import('./embeddingProvider.js').EmbeddingProvider,
 * }} options
 * @returns {SemanticRetrievalResult[]}
 */
export function retrieveSemanticChunks({
  query,
  campgroundId = '',
  documentType = '',
  limit = 10,
  store,
  embeddingProvider = testEmbeddingProvider,
} = {}) {
  const normalizedQuery = (query ?? '').trim()
  const vectorStore = store ?? getSemanticIndex(embeddingProvider)

  if (!normalizedQuery || vectorStore.size() === 0) {
    return []
  }

  const queryVector = embeddingProvider.embed(normalizedQuery)
  const searchResults = vectorStore.search(queryVector, {
    limit,
    filter: (metadata) => {
      if (campgroundId && metadata.campgroundId !== campgroundId) {
        return false
      }
      if (documentType && metadata.documentType !== documentType) {
        return false
      }
      return true
    },
  })

  return searchResults.map((result) => {
    const campground = getCampgroundById(result.metadata.campgroundId)
    return {
      chunk: metadataToChunk(result.metadata, result.chunkId),
      similarityScore: result.similarity,
      sourceUrl: result.metadata.sourceUrl,
      sourceName: result.metadata.sourceName,
      campgroundName: campground?.name,
    }
  })
}
