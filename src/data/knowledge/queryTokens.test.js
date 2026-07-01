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
      isPriceQuestion: false,
      isCheapestQuestion: false,
    })
  })

  it('detects pricing and cheapest intent', () => {
    expect(getQueryIntent('What is the cheapest campground?')).toEqual({
      isCountQuestion: false,
      mentionsCampsites: false,
      mentionsCampgrounds: true,
      isPriceQuestion: true,
      isCheapestQuestion: true,
    })

    expect(getQueryIntent('What are the nightly camping fees at Ice House?')).toEqual(
      expect.objectContaining({
        isPriceQuestion: true,
        isCheapestQuestion: false,
      }),
    )
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
