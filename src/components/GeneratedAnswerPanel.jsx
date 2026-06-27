import React, { useState } from 'react'
import { FiChevronDown, FiChevronUp, FiExternalLink } from 'react-icons/fi'
import { getDocumentTypeLabel } from '../data/knowledgeSchema.js'

/**
 * @typedef {import('../server/rag/groundedAnswerGenerator.js').GroundedAnswerCitation} GroundedAnswerCitation
 * @typedef {import('../server/rag/answerTrust.js').UniqueSourceReference} UniqueSourceReference
 * @typedef {import('../server/rag/answerTrust.js').SupportingEvidenceItem} SupportingEvidenceItem
 * @typedef {import('../server/rag/answerTrust.js').AnswerConfidenceLevel} AnswerConfidenceLevel
 * @typedef {import('../server/rag/contradictionDetection.js').ContradictionWarning} ContradictionWarning
 */

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
 * @param {{
 *   status: 'idle' | 'loading' | 'streaming' | 'success' | 'insufficient_context' | 'error'
 *   answer?: string
 *   displayedAnswer?: string
 *   message?: string
 *   citations?: GroundedAnswerCitation[]
 *   sources?: UniqueSourceReference[]
 *   evidence?: SupportingEvidenceItem[]
 *   confidence?: AnswerConfidenceLevel
 *   contradictionWarning?: ContradictionWarning | null
 *   model?: string
 *   errorMessage?: string
 * }} props
 */
export default function GeneratedAnswerPanel({
  status,
  answer,
  displayedAnswer,
  message,
  citations = [],
  sources = [],
  evidence = [],
  confidence,
  contradictionWarning = null,
  model,
  errorMessage,
}) {
  const [showEvidence, setShowEvidence] = useState(false)

  if (status === 'idle') {
    return null
  }

  const renderedAnswer = displayedAnswer ?? answer ?? ''

  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      aria-label="Generated answer"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-medium text-gray-900">Generated answer</h3>
        <div className="flex flex-wrap items-center gap-2">
          {status === 'success' && confidence && (
            <span
              className={`rounded-full border px-3 py-1 text-xs font-medium ${CONFIDENCE_STYLES[confidence]}`}
            >
              {CONFIDENCE_LABELS[confidence]}
            </span>
          )}
          {status === 'success' && model && (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
              Model: {model}
            </span>
          )}
        </div>
      </div>

      {(status === 'loading' || status === 'streaming') && (
        <p className="text-sm text-gray-600" role="status" aria-live="polite">
          {status === 'streaming'
            ? 'Streaming answer from campground knowledge…'
            : 'Generating answer from campground knowledge…'}
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

      {(status === 'success' || status === 'streaming') && (
        <div className="space-y-4">
          {contradictionWarning && (
            <div
              className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              role="alert"
            >
              <p className="font-medium">Conflicting official sources detected</p>
              <p className="mt-1">{contradictionWarning.message}</p>
            </div>
          )}

          {renderedAnswer && (
            <p className="text-sm text-gray-800 whitespace-pre-line">{renderedAnswer}</p>
          )}

          {sources.length > 0 && <SourceList sources={sources} />}

          {citations.length > 0 && <CitationList citations={citations} />}

          {evidence.length > 0 && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setShowEvidence((current) => !current)}
                className="inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-900"
                aria-expanded={showEvidence}
              >
                {showEvidence ? <FiChevronUp size={16} /> : <FiChevronDown size={16} />}
                {showEvidence ? 'Hide Evidence' : 'Show Evidence'}
              </button>

              {showEvidence && <EvidenceList evidence={evidence} citations={citations} />}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * @param {{ sources: UniqueSourceReference[] }} props
 */
function SourceList({ sources }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-gray-900">Sources</h4>
      <ul className="space-y-2">
        {sources.map((source) => (
          <li
            key={source.sourceUrl}
            className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 text-sm"
          >
            <span className="font-medium text-gray-900">{source.sourceName}</span>
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-shrink-0 items-center text-sm text-green-700 hover:text-green-900"
            >
              View source
              <FiExternalLink className="ml-1" size={14} />
            </a>
          </li>
        ))}
      </ul>
    </div>
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
            id={`citation-${citation.id}`}
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

/**
 * @param {{ evidence: SupportingEvidenceItem[], citations: GroundedAnswerCitation[] }} props
 */
function EvidenceList({ evidence, citations }) {
  return (
    <ul className="space-y-3">
      {evidence.map((item) => {
        const citationIndex = citations.findIndex((citation) => citation.id === item.citationId)

        return (
          <li
            key={item.citationId}
            className="rounded-lg border border-green-100 bg-green-50/40 px-4 py-3 text-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{item.title}</p>
                <p className="mt-0.5 text-xs text-gray-600">
                  {item.sourceName}
                  {item.campgroundName ? ` · ${item.campgroundName}` : ''}
                </p>
                <p className="mt-2 text-gray-700">{item.excerpt}</p>
              </div>
              {citationIndex >= 0 && (
                <a
                  href={`#citation-${item.citationId}`}
                  className="flex-shrink-0 text-xs font-medium text-green-800 hover:text-green-900"
                >
                  Citation [{citationIndex + 1}]
                </a>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
