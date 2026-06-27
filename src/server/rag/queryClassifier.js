/**
 * Query classification for Ask API capability guardrails (CS-012).
 * Distinguishes factual, ratings/opinion, comparison, and recommendation questions.
 * Server-only; never import from React client code.
 */

import { inferCampgroundMatches } from '../../data/knowledge/campgroundQueryMatch.js'
import { getAllCampgrounds } from '../../data/campgroundData.js'

/** @typedef {'factual' | 'ratings_opinion' | 'comparison' | 'recommendation'} QueryCategory */

/**
 * @typedef {Object} QueryClassification
 * @property {QueryCategory} category
 * @property {boolean} shouldShortCircuit
 * @property {string} [shortCircuitMessage]
 * @property {string[]} campgroundNames
 */

export const QUERY_CATEGORY_FACTUAL = 'factual'
export const QUERY_CATEGORY_RATINGS_OPINION = 'ratings_opinion'
export const QUERY_CATEGORY_COMPARISON = 'comparison'
export const QUERY_CATEGORY_RECOMMENDATION = 'recommendation'

export const RATINGS_UNAVAILABLE_MESSAGE =
  "Review ratings are not available yet. I can help with official campground facts like operator, reservations, water availability, and campsite types from verified sources."

const OFFICIAL_FACT_PATTERN =
  /\b(rules?|polic(y|ies)|reservation|reservations|book(ing)?|operator|campsites?|camping sites?|camp sites?|water|potable|fees?|hours?|alerts?|notices?|amenities|dogs?|pets?|fires?|generators?|quiet hours?|check[- ]in|check[- ]out|first[- ]come|availability|sites?|campgrounds?)\b/i

const RATINGS_OPINION_PATTERN =
  /\b(rating|rated|ratings|stars?|reviewed?|reviews?|review score|user reviews?)\b|\bhow good\b|\bis it good\b|\bworth (it|visiting|the trip)\b|\bwhat do (people|visitors|campers|others) (think|say)\b|\bopinions?\b|\bpopular(ity)?\b/i

const COMPARISON_PATTERN =
  /\bcompare\b|\bvs\.?\b|\bversus\b|\bdifference(s)? between\b|\bbetter than\b|\bwhich is better\b|\bwhich are better\b|\bwhich (one|campground|place) (is|has|would|should)\b.*\b(or|vs\.?)\b|\bbetween .+ and .+\b/i

const RECOMMENDATION_PATTERN =
  /\brecommend(ation|ations|ed|s)?\b|\bsuggest(ion|ions|ed|s)?\b|\bbest campground\b|\bwhere should i\b|\bwhat campground should\b|\bgood (campground|place|spot) for\b|\blooking for a campground\b/i

const OFFICIAL_FACT_TOPICS =
  'operator, reservations, water, campsite type, rules, alerts, amenities, fees, and policies'

/**
 * Returns campground display names inferred from a query.
 * @param {string} question
 * @returns {string[]}
 */
export function getInferredCampgroundNames(question) {
  const campgroundById = new Map(getAllCampgrounds().map((campground) => [campground.id, campground.name]))
  const matches = inferCampgroundMatches(question)

  return matches
    .map((match) => campgroundById.get(match.id))
    .filter((name) => typeof name === 'string' && name.length > 0)
}

/**
 * Returns true when the question asks only for unsupported ratings or subjective opinion.
 * @param {string} normalizedQuestion
 * @returns {boolean}
 */
export function isRatingsOnlyQuestion(normalizedQuestion) {
  if (!RATINGS_OPINION_PATTERN.test(normalizedQuestion)) {
    return false
  }

  if (COMPARISON_PATTERN.test(normalizedQuestion) || RECOMMENDATION_PATTERN.test(normalizedQuestion)) {
    return false
  }

  return !OFFICIAL_FACT_PATTERN.test(normalizedQuestion)
}

/**
 * Classifies a user question for Ask API capability guardrails.
 * @param {string} question
 * @returns {QueryClassification}
 */
export function classifyQuery(question) {
  const normalizedQuestion = question.trim().toLowerCase()
  const campgroundNames = getInferredCampgroundNames(question)

  if (isRatingsOnlyQuestion(normalizedQuestion)) {
    return {
      category: QUERY_CATEGORY_RATINGS_OPINION,
      shouldShortCircuit: true,
      shortCircuitMessage: buildRatingsUnavailableMessage(campgroundNames),
      campgroundNames,
    }
  }

  if (COMPARISON_PATTERN.test(normalizedQuestion)) {
    return {
      category: QUERY_CATEGORY_COMPARISON,
      shouldShortCircuit: false,
      campgroundNames,
    }
  }

  if (RECOMMENDATION_PATTERN.test(normalizedQuestion)) {
    return {
      category: QUERY_CATEGORY_RECOMMENDATION,
      shouldShortCircuit: false,
      campgroundNames,
    }
  }

  return {
    category: QUERY_CATEGORY_FACTUAL,
    shouldShortCircuit: false,
    campgroundNames,
  }
}

/**
 * Builds a ratings-unavailable message, optionally naming inferred campgrounds.
 * @param {string[]} campgroundNames
 * @returns {string}
 */
export function buildRatingsUnavailableMessage(campgroundNames = []) {
  if (campgroundNames.length === 0) {
    return RATINGS_UNAVAILABLE_MESSAGE
  }

  if (campgroundNames.length === 1) {
    return `Review ratings are not available yet for ${campgroundNames[0]}. I can help with official campground facts like ${OFFICIAL_FACT_TOPICS} from verified sources.`
  }

  const namedCampgrounds = formatCampgroundList(campgroundNames)
  return `Review ratings are not available yet for ${namedCampgrounds}. I can help with official campground facts like ${OFFICIAL_FACT_TOPICS} from verified sources.`
}

/**
 * @param {string[]} campgroundNames
 * @returns {string}
 */
function formatCampgroundList(campgroundNames) {
  if (campgroundNames.length === 2) {
    return `${campgroundNames[0]} and ${campgroundNames[1]}`
  }

  const lastName = campgroundNames[campgroundNames.length - 1]
  const leadingNames = campgroundNames.slice(0, -1).join(', ')
  return `${leadingNames}, and ${lastName}`
}

/**
 * Returns additional system-prompt rules for a classified query category.
 * @param {QueryCategory} category
 * @param {string[]} campgroundNames
 * @returns {string[]}
 */
export function buildCapabilityGuardrailRules(category, campgroundNames = []) {
  switch (category) {
    case QUERY_CATEGORY_COMPARISON:
      return buildComparisonGuardrailRules(campgroundNames)
    case QUERY_CATEGORY_RECOMMENDATION:
      return buildRecommendationGuardrailRules()
    default:
      return []
  }
}

/**
 * @param {string[]} campgroundNames
 * @returns {string[]}
 */
function buildComparisonGuardrailRules(campgroundNames) {
  const campgroundHint =
    campgroundNames.length > 0
      ? ` The user is comparing ${formatCampgroundList(campgroundNames)}.`
      : ''

  return [
    'This is a comparison question.' + campgroundHint,
    'Compare campgrounds using ONLY official facts present in the retrieved context, such as ' +
      OFFICIAL_FACT_TOPICS + '.',
    'Do NOT compare quality, popularity, scenery, or user satisfaction.',
    'Do NOT invent or estimate review ratings, star scores, or crowd opinions.',
    'If the user asks which campground is "better," explain that review ratings are not available and compare only the official facts you can cite.',
  ]
}

/**
 * @returns {string[]}
 */
function buildRecommendationGuardrailRules() {
  return [
    'This is a recommendation question.',
    'Recommend campgrounds ONLY using official facts from the retrieved context and preferences explicitly stated in the user question.',
    'Do NOT invent review ratings, popularity rankings, or crowd favorites.',
    'If the user did not state preferences, explain tradeoffs using official facts and note that review ratings are not available.',
    'Never claim a campground is the "best" based on quality or reviews — only match stated preferences to official facts you can cite.',
  ]
}
