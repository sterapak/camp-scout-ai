import {
  getMeaningfulQueryTokens,
  getQueryIntent,
  requiresExactTokenMatch,
} from './queryTokens'
import { inferCampgroundMatches } from './campgroundQueryMatch'
import { indexTokenMatchesQueryToken } from './knowledgeIndex'

describe('queryTokens', () => {
  it('removes stop words from natural-language queries', () => {
    expect(getMeaningfulQueryTokens('how many camping sites at silver lake?')).toEqual([
      'camping',
      'sites',
      'silver',
      'lake',
    ])
  })

  it('detects count and campsite intent', () => {
    expect(getQueryIntent('how many camping sites at silver lake?')).toEqual({
      isCountQuestion: true,
      mentionsCampsites: true,
      mentionsCampgrounds: false,
    })
  })

  it('requires exact matches for short tokens', () => {
    expect(requiresExactTokenMatch('at')).toBe(true)
    expect(requiresExactTokenMatch('lake')).toBe(false)
  })
})

describe('campgroundQueryMatch', () => {
  it('infers Silver Lake West from a silver lake query', () => {
    const matches = inferCampgroundMatches('how many camping sites at silver lake?')

    expect(matches[0]?.id).toBe('silver-lake-west')
    expect(matches[0]?.score).toBeGreaterThan(0)
  })
})

describe('knowledgeIndex token matching', () => {
  it('avoids substring false positives for short tokens like "at"', () => {
    expect(indexTokenMatchesQueryToken('state', 'at')).toBe(false)
    expect(indexTokenMatchesQueryToken('at', 'at')).toBe(true)
  })
})
