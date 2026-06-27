/** @jest-environment node */

import { detectContradictions } from './contradictionDetection.js'

describe('detectContradictions', () => {
  it('returns null when no contradictions exist', () => {
    const warning = detectContradictions([
      {
        document: {
          id: 'doc-1',
          title: 'Rules',
          content: 'Dogs are allowed on leash in the campground.',
          documentType: 'rules',
          campgroundId: 'example',
        },
        relevanceScore: 20,
        sourceUrl: 'https://example.com/1',
        sourceName: 'National Park Service',
      },
      {
        document: {
          id: 'doc-2',
          title: 'Alerts',
          content: 'Dogs must remain on leash at all times.',
          documentType: 'alert',
          campgroundId: 'example',
        },
        relevanceScore: 18,
        sourceUrl: 'https://example.com/2',
        sourceName: 'National Park Service',
      },
    ])

    expect(warning).toBeNull()
  })

  it('detects contradictory dog policies across sources', () => {
    const warning = detectContradictions([
      {
        document: {
          id: 'doc-1',
          title: 'Rules A',
          content: 'Dogs are allowed on leash in the campground.',
          documentType: 'rules',
          campgroundId: 'example',
        },
        relevanceScore: 20,
        sourceUrl: 'https://example.com/1',
        sourceName: 'National Park Service',
      },
      {
        document: {
          id: 'doc-2',
          title: 'Rules B',
          content: 'Dogs are not allowed in the campground.',
          documentType: 'rules',
          campgroundId: 'example',
        },
        relevanceScore: 18,
        sourceUrl: 'https://example.com/2',
        sourceName: 'California State Parks',
      },
    ])

    expect(warning).not.toBeNull()
    expect(warning?.topic).toBe('Dogs allowed')
    expect(warning?.conflictingSources).toHaveLength(2)
  })
})
