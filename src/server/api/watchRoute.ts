/**
 * Availability-watch API routes (single-user; protected by the same
 * CAMP_SCOUT_API_TOKEN as the rest of the API). Composed into the main
 * middleware in askRoute.ts. Returns true if it handled the request.
 *
 *   GET    /api/watches            list watches
 *   POST   /api/watches            create a watch
 *   PATCH  /api/watches/:id        update (e.g. { status: 'paused' })
 *   DELETE /api/watches/:id        delete
 *   GET    /api/alerts             recent alerts
 *   GET    /api/settings/contact   owner phone/email/channel prefs
 *   PUT    /api/settings/contact   update owner contact
 */
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import { desc, eq } from 'drizzle-orm'

import { getDb } from '../db/index.js'
import { alertsSent, ownerSettings, watches } from '../db/schema.js'
import { parseRecGovCampgroundId } from '../availability/recGovAdapter.js'
import {
  validateApiAccess,
  type ApiAccessFailure,
} from './apiProtection.js'

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
): Promise<boolean> {
  const pathname = req.url?.split('?')[0] ?? ''
  const method = req.method ?? 'GET'

  const isWatchPath =
    pathname === '/api/watches' ||
    pathname.startsWith('/api/watches/') ||
    pathname === '/api/alerts' ||
    pathname === '/api/settings/contact'
  if (!isWatchPath) return false

  // Auth: same token as the rest of the API.
  const access = validateApiAccess(req)
  if (!access.ok) {
    const failure = access as ApiAccessFailure
    sendJson(res, failure.statusCode, failure.body)
    return true
  }

  const db = getDb() // opened lazily, only for watch routes

  try {
    // ---- /api/watches ----
    if (pathname === '/api/watches') {
      if (method === 'GET') {
        const rows = db.select().from(watches).orderBy(desc(watches.createdAt)).all()
        sendJson(res, 200, { watches: rows })
        return true
      }
      if (method === 'POST') {
        const body = await readBody(req)
        const platform = (body.platform as string) || 'recgov'
        let facilityId = (body.facilityId as string) || (body.campgroundId as string) || ''
        // Convenience: accept a recreation.gov campground URL and parse the id.
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

        const id = randomUUID()
        db.insert(watches)
          .values({
            id,
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

    // ---- /api/watches/:id ----
    if (pathname.startsWith('/api/watches/')) {
      const id = pathname.slice('/api/watches/'.length)
      const existing = db.select().from(watches).where(eq(watches.id, id)).get()
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
      const rows = db.select().from(alertsSent).orderBy(desc(alertsSent.sentAt)).limit(50).all()
      sendJson(res, 200, { alerts: rows })
      return true
    }

    // ---- /api/settings/contact ----
    if (pathname === '/api/settings/contact') {
      if (method === 'GET') {
        const row = db.select().from(ownerSettings).where(eq(ownerSettings.id, 1)).get()
        sendJson(res, 200, { settings: row ?? null })
        return true
      }
      if (method === 'PUT') {
        const body = await readBody(req)
        const values = {
          id: 1 as const,
          phone: typeof body.phone === 'string' ? body.phone : null,
          email: typeof body.email === 'string' ? body.email : null,
          smsEnabled: body.smsEnabled !== false,
          emailEnabled: body.emailEnabled === true,
          updatedAt: new Date().toISOString(),
        }
        db.insert(ownerSettings)
          .values(values)
          .onConflictDoUpdate({ target: ownerSettings.id, set: values })
          .run()
        const row = db.select().from(ownerSettings).where(eq(ownerSettings.id, 1)).get()
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
