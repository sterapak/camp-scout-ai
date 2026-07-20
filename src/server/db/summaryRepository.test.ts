/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { __resetDbForTests } from './index.js'
import { readStoredSummary, writeStoredSummary, type StoredSummary } from './summaryRepository.js'

const SNAPSHOT = { id: 'snap-v1', documentIds: ['a', 'b'] }

function entry(overrides: Partial<StoredSummary> = {}): StoredSummary {
  return {
    campgroundId: 'van-damme-sp',
    knowledgeSnapshot: SNAPSHOT,
    generatedAt: '2026-07-19T21:00:00.000Z',
    summary: { status: 'success', sections: { overview: 'Coastal redwoods.' } },
    ...overrides,
  }
}

describe('durable campground summaries (SQLite)', () => {
  let dir: string
  let previousPath: string | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campscout-summaries-'))
    previousPath = process.env.DATABASE_PATH
    process.env.DATABASE_PATH = join(dir, 'summaries.sqlite') // real file, not :memory:
    __resetDbForTests(null)
  })

  afterEach(() => {
    __resetDbForTests(null)
    if (previousPath === undefined) delete process.env.DATABASE_PATH
    else process.env.DATABASE_PATH = previousPath
    rmSync(dir, { recursive: true, force: true })
  })

  it('round-trips a summary', () => {
    writeStoredSummary(entry())
    const found = readStoredSummary('van-damme-sp', 'snap-v1')

    expect(found?.generatedAt).toBe('2026-07-19T21:00:00.000Z')
    expect(found?.summary).toEqual({ status: 'success', sections: { overview: 'Coastal redwoods.' } })
    expect(found?.knowledgeSnapshot).toEqual(SNAPSHOT)
  })

  // THE point of this table. Previously summaries lived only in an in-memory Map,
  // so every deploy discarded them and the next visitor re-paid generation.
  it('survives a restart — reloads on a fresh connection', () => {
    writeStoredSummary(entry())

    __resetDbForTests(null) // simulate process restart / deploy

    const found = readStoredSummary('van-damme-sp', 'snap-v1')
    expect(found?.summary).toEqual({ status: 'success', sections: { overview: 'Coastal redwoods.' } })
  })

  // Invalidation is the reason snapshot_id is in the key: changed knowledge must
  // NOT return a stale summary, and must not need a manual purge.
  it('does not return a summary generated against a different knowledge snapshot', () => {
    writeStoredSummary(entry())

    expect(readStoredSummary('van-damme-sp', 'snap-v2')).toBeUndefined()
    expect(readStoredSummary('van-damme-sp', 'snap-v1')).toBeDefined()
  })

  it('regenerating overwrites in place rather than duplicating', () => {
    writeStoredSummary(entry())
    writeStoredSummary(
      entry({ generatedAt: '2026-07-20T09:00:00.000Z', summary: { status: 'success', sections: { overview: 'Updated.' } } }),
    )

    const found = readStoredSummary('van-damme-sp', 'snap-v1')
    expect(found?.generatedAt).toBe('2026-07-20T09:00:00.000Z')
    expect(found?.summary).toEqual({ status: 'success', sections: { overview: 'Updated.' } })
  })

  it('treats an unreadable row as a MISS, not an empty summary', () => {
    writeStoredSummary(entry())

    // Corrupt the stored JSON directly, as a partial write or bad deploy might.
    __resetDbForTests(null) // release the drizzle handle before opening a raw one
    const Database = require('better-sqlite3')
    const raw = new Database(process.env.DATABASE_PATH as string)
    raw.prepare('UPDATE campground_summaries SET summary_json = ?').run('{not json')
    raw.close()
    __resetDbForTests(null)

    // A miss regenerates. Returning a blank summary would render an empty card
    // that looks generated — worse than regenerating.
    expect(readStoredSummary('van-damme-sp', 'snap-v1')).toBeUndefined()
  })
})
