import React from 'react'
import { getDocumentTypeLabel, KNOWLEDGE_DOCUMENT_TYPES } from '../data/knowledgeSchema.js'
import { getAllCampgrounds } from '../data/campgroundData.js'

export default function KnowledgeFilters({
  query,
  campgroundId,
  documentType,
  campgroundIds,
  onQueryChange,
  onCampgroundChange,
  onDocumentTypeChange,
}) {
  const campgroundsWithKnowledge = getAllCampgrounds().filter((c) =>
    campgroundIds.includes(c.id),
  )

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="knowledge-search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <input
            id="knowledge-search"
            type="search"
            role="searchbox"
            placeholder="Search knowledge documents..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>

        <div>
          <label htmlFor="knowledge-campground" className="block text-sm font-medium text-gray-700 mb-1">
            Campground
          </label>
          <select
            id="knowledge-campground"
            value={campgroundId}
            onChange={(e) => onCampgroundChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All campgrounds</option>
            {campgroundsWithKnowledge.map((campground) => (
              <option key={campground.id} value={campground.id}>
                {campground.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="knowledge-type" className="block text-sm font-medium text-gray-700 mb-1">
            Document type
          </label>
          <select
            id="knowledge-type"
            value={documentType}
            onChange={(e) => onDocumentTypeChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="">All types</option>
            {KNOWLEDGE_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {getDocumentTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
