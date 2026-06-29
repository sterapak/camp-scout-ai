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
