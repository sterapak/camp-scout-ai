import React from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'

/**
 * @param {{
 *   isLoading: boolean
 *   error: string | null
 *   answer: string | null
 *   citations: import('../api/askClient.js').AskCitation[]
 *   model: string | null
 *   hasRequested: boolean
 * }} props
 */
export default function AskAnswerPanel({
  isLoading,
  error,
  answer,
  citations,
  model,
  hasRequested,
}) {
  if (!hasRequested && !isLoading) {
    return null
  }

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-label="Generated answer"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">Generated answer</h3>
        {model && !isLoading && !error && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
            Model: {model}
          </span>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-gray-600" role="status" aria-live="polite">
          Generating answer…
        </p>
      )}

      {error && !isLoading && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      {answer && !isLoading && !error && (
        <p className="text-sm text-gray-800 whitespace-pre-line">{answer}</p>
      )}

      {citations.length > 0 && !isLoading && !error && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Citations</h4>
          <ul className="space-y-3">
            {citations.map((citation) => (
              <li
                key={citation.id}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2"
              >
                <p className="text-sm font-semibold text-gray-900">{citation.title}</p>
                {citation.campgroundName && (
                  <p className="text-sm text-gray-600">{citation.campgroundName}</p>
                )}
                <p className="text-xs font-medium text-green-800">
                  {getDocumentTypeLabel(citation.documentType)}
                </p>
                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs text-gray-500">{citation.sourceName}</span>
                  <a
                    href={citation.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
                  >
                    Source link
                    <FiExternalLink className="ml-1" size={14} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
