// Phase 0 spike: probe the undocumented UseDirect RDR API behind ReserveCalifornia.
// Run: node scripts/spike-reservecalifornia.mjs ["park name fragment"]
// Endpoint names drift between UseDirect versions, so this tests hypotheses and
// reports what actually responds. Polite: ~6 requests total, honest UA, timeouts.

const USER_AGENT = 'CampScoutAvailabilitySpike/0.1 (+https://github.com/camp-scout-ai; contact: steve@terapak.com)'
const TIMEOUT_MS = 15000
const BASE = 'https://calirdr.usedirect.com/RDR/rdr'

const PARK_QUERY = process.argv[2] ?? 'Samuel P. Taylor' // seeded in src/data/campgrounds.js

async function politeFetch(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await response.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* non-JSON */ }
    return { status: response.status, ok: response.ok, json, text }
  } catch (error) {
    return { status: 0, ok: false, error: error?.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : String(error) }
  } finally {
    clearTimeout(timeoutId)
  }
}

function header(title) {
  console.log(`\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`)
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10) // YYYY-MM-DD
}

function nextMonthRange(nights = 2) {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + nights)
  return { start: fmtDate(start), end: fmtDate(end) }
}

// ---------------------------------------------------------------------------
// 1. Place lookup — try name-search first (cheap), fall back to full list.
// ---------------------------------------------------------------------------
async function findPlace() {
  const nameUrl = `${BASE}/fd/citypark/namecontains/${encodeURIComponent(PARK_QUERY)}`
  header(`1a. Place name search: GET ${nameUrl}`)
  let res = await politeFetch(nameUrl)
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  let places = null
  if (res.json) {
    places = Array.isArray(res.json) ? res.json : Object.values(res.json)
    console.log(`Parsed ${places.length} entries. First entry:`)
    console.log(JSON.stringify(places[0], null, 2))
  } else {
    console.log('Body (first 200 chars):', (res.text ?? '').slice(0, 200))
  }

  if (!places || places.length === 0) {
    const listUrl = `${BASE}/fd/places`
    header(`1b. Fallback full place list: GET ${listUrl}`)
    res = await politeFetch(listUrl)
    console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
    if (res.json && Array.isArray(res.json)) {
      console.log(`Total places: ${res.json.length}. Place fields: ${Object.keys(res.json[0] ?? {}).join(', ')}`)
      places = res.json.filter((p) => (p.Name ?? '').toLowerCase().includes(PARK_QUERY.toLowerCase().split(' ')[0]))
      console.log(`Matches for "${PARK_QUERY}":`, places.map((p) => `${p.PlaceId ?? p.CityParkId}: ${p.Name}`).slice(0, 5))
    }
  }

  if (!places || places.length === 0) return null
  const place = places.find((p) => (p.Name ?? '').toLowerCase().includes('taylor')) ?? places[0]
  const placeId = place.PlaceId ?? place.CityParkId ?? place.Id
  console.log(`\nSelected place: ${placeId} "${place.Name}"`)
  return placeId
}

// ---------------------------------------------------------------------------
// 2. Place detail search — expected to map PlaceId -> Facilities (campgrounds).
// ---------------------------------------------------------------------------
async function searchPlace(placeId) {
  const { start } = nextMonthRange()
  const url = `${BASE}/search/place`
  const body = {
    PlaceId: placeId,
    Latitude: 0,
    Longitude: 0,
    HighlightedPlaceId: 0,
    StartDate: start,
    Nights: '2',
    CountNearby: false,
    NearbyLimit: 100,
    NearbyOnlyAvailable: false,
    NearbyCountLimit: 10,
    Sort: 'Distance',
    CustomerId: '0',
    RefreshFavourites: true,
    IsADA: false,
    UnitCategoryId: '0',
    SleepingUnitId: '0',
    MinVehicleLength: 0,
    UnitTypesGroupIds: [],
  }
  header(`2. Place detail: POST ${url}\nBody: ${JSON.stringify(body)}`)
  const res = await politeFetch(url, { method: 'POST', body })
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  if (!res.json) {
    console.log('Body (first 300 chars):', (res.text ?? '').slice(0, 300))
    return null
  }
  console.log(`Top-level keys: ${Object.keys(res.json).join(', ')}`)
  const selected = res.json.SelectedPlace ?? res.json
  console.log(`SelectedPlace keys: ${Object.keys(selected ?? {}).join(', ')}`)
  const facilities = selected?.Facilities ?? {}
  const facList = Array.isArray(facilities) ? facilities : Object.values(facilities)
  console.log(`\nFacilities under place ${placeId}: ${facList.length}`)
  for (const f of facList.slice(0, 8)) {
    console.log(`  FacilityId=${f.FacilityId} "${f.Name}" type=${f.FacilityType} available=${f.Available} category=${f.Category ?? ''}`)
  }
  if (facList[0]) console.log('\nFacility fields:', Object.keys(facList[0]).join(', '))
  return facList[0]?.FacilityId ?? null
}

// ---------------------------------------------------------------------------
// 3. Availability grid for one facility.
// ---------------------------------------------------------------------------
async function searchGrid(facilityId, placeId) {
  const { start, end } = nextMonthRange(4)
  const url = `${BASE}/search/grid`
  const body = {
    FacilityId: facilityId,
    PlaceId: placeId,
    UnitTypeId: 0,
    StartDate: start,
    EndDate: end,
    InSeasonOnly: true,
    WebOnly: true,
    IsADA: false,
    SleepingUnitId: 0,
    MinVehicleLength: 0,
    UnitCategoryId: 0,
    UnitTypesGroupIds: [],
    MinDate: start,
    MaxDate: end,
  }
  header(`3. Availability grid: POST ${url}\nBody: ${JSON.stringify(body)}`)
  const res = await politeFetch(url, { method: 'POST', body })
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  if (!res.json) {
    console.log('Body (first 300 chars):', (res.text ?? '').slice(0, 300))
    return
  }
  console.log(`Top-level keys: ${Object.keys(res.json).join(', ')}`)
  const facility = res.json.Facility ?? res.json
  console.log(`Facility keys: ${Object.keys(facility ?? {}).join(', ')}`)
  const units = facility?.Units ?? {}
  const unitList = Array.isArray(units) ? units : Object.values(units)
  console.log(`\nUnits: ${unitList.length}`)
  const unit = unitList[0]
  if (!unit) return
  console.log('Unit fields:', Object.keys(unit).join(', '))
  const { Slices, ...unitMeta } = unit
  console.log('Sample unit (Slices elided):', JSON.stringify(unitMeta, null, 2))
  const sliceList = Array.isArray(Slices) ? Slices : Object.values(Slices ?? {})
  console.log(`\nSlices for first unit: ${sliceList.length}`)
  console.log('First 3 slices:', JSON.stringify(sliceList.slice(0, 3), null, 2))

  // Flag vocabulary across all units' slices
  const flagStats = { IsFree: 0, IsBlocked: 0, IsWalkin: 0, hasReservationId: 0, total: 0 }
  for (const u of unitList) {
    const slices = Array.isArray(u.Slices) ? u.Slices : Object.values(u.Slices ?? {})
    for (const s of slices) {
      flagStats.total += 1
      if (s.IsFree) flagStats.IsFree += 1
      if (s.IsBlocked) flagStats.IsBlocked += 1
      if (s.IsWalkin) flagStats.IsWalkin += 1
      if (s.ReservationId) flagStats.hasReservationId += 1
    }
  }
  console.log('\nSlice flag stats across all units:', JSON.stringify(flagStats))
}

// ---------------------------------------------------------------------------
// 4. Deep-link investigation — the site is an Angular SPA; hash/route candidates
//    can't be verified server-side, so grep the app bundle for route strings.
// ---------------------------------------------------------------------------
async function spikeDeepLink(placeId) {
  header('4. Deep-link investigation: GET https://www.reservecalifornia.com/CaliforniaWebHome/')
  const res = await politeFetch('https://www.reservecalifornia.com/CaliforniaWebHome/', { headers: { Accept: 'text/html' } })
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  const html = res.text ?? ''
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1]
  console.log(`<title>: ${title ?? '(none)'}`)
  const baseHref = html.match(/<base href="([^"]*)"/)?.[1]
  console.log(`<base href>: ${baseHref ?? '(none)'}`)
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
  console.log('Script srcs:', scripts.join(', ') || '(none found)')

  // Fetch the main bundle once and grep for router path definitions.
  const mainSrc = scripts.find((s) => /main/i.test(s))
  if (mainSrc) {
    const bundleUrl = new URL(mainSrc, 'https://www.reservecalifornia.com/CaliforniaWebHome/').href
    console.log(`\nFetching app bundle for route strings: ${bundleUrl}`)
    const bundle = await politeFetch(bundleUrl, { headers: { Accept: '*/*' } })
    console.log(`HTTP status: ${bundle.status}, bytes: ${bundle.text?.length ?? 0}`)
    const js = bundle.text ?? ''
    const routeMatches = [...new Set([...js.matchAll(/path\s*:\s*["']([^"']{2,60})["']/g)].map((m) => m[1]))]
    console.log(`Router paths found (${routeMatches.length}):`)
    for (const r of routeMatches.slice(0, 40)) console.log(`  ${r}`)
  } else {
    console.log('No main bundle found in HTML — may be a different SPA layout.')
  }

  console.log(`\nCandidate deep-link formats to verify manually (placeId=${placeId}):`)
  console.log(`  legacy hash: https://www.reservecalifornia.com/Web/Default.aspx#!park/${placeId}`)
  console.log(`  SPA path:    https://www.reservecalifornia.com/CaliforniaWebHome/ (+ discovered route)`)
}

const startedAt = Date.now()
const placeId = await findPlace()
if (placeId != null) {
  const facilityId = await searchPlace(placeId)
  if (facilityId != null) await searchGrid(facilityId, placeId)
  await spikeDeepLink(placeId)
} else {
  console.log('\nNo place found — endpoint hypotheses failed; see statuses above.')
}
console.log(`\nDone in ${Date.now() - startedAt}ms.`)
