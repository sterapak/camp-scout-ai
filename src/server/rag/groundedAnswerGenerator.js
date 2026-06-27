/**
 * Grounded answer generator — connects keyword retrieval to the answer provider.
 * Answers are generated only from retrieved campground knowledge context.
 * Server-only; never import from React client code.
 */

import { retrieveDocuments } from '../../data/knowledge/knowledgeRetrieval.js'
import { buildRetrievalContext } from '../../data/knowledge/retrievalContext.js'
import { createAnswerProvider } from '../openai/createAnswerProvider.js'
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../openai/answerProvider.js'
import {
  buildCapabilityGuardrailRules,
  classifyQuery,
} from './queryClassifier.js'

export const DEFAULT_TOP_DOCUMENT_COUNT = 3
export const GROUNDED_ANSWER_MAX_OUTPUT_TOKENS = DEFAULT_MAX_OUTPUT_TOKENS

export const INSUFFICIENT_CONTEXT_STATUS = 'insufficient_context'
export const SUCCESS_STATUS = 'success'

const DEFAULT_INSUFFICIENT_MESSAGE =
  "I don't have information about that in my campground knowledge base. Try browsing the campground list or checking the official park website."

/**
 * @typedef {import('../../data/knowledge/retrievalContext.js').RetrievalContextSource} RetrievalContextSource
 */

/**
 * @typedef {Object} GroundedAnswerCitation
 * @property {string} id
 * @property {string} title
 * @property {string} sourceName
 * @property {string} sourceUrl
 * @property {string} [campgroundName]
 * @property {string} documentType
 */

/**
 * @typedef {Object} GroundedAnswerSuccess
 * @property {'success'} status
 * @property {string} answer
 * @property {GroundedAnswerCitation[]} citations
 * @property {string} model
 * @property {number} [inputTokens]
 * @property {number} [outputTokens]
 */

/**
 * @typedef {Object} GroundedAnswerInsufficient
 * @property {'insufficient_context'} status
 * @property {string} message
 * @property {GroundedAnswerCitation[]} citations
 */

/**
 * @typedef {GroundedAnswerSuccess | GroundedAnswerInsufficient} GroundedAnswerResult
 */

/**
 * Builds system instructions requiring context-only answers with citations.
 * @param {number} sourceCount
 * @param {import('./queryClassifier.js').QueryCategory} [queryCategory]
 * @param {string[]} [campgroundNames]
 * @returns {string}
 */
export function buildGroundedAnswerInstructions(sourceCount, queryCategory, campgroundNames = []) {
  const baseRules = [
    'You are Camp Scout AI, a helpful assistant for Northern California campground visitors.',
    'Answer using ONLY the retrieved source excerpts provided in the user input.',
    '',
    'Rules:',
    '1. Answer only from the provided context. Do not use outside knowledge.',
    '2. Cite every factual claim with [Source N] where N is 1 through ' + sourceCount + '.',
    '3. End with a "Sources:" section listing each cited source with sourceName and sourceUrl.',
    '4. If the context does not contain enough information, say so clearly.',
    '5. Never invent campground names, policies, fees, availability, or reservation details.',
    '6. Use plain, friendly language appropriate for campers planning a trip.',
  ]

  const guardrailRules = buildCapabilityGuardrailRules(queryCategory ?? 'factual', campgroundNames)

  if (guardrailRules.length === 0) {
    return baseRules.join('\n')
  }

  return [
    ...baseRules,
    '',
    'Capability guardrails:',
    ...guardrailRules.map((rule, index) => `${index + 1}. ${rule}`),
  ].join('\n')
}

/**
 * Maps retrieval context sources to citation metadata.
 * @param {RetrievalContextSource} source
 * @returns {GroundedAnswerCitation}
 */
export function toGroundedAnswerCitation(source) {
  return {
    id: source.id,
    title: source.title,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    campgroundName: source.campgroundName,
    documentType: source.documentType,
  }
}

/**
 * Keeps retrieval results that are relevant to the question.
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @returns {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]}
 */
export function filterRelevantResults(results) {
  return results.filter((result) => result.relevanceScore > 0)
}

/**
 * @param {string} message
 * @returns {GroundedAnswerInsufficient}
 */
export function buildInsufficientContextResponse(message = DEFAULT_INSUFFICIENT_MESSAGE) {
  return {
    status: INSUFFICIENT_CONTEXT_STATUS,
    message,
    citations: [],
  }
}

/**
 * Returns a grounded success response for capability guardrail short-circuits.
 * @param {string} answer
 * @returns {GroundedAnswerSuccess}
 */
export function buildGuardrailAnswerResponse(answer) {
  return {
    status: SUCCESS_STATUS,
    answer,
    citations: [],
    model: 'capability-guardrail',
  }
}

/**
 * Generates a grounded answer from retrieved campground knowledge.
 * @param {{
 *   question: string,
 *   campgroundId?: string,
 *   documentType?: string,
 *   topDocumentCount?: number,
 *   maxOutputTokens?: number,
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 * }} [options]
 * @returns {Promise<GroundedAnswerResult>}
 */
export async function generateGroundedAnswer({
  question,
  campgroundId = '',
  documentType = '',
  topDocumentCount = DEFAULT_TOP_DOCUMENT_COUNT,
  maxOutputTokens = GROUNDED_ANSWER_MAX_OUTPUT_TOKENS,
  answerProvider,
  provider,
} = {}) {
  const trimmedQuestion = (question ?? '').trim()

  if (trimmedQuestion.length === 0) {
    return buildInsufficientContextResponse('A question is required to generate an answer.')
  }

  const queryClassification = classifyQuery(trimmedQuestion)

  if (queryClassification.shouldShortCircuit && queryClassification.shortCircuitMessage) {
    return buildGuardrailAnswerResponse(queryClassification.shortCircuitMessage)
  }

  const results = retrieveDocuments({
    query: trimmedQuestion,
    campgroundId,
    documentType,
    limit: topDocumentCount,
  })

  const relevantResults = filterRelevantResults(results)

  if (relevantResults.length === 0) {
    return buildInsufficientContextResponse()
  }

  const context = buildRetrievalContext({
    question: trimmedQuestion,
    results: relevantResults,
  })

  const providerInstance = answerProvider ?? createAnswerProvider({ provider })

  const generationResult = await providerInstance.generateAnswer({
    instructions: buildGroundedAnswerInstructions(
      context.sourceCount,
      queryClassification.category,
      queryClassification.campgroundNames,
    ),
    input: context.promptContext,
    maxOutputTokens,
  })

  return {
    status: SUCCESS_STATUS,
    answer: generationResult.text,
    citations: context.sources.map(toGroundedAnswerCitation),
    model: generationResult.model,
    inputTokens: generationResult.inputTokens,
    outputTokens: generationResult.outputTokens,
  }
}
