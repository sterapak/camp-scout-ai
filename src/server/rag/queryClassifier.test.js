/** @jest-environment node */

import {
  buildCapabilityGuardrailRules,
  buildRatingsUnavailableMessage,
  classifyQuery,
  isRatingsOnlyQuestion,
  QUERY_CATEGORY_COMPARISON,
  QUERY_CATEGORY_FACTUAL,
  QUERY_CATEGORY_RATINGS_OPINION,
  QUERY_CATEGORY_RECOMMENDATION,
  RATINGS_UNAVAILABLE_MESSAGE,
} from './queryClassifier.js'

describe('isRatingsOnlyQuestion', () => {
  it('detects pure ratings questions', () => {
    expect(isRatingsOnlyQuestion('what is the star rating for silver lake west?')).toBe(true)
    expect(isRatingsOnlyQuestion('what do people say about yosemite upper pines?')).toBe(true)
    expect(isRatingsOnlyQuestion('show me reviews for silver lake west')).toBe(true)
  })

  it('does not treat comparison questions as ratings-only', () => {
    expect(isRatingsOnlyQuestion('compare silver lake west and silver lake east')).toBe(false)
    expect(isRatingsOnlyQuestion('which is better, silver lake west or silver lake east?')).toBe(false)
  })

  it('does not treat official-fact questions with incidental wording as ratings-only', () => {
    expect(isRatingsOnlyQuestion('what are the reservation rules at silver lake west?')).toBe(false)
    expect(isRatingsOnlyQuestion('how many campsites at silver lake?')).toBe(false)
  })
})

describe('classifyQuery', () => {
  it('classifies factual official-source questions normally', () => {
    const result = classifyQuery('What are the bear food storage rules at Yosemite Upper Pines?')

    expect(result.category).toBe(QUERY_CATEGORY_FACTUAL)
    expect(result.shouldShortCircuit).toBe(false)
  })

  it('short-circuits unsupported ratings questions', () => {
    const result = classifyQuery('What is the star rating for Silver Lake West?')

    expect(result.category).toBe(QUERY_CATEGORY_RATINGS_OPINION)
    expect(result.shouldShortCircuit).toBe(true)
    expect(result.shortCircuitMessage).toContain('Review ratings are not available yet')
    expect(result.shortCircuitMessage).toContain('Silver Lake West Campground')
  })

  it('classifies comparison questions without short-circuiting', () => {
    const result = classifyQuery('Compare Silver Lake West and Silver Lake East')

    expect(result.category).toBe(QUERY_CATEGORY_COMPARISON)
    expect(result.shouldShortCircuit).toBe(false)
  })

  it('classifies recommendation questions without short-circuiting', () => {
    const result = classifyQuery('What campground do you recommend for first-come-first-served camping?')

    expect(result.category).toBe(QUERY_CATEGORY_RECOMMENDATION)
    expect(result.shouldShortCircuit).toBe(false)
  })

  it('treats which-is-better questions as comparisons', () => {
    const result = classifyQuery('Which is better, Silver Lake West or Silver Lake East?')

    expect(result.category).toBe(QUERY_CATEGORY_COMPARISON)
    expect(result.shouldShortCircuit).toBe(false)
  })
})

describe('buildRatingsUnavailableMessage', () => {
  it('returns the generic message when no campground is inferred', () => {
    expect(buildRatingsUnavailableMessage([])).toBe(RATINGS_UNAVAILABLE_MESSAGE)
  })

  it('names a single inferred campground', () => {
    const message = buildRatingsUnavailableMessage(['Silver Lake West Campground'])

    expect(message).toContain('Silver Lake West Campground')
    expect(message).toContain('Review ratings are not available yet')
  })
})

describe('buildCapabilityGuardrailRules', () => {
  it('requires fact-only comparisons and disclaims ratings', () => {
    const rules = buildCapabilityGuardrailRules(QUERY_CATEGORY_COMPARISON, [
      'Silver Lake West Campground',
      'Silver Lake East Campground',
    ])

    expect(rules.join(' ')).toMatch(/comparison question/i)
    expect(rules.join(' ')).toMatch(/official facts/i)
    expect(rules.join(' ')).toMatch(/review ratings are not available/i)
    expect(rules.join(' ')).toMatch(/Do NOT invent or estimate review ratings/i)
  })

  it('requires preference-based recommendations without fake ratings', () => {
    const rules = buildCapabilityGuardrailRules(QUERY_CATEGORY_RECOMMENDATION)

    expect(rules.join(' ')).toMatch(/recommendation question/i)
    expect(rules.join(' ')).toMatch(/preferences explicitly stated/i)
    expect(rules.join(' ')).toMatch(/Do NOT invent review ratings/i)
  })

  it('returns no extra rules for factual questions', () => {
    expect(buildCapabilityGuardrailRules(QUERY_CATEGORY_FACTUAL)).toEqual([])
  })
})
