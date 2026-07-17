/**
 * Polite JSON fetch for third-party availability APIs. Mirrors the ingestion
 * fetch pattern (custom UA, AbortController timeout, injectable fetchImpl for
 * tests). Per-request spacing/jitter/backoff is the scheduler's job (it owns the
 * per-platform serial queue); this just does one careful request.
 *
 * NOTE: these availability APIs are unofficial. We keep the footprint small and
 * identify with a descriptive User-Agent where the endpoint tolerates it. See
 * the scheduler for rate-limiting + backoff.
 */

const DEFAULT_TIMEOUT_MS = 20000

export interface PoliteFetchOptions {
  fetchImpl?: typeof fetch
  timeoutMs?: number
  userAgent?: string
  headers?: Record<string, string>
  method?: 'GET' | 'POST'
  body?: string
}

export interface PoliteJsonResult<T = unknown> {
  ok: boolean
  status?: number
  data?: T
  error?: string
}

export async function politeFetchJson<T = unknown>(
  url: string,
  options: PoliteFetchOptions = {},
): Promise<PoliteJsonResult<T>> {
  const {
    fetchImpl = globalThis.fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    userAgent,
    headers = {},
    method = 'GET',
    body,
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetchImpl(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body,
      redirect: 'follow',
      signal: controller.signal,
    })

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `HTTP ${response.status} ${response.statusText}`,
      }
    }

    const data = (await response.json()) as T
    return { ok: true, status: response.status, data }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  } finally {
    clearTimeout(timeoutId)
  }
}
