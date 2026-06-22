import React, { useMemo, useState } from 'react'
import { getDocumentTypeLabel } from '../data/knowledgeSchema'
import { retrieveSemanticChunks } from '../rag/semanticRetrieval'

export default function RetrievalPlaygroundPage() {
  const [query, setQuery] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')

  const results = useMemo(() => {
    if (!submittedQuery.trim()) return []
    return retrieveSemanticChunks({ query: submittedQuery, limit: 10 })
  }, [submittedQuery])

  function handleSubmit(event) {
    event.preventDefault()
    setSubmittedQuery(query.trim())
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Retrieval Playground</h2>
        <p className="mt-1 text-sm text-gray-600">
          Developer tool for visualizing semantic retrieval results. No AI-generated answers —
          only ranked chunks with similarity scores and source attribution.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Enter a retrieval query (e.g., bear food storage rules)"
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 transition"
        >
          Search
        </button>
      </form>

      {submittedQuery && (
        <p className="text-sm text-gray-500">
          {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{submittedQuery}&rdquo;
        </p>
      )}

      {submittedQuery && results.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
          No matching chunks found. Try a different query.
        </div>
      )}

      <div className="space-y-4">
        {results.map((result, index) => (
          <article
            key={result.chunk.id}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Rank #{index + 1}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-gray-900">{result.chunk.title}</h3>
                {result.campgroundName && (
                  <p className="text-sm text-gray-600">{result.campgroundName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Similarity
                </p>
                <p className="text-lg font-mono font-semibold text-green-700">
                  {result.similarityScore.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {getDocumentTypeLabel(result.chunk.documentType)}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Chunk {result.chunk.chunkIndex}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-mono text-gray-500">
                {result.chunk.id}
              </span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-gray-800">{result.chunk.text}</p>

            <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
              <p>
                Source:{' '}
                <a
                  href={result.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 hover:underline"
                >
                  {result.sourceName}
                </a>
              </p>
              <p className="mt-1">Last verified: {result.chunk.lastUpdatedAt}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
