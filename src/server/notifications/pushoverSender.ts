/**
 * Pushover push notifications — instant alerts to your phone with no carrier,
 * no A2P registration, no email. Raw fetch (lean deps). Needs two values from
 * pushover.net: PUSHOVER_APP_TOKEN (your application/API token) and
 * PUSHOVER_USER_KEY (your user key). Degrades gracefully: not set -> inert.
 *
 * NOTE: currently a single recipient (the configured user key). Fine for a
 * single-user deployment; per-user keys would move USER_KEY into user_settings.
 */

export interface SendPushoverDeps {
  fetchImpl?: typeof fetch
  appToken?: string
  userKey?: string
}

export interface SendPushoverResult {
  ok: boolean
  status?: number
  error?: string
}

export function pushoverConfigured(deps: SendPushoverDeps = {}): boolean {
  const token = deps.appToken ?? process.env.PUSHOVER_APP_TOKEN
  const user = deps.userKey ?? process.env.PUSHOVER_USER_KEY
  return Boolean(token && user)
}

export async function sendPushover(
  message: string,
  opts: { title?: string; url?: string; urlTitle?: string } = {},
  deps: SendPushoverDeps = {},
): Promise<SendPushoverResult> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const token = deps.appToken ?? process.env.PUSHOVER_APP_TOKEN
  const user = deps.userKey ?? process.env.PUSHOVER_USER_KEY

  if (!token || !user) return { ok: false, error: 'Pushover not configured (need app token + user key)' }
  if (!message) return { ok: false, error: 'missing message' }

  const form = new URLSearchParams({ token, user, message })
  if (opts.title) form.set('title', opts.title)
  if (opts.url) form.set('url', opts.url)
  if (opts.urlTitle) form.set('url_title', opts.urlTitle)

  try {
    const res = await fetchImpl('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: form.toString(),
    })
    const data = (await res.json().catch(() => ({}))) as { status?: number; errors?: string[] }
    if (!res.ok || data.status !== 1) {
      return { ok: false, status: res.status, error: data.errors?.join(', ') || `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
