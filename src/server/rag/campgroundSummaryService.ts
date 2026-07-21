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
import { resolveKnowledgeSnapshot, type KnowledgeSnapshot } from './knowledgeSnapshot.js'
import { fetchRidbSummarySource } from './ridbSummarySource.js'
import type { RetrievalResult } from '../../data/knowledge/knowledgeRetrieval.js'

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

export interface GetCampgroundSummaryOptions {
  campgroundId?: string
  forceRegenerate?: boolean
  now?: () => Date
  answerProvider?: import('../openai/answerProvider.js').AnswerProvider
  provider?: import('../openai/createAnswerProvider.js').AnswerProviderName
  protectedAccess?: boolean
  maxOutputTokens?: number
}

export async function getCampgroundSummary({
  campgroundId,
  forceRegenerate = false,
  now = () => new Date(),
  answerProvider,
  provider,
  protectedAccess = false,
  maxOutputTokens,
}: GetCampgroundSummaryOptions = {}) {
  const trimmedCampgroundId = (campgroundId ?? '').trim()

  if (trimmedCampgroundId.length === 0) {
    return generateCampgroundSummary({
      campgroundId: trimmedCampgroundId,
      answerProvider,
      provider,
      protectedAccess,
    })
  }

  // Generate (or return cached) against a known snapshot, caching successes so
  // each (campground, source-version) is only paid for once.
  const generateAndCache = async (
    snapshot: KnowledgeSnapshot,
    overrideResults?: RetrievalResult[],
    campgroundName?: string,
  ) => {
    if (!forceRegenerate) {
      const cached = getCachedSummary(trimmedCampgroundId, snapshot)
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
      overrideResults,
      campgroundName,
    })

    if (result.status !== 'success') return result

    const generatedAt = now().toISOString()
    setCachedSummary({ campgroundId: trimmedCampgroundId, knowledgeSnapshot: snapshot, generatedAt, summary: result })
    return { ...result, generatedAt, knowledgeSnapshot: snapshot, cached: false }
  }

  // 1. Curated knowledge (the ~22 hand-authored campgrounds).
  const knowledgeSnapshot = resolveKnowledgeSnapshot(trimmedCampgroundId)
  if (knowledgeSnapshot) {
    return generateAndCache(knowledgeSnapshot)
  }

  // 2. RIDB fallback: any numeric recreation.gov facility with a usable
  //    description. Keyed by the RIDB content hash so it caches per version.
  const ridb = await fetchRidbSummarySource(trimmedCampgroundId)
  if (ridb) {
    return generateAndCache(ridb.snapshot, ridb.results, ridb.campgroundName)
  }

  // 3. Neither curated nor RIDB → honest "insufficient" from the generator.
  return generateCampgroundSummary({
    campgroundId: trimmedCampgroundId,
    answerProvider,
    provider,
    protectedAccess,
    maxOutputTokens,
  })
}

export { clearSummaryCache }
