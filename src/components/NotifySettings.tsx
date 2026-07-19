/**
 * Notify settings: where cancellation alerts are sent. Single-user (one
 * owner_settings row) backed by /api/settings/contact. Rendered in SettingsPage
 * only when the API is available.
 */
import { useEffect, useState } from 'react'

import {
  getContactSettings,
  updateContactSettings,
  WatchApiError,
} from '../api/watchClient.js'

export default function NotifySettings() {
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [smsEnabled, setSmsEnabled] = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'saving'>('loading')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  async function sendTestPush() {
    setTestResult(null)
    setTesting(true)
    try {
      const res = await fetch('/api/pushover/test', { method: 'POST', credentials: 'same-origin' })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      setTestResult(
        data.ok
          ? 'Sent — check your phone for the push notification. 🏕'
          : `Not sent: ${data.error ?? 'Pushover not set up yet.'}`,
      )
    } catch {
      setTestResult('Could not reach the server.')
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    getContactSettings()
      .then((s) => {
        if (cancelled) return
        if (s) {
          setPhone(s.phone ?? '')
          setEmail(s.email ?? '')
          setSmsEnabled(s.smsEnabled)
          setEmailEnabled(s.emailEnabled)
        }
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setMessage(null)
    setError(null)
    setStatus('saving')
    try {
      await updateContactSettings({
        phone: phone.trim() || null,
        email: email.trim() || null,
        smsEnabled,
        emailEnabled,
      })
      setMessage('Saved.')
    } catch (err) {
      setError(err instanceof WatchApiError ? err.message : 'Could not save.')
    } finally {
      setStatus('ready')
    }
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'
  const input =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Alert notifications</h3>
        <p className="text-sm text-gray-600">
          Cancellation alerts arrive as an instant push (via the Pushover app) and by email.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="notify-phone">Mobile number (SMS)</label>
        <input
          id="notify-phone"
          className={input}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+15551234567"
        />
        <p className="mt-1 text-xs text-gray-500">
          SMS is currently unavailable (carrier registration). Alerts go via push and email below.
        </p>
      </div>

      <div>
        <label className={label} htmlFor="notify-email">Email (optional)</label>
        <input
          id="notify-email"
          className={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={smsEnabled} onChange={(e) => setSmsEnabled(e.target.checked)} />
          Send SMS alerts <span className="text-xs text-gray-400">(currently unavailable)</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} />
          Send email alerts <span className="text-xs text-green-700">(reliable — no carrier setup)</span>
        </label>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={status === 'saving' || status === 'loading'}
          className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => void sendTestPush()}
          disabled={testing}
          className="rounded-md border border-green-700 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-50 disabled:opacity-60"
        >
          {testing ? 'Sending…' : 'Send test push'}
        </button>
      </div>
      {testResult && <p className="text-sm text-gray-600">{testResult}</p>}
    </section>
  )
}
