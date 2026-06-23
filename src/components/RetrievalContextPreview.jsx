import React from 'react'

/**
 * @param {{
 *   promptContext: string
 *   sourceCount: number
 *   hasSearched: boolean
 * }} props
 */
export default function RetrievalContextPreview({ promptContext, sourceCount, hasSearched }) {
  if (!hasSearched) {
    return (
      <section className="rounded-lg border border-dashed border-gray-300 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900">Prepared LLM context</h3>
        <p className="mt-2 text-sm text-gray-600">
          Enter a question and retrieve knowledge to preview the structured context that will be
          passed to a future LLM integration.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">Prepared LLM context</h3>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
          {sourceCount} source{sourceCount !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-sm text-gray-600">
        This text is assembled from retrieved documents and is ready to prepend to a future LLM
        prompt. No model call is made yet.
      </p>
      <pre
        className="max-h-96 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-xs text-gray-800 whitespace-pre-wrap font-mono"
        aria-label="Prepared LLM context preview"
      >
        {promptContext}
      </pre>
    </section>
  )
}
