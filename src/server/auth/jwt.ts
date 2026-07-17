/**
 * Minimal HS256 JWT for stateless session cookies — hand-rolled on node:crypto
 * (the repo avoids SDKs/deps; Twilio + Stripe are the only externals, Twilio via
 * raw REST). Signed with SESSION_SECRET. Payload carries the user identity so
 * auth needs no DB lookup. Rotating SESSION_SECRET invalidates all sessions
 * (the revocation kill-switch, since JWTs can't be revoked individually).
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionUser {
  uid: string
  email: string
  name?: string | null
  picture?: string | null
}
interface SignedPayload extends SessionUser {
  exp: number // unix seconds
}

export const SESSION_TTL_SECONDS = 14 * 24 * 60 * 60 // 14 days

function getSecret(): string {
  const s = process.env.SESSION_SECRET
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short (need >= 16 chars)')
  }
  return s
}

function b64url(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function hmac(data: string): string {
  return createHmac('sha256', getSecret()).update(data).digest('base64url')
}

export function signSession(user: SessionUser, ttlSeconds: number = SESSION_TTL_SECONDS): string {
  const payload: SignedPayload = { ...user, exp: Math.floor(Date.now() / 1000) + ttlSeconds }
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify(payload))
  const sig = hmac(`${header}.${body}`)
  return `${header}.${body}.${sig}`
}

/** Verify signature + expiry. Returns the payload or null (never throws). */
export function verifySession(token: string | null | undefined): SignedPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [header, body, sig] = parts

  let expected: string
  try {
    expected = hmac(`${header}.${body}`)
  } catch {
    return null // secret missing
  }
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SignedPayload
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!payload.uid || !payload.email) return null
    return payload
  } catch {
    return null
  }
}
