import { getAllCampgrounds } from '../campgroundData.js'
import { getMeaningfulQueryTokens, tokenizeText } from './queryTokens.js'

/**
 * @typedef {Object} InferredCampgroundMatch
 * @property {string} id
 * @property {number} score
 */

/**
 * Scores how well a campground matches a natural-language query.
 * @param {import('../campgroundSchema.js').Campground} campground
 * @param {string[]} meaningfulTokens
 * @param {string} normalizedQuery
 * @returns {number}
 */
function scoreCampgroundMatch(campground, meaningfulTokens, normalizedQuery) {
  const haystack = [
    campground.id.replace(/-/g, ' '),
    campground.name,
    campground.region,
    campground.notes,
    ...campground.tags,
  ]
    .join(' ')
    .toLowerCase()

  let score = 0

  for (const token of meaningfulTokens) {
    if (haystack.includes(token)) {
      score += 1
    }
  }

  const campgroundName = campground.name.toLowerCase()
  if (normalizedQuery && campgroundName.includes(normalizedQuery)) {
    score += 5
  }

  for (const phrase of extractLocationPhrases(normalizedQuery)) {
    if (haystack.includes(phrase) || campgroundName.includes(phrase)) {
      score += 4
    }
  }

  return score
}

/**
 * Extracts multi-word location phrases from a query.
 * @param {string} normalizedQuery
 * @returns {string[]}
 */
function extractLocationPhrases(normalizedQuery) {
  const tokens = tokenizeText(normalizedQuery)
  /** @type {string[]} */
  const phrases = []

  for (let index = 0; index < tokens.length - 1; index += 1) {
    phrases.push(`${tokens[index]} ${tokens[index + 1]}`)
  }

  return phrases
}

/**
 * Infers campground IDs referenced by a natural-language query.
 * @param {string} query
 * @returns {InferredCampgroundMatch[]}
 */
export function inferCampgroundMatches(query) {
  const normalizedQuery = query.trim().toLowerCase()
  const meaningfulTokens = getMeaningfulQueryTokens(normalizedQuery)

  if (meaningfulTokens.length === 0) {
    return []
  }

  return getAllCampgrounds()
    .map((campground) => ({
      id: campground.id,
      score: scoreCampgroundMatch(campground, meaningfulTokens, normalizedQuery),
    }))
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score)
}

/**
 * Returns the strongest inferred campground match for a query, if any.
 * @param {string} query
 * @returns {InferredCampgroundMatch | null}
 */
export function getPrimaryCampgroundMatch(query) {
  const [bestMatch] = inferCampgroundMatches(query)
  return bestMatch ?? null
}
