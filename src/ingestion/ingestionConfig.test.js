/** @jest-environment node */

import { campgrounds } from '../data/campgrounds.js'
import { readManifest } from './manifest.js'
import {
  getAllIngestionCampgroundIds,
  INGESTION_CAMPGROUND_IDS,
  resolveCampgroundIdsFromArgs,
} from './ingestionConfig.js'

describe('ingestionConfig', () => {
  it('includes every seed campground by default', () => {
    expect(INGESTION_CAMPGROUND_IDS).toHaveLength(campgrounds.length)

    campgrounds.forEach((campground) => {
      expect(INGESTION_CAMPGROUND_IDS).toContain(campground.id)
    })
  })

  it('returns a copy of all campground IDs', () => {
    const ids = getAllIngestionCampgroundIds()

    expect(ids).toEqual(INGESTION_CAMPGROUND_IDS)
    expect(ids).not.toBe(INGESTION_CAMPGROUND_IDS)
  })

  it('resolves a single campground from CLI args', () => {
    expect(resolveCampgroundIdsFromArgs(['--campground', 'donner-memorial'])).toEqual([
      'donner-memorial',
    ])
  })

  it('throws when --campground is missing a value', () => {
    expect(() => resolveCampgroundIdsFromArgs(['--campground'])).toThrow(
      'Missing value for --campground',
    )
  })
})

describe('ingestion manifest coverage', () => {
  it('contains every supported campground after a full ingest', () => {
    const manifest = readManifest()

    campgrounds.forEach((campground) => {
      expect(manifest.campgrounds[campground.id]).toEqual(
        expect.objectContaining({
          sourceUrl: campground.sourceUrl,
          sourceName: expect.any(String),
          lastFetchedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          contentHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      )
    })
  })
})
