/**
 * Orchestrates campground summary generation with knowledge-snapshot caching.
 * Server-only; never import from React client code.
 */

import {
  clearSummaryCache,
  getCachedSummary,
  setCachedSummary,
} from './campgroundSummaryCache.js'
import { generateCampgroundSummary } from './campgroundSummaryGenerator.js'
import { resolveKnowledgeSnapshot } from './knowledgeSnapshot.js'

/**
 * @typedef {import('./campgroundSummaryGenerator.js').CampgroundSummaryResult} CampgroundSummaryResult
 * @typedef {import('./knowledgeSnapshot.js').KnowledgeSnapshot} KnowledgeSnapshot
 */

/**
 * @typedef {CampgroundSummaryResult & {
 *   generatedAt?: string,
 *   knowledgeSnapshot?: KnowledgeSnapshot,
 *   cached?: boolean,
 * }} CampgroundSummaryResponse
 */

/**
 * Returns a campground summary, using the cache when the knowledge snapshot is unchanged.
 * @param {{
 *   campgroundId: string,
 *   forceRegenerate?: boolean,
 *   now?: () => Date,
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 *   protectedAccess?: boolean,
 *   maxOutputTokens?: number,
 * }} options
 * @returns {Promise<CampgroundSummaryResponse>}
 */
export async function getCampgroundSummary({
  campgroundId,
  forceRegenerate = false,
  now = () => new Date(),
  answerProvider,
  provider,
  protectedAccess = false,
  maxOutputTokens,
} = {}) {
  const trimmedCampgroundId = (campgroundId ?? '').trim()

  if (trimmedCampgroundId.length === 0) {
    return generateCampgroundSummary({
      campgroundId: trimmedCampgroundId,
      answerProvider,
      provider,
      protectedAccess,
    })
  }

  const knowledgeSnapshot = resolveKnowledgeSnapshot(trimmedCampgroundId)

  if (!forceRegenerate && knowledgeSnapshot) {
    const cached = getCachedSummary(trimmedCampgroundId, knowledgeSnapshot)
    if (cached) {
      return {
        ...cached.summary,
        generatedAt: cached.generatedAt,
        knowledgeSnapshot: cached.knowledgeSnapshot,
        cached: true,
      }
    }
  }

  const result = await generateCampgroundSummary({
    campgroundId: trimmedCampgroundId,
    answerProvider,
    provider,
    protectedAccess,
    maxOutputTokens,
  })

  if (result.status !== 'success' || !knowledgeSnapshot) {
    return result
  }

  const generatedAt = now().toISOString()

  setCachedSummary({
    campgroundId: trimmedCampgroundId,
    knowledgeSnapshot,
    generatedAt,
    summary: result,
  })

  return {
    ...result,
    generatedAt,
    knowledgeSnapshot,
    cached: false,
  }
}

export { clearSummaryCache }
