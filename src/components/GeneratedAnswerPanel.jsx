import React from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'

/**
 * @typedef {import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerCitation} GroundedAnswerCitation
 */

/**
 * @param {{
 *   status: 'idle' | 'loading' | 'success' | 'insufficient_context' | 'error'
 *   answer?: string
 *   message?: string
 *   citations?: GroundedAnswerCitation[]
 *   model?: string
 *   errorMessage?: string
 * }} props
 */
export default function GeneratedAnswerPanel({
  status,
  answer,
  message,
  citations = [],
  model,
  errorMessage,
}) {
  if (status === 'idle') {
    return null
  }

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-label="Generated answer"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">Generated answer</h3>
        {status === 'success' && model && (
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            Model: {model}
          </span>
        )}
      </div>

      {status === 'loading' && (
        <p className="text-sm text-gray-600" role="status" aria-live="polite">
          Generating answer from campground knowledge…
        </p>
      )}

      {status === 'error' && (
        <p className="text-sm text-red-700" role="alert">
          {errorMessage || 'Answer generation failed. Please try again.'}
        </p>
      )}

      {status === 'insufficient_context' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">{message}</p>
          {citations.length > 0 && <CitationList citations={citations} />}
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-800 whitespace-pre-line">{answer}</p>
          {citations.length > 0 && <CitationList citations={citations} />}
        </div>
      )}
    </section>
  )
}

/**
 * @param {{ citations: GroundedAnswerCitation[] }} props
 */
function CitationList({ citations }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Citations</h4>
      <ul className="space-y-2">
        {citations.map((citation, index) => (
          <li
            key={citation.id}
            className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">
                  [{index + 1}] {citation.title}
                </p>
                {citation.campgroundName && (
                  <p className="mt-0.5 text-xs text-gray-600">{citation.campgroundName}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {citation.sourceName} · {getDocumentTypeLabel(citation.documentType)}
                </p>
              </div>
              <a
                href={citation.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-shrink-0 items-center text-sm text-green-700 hover:text-green-900"
              >
                Source
                <FiExternalLink className="ml-1" size={14} />
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
