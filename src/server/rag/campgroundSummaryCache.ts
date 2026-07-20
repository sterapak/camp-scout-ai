/**
 * Two-tier cache for generated campground summaries. Server-only.
 *
 * L1 is an in-memory Map (fast, per-process). L2 is SQLite on the Fly volume,
 * so summaries survive restarts and deploys — previously they did not, and every
 * deploy silently discarded all of them.
 *
 * Cache keys combine campgroundId with the knowledge snapshot id so summaries
 * regenerate automatically when underlying knowledge changes.
 */
import { readStoredSummary, writeStoredSummary } from '../db/summaryRepository.js'

/**
 * @typedef {import('./campgroundSummaryGenerator.js').CampgroundSummarySuccess} CampgroundSummarySuccess
 * @typedef {import('./knowledgeSnapshot.js').KnowledgeSnapshot} KnowledgeSnapshot
 */

/**
 * @typedef {Object} CachedCampgroundSummary
 * @property {string} campgroundId
 * @property {KnowledgeSnapshot} knowledgeSnapshot
 * @property {string} generatedAt - ISO 8601 timestamp when summary was generated
 * @property {CampgroundSummarySuccess} summary
 */

/** @type {Map<string, CachedCampgroundSummary>} */
const cache = new Map()

/**
 * @param {string} campgroundId
 * @param {string} snapshotId
 * @returns {string}
 */
export function buildSummaryCacheKey(campgroundId, snapshotId) {
  return `${campgroundId}:${snapshotId}`
}

/**
 * @param {string} campgroundId
 * @param {KnowledgeSnapshot} knowledgeSnapshot
 * @returns {CachedCampgroundSummary | undefined}
 */
export function getCachedSummary(campgroundId, knowledgeSnapshot) {
  const key = buildSummaryCacheKey(campgroundId, knowledgeSnapshot.id)

  const inMemory = cache.get(key)
  if (inMemory) return inMemory

  // L2: SQLite. The Map alone lost every summary on restart/deploy, so the next
  // visitor paid full generation latency and cost again. A DB miss is a real
  // miss; a DB *error* must not be, or an unreachable database would look like
  // "no summary exists" and silently re-bill generation on every request.
  let stored
  try {
    stored = readStoredSummary(campgroundId, knowledgeSnapshot.id)
  } catch (error) {
    console.warn(
      `[summaryCache] summary lookup failed for ${key}; treating as miss`,
      error,
    )
    return undefined
  }
  if (!stored) return undefined

  const entry = {
    campgroundId: stored.campgroundId,
    knowledgeSnapshot: stored.knowledgeSnapshot,
    generatedAt: stored.generatedAt,
    summary: stored.summary,
  }
  cache.set(key, entry)
  return entry
}

/**
 * @param {CachedCampgroundSummary} entry
 */
export function setCachedSummary(entry) {
  cache.set(
    buildSummaryCacheKey(entry.campgroundId, entry.knowledgeSnapshot.id),
    entry,
  )

  // Write-through. A failed persist must not fail the request — the caller
  // already has a valid summary in hand; we just lose durability for this one.
  try {
    writeStoredSummary(entry)
  } catch (error) {
    console.warn(
      `[summaryCache] failed to persist summary for ${entry.campgroundId}; kept in memory only`,
      error,
    )
  }
}

/** Clears cached summaries — intended for tests. Memory only; see __resetSummariesForTests for the table. */
export function clearSummaryCache() {
  cache.clear()
}
