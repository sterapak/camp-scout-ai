/**
 * Google OAuth 2.0 (authorization-code flow) via raw fetch — no google-auth-
 * library (repo keeps deps lean). Needs GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
 * OAUTH_REDIRECT_URL. The id_token comes straight from Google's token endpoint
 * over TLS in response to our client-secret-authenticated request, so decoding
 * its claims (rather than re-verifying the signature) is safe here.
 */

export interface GoogleUser {
  sub: string
  email: string
  name?: string
  picture?: string
}

function env(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`${name} is not set`)
  return v
}

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'),
    redirect_uri: env('OAUTH_REDIRECT_URL'),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export function decodeIdToken(idToken: string): GoogleUser {
  const parts = idToken.split('.')
  if (parts.length !== 3) throw new Error('malformed id_token')
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    sub?: string
    email?: string
    name?: string
    picture?: string
  }
  if (!claims.sub || !claims.email) throw new Error('id_token missing sub/email')
  return { sub: claims.sub, email: claims.email, name: claims.name, picture: claims.picture }
}

export async function exchangeCodeForUser(
  code: string,
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<GoogleUser> {
  const res = await fetchImpl(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: env('GOOGLE_CLIENT_ID'),
      client_secret: env('GOOGLE_CLIENT_SECRET'),
      redirect_uri: env('OAUTH_REDIRECT_URL'),
      grant_type: 'authorization_code',
    }).toString(),
  })
  if (!res.ok) {
    throw new Error(`Google token exchange failed: HTTP ${res.status}`)
  }
  const data = (await res.json()) as { id_token?: string }
  if (!data.id_token) throw new Error('Google token response missing id_token')
  return decodeIdToken(data.id_token)
}
