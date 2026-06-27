/**
 * Validates citation coverage for generated answers.
 * Server-only; never import from React client code.
 */

/**
 * @typedef {Object} CitationCoverageReport
 * @property {number} factualSentenceCount
 * @property {number} citedSentenceCount
 * @property {number} coverageRatio
 * @property {string[]} warnings
 */

const FACTUAL_SENTENCE_PATTERN = /\b(is|are|was|were|must|requires?|allows?|prohibits?|includes?|offers?|has|have|costs?|opens?|closes?)\b/i
const CITATION_PATTERN =
  /\[Source\s+\d+\]|(?:the\s+)?(?:National Park Service|U\.S\. Forest Service|California State Parks|Recreation\.gov|ReserveCalifornia|Pacific Gas and Electric Company|El Dorado Irrigation District|Official Source)/i

/**
 * Splits answer text into sentences for coverage analysis.
 * Avoids splitting on common abbreviations such as U.S.
 * @param {string} answer
 * @returns {string[]}
 */
export function splitAnswerSentences(answer) {
  const normalized = (answer ?? '').replace(/\bU\.S\./g, 'U_S_')
  return normalized
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.replace(/\bU_S_/g, 'U.S.').trim())
    .filter((sentence) => sentence.length > 0)
}

/**
 * Builds a citation coverage report for a generated answer.
 * @param {string} answer
 * @returns {CitationCoverageReport}
 */
export function validateCitationCoverage(answer) {
  const sentences = splitAnswerSentences(answer)
  const factualSentences = sentences.filter((sentence) => FACTUAL_SENTENCE_PATTERN.test(sentence))
  const citedSentences = factualSentences.filter((sentence) => CITATION_PATTERN.test(sentence))

  const factualSentenceCount = factualSentences.length
  const citedSentenceCount = citedSentences.length
  const coverageRatio =
    factualSentenceCount === 0 ? 1 : citedSentenceCount / factualSentenceCount

  /** @type {string[]} */
  const warnings = []

  if (factualSentenceCount > 0 && citedSentenceCount < factualSentenceCount) {
    warnings.push(
      `${factualSentenceCount - citedSentenceCount} factual statement(s) may be missing citations.`
    )
  }

  return {
    factualSentenceCount,
    citedSentenceCount,
    coverageRatio,
    warnings,
  }
}

/**
 * Returns grounding metrics for monitoring dashboards.
 * @param {{
 *   answer: string,
 *   citationCount: number,
 *   confidence: import('./answerTrust.js').AnswerConfidenceLevel,
 * }} params
 * @returns {{
 *   citationCount: number,
 *   confidence: import('./answerTrust.js').AnswerConfidenceLevel,
 *   coverageRatio: number,
 *   warnings: string[],
 * }}
 */
export function buildGroundingMetrics({ answer, citationCount, confidence }) {
  const coverage = validateCitationCoverage(answer)

  return {
    citationCount,
    confidence,
    coverageRatio: coverage.coverageRatio,
    warnings: coverage.warnings,
  }
}
