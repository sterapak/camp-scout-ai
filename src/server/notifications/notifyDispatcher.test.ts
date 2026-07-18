/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { eq } from 'drizzle-orm'

import { getDb, __resetDbForTests } from '../db/index.js'
import { alertsSent, users, userSettings, type WatchRow } from '../db/schema.js'
import { dispatchMatches } from './notifyDispatcher.js'
import type { WatchMatch } from '../availability/diffEngine.js'

function fakeTwilio() {
  const calls: string[] = []
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push(String(init.body))
    return { ok: true, status: 201, json: async () => ({ sid: 'SM1', status: 'queued' }) }
  }) as unknown as typeof fetch
  return { calls, smsDeps: { fetchImpl, accountSid: 'AC', authToken: 't', fromNumber: '+15550000000' } }
}

function watchRow(userId: string): WatchRow {
  return {
    id: 'w1',
    userId,
    platform: 'recgov',
    facilityId: '232447',
    campgroundName: 'Upper Pines',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    minNights: 1,
    siteFilters: null,
    status: 'active',
  } as unknown as WatchRow
}

function matches(n: number): WatchMatch[] {
  return Array.from({ length: n }, (_, i) => ({
    siteId: String(100 + i),
    siteName: `Site ${100 + i}`,
    date: '2026-08-10',
    nights: 1,
  }))
}

describe('dispatchMatches — no SMS fan-out', () => {
  let dir: string
  let prevPath: string | undefined
  const userId = randomUUID()

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campscout-dispatch-'))
    prevPath = process.env.DATABASE_PATH
    process.env.DATABASE_PATH = join(dir, 'd.sqlite')
    __resetDbForTests(null)
    const db = getDb()
    db.insert(users).values({ id: userId, googleSub: 's', email: 'a@b.com' }).run()
    db.insert(userSettings).values({ userId, phone: '+15551112222', smsEnabled: true }).run()
  })

  afterEach(() => {
    __resetDbForTests(null)
    if (prevPath === undefined) delete process.env.DATABASE_PATH
    else process.env.DATABASE_PATH = prevPath
    rmSync(dir, { recursive: true, force: true })
  })

  it('sends exactly ONE summary SMS for a batch of 50 freed slots', async () => {
    const db = getDb()
    const { calls, smsDeps } = fakeTwilio()
    const result = await dispatchMatches(db, watchRow(userId), matches(50), { smsDeps })

    expect(calls).toHaveLength(1) // <-- the bug was 50 sends; now one
    expect(result.sent).toBe(1)
    expect(calls[0]).toContain('50+openings') // "50 openings" (form-encoded)
    // Every slot still recorded for dedup/history.
    expect(db.select().from(alertsSent).all()).toHaveLength(50)
  })

  it('does not re-alert already-recorded slots on the next poll', async () => {
    const db = getDb()
    const first = fakeTwilio()
    await dispatchMatches(db, watchRow(userId), matches(50), { smsDeps: first.smsDeps })

    const second = fakeTwilio()
    const result = await dispatchMatches(db, watchRow(userId), matches(50), { smsDeps: second.smsDeps })
    expect(second.calls).toHaveLength(0)
    expect(result.sent).toBe(0)
    expect(result.skipped).toBe(50)
  })

  it('sends ONE email (not one per site) when email alerts are enabled', async () => {
    const db = getDb()
    db.update(userSettings)
      .set({ emailEnabled: true, email: 'me@example.com', smsEnabled: false })
      .where(eq(userSettings.userId, userId))
      .run()

    const calls: unknown[] = []
    const emailDeps = {
      apiKey: 're_x',
      fetchImpl: (async (_u: string, i: RequestInit) => {
        calls.push(JSON.parse(String(i.body)))
        return { ok: true, status: 200, json: async () => ({ id: 'em1' }) }
      }) as unknown as typeof fetch,
    }

    const result = await dispatchMatches(db, watchRow(userId), matches(30), { emailDeps })
    expect(calls).toHaveLength(1)
    expect(result.sent).toBe(1)
    expect(db.select().from(alertsSent).all()).toHaveLength(30)
  })

  it('sends nothing when the kill-switch is off', async () => {
    const db = getDb()
    const { calls, smsDeps } = fakeTwilio()
    process.env.WATCH_SMS_ENABLED = 'false'
    try {
      const result = await dispatchMatches(db, watchRow(userId), matches(5), { smsDeps })
      expect(calls).toHaveLength(0)
      expect(result.sent).toBe(0)
    } finally {
      delete process.env.WATCH_SMS_ENABLED
    }
  })
})
