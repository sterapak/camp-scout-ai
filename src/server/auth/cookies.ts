/**
 * Cookie helpers (raw — no cookie lib; the server is plain node:http). Session +
 * OAuth-state cookies are HttpOnly, Secure, SameSite=Lax.
 */
import type { IncomingMessage } from 'node:http'

export const SESSION_COOKIE = 'cs_session'
export const OAUTH_STATE_COOKIE = 'cs_oauth_state'

export function parseCookies(req: IncomingMessage): Record<string, string> {
  const header = req.headers.cookie
  if (!header) return {}
  const out: Record<string, string> = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const name = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (name) {
      try {
        out[name] = decodeURIComponent(value)
      } catch {
        out[name] = value
      }
    }
  }
  return out
}

export interface CookieOptions {
  maxAgeSeconds?: number
  sameSite?: 'Lax' | 'Strict' | 'None'
  path?: string
  secure?: boolean
  httpOnly?: boolean
}

export function serializeCookie(name: string, value: string, opts: CookieOptions = {}): string {
  const parts = [`${name}=${encodeURIComponent(value)}`]
  parts.push(`Path=${opts.path ?? '/'}`)
  if (opts.maxAgeSeconds != null) parts.push(`Max-Age=${opts.maxAgeSeconds}`)
  if (opts.httpOnly !== false) parts.push('HttpOnly')
  if (opts.secure !== false) parts.push('Secure')
  parts.push(`SameSite=${opts.sameSite ?? 'Lax'}`)
  return parts.join('; ')
}

/** A Set-Cookie value that immediately expires the named cookie. */
export function clearCookie(name: string): string {
  return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`
}
