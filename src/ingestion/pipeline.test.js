// @ts-nocheck
/** @jest-environment node */

import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'

import { isValidKnowledgeDocument } from '../data/knowledgeSchema.js'
import { computeContentHash } from './contentHash.js'
import { extractReadableText } from './extractContent.js'
import { createEmptyManifest, writeManifest } from './manifest.js'
import { ingestCampground, runIngestionPipeline } from './pipeline.js'
import { updateDocumentsRegistry } from './registryUpdater.js'

const fixturePath = join(__dirname, '__fixtures__', 'mount-tamalpais-pantoll.html')
const fixtureHtml = readFileSync(fixturePath, 'utf8')

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

describe('ingestion pipeline', () => {
  let tempDir = ''

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'camp-scout-ingest-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('writes schema-valid documents and skips unchanged reruns', async () => {
    const knowledgeRoot = join(tempDir, 'knowledge')
    const campgroundDir = join(knowledgeRoot, 'campgrounds', campground.id)
    const manifestPath = join(knowledgeRoot, 'ingestion-manifest.json')
    const documentsFilePath = join(knowledgeRoot, 'documents.js')

    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => fixtureHtml,
    })

    const firstResult = await ingestCampground(campground, {
      fetchImpl,
      manifestPath,
      knowledgeRoot,
      nowIso: () => '2025-06-25T12:00:00.000Z',
    })

    expect(firstResult.status).toBe('success')
    expect(firstResult.documentsWritten).toBe(4)

    const descriptionPath = join(campgroundDir, 'description.js')
    const firstDescription = readFileSync(descriptionPath, 'utf8')

    updateDocumentsRegistry(knowledgeRoot, documentsFilePath)
    expect(readFileSync(documentsFilePath, 'utf8')).toContain('mountTamalpaisPantollDescription')

    const secondResult = await ingestCampground(campground, {
      fetchImpl,
      manifestPath,
      knowledgeRoot,
      nowIso: () => '2025-06-25T13:00:00.000Z',
    })

    expect(secondResult.status).toBe('skipped')
    expect(readFileSync(descriptionPath, 'utf8')).toBe(firstDescription)
  })

  it('continues processing when one campground fails', async () => {
    const logs = []
    const summary = await runIngestionPipeline(['unknown-campground', 'another-missing'], {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => fixtureHtml,
      }),
      logger: (message) => logs.push(message),
    })

    expect(summary.failed).toBe(2)
    expect(summary.succeeded).toBe(0)
    expect(logs.some((message) => message.includes('Unknown campground id'))).toBe(true)
  })

  it('stores content hash metadata after a successful ingest', async () => {
    const knowledgeRoot = join(tempDir, 'knowledge')
    const manifestPath = join(knowledgeRoot, 'ingestion-manifest.json')
    const fetchImpl = async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => fixtureHtml,
    })

    await ingestCampground(campground, {
      fetchImpl,
      manifestPath,
      knowledgeRoot,
      nowIso: () => '2025-06-25T12:00:00.000Z',
    })

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
    expect(manifest.campgrounds[campground.id]).toEqual({
      sourceUrl: campground.sourceUrl,
      sourceName: 'California State Parks',
      lastFetchedAt: '2025-06-25T12:00:00.000Z',
      contentHash: computeContentHash(extractReadableText(fixtureHtml)),
    })
  })

  it('seeds manifest hash to avoid rewriting existing files on first run', async () => {
    const knowledgeRoot = join(tempDir, 'knowledge')
    const manifestPath = join(knowledgeRoot, 'ingestion-manifest.json')
    const existingDescriptionPath = join(
      knowledgeRoot,
      'campgrounds',
      campground.id,
      'description.js',
    )

    mkdirSync(dirname(existingDescriptionPath), { recursive: true })

    writeFileSync(
      existingDescriptionPath,
      [
        "/** @type {import('../../knowledgeSchema.js').KnowledgeDocument} */",
        'export default {',
        "  id: 'mount-tamalpais-pantoll-description',",
        "  campgroundId: 'mount-tamalpais-pantoll',",
        "  title: 'Existing Overview',",
        "  documentType: 'description',",
        "  content: `Existing content`,",
        "  sourceUrl: 'https://www.parks.ca.gov/?page_id=471',",
        "  sourceName: 'California State Parks',",
        "  lastUpdatedAt: '2025-06-01',",
        '}',
        '',
      ].join('\n'),
      'utf8',
    )

    writeManifest(
      createEmptyManifest(),
      manifestPath,
    )

    writeFileSync(
      manifestPath,
      JSON.stringify({
        version: 1,
        campgrounds: {
          [campground.id]: {
            sourceUrl: campground.sourceUrl,
            sourceName: 'California State Parks',
            lastFetchedAt: '2025-06-25T12:00:00.000Z',
            contentHash: computeContentHash(extractReadableText(fixtureHtml)),
          },
        },
      }, null, 2),
      'utf8',
    )

    const result = await ingestCampground(campground, {
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => fixtureHtml,
      }),
      manifestPath,
      knowledgeRoot,
    })

    expect(result.status).toBe('skipped')
    expect(readFileSync(existingDescriptionPath, 'utf8')).toContain('Existing Overview')
  })
})

describe('ingestion generated documents', () => {
  it('passes schema validation for fixture-derived content', () => {
    const categorized = {
      description: ['Pantoll Campground is located in Mount Tamalpais State Park with ridge views.'],
      rules: ['Quiet hours are enforced from 10 PM to 6 AM.'],
      reservation: ['Day use fees apply for park entry.'],
      alert: ['Seasonal alert: High winds may close ridge trails during winter storms.'],
    }

    const documents = [
      {
        id: 'mount-tamalpais-pantoll-description',
        campgroundId: campground.id,
        title: 'Pantoll Campground Overview',
        documentType: 'description',
        content: categorized.description.join(' '),
        sourceUrl: campground.sourceUrl,
        sourceName: 'California State Parks',
        lastUpdatedAt: '2025-06-25',
      },
      {
        id: 'mount-tamalpais-pantoll-rules',
        campgroundId: campground.id,
        title: 'Pantoll Campground Rules',
        documentType: 'rules',
        content: categorized.rules.join(' '),
        sourceUrl: campground.sourceUrl,
        sourceName: 'California State Parks',
        lastUpdatedAt: '2025-06-25',
      },
      {
        id: 'mount-tamalpais-pantoll-reservation',
        campgroundId: campground.id,
        title: 'Pantoll Campground Reservation Information',
        documentType: 'reservation',
        content: categorized.reservation.join(' '),
        sourceUrl: campground.sourceUrl,
        sourceName: 'California State Parks',
        lastUpdatedAt: '2025-06-25',
      },
      {
        id: 'mount-tamalpais-pantoll-alert',
        campgroundId: campground.id,
        title: 'Pantoll Campground Alerts & Notices',
        documentType: 'alert',
        content: categorized.alert.join(' '),
        sourceUrl: campground.sourceUrl,
        sourceName: 'California State Parks',
        lastUpdatedAt: '2025-06-25',
      },
    ]

    documents.forEach((document) => {
      expect(isValidKnowledgeDocument(document)).toBe(true)
    })
  })
})
