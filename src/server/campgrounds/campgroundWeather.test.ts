/** @jest-environment node */
import {
  getConditions,
  getMonthlyClimate,
  __resetWeatherCacheForTests,
} from './campgroundWeather.js'

function meteoFetch(payload: unknown): typeof fetch {
  return (async () => ({ ok: true, status: 200, json: async () => payload })) as unknown as typeof fetch
}

const NOW = new Date('2026-07-19T00:00:00Z')

describe('getConditions', () => {
  beforeEach(() => __resetWeatherCacheForTests())

  it('returns a forecast for a near date', async () => {
    const payload = {
      elevation: 1800,
      daily: {
        time: ['2026-07-20', '2026-07-21'],
        temperature_2m_max: [76, 77],
        temperature_2m_min: [58, 60],
        snowfall_sum: [0, 0],
      },
    }
    const c = await getConditions(40.53, -121.57, '2026-07-21', NOW, meteoFetch(payload))
    expect(c?.kind).toBe('forecast')
    expect(c).toMatchObject({ highF: 77, lowF: 60, advisory: null })
    expect(c?.elevationFt).toBe(Math.round(1800 * 3.28084))
  })

  it('returns typical climate for a far-out December date with a freezing advisory', async () => {
    const payload = {
      elevation: 1800,
      daily: {
        temperature_2m_max: [48, 46, 50],
        temperature_2m_min: [30, 32, 31],
        snowfall_sum: [1, 0, 2],
      },
    }
    const c = await getConditions(40.53, -121.57, '2026-12-20', NOW, meteoFetch(payload))
    expect(c?.kind).toBe('typical')
    expect(c?.lowF).toBe(31)
    expect(c?.advisory).toBe('freezing')
    expect(c?.snowDays).toBe(2)
    expect(c?.label).toBe('Typical December')
  })

  it('rejects bad input without fetching', async () => {
    const spy = jest.fn()
    expect(await getConditions(NaN, 0, '2026-12-20', NOW, spy as unknown as typeof fetch)).toBeNull()
    expect(await getConditions(40, -121, 'notadate', NOW, spy as unknown as typeof fetch)).toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })

  it('summarizes typical climate for each month in a watch window', async () => {
    const payload = {
      elevation: 1800,
      daily: {
        temperature_2m_max: [40, 42],
        temperature_2m_min: [28, 30],
        snowfall_sum: [1, 2],
      },
    }
    const { elevationFt, months } = await getMonthlyClimate(
      40.5,
      -121.5,
      '2026-11-10',
      '2026-12-20',
      NOW,
      meteoFetch(payload),
    )
    expect(months.map((m) => m.label)).toEqual(['November', 'December'])
    expect(months[0].advisory).toBe('freezing')
    expect(months[1].snowDays).toBe(2)
    expect(elevationFt).toBe(Math.round(1800 * 3.28084))
  })
})
