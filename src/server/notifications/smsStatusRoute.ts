/**
 * Session-gated SMS diagnostics for the signed-in user:
 *   GET  /api/sms/status  — recent Twilio messages to the user's number with
 *                           their REAL delivery status + error code (e.g. 30034).
 *   POST /api/sms/test    — send ONE test SMS to the user's own number to verify
 *                           delivery on demand (bypasses the watcher kill-switch;
 *                           always their own number only).
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

import { eq } from 'drizzle-orm'

import { getDb } from '../db/index.js'
import { userSettings } from '../db/schema.js'
import { requireUser } from '../auth/authRoutes.js'
import { listRecentMessages, sendSms, toE164, twilioConfigured } from './twilioSmsSender.js'
import { emailConfigured, sendEmail } from './emailSender.js'
import { pushoverConfigured, sendPushover } from './pushoverSender.js'

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(body))
}

export async function handleSmsStatusRoute(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const path = req.url?.split('?')[0] ?? ''
  const isStatus = path === '/api/sms/status'
  const isTest = path === '/api/sms/test'
  const isEmailTest = path === '/api/email/test'
  const isPushTest = path === '/api/pushover/test'
  if (!isStatus && !isTest && !isEmailTest && !isPushTest) return false

  const method = req.method ?? 'GET'
  const wantsPost = isTest || isEmailTest || isPushTest
  if ((isStatus && method !== 'GET') || (wantsPost && method !== 'POST')) {
    res.setHeader('Allow', isStatus ? 'GET' : 'POST')
    sendJson(res, 405, { error: 'Method not allowed.' })
    return true
  }

  const user = requireUser(req)
  if (!user) {
    sendJson(res, 401, { error: 'Sign in required.' })
    return true
  }

  // POST /api/pushover/test — send a test push notification.
  if (isPushTest) {
    if (!pushoverConfigured()) {
      sendJson(res, 200, { ok: false, error: 'Pushover not configured (set PUSHOVER_APP_TOKEN + PUSHOVER_USER_KEY).' })
      return true
    }
    const result = await sendPushover('Your Camp Scout cancellation alerts are working. 🏕', {
      title: '🏕 Camp Scout AI test',
    })
    sendJson(res, 200, { ok: result.ok, error: result.error ?? null })
    return true
  }

  const settings = getDb().select().from(userSettings).where(eq(userSettings.userId, user.uid)).get()

  // POST /api/email/test — send a single test email to the user's own address.
  if (isEmailTest) {
    const email = settings?.email?.trim() ?? ''
    if (!emailConfigured()) {
      sendJson(res, 200, { ok: false, error: 'Email not configured (set RESEND_API_KEY).' })
      return true
    }
    if (!email) {
      sendJson(res, 200, { ok: false, error: 'Set your email in Settings first.' })
      return true
    }
    const result = await sendEmail(
      email,
      '🏕 Camp Scout AI test',
      'Your Camp Scout cancellation alerts are working. This is a test email.',
    )
    sendJson(res, 200, { ok: result.ok, to: email, id: result.id ?? null, error: result.error ?? null })
    return true
  }

  const phone = toE164(settings?.phone ?? '')
  const configured = twilioConfigured()

  // POST /api/sms/test — send a single message to the user's own number.
  if (isTest) {
    if (!configured) {
      sendJson(res, 200, { ok: false, error: 'Twilio not configured.' })
      return true
    }
    if (!phone) {
      sendJson(res, 200, { ok: false, error: 'Set your phone in Settings first.' })
      return true
    }
    const result = await sendSms(
      phone,
      'Camp Scout AI test — your SMS alerts are working. 🏕',
    )
    sendJson(res, 200, {
      ok: result.ok,
      to: phone,
      sid: result.sid ?? null,
      messageStatus: result.messageStatus ?? null,
      error: result.error ?? null,
    })
    return true
  }

  // GET /api/sms/status
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
