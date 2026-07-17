// Phase 0 spike: validate Recreation.gov availability + search endpoints with REAL data.
// Run: node scripts/spike-recgov-availability.mjs [campgroundId]
// Polite: 3 requests total, honest User-Agent, hard timeouts. Does not touch app/DB.

const USER_AGENT = 'CampScoutAvailabilitySpike/0.1 (+https://github.com/camp-scout-ai; contact: steve@terapak.com)'
const TIMEOUT_MS = 15000

const CAMPGROUND_ID = process.argv[2] ?? '232447' // Upper Pines, Yosemite (seeded)
const SEARCH_NAME = 'Upper Pines'

/** Minimal polite fetch mirroring src/ingestion/fetchSource.js (JSON flavor). */
async function politeFetch(url, options = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...options.headers,
      },
      redirect: 'follow',
      signal: controller.signal,
    })
    const text = await response.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* non-JSON body (e.g. Akamai block page) */ }
    return { status: response.status, ok: response.ok, json, text }
  } catch (error) {
    return { status: 0, ok: false, error: error?.name === 'AbortError' ? `timeout after ${TIMEOUT_MS}ms` : String(error) }
  } finally {
    clearTimeout(timeoutId)
  }
}

/** First day of next month, as the exact format the endpoint requires. */
function nextMonthStartDate() {
  const now = new Date()
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return d.toISOString().replace(/\.\d{3}Z$/, '.000Z') // YYYY-MM-01T00:00:00.000Z
}

function header(title) {
  console.log(`\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`)
}

// ---------------------------------------------------------------------------
// 1. Monthly availability grid
// ---------------------------------------------------------------------------
async function spikeAvailability() {
  const startDate = nextMonthStartDate()
  const url = `https://www.recreation.gov/api/camps/availability/campground/${CAMPGROUND_ID}/month?start_date=${encodeURIComponent(startDate)}`
  header(`1. Availability: ${url}`)

  const res = await politeFetch(url)
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  if (!res.json) {
    console.log('Non-JSON body (first 300 chars) — likely bot-protection block page:')
    console.log((res.text ?? '').slice(0, 300))
    return
  }

  const campsites = res.json.campsites ?? {}
  const siteIds = Object.keys(campsites)
  console.log(`Top-level keys: ${Object.keys(res.json).join(', ')}`)
  console.log(`campsites entries: ${siteIds.length}`)
  if (res.json.count !== undefined) console.log(`count field: ${res.json.count}`)

  if (siteIds.length === 0) return

  // Per-site field inventory from the first site, full record printed once.
  const first = campsites[siteIds[0]]
  console.log(`\nPer-site fields: ${Object.keys(first).join(', ')}`)
  const { availabilities, quantities, ...meta } = first
  console.log('Sample site metadata (availabilities/quantities elided):')
  console.log(JSON.stringify(meta, null, 2))
  const availDates = Object.keys(availabilities ?? {})
  console.log(`\navailabilities: ${availDates.length} dates, first key: ${availDates[0]}`)
  console.log('First 5 availability entries:', JSON.stringify(Object.fromEntries(Object.entries(availabilities ?? {}).slice(0, 5)), null, 2))
  if (quantities) {
    console.log('quantities sample:', JSON.stringify(Object.fromEntries(Object.entries(quantities).slice(0, 3))))
  }

  // Status vocabulary + campsite_type vocabulary across ALL sites.
  const statusCounts = new Map()
  const typeCounts = new Map()
  for (const site of Object.values(campsites)) {
    typeCounts.set(site.campsite_type, (typeCounts.get(site.campsite_type) ?? 0) + 1)
    for (const status of Object.values(site.availabilities ?? {})) {
      statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1)
    }
  }
  console.log('\nStatus vocabulary seen (status: count):')
  for (const [k, v] of [...statusCounts].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`)
  console.log('campsite_type vocabulary:', JSON.stringify([...typeCounts]))

  // Deep-link material: a real campsite id for /camping/campsites/{campsiteId}
  console.log(`\nDeep links:`)
  console.log(`  campground: https://www.recreation.gov/camping/campgrounds/${CAMPGROUND_ID}/availability`)
  console.log(`  campsite:   https://www.recreation.gov/camping/campsites/${first.campsite_id} (site ${first.site}, loop ${first.loop})`)
}

// ---------------------------------------------------------------------------
// 2. Undocumented name search
// ---------------------------------------------------------------------------
async function spikeSearch() {
  const url = `https://www.recreation.gov/api/search?q=${encodeURIComponent(SEARCH_NAME)}&fq=entity_type%3Acampground&size=3`
  header(`2. Name search (undocumented): ${url}`)

  const res = await politeFetch(url)
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  if (!res.json) {
    console.log('Non-JSON body (first 300 chars):')
    console.log((res.text ?? '').slice(0, 300))
    return
  }
  console.log(`Top-level keys: ${Object.keys(res.json).join(', ')}`)
  const results = res.json.results ?? []
  console.log(`results: ${results.length} (total: ${res.json.total})`)
  for (const r of results.slice(0, 3)) {
    console.log(`  entity_id=${r.entity_id} entity_type=${r.entity_type} name="${r.name}" parent="${r.parent_name ?? ''}" city=${r.city ?? ''}`)
  }
  if (results[0]) {
    console.log('\nFirst result field names:', Object.keys(results[0]).join(', '))
  }
  console.log('\nNOTE: the OFFICIAL route is RIDB: https://ridb.recreation.gov/api/v1/facilities?query=<name>')
  console.log('      RIDB requires a free API key (apikey header) — obtain RIDB_API_KEY at https://ridb.recreation.gov/')
}

// ---------------------------------------------------------------------------
// 3. Deep-link page reachability (1 request; SPA page, expect 200 or bot block)
// ---------------------------------------------------------------------------
async function spikeDeepLink() {
  const url = `https://www.recreation.gov/camping/campgrounds/${CAMPGROUND_ID}/availability`
  header(`3. Deep-link page fetch: ${url}`)
  const res = await politeFetch(url, { headers: { Accept: 'text/html' } })
  console.log(`HTTP status: ${res.status}${res.error ? ` (error: ${res.error})` : ''}`)
  const title = (res.text ?? '').match(/<title>([^<]*)<\/title>/)?.[1]
  console.log(`Page <title>: ${title ?? '(none found)'}`)
}

const startedAt = Date.now()
await spikeAvailability()
await spikeSearch()
await spikeDeepLink()
console.log(`\nDone in ${Date.now() - startedAt}ms (3 requests).`)
