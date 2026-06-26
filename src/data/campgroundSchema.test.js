import { isValidCampground, CAMPGROUND_FIELDS } from './campgroundSchema'
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
