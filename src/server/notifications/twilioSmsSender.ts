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
  if (!to) return { ok: false, error: 'missing recipient phone' }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const form = new URLSearchParams({ To: to, From: fromNumber, Body: body })
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
    const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string }
    if (!res.ok) {
      return { ok: false, status: res.status, error: data.message || `HTTP ${res.status}` }
    }
    return { ok: true, status: res.status, sid: data.sid }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
