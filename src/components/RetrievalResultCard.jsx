import React from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'

/**
 * @param {{ result: import('../data/knowledge/knowledgeRetrieval.js').RetrievalResult, rank: number }} props
 */
export default function RetrievalResultCard({ result, rank }) {
  const { document, relevanceScore, sourceUrl, sourceName, campgroundName } = result
  const typeLabel = getDocumentTypeLabel(document.documentType)

  return (
    <article className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Source {rank}
            </p>
            <h3 className="text-lg font-semibold text-gray-900">{document.title}</h3>
            {campgroundName && (
              <p className="mt-1 text-sm text-gray-600">{campgroundName}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {typeLabel}
            </span>
            <span className="text-xs text-gray-500">Score: {relevanceScore}</span>
          </div>
        </div>

        <p className="text-sm text-gray-700 line-clamp-4 whitespace-pre-line">{document.content}</p>
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 bg-gray-50 rounded-b-lg">
        <span className="text-xs text-gray-500">{sourceName}</span>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
        >
          Official source
          <FiExternalLink className="ml-1" size={14} />
        </a>
      </div>
    </article>
  )
}
