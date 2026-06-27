/** @jest-environment node */

import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import {
  buildCampgroundSummaryInstructions,
  calculateSummaryConfidence,
  generateCampgroundSummary,
  orderSummaryDocuments,
  parseSummarySections,
} from './campgroundSummaryGenerator.js'
import { retrieveByCampground } from '../../data/knowledge/knowledgeRetrieval.js'

describe('campgroundSummaryGenerator helpers', () => {
  it('orders summary documents by type priority', () => {
    const ordered = orderSummaryDocuments(retrieveByCampground('yosemite-upper-pines'))
    const types = ordered.map((result) => result.document.documentType)

    expect(types.indexOf('description')).toBeLessThan(types.indexOf('rules'))
    expect(types.indexOf('rules')).toBeLessThan(types.indexOf('reservation'))
  })

  it('returns high confidence when core document types are available', () => {
    const confidence = calculateSummaryConfidence(retrieveByCampground('yosemite-upper-pines'))
    expect(confidence).toBe('high')
  })

  it('builds summary instructions with required section headers', () => {
    const instructions = buildCampgroundSummaryInstructions('Upper Pines', 3, [
      { sourceName: 'National Park Service', sourceUrl: 'https://example.com' },
    ])

    expect(instructions).toContain('Google Maps-style campground summary')
    expect(instructions).toContain('## Overview')
    expect(instructions).toContain('## Highlights')
  })

  it('parses markdown sections from generated summary text', () => {
    const sections = parseSummarySections(
      '## Overview\nScenic valley camping.\n\n## Amenities\nRestrooms available.\n\n## Restrictions\nBear boxes required.\n\n## Reservations\nReserve ahead.\n\n## Highlights\nNear trailheads.'
    )

    expect(sections.overview).toBe('Scenic valley camping.')
    expect(sections.amenities).toBe('Restrooms available.')
    expect(sections.restrictions).toBe('Bear boxes required.')
    expect(sections.reservations).toBe('Reserve ahead.')
    expect(sections.highlights).toBe('Near trailheads.')
  })
})

describe('generateCampgroundSummary', () => {
  it('returns structured sections with citations from official documents', async () => {
    const result = await generateCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
    })

    expect(result.status).toBe('success')
    expect(result.campgroundName).toContain('Upper Pines')
    expect(result.sections.overview.length).toBeGreaterThan(0)
    expect(result.sections.amenities.length).toBeGreaterThan(0)
    expect(result.sections.restrictions.length).toBeGreaterThan(0)
    expect(result.sections.reservations.length).toBeGreaterThan(0)
    expect(result.sections.highlights.length).toBeGreaterThan(0)
    expect(result.citations.length).toBeGreaterThan(0)
    expect(result.sources.length).toBeGreaterThan(0)
    expect(result.confidence).toBe('high')
  })

  it('transforms generic source references in summary sections', async () => {
    const result = await generateCampgroundSummary({
      campgroundId: 'yosemite-upper-pines',
      answerProvider: fakeAnswerProvider,
    })

    expect(result.sections.overview).not.toContain('[Source 1]')
    expect(result.sections.overview).toMatch(/the National Park Service|official sources/i)
  })

  it('returns insufficient context for unknown campgrounds', async () => {
    const result = await generateCampgroundSummary({
      campgroundId: 'unknown-campground',
      answerProvider: fakeAnswerProvider,
    })

    expect(result.status).toBe('insufficient_context')
    expect(result.message).toContain('Campground not found')
  })
})
