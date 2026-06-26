/** @jest-environment node */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { campgrounds } from '../data/campgrounds.js'
import {
  hasConfiguredSources,
  resolveCampgroundSources,
} from '../data/campgroundSources.js'
import { isValidCampground, isValidCampgroundSource, CAMPGROUND_SOURCE_TYPES } from '../data/campgroundSchema.js'
import { fetchCampgroundReadableText } from './fetchCampgroundContent.js'
import {
  buildDocumentId,
  generateKnowledgeDocuments,
} from './generateDocuments.js'
import { categorizeContent } from './categorizeContent.js'
import { extractReadableText } from './extractContent.js'
import { ingestCampground } from './pipeline.js'
import { toGroundedAnswerCitation } from '../server/rag/groundedAnswerGenerator.js'
import { retrieveByCampground } from '../data/knowledge/knowledgeRetrieval.js'

const fixtureDir = join(__dirname, '__fixtures__')
const silverLakeEidHtml = readFileSync(join(fixtureDir, 'silver-lake-west-eid.html'), 'utf8')
const silverLakeUsfsHtml = readFileSync(join(fixtureDir, 'silver-lake-east-usfs.html'), 'utf8')

const silverLake = campgrounds.find((campground) => campground.id === 'silver-lake-west')
const iceHouse = campgrounds.find((campground) => campground.id === 'ice-house-reservoir')
const pantoll = campgrounds.find((campground) => campground.id === 'mount-tamalpais-pantoll')

describe('multi-source campground configuration', () => {
  it('defines supported sourceType values on configured campgrounds', () => {
    expect(CAMPGROUND_SOURCE_TYPES).toEqual([
      'operator',
      'government',
      'reservation',
      'alert',
      'map',
      'recreation-info',
    ])

    expect(silverLake?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'El Dorado Irrigation District',
          sourceType: 'operator',
          priority: 1,
        }),
        expect.objectContaining({
          name: 'U.S. Forest Service',
          sourceType: 'government',
          priority: 2,
        }),
      ]),
    )

    expect(iceHouse?.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Pacific Gas and Electric Company',
          sourceType: 'operator',
        }),
        expect.objectContaining({
          name: 'Recreation.gov',
          sourceType: 'reservation',
        }),
      ]),
    )
  })

  it('validates multi-source campground seed records', () => {
    expect(isValidCampground(silverLake)).toBe(true)
    expect(isValidCampground(iceHouse)).toBe(true)

    silverLake?.sources?.forEach((source) => {
      expect(isValidCampgroundSource(source)).toBe(true)
    })
  })

  it('keeps legacy single-source campgrounds compatible', () => {
    expect(hasConfiguredSources(pantoll)).toBe(false)
    expect(resolveCampgroundSources(pantoll)).toEqual([
      expect.objectContaining({
        url: pantoll?.sourceUrl,
        priority: 1,
      }),
    ])
    expect(isValidCampground(pantoll)).toBe(true)
  })
})

describe('multi-source ingestion', () => {
  it('fetches each configured source URL separately', async () => {
    const fetchedUrls = []

    const result = await fetchCampgroundReadableText(silverLake, {
      fetchImpl: async (url) => {
        fetchedUrls.push(url)
        return {
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => (
            url.includes('eid.org') ? silverLakeEidHtml : silverLakeUsfsHtml
          ),
        }
      },
    })

    expect(result.ok).toBe(true)
    expect(fetchedUrls).toEqual([
      'https://www.eid.org/recreation/silver-lake',
      'https://www.fs.usda.gov/r05/eldorado/recreation/silver-lake-campground-east',
    ])
    expect(result.fetchedSources).toHaveLength(2)
  })

  it('preserves sourceName and sourceUrl per generated document', () => {
    const documents = generateKnowledgeDocuments({
      campground: silverLake,
      fetchedSources: [
        {
          source: silverLake.sources[0],
          readableText: extractReadableText(silverLakeEidHtml),
          url: silverLake.sources[0].url,
        },
        {
          source: silverLake.sources[1],
          readableText: extractReadableText(silverLakeUsfsHtml),
          url: silverLake.sources[1].url,
        },
      ],
      lastUpdatedAt: '2025-06-25',
    })

    const eidDescription = documents.find(
      (document) => document.id === buildDocumentId('silver-lake-west', 'description', silverLake.sources[0]),
    )
    const usfsRules = documents.find(
      (document) => document.id === buildDocumentId('silver-lake-west', 'rules', silverLake.sources[1]),
    )

    expect(eidDescription?.sourceName).toBe('El Dorado Irrigation District')
    expect(eidDescription?.sourceUrl).toBe('https://www.eid.org/recreation/silver-lake')
    expect(usfsRules?.sourceName).toBe('U.S. Forest Service')
    expect(usfsRules?.sourceUrl).toContain('fs.usda.gov')
  })

  it('keeps legacy single-source document IDs unchanged', () => {
    const pantollHtml = readFileSync(join(fixtureDir, 'mount-tamalpais-pantoll.html'), 'utf8')
    const documents = generateKnowledgeDocuments({
      campground: pantoll,
      categorized: categorizeContent(extractReadableText(pantollHtml)),
      lastUpdatedAt: '2025-06-25',
    })

    documents.forEach((document) => {
      expect(document.id).toBe(buildDocumentId(pantoll.id, document.documentType))
      expect(document.sourceUrl).toBe(pantoll.sourceUrl)
    })
  })
})

describe('Silver Lake West EID accordion extraction', () => {
  it('includes forty-two (42) campsites and FCFS details from accordion panels', () => {
    const readableText = extractReadableText(silverLakeEidHtml)
    const documents = generateKnowledgeDocuments({
      campground: silverLake,
      fetchedSources: [
        {
          source: silverLake.sources[0],
          readableText,
          url: silverLake.sources[0].url,
        },
        {
          source: silverLake.sources[1],
          readableText: extractReadableText(silverLakeUsfsHtml),
          url: silverLake.sources[1].url,
        },
      ],
      lastUpdatedAt: '2025-06-25',
    })

    const combinedContent = documents
      .filter((document) => document.sourceName === 'El Dorado Irrigation District')
      .map((document) => document.content)
      .join(' ')

    expect(combinedContent).toMatch(/forty-two \(42\) campsites|42 campsites/i)
    expect(combinedContent).toContain('first-come, first-served')
    expect(combinedContent).toContain('No reservations are accepted')
    expect(combinedContent).toMatch(/no potable water|no water service/i)
  })
})

describe('multi-source citation preservation', () => {
  it('maps retrieval results to the correct official authority', () => {
    const results = retrieveByCampground('silver-lake-west')
    const eidResult = results.find((result) => result.sourceName === 'El Dorado Irrigation District')
    const usfsResult = results.find((result) => result.sourceName === 'U.S. Forest Service')

    expect(eidResult?.sourceUrl).toBe('https://www.eid.org/recreation/silver-lake')
    expect(usfsResult?.sourceUrl).toContain('fs.usda.gov')

    if (eidResult) {
      const citation = toGroundedAnswerCitation({
        id: eidResult.document.id,
        title: eidResult.document.title,
        sourceName: eidResult.sourceName,
        sourceUrl: eidResult.sourceUrl,
        campgroundName: eidResult.campgroundName,
        documentType: eidResult.document.documentType,
        relevanceScore: eidResult.relevanceScore,
      })

      expect(citation.sourceName).toBe('El Dorado Irrigation District')
      expect(citation.sourceUrl).toBe('https://www.eid.org/recreation/silver-lake')
    }
  })

  it('preserves PG&E citations for Ice House operator content', () => {
    const results = retrieveByCampground('ice-house-reservoir')
    const pgeResult = results.find((result) => result.sourceName === 'Pacific Gas and Electric Company')

    expect(pgeResult?.sourceUrl).toContain('pge.com')
  })
})

describe('multi-source ingestCampground integration', () => {
  it('writes per-source knowledge modules for configured campgrounds', async () => {
    const { mkdtempSync, rmSync, readFileSync, existsSync } = await import('node:fs')
    const { tmpdir } = await import('node:os')
    const tempDir = mkdtempSync(join(tmpdir(), 'camp-scout-multi-source-'))

    try {
      const knowledgeRoot = join(tempDir, 'knowledge')
      const manifestPath = join(knowledgeRoot, 'ingestion-manifest.json')

      const result = await ingestCampground(silverLake, {
        knowledgeRoot,
        manifestPath,
        nowIso: () => '2025-06-25T12:00:00.000Z',
        fetchImpl: async (url) => ({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () => (
            url.includes('eid.org') ? silverLakeEidHtml : silverLakeUsfsHtml
          ),
        }),
      })

      expect(result.status).toBe('success')
      expect(existsSync(join(knowledgeRoot, 'campgrounds/silver-lake-west/description--source-1.js'))).toBe(true)
      expect(existsSync(join(knowledgeRoot, 'campgrounds/silver-lake-west/description.js'))).toBe(false)

      const eidDescription = readFileSync(
        join(knowledgeRoot, 'campgrounds/silver-lake-west/description--source-1.js'),
        'utf8',
      )
      expect(eidDescription).toContain('El Dorado Irrigation District')
      expect(eidDescription).toContain('https://www.eid.org/recreation/silver-lake')
      expect(eidDescription).toMatch(/forty-two \(42\) campsites|42 campsites/i)
    } finally {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })
})
