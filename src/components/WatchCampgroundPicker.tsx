/**
 * Searchable campground picker for creating a watch. Merges the hand-curated
 * watchable campgrounds with the full state Recreation.gov set imported from
 * RIDB (300+), deduped by facility id. Type to filter; pick one and only the
 * dates remain. A "paste a link" escape hatch covers anything not in the list.
 */
import { useEffect, useMemo, useState } from 'react'

import { getAllCampgrounds } from '../data/campgroundData.js'
import { isWatchable, parseRecGovCampgroundId } from '../utils/recgov.js'
import { fetchRecgovCampgrounds } from '../api/campgroundMediaClient.js'
import WatchCreateForm from './WatchCreateForm.js'
import type { Watch } from '../api/watchClient.js'

interface Option {
  id: string
  name: string
  region: string
  reservationUrl: string
}

const MAX_RESULTS = 30

interface CuratedCampground {
  name: string
  region: string
  reservationUrl: string
}

function curatedOptions(): Option[] {
  return (getAllCampgrounds() as CuratedCampground[])
    .filter((c) => isWatchable(c.reservationUrl))
    .map((c) => ({
      id: parseRecGovCampgroundId(c.reservationUrl) ?? '',
      name: c.name,
      region: c.region,
      reservationUrl: c.reservationUrl,
    }))
    .filter((o) => o.id)
}

export default function WatchCampgroundPicker({ onCreated }: { onCreated: (watch: Watch) => void }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Option | null>(null)
  const [showOther, setShowOther] = useState(false)
  const [imported, setImported] = useState<Option[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchRecgovCampgrounds('CA').then((list) => {
      if (cancelled) return
      setImported(list.map((c) => ({ id: c.id, name: c.name, region: c.region, reservationUrl: c.reservationUrl })))
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Curated names win over the RAW RIDB names on collisions.
  const options = useMemo(() => {
    const byId = new Map<string, Option>()
    for (const o of [...curatedOptions(), ...imported]) {
      if (o.id && !byId.has(o.id)) byId.set(o.id, o)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [imported])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const hits = options.filter(
      (o) => o.name.toLowerCase().includes(q) || o.region.toLowerCase().includes(q),
    )
    return { total: hits.length, shown: hits.slice(0, MAX_RESULTS) }
  }, [query, options])

  const input =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

  if (selected) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-md border border-green-200 bg-green-50 px-3 py-2">
          <div className="text-sm">
            <span className="font-medium text-gray-900">{selected.name}</span>
            <span className="ml-2 text-gray-500">{selected.region}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="text-sm text-green-700 underline hover:text-green-900"
          >
            Change
          </button>
        </div>
        <WatchCreateForm
          key={selected.id}
          prefillName={selected.name}
          prefillUrl={selected.reservationUrl}
          onCreated={(watch) => {
            setSelected(null)
            setQuery('')
            onCreated(watch)
          }}
        />
      </div>
    )
  }

  if (showOther) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShowOther(false)}
          className="text-sm text-green-700 underline hover:text-green-900"
        >
          ← Back to search
        </button>
        <WatchCreateForm
          onCreated={(watch) => {
            setShowOther(false)
            onCreated(watch)
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="watch-search">
        Campground
      </label>
      <input
        id="watch-search"
        className={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={
          loading ? 'Loading campgrounds…' : `Search ${options.length}+ Recreation.gov campgrounds…`
        }
        autoComplete="off"
      />

      {matches && (
        <div className="max-h-72 overflow-y-auto rounded-md border border-gray-200">
          {matches.shown.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">
              No matches.{' '}
              <button
                type="button"
                onClick={() => setShowOther(true)}
                className="text-green-700 underline"
              >
                Paste a Recreation.gov link
              </button>
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {matches.shown.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(o)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-green-50"
                  >
                    <span className="font-medium text-gray-900">{o.name}</span>
                    <span className="shrink-0 text-xs text-gray-500">{o.region}</span>
                  </button>
                </li>
              ))}
              {matches.total > matches.shown.length && (
                <li className="px-3 py-2 text-xs text-gray-400">
                  +{matches.total - matches.shown.length} more — keep typing to narrow
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Recreation.gov campgrounds statewide.{' '}
        <button type="button" onClick={() => setShowOther(true)} className="text-green-700 underline">
          Not listed? Paste a link
        </button>
      </p>
    </div>
  )
}
