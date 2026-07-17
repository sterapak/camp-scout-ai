/**
 * Resolves the Camp Scout API token for browser requests to protected routes.
 * Populated at runtime by /camp-scout-runtime.js.
 */
export function resolveApiToken(): string | null {
  if (typeof window !== 'undefined') {
    const runtimeToken = window.__CAMP_SCOUT_RUNTIME__?.apiToken
    if (typeof runtimeToken === 'string' && runtimeToken.trim().length > 0) {
      return runtimeToken.trim()
    }
  }

  return null
}

/**
 * True only when a backend API is reachable — i.e. the runtime token was
 * injected by the server (Fly). On the static GitHub Pages build there is no
 * server, so this is false and all API-backed features (Watches) hide.
 */
export function isApiAvailable(): boolean {
  return resolveApiToken() !== null
}

/**
 * The signed-in user, injected by the server into the runtime config. Null when
 * logged out, or on the static build (no server → no runtime config at all).
 */
export function resolveRuntimeUser(): CampScoutRuntimeUser | null {
  if (typeof window !== 'undefined') {
    const user = window.__CAMP_SCOUT_RUNTIME__?.user
    if (user && typeof user.email === 'string' && user.email.length > 0) {
      return user
    }
  }
  return null
}

/** True when the runtime config was served at all (i.e. a backend is present). */
export function hasRuntimeConfig(): boolean {
  return typeof window !== 'undefined' && window.__CAMP_SCOUT_RUNTIME__ != null
}

export function buildApiRequestHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  const token = resolveApiToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
