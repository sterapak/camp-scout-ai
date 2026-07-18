/**
 * Email alerts via Resend's REST API (raw fetch — lean deps). No A2P/carrier
 * registration nightmare like SMS: email just works. Needs RESEND_API_KEY;
 * EMAIL_FROM defaults to Resend's onboarding sender, which can deliver to your
 * own account email with no domain setup (fine for personal use). Degrades
 * gracefully: no key -> inert.
 */

export interface SendEmailDeps {
  fetchImpl?: typeof fetch
  apiKey?: string
  from?: string
}

export interface SendEmailResult {
  ok: boolean
  id?: string
  status?: number
  error?: string
}

const DEFAULT_FROM = 'Camp Scout AI <onboarding@resend.dev>'

export function emailConfigured(deps: SendEmailDeps = {}): boolean {
  return Boolean(deps.apiKey ?? process.env.RESEND_API_KEY)
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  deps: SendEmailDeps = {},
): Promise<SendEmailResult> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const apiKey = deps.apiKey ?? process.env.RESEND_API_KEY
  const from = deps.from ?? process.env.EMAIL_FROM ?? DEFAULT_FROM

  if (!apiKey) return { ok: false, error: 'Email not configured (missing RESEND_API_KEY)' }
  if (!to) return { ok: false, error: 'missing recipient email' }

  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ from, to, subject, text }),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.message || `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status, id: data.id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
