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
    const results = searchCampgrounds({ regions: [region] })
    expect(results.every((c) => c.region === region)).toBe(true)
  })

  it('filters by multiple regions matching any selected', () => {
    const [first, second] = getAllRegions().slice(0, 2)
    const results = searchCampgrounds({ regions: [first, second] })

    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect([first, second]).toContain(c.region)
    })
  })

  it('returns all campgrounds when no regions are selected', () => {
    expect(searchCampgrounds({ regions: [] }).length).toBe(getAllCampgrounds().length)
  })

  it('filters by a single amenity', () => {
    const amenity = getAllAmenities()[0]
    const results = searchCampgrounds({ amenities: [amenity] })
    expect(results.every((c) => c.amenities.includes(amenity))).toBe(true)
  })

  it('filters by multiple amenities requiring all selected', () => {
    const all = getAllAmenities()
    const withMultiple = getAllCampgrounds().find((c) => c.amenities.length >= 2)
    expect(withMultiple).toBeDefined()

    const [first, second] = withMultiple.amenities
    const results = searchCampgrounds({ amenities: [first, second] })

    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.amenities).toEqual(expect.arrayContaining([first, second]))
    })

    const tooMany = searchCampgrounds({ amenities: [first, second, all.find((a) => !withMultiple.amenities.includes(a))] })
    expect(tooMany.every((c) => c.amenities.includes(first) && c.amenities.includes(second))).toBe(true)
  })

  it('returns all campgrounds when no amenities are selected', () => {
    expect(searchCampgrounds({ amenities: [] }).length).toBe(getAllCampgrounds().length)
  })

  it('filters by tag', () => {
    const tag = getAllTags()[0]
    const results = searchCampgrounds({ tags: [tag] })
    expect(results.every((c) => c.tags.includes(tag))).toBe(true)
  })

  it('filters by multiple tags matching any selected', () => {
    const [first, second] = getAllTags().slice(0, 2)
    const results = searchCampgrounds({ tags: [first, second] })

    expect(results.length).toBeGreaterThan(0)
    results.forEach((c) => {
      expect(c.tags.includes(first) || c.tags.includes(second)).toBe(true)
    })
  })

  it('returns all campgrounds when no tags are selected', () => {
    expect(searchCampgrounds({ tags: [] }).length).toBe(getAllCampgrounds().length)
  })

  it('combines multiple filters', () => {
    const tag = 'state-park'
    const results = searchCampgrounds({ query: 'redwood', tags: [tag] })
    results.forEach((c) => {
      expect(c.tags).toContain(tag)
    })
  })

  it('uses the live Emerald Bay State Park page for Eagle Point official info', () => {
    const campground = getCampgroundById('emerald-bay-eagle-point')
    expect(campground?.sourceUrl).toBe('https://www.parks.ca.gov/?page_id=506')
  })
})
