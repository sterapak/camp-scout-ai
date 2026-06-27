import React from 'react'

/**
 * @param {{
 *   history: Array<{ question: string, campgroundId?: string, askedAt: string }>
 *   onSelect: (entry: { question: string, campgroundId?: string }) => void
 *   onClear: () => void
 * }} props
 */
export default function QuestionHistoryPanel({ history, onSelect, onClear }) {
  if (!history.length) {
    return null
  }

  return (
    <section className="space-y-2" aria-label="Recent questions">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-medium text-gray-900">Recent questions</h4>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-medium text-gray-500 hover:text-gray-700"
        >
          Clear history
        </button>
      </div>
      <ul className="space-y-2">
        {history.map((entry) => (
          <li key={`${entry.askedAt}-${entry.question}`}>
            <button
              type="button"
              onClick={() => onSelect(entry)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
            >
              {entry.question}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
