import React from 'react'

/**
 * @param {{
 *   questions: Array<{ id: string, text: string }>
 *   onSelect: (question: string) => void
 * }} props
 */
export default function SuggestedQuestions({ questions, onSelect }) {
  if (!questions.length) {
    return null
  }

  return (
    <section className="space-y-2" aria-label="Suggested questions">
      <h4 className="text-sm font-medium text-gray-900">Suggested questions</h4>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => (
          <button
            key={question.id}
            type="button"
            onClick={() => onSelect(question.text)}
            className="rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-sm text-green-900 hover:bg-green-100"
          >
            {question.text}
          </button>
        ))}
      </div>
    </section>
  )
}
