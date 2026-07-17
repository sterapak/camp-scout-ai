/**
 * Campground media route: GET /api/campgrounds/:facilityId/photo — resolves an
 * official Recreation.gov photo (via RIDB) for a facility id. Session-gated so
 * the RIDB key stays behind the login wall; uses the lightweight jwt/cookies
 * check (not requireUser) to avoid pulling the db import graph. Returns true if
 * it handled the request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

import { parseCookies, SESSION_COOKIE } from '../auth/cookies.js'
import { verifySession } from '../auth/jwt.js'
import { fetchFacilityPhoto } from './ridbMedia.js'

const PHOTO_RE = /^\/api\/campgrounds\/(\d+)\/photo$/

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export async function handleCampgroundMediaRoutes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathname = req.url?.split('?')[0] ?? ''
  const match = PHOTO_RE.exec(pathname)
  if (!match) return false

  if ((req.method ?? 'GET') !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJson(res, 405, { error: 'Method not allowed.' })
    return true
  }

  // Behind the login wall (keeps our RIDB key from being farmed anonymously).
  if (!verifySession(parseCookies(req)[SESSION_COOKIE])) {
    sendJson(res, 401, { error: 'Sign in required.' })
    return true
  }

  const photo = await fetchFacilityPhoto(match[1])
  // Cache at the edge/browser: photos are static and the resolver is rate-limited.
  res.setHeader('Cache-Control', 'private, max-age=86400')
  sendJson(res, 200, { photo })
  return true
}
