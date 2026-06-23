import React from 'react'
import { FiSearch } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'

/**
 * @param {{
 *   question: string
 *   campgroundId: string
 *   documentType: string
 *   campgroundOptions: Array<{ id: string, name: string }>
 *   documentTypes: string[]
 *   onQuestionChange: (value: string) => void
 *   onCampgroundChange: (value: string) => void
 *   onDocumentTypeChange: (value: string) => void
 *   onSubmit: () => void
 * }} props
 */
export default function RetrievalFilters({
  question,
  campgroundId,
  documentType,
  campgroundOptions,
  documentTypes,
  onQuestionChange,
  onCampgroundChange,
  onDocumentTypeChange,
  onSubmit,
}) {
  const selectClass =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600'

  function handleSubmit(event) {
    event.preventDefault()
    onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
          Question
        </span>
        <div className="relative">
          <FiSearch className="absolute left-3 top-3 text-gray-400" />
          <textarea
            value={question}
            onChange={(event) => onQuestionChange(event.target.value)}
            placeholder="e.g. What are the bear food storage rules at Yosemite?"
            rows={3}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-green-600 focus:outline-none focus:ring-1 focus:ring-green-600 resize-y min-h-[4.5rem]"
            aria-label="Enter a question to retrieve knowledge"
          />
        </div>
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Campground (optional)
          </span>
          <select
            value={campgroundId}
            onChange={(event) => onCampgroundChange(event.target.value)}
            className={selectClass}
            aria-label="Filter by campground"
          >
            <option value="">All campgrounds</option>
            {campgroundOptions.map((campground) => (
              <option key={campground.id} value={campground.id}>
                {campground.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
            Document type (optional)
          </span>
          <select
            value={documentType}
            onChange={(event) => onDocumentTypeChange(event.target.value)}
            className={selectClass}
            aria-label="Filter by document type"
          >
            <option value="">All types</option>
            {documentTypes.map((type) => (
              <option key={type} value={type}>
                {getDocumentTypeLabel(type)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
      >
        Retrieve knowledge
      </button>
    </form>
  )
}
