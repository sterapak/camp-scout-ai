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

const DAY_LABELS = [
  { n: 0, l: 'Sun' },
  { n: 1, l: 'Mon' },
  { n: 2, l: 'Tue' },
  { n: 3, l: 'Wed' },
  { n: 4, l: 'Thu' },
  { n: 5, l: 'Fri' },
  { n: 6, l: 'Sat' },
]

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
  const [weekdays, setWeekdays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleDay(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    )
  }

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
    if (weekdays.length === 0) return setError('Pick at least one day of the week to watch.')

    setSubmitting(true)
    try {
      const watch = await createWatch({
        recgovUrl: url.trim(),
        campgroundName: name.trim(),
        startDate,
        endDate,
        minNights: Math.max(1, minNights),
        weekdays,
      })
      if (!fixedUrl) {
        setName('')
        setUrl('')
      }
      setStartDate('')
      setEndDate('')
      setMinNights(1)
      setWeekdays([0, 1, 2, 3, 4, 5, 6])
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

      <div>
        <label className={label}>Which nights?</label>
        <div className="flex flex-wrap gap-1.5">
          {DAY_LABELS.map((d) => {
            const on = weekdays.includes(d.n)
            return (
              <button
                key={d.n}
                type="button"
                onClick={() => toggleDay(d.n)}
                aria-pressed={on}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  on
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d.l}
              </button>
            )
          })}
        </div>
        <div className="mt-1.5 flex gap-3 text-xs">
          <button
            type="button"
            className="text-green-700 underline"
            onClick={() => setWeekdays([0, 1, 2, 3, 4, 5, 6])}
          >
            Any day
          </button>
          <button
            type="button"
            className="text-green-700 underline"
            onClick={() => setWeekdays([5, 6])}
          >
            Weekends (Fri–Sat)
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Only alert when a cancellation frees a night on the selected days.
        </p>
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
