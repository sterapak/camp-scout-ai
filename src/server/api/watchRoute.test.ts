/** @jest-environment node */
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { getDb, __resetDbForTests } from '../db/index.js'
import { users } from '../db/schema.js'
import { signSession } from '../auth/jwt.js'
import { SESSION_COOKIE } from '../auth/cookies.js'
import { handleWatchRoutes } from './watchRoute.js'

const SECRET = 'test-secret-at-least-16-chars-long'

interface MockResState {
  status: number
  body: string
  headers: Record<string, string>
}

function mockRes(): { res: ServerResponse; state: MockResState } {
  const state: MockResState = { status: 0, body: '', headers: {} }
  const res = {
    writeHead(status: number, headers?: Record<string, string>) {
      state.status = status
      if (headers) Object.assign(state.headers, headers)
      return res
    },
    setHeader(name: string, value: string) {
      state.headers[name] = value
    },
    end(body?: string) {
      state.body = body ?? ''
    },
  }
  return { res: res as unknown as ServerResponse, state }
}

function mockReq(opts: {
  method: string
  url: string
  cookie?: string
  body?: unknown
}): IncomingMessage {
  const payload = opts.body != null ? [Buffer.from(JSON.stringify(opts.body))] : []
  const req = Readable.from(payload) as unknown as IncomingMessage
  req.method = opts.method
  req.url = opts.url
  req.headers = opts.cookie ? { cookie: opts.cookie } : {}
  return req
}

function cookieFor(uid: string, email: string): string {
  return `${SESSION_COOKIE}=${signSession({ uid, email })}`
}

async function call(opts: {
  method: string
  url: string
  cookie?: string
  body?: unknown
}): Promise<{ status: number; json: any; handled: boolean }> {
  const { res, state } = mockRes()
  const handled = await handleWatchRoutes(mockReq(opts), res)
  return {
    handled,
    status: state.status,
    json: state.body ? JSON.parse(state.body) : null,
  }
}

describe('watchRoute per-user isolation', () => {
  let dir: string
  let prevPath: string | undefined
  let prevSecret: string | undefined
  const USER_A = randomUUID()
  const USER_B = randomUUID()

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campscout-watch-'))
    prevPath = process.env.DATABASE_PATH
    prevSecret = process.env.SESSION_SECRET
    process.env.DATABASE_PATH = join(dir, 'watch.sqlite')
    process.env.SESSION_SECRET = SECRET
    __resetDbForTests(null)

    const db = getDb()
    db.insert(users)
      .values([
        { id: USER_A, googleSub: 'sub-a', email: 'a@example.com', name: 'A' },
        { id: USER_B, googleSub: 'sub-b', email: 'b@example.com', name: 'B' },
      ])
      .run()
  })

  afterEach(() => {
    __resetDbForTests(null)
    if (prevPath === undefined) delete process.env.DATABASE_PATH
    else process.env.DATABASE_PATH = prevPath
    if (prevSecret === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = prevSecret
    rmSync(dir, { recursive: true, force: true })
  })

  const newWatchBody = {
    platform: 'recgov',
    facilityId: '232447',
    campgroundName: 'Upper Pines',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
  }

  it('401s when no session cookie is present', async () => {
    const r = await call({ method: 'GET', url: '/api/watches' })
    expect(r.handled).toBe(true)
    expect(r.status).toBe(401)
  })

  it('scopes created watches to the signed-in user', async () => {
    const created = await call({
      method: 'POST',
      url: '/api/watches',
      cookie: cookieFor(USER_A, 'a@example.com'),
      body: newWatchBody,
    })
    expect(created.status).toBe(201)
    expect(created.json.watch.userId).toBe(USER_A)

    // A sees it; B does not.
    const listA = await call({
      method: 'GET',
      url: '/api/watches',
      cookie: cookieFor(USER_A, 'a@example.com'),
    })
    expect(listA.json.watches).toHaveLength(1)

    const listB = await call({
      method: 'GET',
      url: '/api/watches',
      cookie: cookieFor(USER_B, 'b@example.com'),
    })
    expect(listB.json.watches).toHaveLength(0)
  })

  it("returns 404 when a user tries to modify another user's watch", async () => {
    const created = await call({
      method: 'POST',
      url: '/api/watches',
      cookie: cookieFor(USER_A, 'a@example.com'),
      body: newWatchBody,
    })
    const id = created.json.watch.id

    const patchByB = await call({
      method: 'PATCH',
      url: `/api/watches/${id}`,
      cookie: cookieFor(USER_B, 'b@example.com'),
      body: { status: 'paused' },
    })
    expect(patchByB.status).toBe(404)

    const deleteByB = await call({
      method: 'DELETE',
      url: `/api/watches/${id}`,
      cookie: cookieFor(USER_B, 'b@example.com'),
    })
    expect(deleteByB.status).toBe(404)

    // The watch is untouched and still active for A.
    const listA = await call({
      method: 'GET',
      url: '/api/watches',
      cookie: cookieFor(USER_A, 'a@example.com'),
    })
    expect(listA.json.watches).toHaveLength(1)
    expect(listA.json.watches[0].status).toBe('active')
  })

  it('scopes contact settings per user', async () => {
    await call({
      method: 'PUT',
      url: '/api/settings/contact',
      cookie: cookieFor(USER_A, 'a@example.com'),
      body: { phone: '+15550001111', smsEnabled: true },
    })

    const getA = await call({
      method: 'GET',
      url: '/api/settings/contact',
      cookie: cookieFor(USER_A, 'a@example.com'),
    })
    expect(getA.json.settings.phone).toBe('+15550001111')

    const getB = await call({
      method: 'GET',
      url: '/api/settings/contact',
      cookie: cookieFor(USER_B, 'b@example.com'),
    })
    expect(getB.json.settings).toBeNull()
  })
})
