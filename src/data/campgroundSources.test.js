import { campgrounds } from './campgrounds.js'
import {
  getPrimarySourceUrl,
  hasConfiguredSources,
  resolveCampgroundSources,
} from './campgroundSources.js'

describe('campgroundSources', () => {
  const silverLake = campgrounds.find((campground) => campground.id === 'silver-lake-west')
  const pantoll = campgrounds.find((campground) => campground.id === 'mount-tamalpais-pantoll')

  it('detects configured multi-source campgrounds', () => {
    expect(hasConfiguredSources(silverLake)).toBe(true)
    expect(hasConfiguredSources(pantoll)).toBe(false)
  })

  it('returns sources sorted by priority', () => {
    const sources = resolveCampgroundSources(silverLake)
    expect(sources.map((source) => source.priority)).toEqual([1, 2])
    expect(sources[0].name).toBe('El Dorado Irrigation District')
  })

  it('synthesizes a primary legacy source for single-source campgrounds', () => {
    const sources = resolveCampgroundSources(pantoll)
    expect(sources).toHaveLength(1)
    expect(sources[0].url).toBe(pantoll?.sourceUrl)
    expect(sources[0].priority).toBe(1)
  })

  it('returns the primary source URL for UI links', () => {
    expect(getPrimarySourceUrl(silverLake)).toBe('https://www.eid.org/recreation/silver-lake')
    expect(getPrimarySourceUrl(pantoll)).toBe(pantoll?.sourceUrl)
  })
})
