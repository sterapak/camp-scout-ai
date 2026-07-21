/** @jest-environment node */
import { fetchRidbSummarySource, stripRidbHtml } from './ridbSummarySource.js'

function fakeRidb(body: unknown, ok = true) {
  return (async () => ({
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  })) as unknown as typeof fetch
}

const RICH_DESCRIPTION =
  '<p>Ponderosa Cove greets group campers with shaded sites near Stumpy Meadows ' +
  'Reservoir. The lake is great for swimming and fishing for brown and rainbow ' +
  'trout. The campground has vault toilets and drinking water.</p>'

describe('fetchRidbSummarySource', () => {
  it('builds a description knowledge result from a RIDB facility', async () => {
    const src = await fetchRidbSummarySource('233285', {
      apiKey: 'k',
      fetchImpl: fakeRidb({
        FacilityName: 'PONDEROSA COVE CAMPGROUND',
        FacilityDescription: RICH_DESCRIPTION,
        FacilityDirections: '<p>Off Ice House Rd.</p>',
      }),
    })
    expect(src).not.toBeNull()
    expect(src!.campgroundName).toBe('PONDEROSA COVE CAMPGROUND')
    expect(src!.results).toHaveLength(1)
    const doc = src!.results[0].document
    expect(doc.documentType).toBe('description')
    expect(doc.content).toContain('Stumpy Meadows')
    expect(doc.content).toContain('Directions: Off Ice House Rd.')
    expect(doc.sourceUrl).toBe('https://www.recreation.gov/camping/campgrounds/233285')
    expect(src!.snapshot.id).toMatch(/^ridb-/)
  })

  it('is deterministic: same description → same snapshot id (stable cache key)', async () => {
    const call = () =>
      fetchRidbSummarySource('233285', {
        apiKey: 'k',
        fetchImpl: fakeRidb({ FacilityName: 'X', FacilityDescription: RICH_DESCRIPTION }),
      })
    const a = await call()
    const b = await call()
    expect(a!.snapshot.id).toBe(b!.snapshot.id)
  })

  it('returns null for a slug (curated ids are handled elsewhere)', async () => {
    const src = await fetchRidbSummarySource('silver-lake-west', { apiKey: 'k', fetchImpl: fakeRidb({}) })
    expect(src).toBeNull()
  })

  it('returns null when there is no API key', async () => {
    const src = await fetchRidbSummarySource('233285', {
      apiKey: '',
      fetchImpl: fakeRidb({ FacilityDescription: RICH_DESCRIPTION }),
    })
    expect(src).toBeNull()
  })

  it('returns null for a too-sparse description (no hallucinating)', async () => {
    const src = await fetchRidbSummarySource('999', {
      apiKey: 'k',
      fetchImpl: fakeRidb({ FacilityName: 'Tiny', FacilityDescription: '<p>A campground.</p>' }),
    })
    expect(src).toBeNull()
  })

  it('returns null on an HTTP error', async () => {
    const src = await fetchRidbSummarySource('233285', {
      apiKey: 'k',
      fetchImpl: fakeRidb({}, false),
    })
    expect(src).toBeNull()
  })
})

describe('stripRidbHtml', () => {
  it('removes tags and collapses whitespace', () => {
    expect(stripRidbHtml('<p>Hello&nbsp;&amp; welcome</p>')).toBe('Hello & welcome')
  })
})
