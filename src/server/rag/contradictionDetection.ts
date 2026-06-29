/**
 * Detects contradictory statements across retrieved knowledge documents.
 * Server-only; never import from React client code.
 */

export type { ContradictionWarning } from '../../shared/types/api.js'

const CONTRADICTION_RULES = [
  {
    topic: 'Dogs allowed',
    positivePattern: /\bdogs?\s+(are\s+)?(allowed|permitted|welcome)\b/i,
    negativePattern: /\b(no\s+dogs?|dogs?\s+(are\s+)?not\s+(allowed|permitted)|dogs?\s+(are\s+)?prohibited|prohibited:\s*dogs?)\b/i,
  },
  {
    topic: 'Fires allowed',
    positivePattern: /\b(campfires?|fires?)\s+(are\s+)?(allowed|permitted)\b|\bfire\s+rings?\s+are\s+available\b/i,
    negativePattern: /\b(no\s+(camp)?fires?|(camp)?fires?\s+(are\s+)?not\s+(allowed|permitted)|fire\s+restrictions?\s+(are\s+)?in\s+effect)\b/i,
  },
  {
    topic: 'Generator use',
    positivePattern: /\bgenerators?\s+(are\s+)?(allowed|permitted)\b/i,
    negativePattern: /\b(no\s+generators?|generators?\s+(are\s+)?not\s+(allowed|permitted|prohibited))\b/i,
  },
  {
    topic: 'Reservations required',
    positivePattern: /\breservations?\s+(are\s+)?required\b|\badvance\s+reservations?\s+(are\s+)?required\b/i,
    negativePattern: /\bfirst[- ]come[, ]*first[- ]served\b|\bno\s+reservations?\s+required\b|\bwalk[- ]in\s+only\b/i,
  },
]

/**
 * @param {string} content
 * @param {RegExp} pattern
 * @returns {string | null}
 */
function extractMatchingSentence(content, pattern) {
  const sentences = content.split(/(?<=[.!?])\s+/)
  for (const sentence of sentences) {
    if (pattern.test(sentence)) {
      return sentence.trim()
    }
  }

  if (pattern.test(content)) {
    return content.slice(0, 180).trim()
  }

  return null
}

/**
 * Detects contradictions across retrieved documents for known policy topics.
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @returns {ContradictionWarning | null}
 */
export function detectContradictions(results) {
  if (!Array.isArray(results) || results.length < 2) {
    return null
  }

  for (const rule of CONTRADICTION_RULES) {
    /** @type {Array<{ sourceName: string, sourceUrl: string, statement: string, citationId: string, polarity: 'positive' | 'negative' }>} */
    const matches = []

    for (const result of results) {
      const content = result.document.content ?? ''
      const positiveStatement = extractMatchingSentence(content, rule.positivePattern)
      const negativeStatement = extractMatchingSentence(content, rule.negativePattern)

      if (positiveStatement && !rule.negativePattern.test(positiveStatement)) {
        matches.push({
          sourceName: result.sourceName,
          sourceUrl: result.sourceUrl,
          statement: positiveStatement,
          citationId: result.document.id,
          polarity: 'positive',
        })
      }

      if (negativeStatement && !rule.positivePattern.test(negativeStatement)) {
        matches.push({
          sourceName: result.sourceName,
          sourceUrl: result.sourceUrl,
          statement: negativeStatement,
          citationId: result.document.id,
          polarity: 'negative',
        })
      }
    }

    const positiveMatches = matches.filter((match) => match.polarity === 'positive')
    const negativeMatches = matches.filter((match) => match.polarity === 'negative')

    if (positiveMatches.length > 0 && negativeMatches.length > 0) {
      const uniqueSources = new Map()
      for (const match of [...positiveMatches, ...negativeMatches]) {
        uniqueSources.set(match.citationId, {
          sourceName: match.sourceName,
          sourceUrl: match.sourceUrl,
          statement: match.statement,
          citationId: match.citationId,
        })
      }

      return {
        topic: rule.topic,
        message:
          `Official sources disagree about ${rule.topic.toLowerCase()}. ` +
          'Review the cited documents and check the official websites for the most current information.',
        conflictingSources: [...uniqueSources.values()],
      }
    }
  }

  return null
}
