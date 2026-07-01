/**
 * Formats retrieved knowledge documents into structured context for future LLM prompts.
 * No AI calls — plain text assembly only.
 */

import { getDocumentTypeLabel } from '../knowledgeSchema.js'
import {
  estimateTokenCount,
  truncateTextToTokenBudget,
} from '../../server/openai/promptLimits.js'
import type { RetrievalResult } from './knowledgeRetrieval.js'

export interface RetrievalContextSource {
  id: string
  title: string
  sourceUrl: string
  sourceName: string
  campgroundName?: string
  documentType: string
  relevanceScore: number
}

export interface RetrievalContext {
  promptContext: string
  sources: RetrievalContextSource[]
  sourceCount: number
  estimatedPromptTokens?: number
  contextTruncated?: boolean
}

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

export function buildRetrievalContext({
  question = '',
  results = [],
  maxContextTokens,
  pricingSection = '',
}: {
  question?: string
  results?: RetrievalResult[]
  maxContextTokens?: number
  pricingSection?: string
} = {}): RetrievalContext {
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
    pricingSection ? `\n\n---\n\n${pricingSection}` : null,
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
