/**
 * Formats retrieved knowledge documents into structured context for future LLM prompts.
 * No AI calls — plain text assembly only.
 */

import { getDocumentTypeLabel } from '../knowledgeSchema.js'
import {
  estimateTokenCount,
  truncateTextToTokenBudget,
} from '../../server/openai/promptLimits.js'

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
 * @property {number} [estimatedPromptTokens]
 * @property {boolean} [contextTruncated]
 */

/**
 * Builds a single source block.
 * @param {RetrievalResult} result
 * @param {number} index
 * @returns {string}
 */
function buildContextBlock(result, index) {
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
}

/**
 * Builds prompt-ready context from retrieval results.
 * @param {{ question: string, results: RetrievalResult[], maxContextTokens?: number }} options
 * @returns {RetrievalContext}
 */
export function buildRetrievalContext({ question = '', results = [], maxContextTokens } = {}) {
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
    const promptContext = trimmedQuestion
      ? `User question: ${trimmedQuestion}\n\nNo matching knowledge documents were found.`
      : ''

    return {
      promptContext,
      sources,
      sourceCount: 0,
      estimatedPromptTokens: estimateTokenCount(promptContext),
      contextTruncated: false,
    }
  }

  const contextBlocks = results.map((result, index) => buildContextBlock(result, index))

  let promptContext = [
    trimmedQuestion ? `User question: ${trimmedQuestion}` : null,
    '',
    'The following official campground knowledge may help answer the question:',
    '',
    contextBlocks.join('\n\n---\n\n'),
  ]
    .filter((line) => line !== null)
    .join('\n')

  let contextTruncated = false

  if (typeof maxContextTokens === 'number' && maxContextTokens > 0) {
    const cappedPrompt = truncateTextToTokenBudget(promptContext, maxContextTokens)
    promptContext = cappedPrompt.text
    contextTruncated = cappedPrompt.truncated
  }

  return {
    promptContext,
    sources,
    sourceCount: sources.length,
    estimatedPromptTokens: estimateTokenCount(promptContext),
    contextTruncated,
  }
}
