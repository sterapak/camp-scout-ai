/**
 * Watches page: create + manage campground cancellation watches and see recent
 * alerts. Backed by /api/watches, /api/alerts. Hidden on the static build (no API).
 */
import { useCallback, useEffect, useState } from 'react'

import { isApiAvailable } from '../api/apiAuth.js'
import {
  deleteWatch,
  listAlerts,
  listWatches,
  updateWatch,
  WatchApiError,
  type Alert,
  type Watch,
} from '../api/watchClient.js'
import WatchCreateForm from '../components/WatchCreateForm.js'

const card = 'rounded-lg border border-gray-200 bg-white p-6 shadow-sm'

function StatusBadge({ status }: { status: Watch['status'] }) {
  const styles: Record<Watch['status'], string> = {
    active: 'bg-green-100 text-green-800',
    paused: 'bg-gray-100 text-gray-700',
    expired: 'bg-amber-100 text-amber-800',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  )
}

export default function WatchesPage() {
  const [watches, setWatches] = useState<Watch[] | null>(null)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const apiAvailable = isApiAvailable()

  const load = useCallback(async () => {
    setError(null)
    try {
      const [w, a] = await Promise.all([listWatches(), listAlerts()])
      setWatches(w)
      setAlerts(a)
    } catch (err) {
      setError(err instanceof WatchApiError ? err.message : 'Could not load watches.')
      setWatches([])
    }
  }, [])

  useEffect(() => {
    if (apiAvailable) void load()
  }, [apiAvailable, load])

  async function togglePause(watch: Watch) {
    setActionError(null)
    try {
      await updateWatch(watch.id, { status: watch.status === 'active' ? 'paused' : 'active' })
      await load()
    } catch (err) {
      setActionError(err instanceof WatchApiError ? err.message : 'Update failed.')
    }
  }

  async function remove(watch: Watch) {
    setActionError(null)
    try {
      await deleteWatch(watch.id)
      await load()
    } catch (err) {
      setActionError(err instanceof WatchApiError ? err.message : 'Delete failed.')
    }
  }

  if (!apiAvailable) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900">Watches</h2>
        <div className={`${card} text-gray-600`}>
          Cancellation watches with SMS alerts are only available on the hosted app at{' '}
          <a className="text-green-700 underline" href="https://campscout.terapak.com/watches">
            campscout.terapak.com
          </a>
          .
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Watches</h2>
        <p className="text-gray-600">
          Get an SMS the moment a fully-booked campground has a cancellation. Set your phone in{' '}
          <a className="text-green-700 underline" href="/settings">Settings</a> first.
        </p>
      </div>

      <section className={card}>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Watch a campground</h3>
        <WatchCreateForm onCreated={() => void load()} />
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Your watches</h3>
        {actionError && <p className="text-sm text-red-600">{actionError}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        {watches === null && <p className="text-gray-500">Loading…</p>}
        {watches?.length === 0 && !error && (
          <div className={`${card} text-gray-600`}>No watches yet. Add one above.</div>
        )}
        {watches?.map((w) => (
          <div key={w.id} className={`${card} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{w.campgroundName}</span>
                <StatusBadge status={w.status} />
              </div>
              <div className="text-sm text-gray-600">
                {w.startDate} → {w.endDate}
                {w.minNights > 1 ? ` · ${w.minNights}+ nights` : ''}
              </div>
              <div className="text-xs text-gray-400">
                {w.lastPolledAt
                  ? `Last checked ${new Date(w.lastPolledAt).toLocaleString()} · ${w.lastPollStatus ?? ''}`
                  : 'Not checked yet'}
              </div>
            </div>
            <div className="flex gap-2">
              {w.status !== 'expired' && (
                <button
                  onClick={() => void togglePause(w)}
                  className="rounded-md border border-green-700 px-3 py-1.5 text-sm text-green-700 hover:bg-green-50"
                >
                  {w.status === 'active' ? 'Pause' : 'Resume'}
                </button>
              )}
              <button
                onClick={() => void remove(w)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900">Recent alerts</h3>
        {alerts.length === 0 ? (
          <div className={`${card} text-gray-600`}>No alerts sent yet.</div>
        ) : (
          <div className={`${card} divide-y divide-gray-100`}>
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="text-sm">
                  <div className="text-gray-900">
                    Site {a.siteName ?? a.siteId} · {a.date}
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(a.sentAt).toLocaleString()} · {a.channel} · {a.deliveryStatus}
                  </div>
                </div>
                {a.deepLink && (
                  <a
                    href={a.deepLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-green-700 px-3 py-1.5 text-sm text-white hover:bg-green-800"
                  >
                    Book
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
