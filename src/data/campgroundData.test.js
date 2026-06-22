import {
  getAllCampgrounds,
  getCampgroundById,
  getAllRegions,
  getAllAmenities,
  getAllTags,
  searchCampgrounds,
} from './campgroundData'

describe('campgroundData', () => {
  it('returns all valid campgrounds', () => {
    expect(getAllCampgrounds().length).toBeGreaterThanOrEqual(10)
  })

  it('finds a campground by id', () => {
    const first = getAllCampgrounds()[0]
    expect(getCampgroundById(first.id)).toEqual(first)
    expect(getCampgroundById('nonexistent-id')).toBeNull()
  })

  it('returns sorted unique regions', () => {
    const regions = getAllRegions()
    expect(regions.length).toBeGreaterThan(0)
    expect(regions).toEqual([...regions].sort())
    expect(new Set(regions).size).toBe(regions.length)
  })

  it('returns sorted unique amenities and tags', () => {
    expect(getAllAmenities().length).toBeGreaterThan(0)
    expect(getAllTags().length).toBeGreaterThan(0)
  })

  it('searches by query text', () => {
    const results = searchCampgrounds({ query: 'tahoe' })
    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      const haystack = [c.name, c.region, c.notes, ...c.tags].join(' ').toLowerCase()
      expect(haystack).toContain('tahoe')
    })
  })

  it('filters by region', () => {
    const region = getAllRegions()[0]
    const results = searchCampgrounds({ region })
    expect(results.every((c) => c.region === region)).toBe(true)
  })

  it('filters by amenity', () => {
    const amenity = getAllAmenities()[0]
    const results = searchCampgrounds({ amenity })
    expect(results.every((c) => c.amenities.includes(amenity))).toBe(true)
  })

  it('filters by tag', () => {
    const tag = getAllTags()[0]
    const results = searchCampgrounds({ tag })
    expect(results.every((c) => c.tags.includes(tag))).toBe(true)
  })

  it('combines multiple filters', () => {
    const tag = 'state-park'
    const results = searchCampgrounds({ query: 'redwood', tag })
    results.forEach((c) => {
      expect(c.tags).toContain(tag)
    })
  })
})
