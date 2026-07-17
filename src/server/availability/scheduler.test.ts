/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'

import { getDb, __resetDbForTests } from '../db/index.js'
import {
  alertsSent,
  availabilitySnapshots,
  users,
  userSettings,
  watches,
} from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { runOneTick } from './scheduler.js'

// A fake recreation.gov response: site "1" has 2026-08-10 available.
function fakeRecGovFetch(status: Record<string, string>) {
  return (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      campsites: {
        '1': { campsite_id: '1', site: 'B-012', loop: 'Loop B', availabilities: status },
      },
    }),
  })) as unknown as typeof fetch
}

describe('watch scheduler (end-to-end tick)', () => {
  let dir: string
  let prevPath: string | undefined
  const now = () => new Date('2026-07-20T12:00:00Z')

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campscout-sched-'))
    prevPath = process.env.DATABASE_PATH
    process.env.DATABASE_PATH = join(dir, 'sched.sqlite')
    __resetDbForTests(null)

    const db = getDb()
    const userId = randomUUID()
    db.insert(users)
      .values({ id: userId, googleSub: 'sub-1', email: 'camper@example.com', name: 'Camper' })
      .run()
    db.insert(userSettings)
      .values({ userId, phone: '+15550001111', smsEnabled: true, emailEnabled: false })
      .run()
    db.insert(watches)
      .values({
        id: 'w1',
        userId,
        platform: 'recgov',
        facilityId: '232447',
        campgroundName: 'Upper Pines',
        startDate: '2026-08-01',
        endDate: '2026-08-31',
        minNights: 1,
        status: 'active',
      })
      .run()
  })

  afterEach(() => {
    __resetDbForTests(null)
    if (prevPath === undefined) delete process.env.DATABASE_PATH
    else process.env.DATABASE_PATH = prevPath
    rmSync(dir, { recursive: true, force: true })
  })

  it('fetches, detects an available slot, sends one SMS, stores a snapshot, and dedups', async () => {
    const db = getDb()
    const smsCalls: Array<{ url: string; body: string }> = []
    const fakeTwilio = (async (url: string, init: RequestInit) => {
      smsCalls.push({ url: String(url), body: String(init.body) })
      return { ok: true, status: 201, json: async () => ({ sid: 'SM123' }) }
    }) as unknown as typeof fetch

    const opts = {
      now,
      fetchSpacingMs: 0,
      fetchImpl: fakeRecGovFetch({ '2026-08-10T00:00:00Z': 'Available' }),
      dispatchDeps: {
        smsDeps: {
          fetchImpl: fakeTwilio,
          accountSid: 'ACtest',
          authToken: 'tok',
          fromNumber: '+15559990000',
        },
      },
    }

    const first = await runOneTick(db, opts)
    expect(first.watchesPolled).toBe(1)
    expect(first.alertsSent).toBe(1)

    // One SMS actually attempted, with the deep link in the body.
    expect(smsCalls).toHaveLength(1)
    expect(smsCalls[0].url).toContain('api.twilio.com')
    expect(decodeURIComponent(smsCalls[0].body)).toContain(
      'recreation.gov/camping/campsites/1',
    )

    // Alert + snapshot persisted; watch marked polled.
    expect(db.select().from(alertsSent).all()).toHaveLength(1)
    expect(db.select().from(availabilitySnapshots).all()).toHaveLength(1)
    const w = db.select().from(watches).where(eq(watches.id, 'w1')).get()
    expect(w?.lastPollStatus).toBe('ok')
    expect(w?.lastPolledAt).toBeTruthy()

    // Second tick well past the poll interval: same availability => no NEW alert
    // (prev snapshot already available; nothing newly freed).
    const later = () => new Date('2026-07-20T13:00:00Z')
    const second = await runOneTick(db, { ...opts, now: later })
    expect(second.alertsSent).toBe(0)
    expect(smsCalls).toHaveLength(1)
    expect(db.select().from(alertsSent).all()).toHaveLength(1)
  })
})
