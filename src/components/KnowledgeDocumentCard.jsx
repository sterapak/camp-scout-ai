import React from 'react'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'
import { getCampgroundById } from '../data/campgroundData.js'
import { Link } from 'react-router-dom'
import { FiExternalLink, FiMapPin } from 'react-icons/fi'

/**
 * @param {{ document: import('../data/knowledgeSchema.js').KnowledgeDocument }} props
 */
export default function KnowledgeDocumentCard({ document }) {
  const campground = getCampgroundById(document.campgroundId)

  return (
    <article className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-medium text-gray-900">{document.title}</h3>
        <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
          {getDocumentTypeLabel(document.documentType)}
        </span>
      </div>

      <p className="text-sm text-gray-700 line-clamp-3">{document.content}</p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>Last updated: {document.lastUpdatedAt}</span>
        <span>Source: {document.sourceName}</span>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {campground && (
          <Link
            to={`/campgrounds/${campground.id}`}
            className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
          >
            <FiMapPin className="mr-1" size={14} />
            {campground.name}
          </Link>
        )}
        <a
          href={document.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-green-700 hover:text-green-900"
        >
          View source
          <FiExternalLink className="ml-1" size={14} />
        </a>
      </div>
    </article>
  )
}
