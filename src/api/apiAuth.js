/**
 * Resolves the Camp Scout API token for browser requests to protected routes.
 * Populated at runtime by /camp-scout-runtime.js; VITE_CAMP_SCOUT_API_TOKEN is a dev fallback.
 * @returns {string | null}
 */
export function resolveApiToken() {
  if (typeof window !== 'undefined') {
    const runtimeToken = window.__CAMP_SCOUT_RUNTIME__?.apiToken
    if (typeof runtimeToken === 'string' && runtimeToken.trim().length > 0) {
      return runtimeToken.trim()
    }
  }

  return null
}

/**
 * @param {Record<string, string>} [extraHeaders]
 * @returns {Record<string, string>}
 */
export function buildApiRequestHeaders(extraHeaders = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  }

  const token = resolveApiToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
