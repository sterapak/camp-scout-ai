/**
 * Formats retrieved knowledge documents into structured context for future LLM prompts.
 * No AI calls — plain text assembly only.
 */

import { getDocumentTypeLabel } from '../knowledgeSchema.js'

/**
 * @typedef {import('./knowledgeRetrieval.js').RetrievalResult} RetrievalResult
 */

/**
 * @typedef {Object} RetrievalContextSource
 * @property {string} id
 * @property {string} title
 * @property {string} sourceUrl
 * @property {string} sourceName
 * @property {string} [campgroundName]
 * @property {string} documentType
 * @property {number} relevanceScore
 */

/**
 * @typedef {Object} RetrievalContext
 * @property {string} promptContext - Structured text ready to prepend to an LLM prompt
 * @property {RetrievalContextSource[]} sources - Metadata for cited sources
 * @property {number} sourceCount
 */

/**
 * Builds prompt-ready context from retrieval results.
 * @param {{ question: string, results: RetrievalResult[] }} options
 * @returns {RetrievalContext}
 */
export function buildRetrievalContext({ question = '', results = [] } = {}) {
  const trimmedQuestion = question.trim()

  const sources = results.map((result) => ({
    id: result.document.id,
    title: result.document.title,
    sourceUrl: result.sourceUrl,
    sourceName: result.sourceName,
    campgroundName: result.campgroundName,
    documentType: result.document.documentType,
    relevanceScore: result.relevanceScore,
  }))

  if (results.length === 0) {
    return {
      promptContext: trimmedQuestion
        ? `User question: ${trimmedQuestion}\n\nNo matching knowledge documents were found.`
        : '',
      sources,
      sourceCount: 0,
    }
  }

  const contextBlocks = results.map((result, index) => {
    const { document, sourceUrl, sourceName, campgroundName } = result
    const typeLabel = getDocumentTypeLabel(document.documentType)

    return [
      `### Source ${index + 1}: ${document.title}`,
      `Campground: ${campgroundName ?? document.campgroundId}`,
      `Type: ${typeLabel}`,
      `Source: ${sourceName} (${sourceUrl})`,
      '',
      document.content,
    ].join('\n')
  })

  const promptContext = [
    trimmedQuestion ? `User question: ${trimmedQuestion}` : null,
    '',
    'The following official campground knowledge may help answer the question:',
    '',
    contextBlocks.join('\n\n---\n\n'),
  ]
    .filter((line) => line !== null)
    .join('\n')

  return {
    promptContext,
    sources,
    sourceCount: sources.length,
  }
}
