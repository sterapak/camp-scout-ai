import React, { useMemo, useState } from 'react'
import KnowledgeDocumentCard from '../components/KnowledgeDocumentCard'
import KnowledgeFilters from '../components/KnowledgeFilters'
import { getKnowledgeCampgroundIds } from '../data/knowledge/documents'
import { searchDocuments } from '../data/knowledge/knowledgeIndex'

export default function KnowledgePage() {
  const [query, setQuery] = useState('')
  const [campgroundId, setCampgroundId] = useState('')
  const [documentType, setDocumentType] = useState('')

  const campgroundIds = useMemo(() => getKnowledgeCampgroundIds(), [])

  const results = useMemo(
    () => searchDocuments({ query, campgroundId, documentType }),
    [query, campgroundId, documentType],
  )

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Knowledge Library</h2>
        <p className="mt-1 text-sm text-gray-600">
          Official campground information from park and agency sources.
        </p>
      </div>

      <KnowledgeFilters
        query={query}
        campgroundId={campgroundId}
        documentType={documentType}
        campgroundIds={campgroundIds}
        onQueryChange={setQuery}
        onCampgroundChange={setCampgroundId}
        onDocumentTypeChange={setDocumentType}
      />

      <p className="text-sm text-gray-500">
        Showing {results.length} document{results.length !== 1 ? 's' : ''}
      </p>

      {results.length === 0 ? (
        <p className="text-gray-600">No documents match your filters.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {results.map((document) => (
            <KnowledgeDocumentCard key={document.id} document={document} />
          ))}
        </div>
      )}
    </div>
  )
}
