import { isValidCampground, isValidCampgroundImage, CAMPGROUND_FIELDS } from './campgroundSchema'
import { campgrounds } from './campgrounds'

describe('campgroundSchema', () => {
  it('defines all required fields', () => {
    expect(CAMPGROUND_FIELDS).toEqual([
      'id',
      'name',
      'region',
      'sourceUrl',
      'reservationUrl',
      'amenities',
      'rules',
      'dogPolicy',
      'notes',
      'lastVerifiedAt',
      'tags',
      'sources',
      'images',
    ])
  })

  it('validates a real seed record', () => {
    expect(isValidCampground(campgrounds[0])).toBe(true)
  })

  it('rejects records missing sourceUrl', () => {
    expect(isValidCampground({ ...campgrounds[0], sourceUrl: '' })).toBe(false)
  })

  it('rejects records with invalid URLs', () => {
    expect(isValidCampground({ ...campgrounds[0], sourceUrl: 'not-a-url' })).toBe(false)
  })

  it('validates official campground images', () => {
    expect(
      isValidCampgroundImage({
        url: 'https://www.nps.gov/yose/planyourvisit/images/pines-campgrounds-map.jpg',
        altText: 'Upper Pines campground map',
        sourceName: 'National Park Service',
        sourceUrl: 'https://www.nps.gov/yose/planyourvisit/pinescampgrounds.htm',
        priority: 1,
      }),
    ).toBe(true)
  })

  it('rejects campground images with duplicate priorities', () => {
    const yosemite = campgrounds.find((campground) => campground.id === 'yosemite-upper-pines')
    expect(yosemite?.images).toBeDefined()
    expect(isValidCampground(yosemite)).toBe(true)
  })
})

describe('campgrounds seed data', () => {
  it('contains 20–25 real NorCal campgrounds', () => {
    expect(campgrounds.length).toBeGreaterThanOrEqual(20)
    expect(campgrounds.length).toBeLessThanOrEqual(25)
  })

  it('every record passes schema validation', () => {
    campgrounds.forEach((campground) => {
      expect(isValidCampground(campground)).toBe(true)
    })
  })

  it('does not include availability fields', () => {
    campgrounds.forEach((campground) => {
      expect(campground).not.toHaveProperty('availability')
      expect(campground).not.toHaveProperty('openDates')
      expect(campground).not.toHaveProperty('sitesAvailable')
    })
  })
})
