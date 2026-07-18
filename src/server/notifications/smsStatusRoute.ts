/**
 * GET /api/sms/status — session-gated diagnostic. Looks up the signed-in user's
 * phone, asks Twilio for the recent messages sent to it, and returns their REAL
 * delivery status + error code (e.g. 30034 = unregistered A2P 10DLC). This is
 * what tells us why a message that our log calls "sent" never arrived.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

import { eq } from 'drizzle-orm'

import { getDb } from '../db/index.js'
import { userSettings } from '../db/schema.js'
import { requireUser } from '../auth/authRoutes.js'
import { listRecentMessages, toE164, twilioConfigured } from './twilioSmsSender.js'

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export async function handleSmsStatusRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  if ((req.url?.split('?')[0] ?? '') !== '/api/sms/status') return false
  if ((req.method ?? 'GET') !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJson(res, 405, { error: 'Method not allowed.' })
    return true
  }

  const user = requireUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Sign in required.' })
    return true
  }

  const settings = getDb().select().from(userSettings).where(eq(userSettings.userId, user.uid)).get()
  const phone = toE164(settings?.phone ?? '')
  const configured = twilioConfigured()

  if (!configured) {
    sendJson(res, 200, { configured: false, phone: phone || null, messages: [] })
    return true
  }
  if (!phone) {
    sendJson(res, 200, { configured: true, phone: null, error: 'No phone on file.', messages: [] })
    return true
  }

  const limitParam = Number(new URL(req.url ?? '', 'http://localhost').searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 100) : 5
  const result = await listRecentMessages({ to: phone, limit })
  sendJson(res, 200, { configured: true, phone, ...result })
  return true
}
