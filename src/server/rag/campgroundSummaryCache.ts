/**
 * In-memory cache for generated campground summaries.
 * Cache keys combine campgroundId with the knowledge snapshot id so summaries
 * regenerate automatically when underlying knowledge changes.
 * Server-only.
 */

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
  return cache.get(buildSummaryCacheKey(campgroundId, knowledgeSnapshot.id))
}

/**
 * @param {CachedCampgroundSummary} entry
 */
export function setCachedSummary(entry) {
  cache.set(
    buildSummaryCacheKey(entry.campgroundId, entry.knowledgeSnapshot.id),
    entry,
  )
}

/** Clears all cached summaries — intended for tests. */
export function clearSummaryCache() {
  cache.clear()
}
