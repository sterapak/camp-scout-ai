/**
 * Twilio SMS via the raw REST API (no SDK — this repo favors lean deps and we
 * need exactly one endpoint). Credentials come from env secrets set on the Fly
 * `campscout` app: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.
 */

export interface SendSmsResult {
  ok: boolean
  status?: number
  sid?: string
  error?: string
  /** Twilio's initial message state (e.g. 'queued', 'accepted') — NOT delivery. */
  messageStatus?: string
  errorCode?: number | null
}

export interface SendSmsDeps {
  fetchImpl?: typeof fetch
  accountSid?: string
  authToken?: string
  fromNumber?: string
}

export function twilioConfigured(deps: SendSmsDeps = {}): boolean {
  const sid = deps.accountSid ?? process.env.TWILIO_ACCOUNT_SID
  const token = deps.authToken ?? process.env.TWILIO_AUTH_TOKEN
  const from = deps.fromNumber ?? process.env.TWILIO_FROM_NUMBER
  return Boolean(sid && token && from)
}

/**
 * Normalize a phone number to E.164 (Twilio requires it). Assumes US (+1) for a
 * bare 10-digit number. Returns '' if there's nothing usable.
 */
export function toE164(raw: string): string {
  const trimmed = (raw ?? '').trim()
  if (trimmed.startsWith('+')) return `+${trimmed.slice(1).replace(/\D/g, '')}`
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return digits ? `+${digits}` : ''
}

export interface TwilioMessageStatus {
  sid: string
  to: string
  status: string
  errorCode: number | null
  errorMessage: string | null
  dateSent: string | null
}

/**
 * Fetch recent Twilio messages (optionally filtered to a recipient) with their
 * real delivery status + error code — the truth "sent" alone doesn't tell us.
 */
export async function listRecentMessages(
  opts: { to?: string; limit?: number } = {},
  deps: SendSmsDeps = {},
): Promise<{ ok: boolean; error?: string; messages: TwilioMessageStatus[] }> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const accountSid = deps.accountSid ?? process.env.TWILIO_ACCOUNT_SID
  const authToken = deps.authToken ?? process.env.TWILIO_AUTH_TOKEN
  if (!accountSid || !authToken) return { ok: false, error: 'Twilio not configured', messages: [] }

  const params = new URLSearchParams({ PageSize: String(opts.limit ?? 5) })
  if (opts.to) params.set('To', opts.to)
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?${params.toString()}`
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  try {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    const data = (await res.json().catch(() => ({}))) as {
      messages?: Array<{
        sid?: string
        to?: string
        status?: string
        error_code?: number | null
        error_message?: string | null
        date_sent?: string | null
      }>
      message?: string
    }
    if (!res.ok) return { ok: false, error: data.message || `HTTP ${res.status}`, messages: [] }
    const messages = (data.messages ?? []).map((m) => ({
      sid: m.sid ?? '',
      to: m.to ?? '',
      status: m.status ?? 'unknown',
      errorCode: m.error_code ?? null,
      errorMessage: m.error_message ?? null,
      dateSent: m.date_sent ?? null,
    }))
    return { ok: true, messages }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err), messages: [] }
  }
}

export async function sendSms(
  to: string,
  body: string,
  deps: SendSmsDeps = {},
): Promise<SendSmsResult> {
  const fetchImpl = deps.fetchImpl ?? globalThis.fetch
  const accountSid = deps.accountSid ?? process.env.TWILIO_ACCOUNT_SID
  const authToken = deps.authToken ?? process.env.TWILIO_AUTH_TOKEN
  const fromNumber = deps.fromNumber ?? process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: 'Twilio not configured (missing SID/token/from)' }
  }
  const toNumber = toE164(to)
  if (!toNumber) return { ok: false, error: 'missing recipient phone' }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const form = new URLSearchParams({ To: toNumber, From: fromNumber, Body: body })
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: form.toString(),
    })
    const data = (await res.json().catch(() => ({}))) as {
      sid?: string
      message?: string
      status?: string
      error_code?: number | null
    }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.message || `HTTP ${res.status}` }
    }
    return {
      ok: true,
      status: res.status,
      sid: data.sid,
      messageStatus: data.status,
      errorCode: data.error_code ?? null,
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
