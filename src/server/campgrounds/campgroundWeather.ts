/**
 * Weather / climate context for a campground + date, so you don't grab a
 * cancellation into conditions you're not packed for (a December spot at a
 * 5,900-ft Sierra campground means snow and freezing nights). Uses Open-Meteo
 * (free, no key): the forecast API for dates within ~2 weeks, and the historical
 * archive (same month, last year) for anything further out as a "typical"
 * estimate. Degrades to null on any error. Cached.
 */
import { politeFetchJson } from '../availability/politeFetch.js'

export interface Conditions {
  kind: 'forecast' | 'typical'
  highF: number
  lowF: number
  elevationFt: number
  snowLikely: boolean
  snowDays?: number
  advisory: 'freezing' | 'cold' | 'hot' | null
  label: string
}

const FORECAST_BASE = 'https://api.open-meteo.com/v1/forecast'
const ARCHIVE_BASE = 'https://archive-api.open-meteo.com/v1/archive'
const FORECAST_WINDOW_DAYS = 14
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const cache = new Map<string, { conditions: Conditions | null; expiresAt: number }>()

/** Test-only: clear the conditions cache. */
export function __resetWeatherCacheForTests(): void {
  cache.clear()
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function metersToFeet(m: number): number {
  return Math.round(m * 3.28084)
}

function monthEnd(year: number, month1: number): string {
  const last = new Date(Date.UTC(year, month1, 0)).getUTCDate()
  return `${year}-${String(month1).padStart(2, '0')}-${String(last).padStart(2, '0')}`
}

function advisoryFor(lowF: number, highF: number): Conditions['advisory'] {
  if (lowF <= 32) return 'freezing'
  if (lowF <= 40) return 'cold'
  if (highF >= 95) return 'hot'
  return null
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length

interface OpenMeteoDaily {
  elevation?: number
  daily?: {
    time?: string[]
    temperature_2m_max?: Array<number | null>
    temperature_2m_min?: Array<number | null>
    snowfall_sum?: Array<number | null>
    precipitation_sum?: Array<number | null>
  }
}

export async function getConditions(
  lat: number,
  lng: number,
  date: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<Conditions | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null
  }
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${date}`
  const cached = cache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.conditions

  const today = now.toISOString().slice(0, 10)
  const daysOut = Math.round(
    (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86_400_000,
  )
  const coords = `latitude=${lat}&longitude=${lng}`

  let conditions: Conditions | null = null
  try {
    if (daysOut >= 0 && daysOut <= FORECAST_WINDOW_DAYS) {
      const url = `${FORECAST_BASE}?${coords}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum&temperature_unit=fahrenheit&forecast_days=16&timezone=auto`
      const res = await politeFetchJson<OpenMeteoDaily>(url, { fetchImpl })
      const d = res.data?.daily
      const i = d?.time?.indexOf(date) ?? -1
      if (res.ok && d && i >= 0) {
        const highF = Math.round(d.temperature_2m_max?.[i] ?? NaN)
        const lowF = Math.round(d.temperature_2m_min?.[i] ?? NaN)
        if (Number.isFinite(highF) && Number.isFinite(lowF)) {
          conditions = {
            kind: 'forecast',
            highF,
            lowF,
            elevationFt: metersToFeet(res.data?.elevation ?? 0),
            snowLikely: (d.snowfall_sum?.[i] ?? 0) > 0,
            advisory: advisoryFor(lowF, highF),
            label: `Forecast for ${date}`,
          }
        }
      }
    } else if (daysOut > FORECAST_WINDOW_DAYS) {
      // Typical: same month, last complete year.
      const month1 = Number(date.slice(5, 7))
      const histYear = now.getUTCFullYear() - 1
      const url = `${ARCHIVE_BASE}?${coords}&start_date=${histYear}-${String(month1).padStart(2, '0')}-01&end_date=${monthEnd(histYear, month1)}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum&temperature_unit=fahrenheit`
      const res = await politeFetchJson<OpenMeteoDaily>(url, { fetchImpl })
      const d = res.data?.daily
      const highs = (d?.temperature_2m_max ?? []).filter((x): x is number => x != null)
      const lows = (d?.temperature_2m_min ?? []).filter((x): x is number => x != null)
      if (res.ok && highs.length && lows.length) {
        const highF = Math.round(mean(highs))
        const lowF = Math.round(mean(lows))
        const snowDays = (d?.snowfall_sum ?? []).filter((x) => (x ?? 0) > 0).length
        conditions = {
          kind: 'typical',
          highF,
          lowF,
          elevationFt: metersToFeet(res.data?.elevation ?? 0),
          snowLikely: snowDays > 0,
          snowDays,
          advisory: advisoryFor(lowF, highF),
          label: `Typical ${MONTHS[month1 - 1]}`,
        }
      }
    }
  } catch {
    conditions = null
  }

  cache.set(key, { conditions, expiresAt: Date.now() + CACHE_TTL_MS })
  return conditions
}
