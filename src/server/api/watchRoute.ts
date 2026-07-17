/**
 * Availability-watch API routes — per-user (authenticated via the session
 * cookie; every row is scoped to the signed-in user). Composed into the server
 * in production.mjs. Returns true if it handled the request.
 *
 *   GET    /api/watches            list the user's watches
 *   POST   /api/watches            create a watch (owned by the user)
 *   PATCH  /api/watches/:id        update the user's watch (status/minNights)
 *   DELETE /api/watches/:id        delete the user's watch
 *   GET    /api/alerts             the user's recent alerts
 *   GET    /api/settings/contact   the user's notify prefs
 *   PUT    /api/settings/contact   update the user's notify prefs
 */
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { and, desc, eq } from 'drizzle-orm'

import { getDb } from '../db/index.js'
import { alertsSent, userSettings, watches } from '../db/schema.js'
import { checkCampgroundWatchable, parseRecGovCampgroundId } from '../availability/recGovAdapter.js'
import { requireUser } from '../auth/authRoutes.js'

export interface WatchRouteDeps {
  /** Injectable fetch for the create-time availability probe (tests). */
  fetchImpl?: typeof fetch
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > 100_000) throw new Error('body too large')
    chunks.push(chunk as Buffer)
  }
  if (chunks.length === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>
}

export async function handleWatchRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  deps: WatchRouteDeps = {},
): Promise<boolean> {
  const pathname = req.url?.split('?')[0] ?? ''
  const method = req.method ?? 'GET'

  const isWatchPath =
    pathname === '/api/watches' ||
    pathname.startsWith('/api/watches/') ||
    pathname === '/api/alerts' ||
    pathname === '/api/settings/contact'
  if (!isWatchPath) return false

  // Auth: signed-in user only (session cookie). Everything is scoped to them.
  const user = requireUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Sign in required.' })
    return true
  }
  const userId = user.uid
  const db = getDb()

  try {
    // ---- /api/watches ----
    if (pathname === '/api/watches') {
      if (method === 'GET') {
        const rows = db
          .select()
          .from(watches)
          .where(eq(watches.userId, userId))
          .orderBy(desc(watches.createdAt))
          .all()
        sendJson(res, 200, { watches: rows })
        return true
      }
      if (method === 'POST') {
        const body = await readBody(req)
        const platform = (body.platform as string) || 'recgov'
        let facilityId = (body.facilityId as string) || (body.campgroundId as string) || ''
        if (!facilityId && typeof body.recgovUrl === 'string') {
          facilityId = parseRecGovCampgroundId(body.recgovUrl) ?? ''
        }
        const campgroundName = (body.campgroundName as string) || ''
        const startDate = (body.startDate as string) || ''
        const endDate = (body.endDate as string) || ''

        if (platform !== 'recgov') {
          sendJson(res, 400, { error: 'Only platform "recgov" is supported in this phase.' })
          return true
        }
        if (!facilityId || !campgroundName || !DATE_RE.test(startDate) || !DATE_RE.test(endDate)) {
          sendJson(res, 400, {
            error:
              'Required: facilityId (or recgovUrl), campgroundName, startDate & endDate (YYYY-MM-DD).',
          })
          return true
        }
        if (endDate < startDate) {
          sendJson(res, 400, { error: 'endDate must be on or after startDate.' })
          return true
        }

        // Validate the campground actually has a Recreation.gov availability feed
        // before saving — otherwise the watch would 404 on every poll forever.
        const check = await checkCampgroundWatchable(facilityId, startDate.slice(0, 7), {
          fetchImpl: deps.fetchImpl,
        })
        if (check.reason === 'not_found') {
          sendJson(res, 400, {
            error:
              "This campground doesn't publish a Recreation.gov availability feed we can watch (got 404). It may be first-come/permit-only, or the link or ID is off.",
          })
          return true
        }
        // A transient probe error (5xx/network) falls through — fail open; the
        // poller will retry rather than block a valid campground on a blip.

        const id = randomUUID()
        db.insert(watches)
          .values({
            id,
            userId,
            platform,
            facilityId,
            campgroundName,
            startDate,
            endDate,
            minNights: Number(body.minNights) > 0 ? Number(body.minNights) : 1,
            siteFilters: body.siteFilters ? JSON.stringify(body.siteFilters) : null,
            status: 'active',
          })
          .run()
        const row = db.select().from(watches).where(eq(watches.id, id)).get()
        sendJson(res, 201, { watch: row })
        return true
      }
      res.setHeader('Allow', 'GET, POST')
      sendJson(res, 405, { error: 'Method not allowed.' })
      return true
    }

    // ---- /api/watches/:id (must belong to the user) ----
    if (pathname.startsWith('/api/watches/')) {
      const id = pathname.slice('/api/watches/'.length)
      const existing = db
        .select()
        .from(watches)
        .where(and(eq(watches.id, id), eq(watches.userId, userId)))
        .get()
      if (!existing) {
        sendJson(res, 404, { error: 'Watch not found.' })
        return true
      }
      if (method === 'DELETE') {
        db.delete(watches).where(eq(watches.id, id)).run()
        sendJson(res, 200, { ok: true })
        return true
      }
      if (method === 'PATCH') {
        const body = await readBody(req)
        const patch: Record<string, unknown> = {}
        if (typeof body.status === 'string' && ['active', 'paused'].includes(body.status)) {
          patch.status = body.status
        }
        if (Number(body.minNights) > 0) patch.minNights = Number(body.minNights)
        if (Object.keys(patch).length === 0) {
          sendJson(res, 400, { error: 'Nothing to update (status: active|paused, minNights).' })
          return true
        }
        db.update(watches).set(patch).where(eq(watches.id, id)).run()
        const row = db.select().from(watches).where(eq(watches.id, id)).get()
        sendJson(res, 200, { watch: row })
        return true
      }
      res.setHeader('Allow', 'PATCH, DELETE')
      sendJson(res, 405, { error: 'Method not allowed.' })
      return true
    }

    // ---- /api/alerts ----
    if (pathname === '/api/alerts') {
      const rows = db
        .select()
        .from(alertsSent)
        .where(eq(alertsSent.userId, userId))
        .orderBy(desc(alertsSent.sentAt))
        .limit(50)
        .all()
      sendJson(res, 200, { alerts: rows })
      return true
    }

    // ---- /api/settings/contact ----
    if (pathname === '/api/settings/contact') {
      if (method === 'GET') {
        const row = db.select().from(userSettings).where(eq(userSettings.userId, userId)).get()
        sendJson(res, 200, { settings: row ?? null })
        return true
      }
      if (method === 'PUT') {
        const body = await readBody(req)
        const values = {
          userId,
          phone: typeof body.phone === 'string' ? body.phone : null,
          email: typeof body.email === 'string' ? body.email : null,
          smsEnabled: body.smsEnabled !== false,
          emailEnabled: body.emailEnabled === true,
          updatedAt: new Date().toISOString(),
        }
        db.insert(userSettings)
          .values(values)
          .onConflictDoUpdate({ target: userSettings.userId, set: values })
          .run()
        const row = db.select().from(userSettings).where(eq(userSettings.userId, userId)).get()
        sendJson(res, 200, { settings: row })
        return true
      }
      res.setHeader('Allow', 'GET, PUT')
      sendJson(res, 405, { error: 'Method not allowed.' })
      return true
    }

    return false
  } catch (err) {
    if (err instanceof SyntaxError) {
      sendJson(res, 400, { error: 'Invalid JSON body.' })
      return true
    }
    sendJson(res, 500, { error: 'Watch route error.' })
    return true
  }
}
