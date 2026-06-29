// @ts-nocheck
/** @jest-environment node */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parse } from 'node-html-parser'

import { isValidKnowledgeDocument } from '../data/knowledgeSchema.js'
import { computeContentHash, normalizeExtractedText } from './contentHash.js'
import {
  categorizeContent,
  categorizeParagraphs,
  getDocumentTypesToWrite,
  isNoiseParagraph,
  scoreParagraphForType,
} from './categorizeContent.js'
import {
  expandCollapsibleContent,
  extractParagraphsFromHtml,
  extractReadableText,
} from './extractContent.js'
import { fetchSource } from './fetchSource.js'
import {
  buildDocumentId,
  buildDocumentTitle,
  generateKnowledgeDocuments,
} from './generateDocuments.js'
import { formatKnowledgeDocumentFile } from './formatDocumentFile.js'
import {
  createEmptyManifest,
  readManifest,
  toKnowledgeUpdatedDate,
  upsertCampgroundRecord,
  writeManifest,
} from './manifest.js'
import { deriveSourceName } from './sourceName.js'
import { toImportName } from './registryUpdater.js'

const fixturePath = join(__dirname, '__fixtures__', 'mount-tamalpais-pantoll.html')
const fixtureHtml = readFileSync(fixturePath, 'utf8')

describe('contentHash', () => {
  it('normalizes whitespace and casing deterministically', () => {
    expect(normalizeExtractedText('  Hello   World  ')).toBe('hello world')
    expect(computeContentHash('Hello World')).toBe(computeContentHash('  hello   world  '))
  })
})

describe('fetchSource', () => {
  it('returns a clear error for invalid URLs', async () => {
    const result = await fetchSource('not-a-url')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Invalid source URL')
  })

  it('returns a clear error for unreachable hosts', async () => {
    const result = await fetchSource('https://camp-scout-invalid.example.test/missing', {
      fetchImpl: async () => {
        throw new Error('getaddrinfo ENOTFOUND')
      },
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('Failed to fetch')
  })

  it('returns a clear error for HTTP failures', async () => {
    const result = await fetchSource('https://example.com/missing', {
      fetchImpl: async () => ({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => '',
      }),
    })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('HTTP 404')
  })
})

describe('extractContent', () => {
  it('removes navigation and footer content', () => {
    const paragraphs = extractParagraphsFromHtml(fixtureHtml)

    expect(paragraphs.some((paragraph) => paragraph.includes('Pantoll Campground'))).toBe(true)
    expect(paragraphs.some((paragraph) => paragraph.includes('© Copyright'))).toBe(false)
    expect(paragraphs.some((paragraph) => paragraph.includes('Reservations and Fees'))).toBe(false)
  })

  it('extracts readable text from HTML fixtures', () => {
    const readableText = extractReadableText(fixtureHtml)

    expect(readableText).toContain('Pantoll Campground is located in Mount Tamalpais State Park')
    expect(readableText).toContain('first-come first-served')
  })

  it('extracts accordion panel bodies marked aria-hidden', () => {
    const accordionHtml = `
      <html><body><main>
        <div class="panel-group accordion">
          <div class="panel">
            <div class="panel-heading"><h4 class="panel-title"><a>Camping at Silver Lake West</a></h4></div>
            <div class="panel-collapse collapse" aria-hidden="true">
              <div class="panel-body">
                <p>Silver Lake West Campground operates on a first-come, first-served basis. The campground has forty-two (42) campsites. No reservations are accepted. There is no potable water at the campground.</p>
              </div>
            </div>
          </div>
        </div>
      </main></body></html>
    `

    const readableText = extractReadableText(accordionHtml)

    expect(readableText).toMatch(/forty-two \(42\) campsites|42 campsites/i)
    expect(readableText).toContain('first-come, first-served')
    expect(readableText).toContain('No reservations are accepted')
    expect(readableText).toContain('no potable water')
  })

  it('reveals hidden accordion panels before aria-hidden nodes are removed', () => {
    const root = parse(`
      <div class="panel">
        <div class="panel-collapse collapse" aria-hidden="true">
          <div class="panel-body"><p>Hidden accordion panel content for testing extraction.</p></div>
        </div>
      </div>
    `)

    expandCollapsibleContent(root)

    expect(root.querySelector('.panel-collapse')?.getAttribute('aria-hidden')).toBeUndefined()
    expect(root.querySelector('.panel-body')?.text).toContain('Hidden accordion panel content')
  })
})

describe('categorizeContent', () => {
  it('assigns paragraphs to description, rules, reservation, and alert sections', () => {
    const readableText = extractReadableText(fixtureHtml)
    const categorized = categorizeContent(readableText)

    expect(categorized.description.join(' ')).toMatch(/Mount Tamalpais State Park/i)
    expect(categorized.rules.join(' ')).toMatch(/Quiet hours/i)
    expect(categorized.reservation.join(' ')).toMatch(/Day use fees/i)
    expect(categorized.alert.join(' ')).toMatch(/Seasonal alert/i)
    expect(getDocumentTypesToWrite(categorized)).toEqual([
      'description',
      'rules',
      'reservation',
      'alert',
    ])
  })

  it('filters known navigation noise paragraphs', () => {
    expect(isNoiseParagraph('Last Checked: 6/25/2026 10:31 AM')).toBe(true)
    expect(isNoiseParagraph('Pantoll Campground offers forested sites with trail access.')).toBe(false)
  })

  it('scores reservation content higher for reservation type', () => {
    const paragraph = 'Reservations are not accepted. Day use fees apply for park entry.'
    expect(scoreParagraphForType(paragraph, 'reservation')).toBeGreaterThan(
      scoreParagraphForType(paragraph, 'description'),
    )
  })

  it('ensures required document categories receive content', () => {
    const categorized = categorizeParagraphs([
      'Pantoll Campground is located in Mount Tamalpais State Park with ridge views.',
    ])

    expect(categorized.description.length).toBeGreaterThan(0)
    expect(categorized.rules.length).toBeGreaterThan(0)
    expect(categorized.reservation.length).toBeGreaterThan(0)
  })
})

describe('generateDocuments', () => {
  const campground = {
    id: 'mount-tamalpais-pantoll',
    name: 'Pantoll Campground (Mount Tamalpais SP)',
    region: 'Marin County',
    sourceUrl: 'https://www.parks.ca.gov/?page_id=471',
    reservationUrl: 'https://www.reservecalifornia.com/',
    amenities: ['Restrooms'],
    rules: ['First-come first-served only'],
    dogPolicy: 'Dogs allowed on leash.',
    notes: 'Small campground on Mount Tamalpais.',
    lastVerifiedAt: '2025-06-01',
    tags: ['state-park'],
  }

  it('generates stable IDs and schema-valid documents', () => {
    const categorized = categorizeContent(extractReadableText(fixtureHtml))
    const documents = generateKnowledgeDocuments({
      campground,
      categorized,
      lastUpdatedAt: '2025-06-25',
    })

    expect(documents).toHaveLength(4)
    documents.forEach((document) => {
      expect(isValidKnowledgeDocument(document)).toBe(true)
      expect(document.id).toBe(buildDocumentId(campground.id, document.documentType))
      expect(document.campgroundId).toBe(campground.id)
      expect(document.sourceName).toBe(deriveSourceName(campground.sourceUrl))
    })
  })

  it('formats deterministic JS modules', () => {
    const categorized = categorizeContent(extractReadableText(fixtureHtml))
    const [document] = generateKnowledgeDocuments({
      campground,
      categorized,
      lastUpdatedAt: '2025-06-25',
    })

    const formatted = formatKnowledgeDocumentFile(document)
    const formattedAgain = formatKnowledgeDocumentFile(document)

    expect(formatted).toBe(formattedAgain)
    expect(formatted).toContain("documentType: 'description'")
    expect(formatted).toContain(buildDocumentTitle(campground, 'description'))
  })
})

describe('manifest change detection', () => {
  let tempDir = ''

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'camp-scout-manifest-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('stores and compares content hashes per campground', () => {
    const manifest = createEmptyManifest()
    const hash = computeContentHash(extractReadableText(fixtureHtml))
    const updated = upsertCampgroundRecord(manifest, 'mount-tamalpais-pantoll', {
      sourceUrl: 'https://www.parks.ca.gov/?page_id=471',
      sourceName: 'California State Parks',
      lastFetchedAt: '2025-06-25T12:00:00.000Z',
      contentHash: hash,
    })

    expect(updated.campgrounds['mount-tamalpais-pantoll'].contentHash).toBe(hash)
    expect(toKnowledgeUpdatedDate('2025-06-25T12:00:00.000Z')).toBe('2025-06-25')
  })

  it('writes deterministic JSON manifests', () => {
    const manifestPath = join(tempDir, 'manifest.json')
    const manifest = upsertCampgroundRecord(createEmptyManifest(), 'alpha', {
      sourceUrl: 'https://example.com/a',
      sourceName: 'Official Source',
      lastFetchedAt: '2025-06-25T12:00:00.000Z',
      contentHash: 'hash-a',
    })

    writeManifest(manifest, manifestPath)
    const first = readFileSync(manifestPath, 'utf8')
    writeManifest(readManifest(manifestPath), manifestPath)
    const second = readFileSync(manifestPath, 'utf8')

    expect(first).toBe(second)
  })
})

describe('registryUpdater helpers', () => {
  it('builds stable import names', () => {
    expect(toImportName('mount-tamalpais-pantoll', 'description')).toBe('mountTamalpaisPantollDescription')
  })
})
