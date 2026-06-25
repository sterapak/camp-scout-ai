const DEFAULT_USER_AGENT = 'CampScoutIngestion/1.0 (+https://github.com/camp-scout-ai)'
const DEFAULT_TIMEOUT_MS = 30000

/**
 * @typedef {Object} FetchSourceResult
 * @property {boolean} ok
 * @property {number} [status]
 * @property {string} [html]
 * @property {string} [error]
 */

/**
 * Fetches HTML content from an official source URL.
 * @param {string} sourceUrl
 * @param {{ fetchImpl?: typeof fetch, timeoutMs?: number, userAgent?: string }} [options]
 * @returns {Promise<FetchSourceResult>}
 */
export async function fetchSource(sourceUrl, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const userAgent = options.userAgent ?? DEFAULT_USER_AGENT

  let parsedUrl

  try {
    parsedUrl = new URL(sourceUrl)
  } catch {
    return {
      ok: false,
      error: `Invalid source URL "${sourceUrl}": URL must include a valid protocol and hostname.`,
    }
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return {
      ok: false,
      error: `Invalid source URL "${sourceUrl}": only HTTP and HTTPS URLs are supported.`,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(sourceUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': userAgent,
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Failed to fetch "${sourceUrl}": HTTP ${response.status} ${response.statusText}.`,
      }
    }

    const html = await response.text()

    if (!html || html.trim().length === 0) {
      return {
        ok: false,
        status: response.status,
        error: `Failed to fetch "${sourceUrl}": response body was empty.`,
      }
    }

    return {
      ok: true,
      status: response.status,
      html,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        ok: false,
        error: `Failed to fetch "${sourceUrl}": request timed out after ${timeoutMs}ms.`,
      }
    }

    const message = error instanceof Error ? error.message : String(error)

    return {
      ok: false,
      error: `Failed to fetch "${sourceUrl}": ${message}`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
