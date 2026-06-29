// @ts-nocheck
import { createHash } from 'node:crypto'

/**
 * Normalizes extracted text for stable hashing and comparison.
 * @param {string} text
 * @returns {string}
 */
export function normalizeExtractedText(text) {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/**
 * Computes a deterministic SHA-256 hash for extracted source content.
 * @param {string} text
 * @returns {string}
 */
export function computeContentHash(text) {
  return createHash('sha256').update(normalizeExtractedText(text)).digest('hex')
}
