/**
 * Create-a-watch form. Reused by WatchesPage (owner types a Recreation.gov URL)
 * and the campground detail page (prefilled with that campground's name + URL,
 * URL hidden). Phase 1 supports Recreation.gov campgrounds only.
 */
import { useState, type FormEvent } from 'react'

import { createWatch, WatchApiError, type Watch } from '../api/watchClient.js'
import { parseRecGovCampgroundId } from '../utils/recgov.js'

interface WatchCreateFormProps {
  prefillName?: string
  /** When set, the campground is fixed (URL field hidden) — used on detail pages. */
  prefillUrl?: string
  onCreated?: (watch: Watch) => void
}

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function WatchCreateForm({
  prefillName,
  prefillUrl,
  onCreated,
}: WatchCreateFormProps) {
  const [name, setName] = useState(prefillName ?? '')
  const [url, setUrl] = useState(prefillUrl ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minNights, setMinNights] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fixedUrl = Boolean(prefillUrl)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    if (!name.trim()) return setError('Campground name is required.')
    if (!parseRecGovCampgroundId(url)) {
      return setError('Enter a valid recreation.gov campground URL (…/camping/campgrounds/<id>).')
    }
    if (!startDate || !endDate) return setError('Pick a start and end date.')
    if (endDate < startDate) return setError('End date must be on or after the start date.')

    setSubmitting(true)
    try {
      const watch = await createWatch({
        recgovUrl: url.trim(),
        campgroundName: name.trim(),
        startDate,
        endDate,
        minNights: Math.max(1, minNights),
      })
      if (!fixedUrl) {
        setName('')
        setUrl('')
      }
      setStartDate('')
      setEndDate('')
      setMinNights(1)
      onCreated?.(watch)
    } catch (err) {
      setError(err instanceof WatchApiError ? err.message : 'Could not create the watch.')
    } finally {
      setSubmitting(false)
    }
  }

  const label = 'block text-sm font-medium text-gray-700 mb-1'
  const input =
    'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={label} htmlFor="watch-name">Campground name</label>
        <input
          id="watch-name"
          className={input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Upper Pines (Yosemite)"
          readOnly={Boolean(prefillName) && fixedUrl}
        />
      </div>

      {!fixedUrl && (
        <div>
          <label className={label} htmlFor="watch-url">Recreation.gov campground URL</label>
          <input
            id="watch-url"
            className={input}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.recreation.gov/camping/campgrounds/232447"
          />
          <p className="mt-1 text-xs text-gray-500">
            Open the campground on recreation.gov and paste its URL. Recreation.gov only for now.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={label} htmlFor="watch-start">Arrive</label>
          <input
            id="watch-start"
            type="date"
            className={input}
            min={todayIso()}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className={label} htmlFor="watch-end">Depart</label>
          <input
            id="watch-end"
            type="date"
            className={input}
            min={startDate || todayIso()}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className={label} htmlFor="watch-nights">Minimum nights</label>
        <input
          id="watch-nights"
          type="number"
          min={1}
          className={`${input} max-w-24`}
          value={minNights}
          onChange={(e) => setMinNights(Number(e.target.value) || 1)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
      >
        {submitting ? 'Creating…' : 'Watch for cancellations'}
      </button>
    </form>
  )
}
