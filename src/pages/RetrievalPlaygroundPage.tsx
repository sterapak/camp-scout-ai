import React, { useEffect, useMemo, useState } from 'react'
import { AskApiError, postAsk } from '../api/askClient.js'
import GeneratedAnswerPanel from '../components/GeneratedAnswerPanel'
import QuestionHistoryPanel from '../components/QuestionHistoryPanel'
import RetrievalContextPreview from '../components/RetrievalContextPreview'
import RetrievalFilters from '../components/RetrievalFilters'
import RetrievalResultCard from '../components/RetrievalResultCard'
import SuggestedQuestions from '../components/SuggestedQuestions'
import { getSuggestedQuestions } from '../data/suggestedQuestions.js'
import { getCampgroundById } from '../data/campgroundData.js'
import { getKnowledgeCampgroundIds } from '../data/knowledge/documents.js'
import { getIndexedDocumentTypes } from '../data/knowledge/knowledgeIndex.js'
import { retrieveDocuments } from '../data/knowledge/knowledgeRetrieval.js'
import { buildRetrievalContext } from '../data/knowledge/retrievalContext.js'
import {
  addQuestionToHistory,
  clearQuestionHistory,
  loadQuestionHistory,
} from '../utils/questionHistory.js'
import { streamAnswerText } from '../utils/streamAnswerText.js'

import type { Citation, Evidence, ContradictionWarning, AnswerConfidenceLevel, UniqueSourceReference } from '../shared/types/api.js'

type SubmittedQuery = {
  question: string
  campgroundId: string
  documentType: string
}

type AskPageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'streaming'; answer: string; displayedAnswer: string; citations: Citation[]; sources: UniqueSourceReference[]; evidence: Evidence[]; confidence: AnswerConfidenceLevel; contradictionWarning?: ContradictionWarning | null; model: string }
  | { status: 'success'; answer: string; displayedAnswer: string; citations: Citation[]; sources: UniqueSourceReference[]; evidence: Evidence[]; confidence: AnswerConfidenceLevel; contradictionWarning?: ContradictionWarning | null; model: string }
  | { status: 'insufficient_context'; message: string; citations: Citation[] }
  | { status: 'error'; errorMessage: string }

export default function RetrievalPlaygroundPage() {
  const [question, setQuestion] = useState('')
  const [campgroundId, setCampgroundId] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState<SubmittedQuery | null>(null)
  const [answerState, setAnswerState] = useState<AskPageState>({ status: 'idle' })
  const [questionHistory, setQuestionHistory] = useState([])

  useEffect(() => {
    setQuestionHistory(loadQuestionHistory())
  }, [])

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

  const suggestedQuestions = useMemo(
    () => getSuggestedQuestions(campgroundId),
    [campgroundId]
  )

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

  async function handleGenerateAnswer(selectedQuestion = question, selectedCampgroundId = campgroundId) {
    const trimmedQuestion = selectedQuestion.trim()
    if (!trimmedQuestion) return

    setAnswerState({ status: 'loading' })

    try {
      const result = await postAsk({
        question: trimmedQuestion,
        campgroundId: selectedCampgroundId,
      })

      const updatedHistory = addQuestionToHistory({
        question: trimmedQuestion,
        campgroundId: selectedCampgroundId,
      })
      setQuestionHistory(updatedHistory)

      if (result.status === 'insufficient_context') {
        setAnswerState({
          status: 'insufficient_context',
          message: result.message,
          citations: result.citations,
        })
        return
      }

      setAnswerState({
        status: 'streaming',
        answer: result.answer,
        displayedAnswer: '',
        citations: result.citations,
        sources: result.sources,
        evidence: result.evidence,
        confidence: result.confidence,
        contradictionWarning: result.contradictionWarning,
        model: result.model,
      })

      await streamAnswerText(result.answer, (partialAnswer) => {
        setAnswerState((current) => {
          if (current.status !== 'streaming') {
            return current
          }
          return { ...current, displayedAnswer: partialAnswer }
        })
      })

      setAnswerState((current) => {
        if (current.status !== 'streaming') {
          return current
        }
        return { ...current, status: 'success', displayedAnswer: result.answer }
      })
    } catch (error) {
      const errorMessage =
        error instanceof AskApiError
          ? error.message
          : 'Answer generation failed. Please try again.'
      setAnswerState({ status: 'error', errorMessage })
    }
  }

  function handleSuggestedQuestionSelect(selectedQuestion) {
    setQuestion(selectedQuestion)
  }

  function handleHistorySelect(entry) {
    setQuestion(entry.question)
    if (entry.campgroundId) {
      setCampgroundId(entry.campgroundId)
    }
    handleGenerateAnswer(entry.question, entry.campgroundId ?? campgroundId)
  }

  function handleClearHistory() {
    clearQuestionHistory()
    setQuestionHistory([])
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Knowledge Retrieval Playground</h2>
        <p className="mt-1 text-sm text-gray-600">
          Test keyword-based retrieval and grounded answer generation against official campground
          knowledge documents. Use Retrieve knowledge for debug panels, or Generate Answer to call
          the ask API.
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
        onGenerateAnswer={() => handleGenerateAnswer()}
        isGeneratingAnswer={answerState.status === 'loading' || answerState.status === 'streaming'}
      />

      {campgroundId && (
        <SuggestedQuestions
          questions={suggestedQuestions}
          onSelect={handleSuggestedQuestionSelect}
        />
      )}

      <QuestionHistoryPanel
        history={questionHistory}
        onSelect={handleHistorySelect}
        onClear={handleClearHistory}
      />

      <GeneratedAnswerPanel
        status={answerState.status}
        answer={'answer' in answerState ? answerState.answer : undefined}
        displayedAnswer={'displayedAnswer' in answerState ? answerState.displayedAnswer : undefined}
        message={'message' in answerState ? answerState.message : undefined}
        citations={'citations' in answerState ? answerState.citations : undefined}
        sources={'sources' in answerState ? answerState.sources : undefined}
        evidence={'evidence' in answerState ? answerState.evidence : undefined}
        confidence={'confidence' in answerState ? answerState.confidence : undefined}
        contradictionWarning={'contradictionWarning' in answerState ? answerState.contradictionWarning : undefined}
        model={'model' in answerState ? answerState.model : undefined}
        errorMessage={'errorMessage' in answerState ? answerState.errorMessage : undefined}
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

      <RetrievalContextPreview
        promptContext={retrievalContext.promptContext}
        sourceCount={retrievalContext.sourceCount}
        hasSearched={Boolean(submittedQuery)}
      />
    </div>
  )
}
