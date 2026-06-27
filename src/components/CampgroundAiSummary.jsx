import React, { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiExternalLink, FiZap } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'
import { formatGeneratedAt, formatKnowledgeSnapshotDate } from '../utils/formatGeneratedAt.js'

/** @typedef {import('../server/rag/campgroundSummaryGenerator.js').CampgroundSummarySections} CampgroundSummarySections */

const SECTION_LABELS = {
  overview: 'Overview',
  amenities: 'Amenities',
  restrictions: 'Restrictions',
  reservations: 'Reservations',
  highlights: 'Highlights',
}

const CONFIDENCE_STYLES = {
  high: 'bg-green-50 text-green-800 border-green-200',
  medium: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  low: 'bg-orange-50 text-orange-800 border-orange-200',
}

const CONFIDENCE_LABELS = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
}

/**
 * Google Maps-style AI summary panel for campground detail pages.
 * @param {{
 *   status: 'idle' | 'loading' | 'success' | 'insufficient_context' | 'error'
 *   sections?: CampgroundSummarySections
 *   citations?: import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerCitation[]
 *   sources?: import('../server/rag/answerTrust.js').UniqueSourceReference[]
 *   confidence?: import('../server/rag/answerTrust.js').AnswerConfidenceLevel
 *   generatedAt?: string
 *   knowledgeSnapshot?: import('../server/rag/knowledgeSnapshot.js').KnowledgeSnapshot
 *   message?: string
 *   errorMessage?: string
 *   imageSlot?: React.ReactNode
 * }} props
 */
export default function CampgroundAiSummary({
  status,
  sections,
  citations = [],
  sources = [],
  confidence,
  generatedAt,
  knowledgeSnapshot,
  message,
  errorMessage,
  imageSlot,
}) {
  const [expanded, setExpanded] = useState(true)
  const [showCitations, setShowCitations] = useState(false)

  if (status === 'idle') {
    return null
  }

  return (
    <section
      className="rounded-xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-white p-6 shadow-sm"
      aria-label="AI campground summary"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        {imageSlot && <div className="lg:sticky lg:top-6">{imageSlot}</div>}

        <div className="min-w-0 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-800">
              <FiZap size={16} aria-hidden="true" />
            </span>
            <h3 className="text-lg font-medium text-gray-900">AI summary</h3>
            {status === 'success' && confidence && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${CONFIDENCE_STYLES[confidence]}`}
              >
                {CONFIDENCE_LABELS[confidence]}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">Generated from official campground sources</p>
          {status === 'success' && generatedAt && (
            <p className="text-xs text-gray-500">
              Generated on {formatGeneratedAt(generatedAt)}
            </p>
          )}
          {status === 'success' && knowledgeSnapshot && (
            <p className="text-xs text-gray-500">
              Knowledge snapshot
              {knowledgeSnapshot.sourceName ? ` from ${knowledgeSnapshot.sourceName}` : ''}
              {knowledgeSnapshot.lastFetchedAt
                ? ` · verified ${formatKnowledgeSnapshotDate(knowledgeSnapshot.lastFetchedAt)}`
                : ''}
            </p>
          )}
        </div>

        {status === 'success' && sections && (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="inline-flex items-center gap-1 text-sm font-medium text-green-800 hover:text-green-900"
            aria-expanded={expanded}
          >
            {expanded ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {status === 'loading' && (
        <div className="mt-4 space-y-3" role="status" aria-live="polite">
          <div className="h-4 w-3/4 animate-pulse rounded bg-green-100" />
          <div className="h-4 w-full animate-pulse rounded bg-green-100" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-green-100" />
          <p className="text-sm text-gray-600">Summarizing official sources…</p>
        </div>
      )}

      {status === 'error' && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {errorMessage || 'Summary generation failed. Please try again.'}
        </p>
      )}

      {status === 'insufficient_context' && (
        <p className="mt-4 text-sm text-gray-700">{message}</p>
      )}

      {status === 'success' && sections && expanded && (
        <div className="mt-4 space-y-4">
          {Object.entries(SECTION_LABELS).map(([key, label]) => {
            const content = sections[/** @type {keyof CampgroundSummarySections} */ (key)]
            if (!content) {
              return null
            }

            return (
              <div key={key}>
                <h4 className="text-sm font-semibold text-gray-900">{label}</h4>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-line">{content}</p>
              </div>
            )
          })}

          {sources.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900">Sources</h4>
              <ul className="space-y-2">
                {sources.map((source) => (
                  <li
                    key={source.sourceUrl}
                    className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-white/80 px-3 py-2 text-sm"
                  >
                    <span className="font-medium text-gray-900">{source.sourceName}</span>
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-green-700 hover:text-green-900"
                    >
                      View
                      <FiExternalLink className="ml-1" size={14} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {citations.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowCitations((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900"
                aria-expanded={showCitations}
              >
                {showCitations ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                {showCitations ? 'Hide citations' : 'Show citations'}
              </button>

              {showCitations && (
                <ul className="space-y-2">
                  {citations.map((citation, index) => (
                    <li
                      key={citation.id}
                      className="rounded-lg border border-gray-100 bg-white/80 px-3 py-2 text-sm"
                    >
                      <p className="font-medium text-gray-900">
                        [{index + 1}] {citation.title}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {citation.sourceName} · {getDocumentTypeLabel(citation.documentType)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
        </div>
      </div>
    </section>
  )
}
