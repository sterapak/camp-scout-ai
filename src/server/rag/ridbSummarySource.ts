/**
 * RIDB-backed summary source.
 *
 * When a browsed recreation.gov campground has NO curated knowledge documents,
 * synthesize a "description" knowledge document from its RIDB (Recreation
 * Information Database) facility record so the SAME summary generator can produce
 * a grounded AI summary. This extends AI summaries from the ~22 hand-curated
 * campgrounds to essentially every recreation.gov facility that has a usable
 * description — the source data was already being fetched for the "About" box.
 *
 * A sparse or empty RIDB description returns null, so the caller shows the honest
 * "not enough info" state rather than letting the model invent facts.
 */
import { createHash } from 'node:crypto'

import type { KnowledgeDocument } from '../../data/knowledgeSchema.js'
import type { RetrievalResult } from '../../data/knowledge/knowledgeRetrieval.js'
import type { KnowledgeSnapshot } from './knowledgeSnapshot.js'

const RIDB_BASE = 'https://ridb.recreation.gov/api/v1'
// Below this, a description is too thin to summarize honestly.
const MIN_DESCRIPTION_CHARS = 160

export interface RidbSummarySource {
  campgroundName: string
  results: RetrievalResult[]
  snapshot: KnowledgeSnapshot
}

interface RidbFacilityResponse {
  FacilityName?: string
  FacilityDescription?: string
  FacilityDirections?: string
}

export interface FetchRidbSummaryDeps {
  fetchImpl?: typeof fetch
  apiKey?: string
}

/** Strip the HTML tags/entities RIDB embeds in its text fields. */
export function stripRidbHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Fetch a RIDB facility and turn it into summary-ready knowledge results.
 * Returns null when: the id is not a numeric RIDB id (slugs are curated), no API
 * key is configured, the request fails, or the description is too sparse.
 */
export async function fetchRidbSummarySource(
  facilityId: string,
  deps: FetchRidbSummaryDeps = {},
): Promise<RidbSummarySource | null> {
  if (!/^\d+$/.test(facilityId)) return null
  const apiKey = deps.apiKey ?? process.env.RIDB_API_KEY
  if (!apiKey) return null
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch

  let facility: RidbFacilityResponse
  try {
    const res = await fetchImpl(`${RIDB_BASE}/facilities/${facilityId}?full=true`, {
      headers: { apikey: apiKey, Accept: 'application/json' },
    })
    if (!res.ok) return null
    facility = (await res.json()) as RidbFacilityResponse
  } catch {
    return null
  }

  const description = stripRidbHtml(facility.FacilityDescription ?? '')
  if (description.length < MIN_DESCRIPTION_CHARS) return null

  const directions = stripRidbHtml(facility.FacilityDirections ?? '')
  const campgroundName = facility.FacilityName
    ? facility.FacilityName.replace(/\s+/g, ' ').trim()
    : `Campground ${facilityId}`

  const sourceUrl = `https://www.recreation.gov/camping/campgrounds/${facilityId}`
  const sourceName = 'Recreation.gov'
  const content = directions ? `${description}\n\nDirections: ${directions}` : description

  const contentHash = createHash('sha256').update(`ridb:${facilityId}:${content}`).digest('hex')

  const document: KnowledgeDocument = {
    id: `ridb-${facilityId}-description`,
    campgroundId: facilityId,
    title: `${campgroundName} — Recreation.gov overview`,
    documentType: 'description',
    content,
    sourceUrl,
    sourceName,
    // RIDB's per-field update timestamp isn't exposed on this endpoint; the
    // content hash (not this value) is what drives cache invalidation.
    lastUpdatedAt: new Date().toISOString(),
  }

  const results: RetrievalResult[] = [
    { document, relevanceScore: 100, sourceUrl, sourceName, campgroundName },
  ]

  const snapshot: KnowledgeSnapshot = {
    id: `ridb-${contentHash.slice(0, 24)}`,
    contentHash,
    sourceName,
  }

  return { campgroundName, results, snapshot }
}
