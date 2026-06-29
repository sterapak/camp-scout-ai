// @ts-nocheck
/**
 * Deterministic local embedding provider for tests and development.
 * No external API calls, API keys, or persistence.
 */

import {
  DEFAULT_EMBEDDING_DIMENSIONS,
  createZeroVector,
} from './embeddingProvider.js'

/**
 * Builds a deterministic embedding vector from text using local character math.
 * @param {string} text
 * @param {number} dimensions
 * @returns {number[]}
 */
function embedText(text, dimensions) {
  const vector = createZeroVector(dimensions)

  if (text == null || typeof text !== 'string') {
    return vector
  }

  const normalized = text.trim()
  if (normalized.length === 0) {
    return vector
  }

  for (let i = 0; i < normalized.length; i++) {
    const dim = i % dimensions
    const code = normalized.charCodeAt(i)
    vector[dim] += (code * (i + 1)) / 10000
  }

  vector[dimensions - 1] = normalized.length / 1000

  return vector
}

/**
 * Creates a deterministic test embedding provider.
 * @param {number} [dimensions]
 * @returns {import('./embeddingProvider.js').EmbeddingProvider}
 */
export function createTestEmbeddingProvider(dimensions = DEFAULT_EMBEDDING_DIMENSIONS) {
  return {
    dimensions,
    embed(text) {
      return embedText(text, dimensions)
    },
    embedMany(texts) {
      if (!Array.isArray(texts)) {
        return []
      }
      return texts.map((text) => embedText(text, dimensions))
    },
  }
}

/** Shared deterministic provider for unit tests. */
export const testEmbeddingProvider = createTestEmbeddingProvider()
