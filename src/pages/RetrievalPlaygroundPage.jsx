import React, { useMemo, useState } from 'react'
import { askQuestion } from '../api/askClient.js'
import AskAnswerPanel from '../components/AskAnswerPanel'
import RetrievalContextPreview from '../components/RetrievalContextPreview'
import RetrievalFilters from '../components/RetrievalFilters'
import RetrievalResultCard from '../components/RetrievalResultCard'
import { getCampgroundById } from '../data/campgroundData.js'
import { getKnowledgeCampgroundIds } from '../data/knowledge/documents.js'
import { getIndexedDocumentTypes } from '../data/knowledge/knowledgeIndex.js'
import { retrieveDocuments } from '../data/knowledge/knowledgeRetrieval.js'
import { buildRetrievalContext } from '../data/knowledge/retrievalContext.js'

export default function RetrievalPlaygroundPage() {
  const [question, setQuestion] = useState('')
  const [campgroundId, setCampgroundId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState(null)
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false)
  const [answerError, setAnswerError] = useState(null)
  const [generatedAnswer, setGeneratedAnswer] = useState(null)
  const [answerCitations, setAnswerCitations] = useState([])
  const [answerModel, setAnswerModel] = useState(null)
  const [hasRequestedAnswer, setHasRequestedAnswer] = useState(false)

  const campgroundOptions = useMemo(
    () =>
      getKnowledgeCampgroundIds()
        .map((id) => {
          const campground = getCampgroundById(id)
          return campground ? { id, name: campground.name } : null
        })
        .filter(Boolean)
        .sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  const documentTypes = useMemo(() => getIndexedDocumentTypes(), [])

  const results = useMemo(() => {
    if (!submittedQuery) return []

    return retrieveDocuments({
      query: submittedQuery.question,
      campgroundId: submittedQuery.campgroundId,
      documentType: submittedQuery.documentType,
      limit: 10,
    })
  }, [submittedQuery])

  const retrievalContext = useMemo(
    () =>
      submittedQuery
        ? buildRetrievalContext({ question: submittedQuery.question, results })
        : { promptContext: '', sources: [], sourceCount: 0 },
    [submittedQuery, results]
  )

  function handleRetrieve() {
    setSubmittedQuery({
      question,
      campgroundId,
      documentType,
    })
  }

  async function handleGenerateAnswer() {
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || isGeneratingAnswer) {
      return
    }

    setHasRequestedAnswer(true)
    setIsGeneratingAnswer(true)
    setAnswerError(null)
    setGeneratedAnswer(null)
    setAnswerCitations([])
    setAnswerModel(null)

    try {
      const response = await askQuestion({
        question: trimmedQuestion,
        campgroundId,
        documentType,
      })

      if (response.status === 'insufficient_context') {
        setGeneratedAnswer(response.message)
        setAnswerCitations(response.citations)
        return
      }

      setGeneratedAnswer(response.answer)
      setAnswerCitations(response.citations)
      setAnswerModel(response.model)
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'An unexpected error occurred.'
      setAnswerError(message)
    } finally {
      setIsGeneratingAnswer(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Knowledge Retrieval Playground</h2>
        <p className="mt-1 text-sm text-gray-600">
          Test keyword-based retrieval against official campground knowledge documents. Results are
          ranked by relevance and formatted for future LLM integration.
        </p>
      </div>

      <RetrievalFilters
        question={question}
        campgroundId={campgroundId}
        documentType={documentType}
        campgroundOptions={campgroundOptions}
        documentTypes={documentTypes}
        onQuestionChange={setQuestion}
        onCampgroundChange={setCampgroundId}
        onDocumentTypeChange={setDocumentType}
        onSubmit={handleRetrieve}
        onGenerateAnswer={handleGenerateAnswer}
        isGeneratingAnswer={isGeneratingAnswer}
      />

      {submittedQuery && (
        <p className="text-sm text-gray-500">
          {results.length === 0
            ? 'No matching documents found.'
            : `Retrieved ${results.length} document${results.length !== 1 ? 's' : ''} for "${submittedQuery.question.trim() || 'all documents'}"`}
        </p>
      )}

      {results.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Retrieved sources</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {results.map((result, index) => (
              <RetrievalResultCard key={result.document.id} result={result} rank={index + 1} />
            ))}
          </div>
        </section>
      )}

      <AskAnswerPanel
        isLoading={isGeneratingAnswer}
        error={answerError}
        answer={generatedAnswer}
        citations={answerCitations}
        model={answerModel}
        hasRequested={hasRequestedAnswer}
      />

      <RetrievalContextPreview
        promptContext={retrievalContext.promptContext}
        sourceCount={retrievalContext.sourceCount}
        hasSearched={Boolean(submittedQuery)}
      />
    </div>
  )
}
