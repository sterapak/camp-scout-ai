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
import { fetchFacilityCoords, fetchStateCampgrounds } from './ridbFacilities.js'
import { geocodeZip } from './geocodeZip.js'
import { getConditions } from './campgroundWeather.js'

const PHOTO_RE = /^\/api\/campgrounds\/(\d+)\/photo$/
const RECGOV_LIST_PATH = '/api/campgrounds/recgov'
const GEOCODE_PATH = '/api/geocode/zip'
const WEATHER_PATH = '/api/weather'
const STATE_RE = /^[A-Za-z]{2}$/

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export async function handleCampgroundMediaRoutes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathname = req.url?.split('?')[0] ?? ''
  const photoMatch = PHOTO_RE.exec(pathname)
  const isList = pathname === RECGOV_LIST_PATH
  const isGeocode = pathname === GEOCODE_PATH
  const isWeather = pathname === WEATHER_PATH
  if (!photoMatch && !isList && !isGeocode && !isWeather) return false

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

  // Weather / climate for a campground + date (forecast or typical).
  if (isWeather) {
    const params = new URL(req.url ?? '', 'http://localhost').searchParams
    const date = params.get('date') ?? ''
    const latParam = params.get('lat')
    const lngParam = params.get('lng')
    // NB: absent params must be NaN, not Number(null)===0 (that's lat/lng 0,0).
    let lat = latParam ? Number(latParam) : NaN
    let lng = lngParam ? Number(lngParam) : NaN
    const facilityId = params.get('facilityId') ?? ''
    if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && /^\d+$/.test(facilityId)) {
      const cg = (await fetchStateCampgrounds('CA')).find((c) => c.id === facilityId)
      if (cg && cg.latitude != null && cg.longitude != null) {
        lat = cg.latitude
        lng = cg.longitude
      } else {
        // Not in the imported list (e.g. curated campgrounds) — resolve directly.
        const co = await fetchFacilityCoords(facilityId)
        if (co) {
          lat = co.lat
          lng = co.lng
        }
      }
    }
    const conditions =
      Number.isFinite(lat) && Number.isFinite(lng) ? await getConditions(lat, lng, date) : null
    res.setHeader('Cache-Control', 'private, max-age=21600')
    sendJson(res, 200, { conditions })
    return true
  }

  // Geocode a US ZIP -> coordinates (for the distance filter).
  if (isGeocode) {
    const zip = new URL(req.url ?? '', 'http://localhost').searchParams.get('zip') ?? ''
    const loc = await geocodeZip(zip)
    res.setHeader('Cache-Control', 'private, max-age=86400')
    sendJson(res, 200, { location: loc })
    return true
  }

  // Imported Recreation.gov campgrounds for a state (default CA).
  if (isList) {
    const stateParam = new URL(req.url ?? '', 'http://localhost').searchParams.get('state')
    const state = stateParam && STATE_RE.test(stateParam) ? stateParam.toUpperCase() : 'CA'
    const campgrounds = await fetchStateCampgrounds(state)
    res.setHeader('Cache-Control', 'private, max-age=86400')
    sendJson(res, 200, { campgrounds })
    return true
  }

  const photo = await fetchFacilityPhoto(photoMatch![1])
  // Cache at the edge/browser: photos are static and the resolver is rate-limited.
  res.setHeader('Cache-Control', 'private, max-age=86400')
  sendJson(res, 200, { photo })
  return true
}
