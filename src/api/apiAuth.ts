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
