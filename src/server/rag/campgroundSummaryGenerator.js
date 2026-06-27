/**
 * Generates Google Maps-style AI campground summaries from official knowledge documents.
 * Server-only; never import from React client code.
 */

import { getCampgroundById } from '../../data/campgroundData.js'
import { retrieveByCampground } from '../../data/knowledge/knowledgeRetrieval.js'
import { buildRetrievalContext } from '../../data/knowledge/retrievalContext.js'
import { createAnswerProvider } from '../openai/createAnswerProvider.js'
import { DEFAULT_MAX_OUTPUT_TOKENS } from '../openai/answerProvider.js'
import {
  buildSupportingEvidence,
  deduplicateSourcesByUrl,
  stripGenericSourcesBlock,
  transformSourceReferences,
} from './answerTrust.js'
import {
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
  toGroundedAnswerCitation,
} from './groundedAnswerGenerator.js'

export const SUMMARY_SECTION_KEYS = [
  'overview',
  'amenities',
  'restrictions',
  'reservations',
  'highlights',
]

/** @typedef {typeof SUMMARY_SECTION_KEYS[number]} SummarySectionKey */

/**
 * @typedef {Record<SummarySectionKey, string>} CampgroundSummarySections
 */

/**
 * @typedef {Object} CampgroundSummarySuccess
 * @property {'success'} status
 * @property {string} campgroundId
 * @property {string} campgroundName
 * @property {CampgroundSummarySections} sections
 * @property {import('./groundedAnswerGenerator.js').GroundedAnswerCitation[]} citations
 * @property {import('./answerTrust.js').UniqueSourceReference[]} sources
 * @property {import('./answerTrust.js').SupportingEvidenceItem[]} evidence
 * @property {import('./answerTrust.js').AnswerConfidenceLevel} confidence
 * @property {string} model
 * @property {number} [inputTokens]
 * @property {number} [outputTokens]
 */

/**
 * @typedef {Object} CampgroundSummaryInsufficient
 * @property {'insufficient_context'} status
 * @property {string} message
 * @property {string} campgroundId
 */

/**
 * @typedef {CampgroundSummarySuccess | CampgroundSummaryInsufficient} CampgroundSummaryResult
 */

const DOCUMENT_TYPE_ORDER = ['description', 'rules', 'reservation', 'alert']

const SUMMARY_QUESTION =
  'Generate a comprehensive campground summary from the official sources below.'

/**
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @returns {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]}
 */
export function orderSummaryDocuments(results) {
  return [...results].sort((left, right) => {
    const leftIndex = DOCUMENT_TYPE_ORDER.indexOf(left.document.documentType)
    const rightIndex = DOCUMENT_TYPE_ORDER.indexOf(right.document.documentType)
    return (leftIndex === -1 ? 99 : leftIndex) - (rightIndex === -1 ? 99 : rightIndex)
  })
}

/**
 * Calculates summary confidence from available document coverage.
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @returns {import('./answerTrust.js').AnswerConfidenceLevel}
 */
export function calculateSummaryConfidence(results) {
  const documentTypes = new Set(results.map((result) => result.document.documentType))

  if (
    documentTypes.has('description') &&
    documentTypes.has('rules') &&
    documentTypes.has('reservation')
  ) {
    return 'high'
  }

  if (documentTypes.has('description') && documentTypes.size >= 2) {
    return 'medium'
  }

  return 'low'
}

/**
 * Builds summary-specific system instructions.
 * @param {string} campgroundName
 * @param {number} sourceCount
 * @param {import('../../data/knowledge/retrievalContext.js').RetrievalContextSource[]} sources
 * @returns {string}
 */
export function buildCampgroundSummaryInstructions(campgroundName, sourceCount, sources = []) {
  const organizationExamples = sources
    .slice(0, 2)
    .map((source) => `the ${source.sourceName}`)
    .join(' and ')

  return [
    'You are Camp Scout AI generating a Google Maps-style campground summary.',
    `Create a concise, trustworthy summary for ${campgroundName} using ONLY the retrieved official excerpts.`,
    '',
    'Rules:',
    '1. Use only facts present in the retrieved context.',
    '2. Reference organizations by name (for example, ' +
      (organizationExamples || 'the National Park Service') +
      ') instead of generic source numbers.',
    '3. Do not invent amenities, fees, availability, or policies.',
    '4. Keep each section short and scannable — 1 to 3 sentences or bullet-style lines.',
    '5. Use exactly these section headers in this order:',
    '## Overview',
    '## Amenities',
    '## Restrictions',
    '## Reservations',
    '## Highlights',
    '6. If a section lacks supporting context, write "Not available in official sources." for that section.',
    '7. Do not include a separate Sources list — citations are shown in the UI.',
    '8. Synthesize across all ' + sourceCount + ' retrieved documents without repeating duplicate facts.',
  ].join('\n')
}

/**
 * Parses markdown section headers into structured summary sections.
 * @param {string} answer
 * @returns {CampgroundSummarySections}
 */
export function parseSummarySections(answer) {
  /** @type {CampgroundSummarySections} */
  const sections = {
    overview: '',
    amenities: '',
    restrictions: '',
    reservations: '',
    highlights: '',
  }

  const headerPattern = /^##\s+(Overview|Amenities|Restrictions|Reservations|Highlights)\s*$/gim
  const matches = [...answer.matchAll(headerPattern)]

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index]
    const sectionName = match[1].toLowerCase()
    const contentStart = match.index + match[0].length
    const contentEnd = matches[index + 1]?.index ?? answer.length
    const content = answer.slice(contentStart, contentEnd).trim()

    if (sectionName in sections) {
      sections[/** @type {SummarySectionKey} */ (sectionName)] = content
    }
  }

  return sections
}

/**
 * @param {string} campgroundId
 * @param {string} [message]
 * @returns {CampgroundSummaryInsufficient}
 */
export function buildInsufficientSummaryResponse(
  campgroundId,
  message = 'No official knowledge documents are available for this campground yet.',
) {
  return {
    status: INSUFFICIENT_CONTEXT_STATUS,
    message,
    campgroundId,
  }
}

/**
 * Generates a grounded campground summary from official knowledge documents.
 * @param {{
 *   campgroundId: string,
 *   maxOutputTokens?: number,
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 * }} options
 * @returns {Promise<CampgroundSummaryResult>}
 */
export async function generateCampgroundSummary({
  campgroundId,
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
  answerProvider,
  provider,
} = {}) {
  const trimmedCampgroundId = (campgroundId ?? '').trim()

  if (trimmedCampgroundId.length === 0) {
    return buildInsufficientSummaryResponse('', 'campgroundId is required to generate a summary.')
  }

  const campground = getCampgroundById(trimmedCampgroundId)
  if (!campground) {
    return buildInsufficientSummaryResponse(trimmedCampgroundId, 'Campground not found.')
  }

  const results = orderSummaryDocuments(retrieveByCampground(trimmedCampgroundId))

  if (results.length === 0) {
    return buildInsufficientSummaryResponse(trimmedCampgroundId)
  }

  const context = buildRetrievalContext({
    question: SUMMARY_QUESTION,
    results,
  })

  const providerInstance = answerProvider ?? createAnswerProvider({ provider })

  const generationResult = await providerInstance.generateAnswer({
    instructions: buildCampgroundSummaryInstructions(
      campground.name,
      context.sourceCount,
      context.sources,
    ),
    input: context.promptContext,
    maxOutputTokens,
  })

  let answer = transformSourceReferences(generationResult.text, context.sources)
  answer = stripGenericSourcesBlock(answer)

  const sections = parseSummarySections(answer)
  const citations = context.sources.map(toGroundedAnswerCitation)
  const sources = deduplicateSourcesByUrl(context.sources)
  const evidence = buildSupportingEvidence(results)
  const confidence = calculateSummaryConfidence(results)

  return {
    status: SUCCESS_STATUS,
    campgroundId: trimmedCampgroundId,
    campgroundName: campground.name,
    sections,
    citations,
    sources,
    evidence,
    confidence,
    model: generationResult.model,
    inputTokens: generationResult.inputTokens,
    outputTokens: generationResult.outputTokens,
  }
}
