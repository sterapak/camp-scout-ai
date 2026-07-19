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

/** Test-only: clear the conditions caches. */
export function __resetWeatherCacheForTests(): void {
  cache.clear()
  monthCache.clear()
}

export interface MonthClimate {
  month: string // 'YYYY-MM'
  label: string // 'December'
  highF: number
  lowF: number
  snowDays: number
  advisory: Conditions['advisory']
}

interface MonthCacheEntry {
  data: { highF: number; lowF: number; snowDays: number; elevationFt: number } | null
  expiresAt: number
}
const monthCache = new Map<string, MonthCacheEntry>()

/** Every 'YYYY-MM' from start..end inclusive (capped at 24). */
export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = []
  let y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7))
  const ey = Number(end.slice(0, 4))
  const em = Number(end.slice(5, 7))
  let guard = 0
  while ((y < ey || (y === ey && m <= em)) && guard++ < 24) {
    out.push(`${y}-${String(m).padStart(2, '0')}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
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

/** Historical typical for one calendar month (avg high/low, snow days). */
async function typicalForMonth(
  lat: number,
  lng: number,
  histYear: number,
  month1: number,
  fetchImpl: typeof fetch,
): Promise<MonthCacheEntry['data']> {
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${histYear}-${month1}`
  const cached = monthCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.data

  let data: MonthCacheEntry['data'] = null
  try {
    const url = `${ARCHIVE_BASE}?latitude=${lat}&longitude=${lng}&start_date=${histYear}-${String(month1).padStart(2, '0')}-01&end_date=${monthEnd(histYear, month1)}&daily=temperature_2m_max,temperature_2m_min,snowfall_sum&temperature_unit=fahrenheit`
    const res = await politeFetchJson<OpenMeteoDaily>(url, { fetchImpl })
    const d = res.data?.daily
    const highs = (d?.temperature_2m_max ?? []).filter((x): x is number => x != null)
    const lows = (d?.temperature_2m_min ?? []).filter((x): x is number => x != null)
    if (res.ok && highs.length && lows.length) {
      data = {
        highF: Math.round(mean(highs)),
        lowF: Math.round(mean(lows)),
        snowDays: (d?.snowfall_sum ?? []).filter((x) => (x ?? 0) > 0).length,
        elevationFt: metersToFeet(res.data?.elevation ?? 0),
      }
    }
  } catch {
    monthCache.set(key, { data: null, expiresAt: Date.now() + 5 * 60 * 1000 })
    return null
  }
  monthCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
  return data
}

/**
 * Typical climate for EACH month in a watch window — a watch is a window, not a
 * single trip, and a cancellation could free any night in it.
 */
export async function getMonthlyClimate(
  lat: number,
  lng: number,
  start: string,
  end: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<{ elevationFt: number; months: MonthClimate[] }> {
  const empty = { elevationFt: 0, months: [] as MonthClimate[] }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return empty
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return empty

  const histYear = now.getUTCFullYear() - 1
  // Fetch every month in parallel (was sequential — slow for a wide window).
  const entries = await Promise.all(
    monthsBetween(start, end).map(async (ym) => {
      const month1 = Number(ym.slice(5, 7))
      const t = await typicalForMonth(lat, lng, histYear, month1, fetchImpl)
      return t ? { ym, month1, t } : null
    }),
  )

  const months: MonthClimate[] = []
  let elevationFt = 0
  for (const e of entries) {
    if (!e) continue
    elevationFt = e.t.elevationFt
    months.push({
      month: e.ym,
      label: MONTHS[e.month1 - 1],
      highF: e.t.highF,
      lowF: e.t.lowF,
      snowDays: e.t.snowDays,
      advisory: advisoryFor(e.t.lowF, e.t.highF),
    })
  }
  return { elevationFt, months }
}
