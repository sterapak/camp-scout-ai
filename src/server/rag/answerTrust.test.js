/** @jest-environment node */

import {
  buildSupportingEvidence,
  calculateAnswerConfidence,
  deduplicateSourcesByUrl,
  formatOrganizationReference,
  getSourceAuthorityRank,
  stripGenericSourcesBlock,
  transformSourceReferences,
} from './answerTrust.js'

describe('answerTrust', () => {
  describe('getSourceAuthorityRank', () => {
    it('ranks federal agencies above reservation portals', () => {
      expect(getSourceAuthorityRank('National Park Service')).toBeLessThan(
        getSourceAuthorityRank('Recreation.gov')
      )
      expect(getSourceAuthorityRank('U.S. Forest Service')).toBeLessThan(
        getSourceAuthorityRank('ReserveCalifornia')
      )
    })
  })

  describe('deduplicateSourcesByUrl', () => {
    it('returns each URL only once in the Sources section', () => {
      const uniqueSources = deduplicateSourcesByUrl([
        { sourceName: 'National Park Service', sourceUrl: 'https://www.nps.gov/yose/rules/' },
        { sourceName: 'National Park Service', sourceUrl: 'https://www.nps.gov/yose/rules/' },
        { sourceName: 'National Park Service', sourceUrl: 'https://www.nps.gov/yose/alerts/' },
      ])

      expect(uniqueSources).toHaveLength(2)
      expect(uniqueSources.map((source) => source.sourceUrl)).toEqual([
        'https://www.nps.gov/yose/rules/',
        'https://www.nps.gov/yose/alerts/',
      ])
    })

    it('orders sources by authority', () => {
      const uniqueSources = deduplicateSourcesByUrl([
        { sourceName: 'Recreation.gov', sourceUrl: 'https://www.recreation.gov/camping' },
        { sourceName: 'National Park Service', sourceUrl: 'https://www.nps.gov/yose/' },
        { sourceName: 'California State Parks', sourceUrl: 'https://www.parks.ca.gov/example' },
      ])

      expect(uniqueSources.map((source) => source.sourceName)).toEqual([
        'National Park Service',
        'California State Parks',
        'Recreation.gov',
      ])
    })
  })

  describe('calculateAnswerConfidence', () => {
    it('returns high confidence for strong retrieval scores', () => {
      expect(calculateAnswerConfidence([55, 48, 42])).toBe('high')
    })

    it('returns medium confidence for moderate retrieval scores', () => {
      expect(calculateAnswerConfidence([22, 18, 16])).toBe('medium')
    })

    it('returns low confidence for weak retrieval scores', () => {
      expect(calculateAnswerConfidence([4, 3])).toBe('low')
    })
  })

  describe('buildSupportingEvidence', () => {
    it('builds excerpts with citation metadata from retrieved documents', () => {
      const evidence = buildSupportingEvidence([
        {
          document: {
            id: 'doc-1',
            title: 'Campground Rules',
            content: 'Dogs are not allowed in the campground. '.repeat(20),
            documentType: 'rules',
            campgroundId: 'example',
          },
          relevanceScore: 30,
          sourceUrl: 'https://example.com/rules',
          sourceName: 'National Park Service',
          campgroundName: 'Example Campground',
        },
      ])

      expect(evidence).toHaveLength(1)
      expect(evidence[0]).toMatchObject({
        citationId: 'doc-1',
        citationIndex: 1,
        sourceName: 'National Park Service',
        title: 'Campground Rules',
      })
      expect(evidence[0].excerpt.length).toBeLessThanOrEqual(281)
    })
  })

  describe('transformSourceReferences', () => {
    it('replaces generic Source N labels with organization names', () => {
      const transformed = transformSourceReferences(
        'Food must be stored in lockers [Source 1]. Quiet hours begin at 10 PM [Source 2].',
        [
          { sourceName: 'National Park Service', sourceUrl: 'https://example.com/1' },
          { sourceName: 'U.S. Forest Service', sourceUrl: 'https://example.com/2' },
        ]
      )

      expect(transformed).toContain('the National Park Service')
      expect(transformed).toContain('the U.S. Forest Service')
      expect(transformed).not.toContain('[Source 1]')
      expect(transformed).not.toContain('[Source 2]')
    })

    it('removes trailing generic Sources blocks', () => {
      const transformed = stripGenericSourcesBlock(
        'Answer text.\n\nSources:\n- [Source 1] National Park Service — https://example.com'
      )

      expect(transformed).toBe('Answer text.')
    })
  })

  describe('formatOrganizationReference', () => {
    it('prefixes organization names with "the"', () => {
      expect(formatOrganizationReference('National Park Service')).toBe('the National Park Service')
    })
  })
})
