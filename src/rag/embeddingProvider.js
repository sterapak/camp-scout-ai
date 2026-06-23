/**
 * Embedding provider interface for future semantic retrieval.
 * Implementations must be local and deterministic for tests; no external AI APIs.
 */

export const DEFAULT_EMBEDDING_DIMENSIONS = 8

/**
 * @typedef {Object} EmbeddingProvider
 * @property {number} dimensions - Length of each embedding vector
 * @property {(text: string) => number[]} embed - Embed a single text string
 * @property {(texts: string[]) => number[][]} embedMany - Embed multiple text strings in order
 */

/**
 * Creates a zero-filled embedding vector.
 * @param {number} dimensions
 * @returns {number[]}
 */
export function createZeroVector(dimensions) {
  return Array.from({ length: dimensions }, () => 0)
}

/**
 * Checks that a value implements the embedding provider contract.
 * @param {unknown} value
 * @returns {value is EmbeddingProvider}
 */
export function isEmbeddingProvider(value) {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof value.dimensions === 'number' &&
    value.dimensions > 0 &&
    typeof value.embed === 'function' &&
    typeof value.embedMany === 'function'
  )
}
