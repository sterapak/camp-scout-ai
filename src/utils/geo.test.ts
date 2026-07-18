/** @jest-environment node */
import { haversineMiles } from './geo.js'

describe('haversineMiles', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMiles(38.7, -120.6, 38.7, -120.6)).toBeCloseTo(0, 5)
  })

  it('matches a known distance (SF → LA ≈ 347 mi)', () => {
    const d = haversineMiles(37.7749, -122.4194, 34.0522, -118.2437)
    expect(d).toBeGreaterThan(340)
    expect(d).toBeLessThan(360)
  })
})
