/**
 * Answer trust utilities — source deduplication, authority ordering,
 * confidence scoring, evidence extraction, and human-friendly references.
 * Server-only; never import from React client code.
 */

/** @typedef {'high' | 'medium' | 'low'} AnswerConfidenceLevel */

export type {
  AnswerConfidenceLevel,
  Evidence as SupportingEvidenceItem,
  UniqueSourceReference,
} from '../../shared/types/api.js'

/**
 * Authority rank for source organizations (lower rank = higher authority).
 * Unknown sources receive a high rank so they sort after recognized agencies.
 */
const SOURCE_AUTHORITY_RANK = {
  'National Park Service': 1,
  'U.S. Forest Service': 2,
  'California State Parks': 3,
  'Pacific Gas and Electric Company': 4,
  'El Dorado Irrigation District': 5,
  'Recreation.gov': 6,
  'ReserveCalifornia': 7,
  'Official Source': 99,
}

const DEFAULT_AUTHORITY_RANK = 50

const HIGH_CONFIDENCE_MIN_SCORE = 40
const MEDIUM_CONFIDENCE_MIN_SCORE = 15

const EVIDENCE_EXCERPT_MAX_LENGTH = 280

/**
 * Returns the authority rank for a source organization name.
 * @param {string} sourceName
 * @returns {number}
 */
export function getSourceAuthorityRank(sourceName) {
  return SOURCE_AUTHORITY_RANK[sourceName] ?? DEFAULT_AUTHORITY_RANK
}

/**
 * @param {{ sourceName: string, sourceUrl: string }} left
 * @param {{ sourceName: string, sourceUrl: string }} right
 * @returns {number}
 */
function compareSourcesByAuthority(left, right) {
  const rankDifference = getSourceAuthorityRank(left.sourceName) - getSourceAuthorityRank(right.sourceName)
  if (rankDifference !== 0) {
    return rankDifference
  }

  return left.sourceName.localeCompare(right.sourceName)
}

/**
 * Deduplicates sources by URL while preserving the highest-authority entry per URL.
 * @param {Array<{ sourceName: string, sourceUrl: string }>} sources
 * @returns {UniqueSourceReference[]}
 */
export function deduplicateSourcesByUrl(sources) {
  /** @type {Map<string, UniqueSourceReference>} */
  const uniqueByUrl = new Map()

  for (const source of sources) {
    const normalizedUrl = normalizeSourceUrl(source.sourceUrl)
    if (!normalizedUrl) {
      continue
    }

    const candidate = {
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl,
      authorityRank: getSourceAuthorityRank(source.sourceName),
    }

    const existing = uniqueByUrl.get(normalizedUrl)
    if (!existing || candidate.authorityRank < existing.authorityRank) {
      uniqueByUrl.set(normalizedUrl, candidate)
    }
  }

  return [...uniqueByUrl.values()].sort(compareSourcesByAuthority)
}

/**
 * Calculates answer confidence from retrieval relevance scores.
 * @param {number[]} relevanceScores
 * @returns {AnswerConfidenceLevel}
 */
export function calculateAnswerConfidence(relevanceScores) {
  if (!Array.isArray(relevanceScores) || relevanceScores.length === 0) {
    return 'low'
  }

  const topScore = Math.max(...relevanceScores)
  const averageScore =
    relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length

  if (topScore >= HIGH_CONFIDENCE_MIN_SCORE && averageScore >= MEDIUM_CONFIDENCE_MIN_SCORE) {
    return 'high'
  }

  if (topScore >= MEDIUM_CONFIDENCE_MIN_SCORE) {
    return 'medium'
  }

  return 'low'
}

/**
 * Builds a readable excerpt from document content.
 * @param {string} content
 * @param {number} [maxLength]
 * @returns {string}
 */
export function buildEvidenceExcerpt(content, maxLength = EVIDENCE_EXCERPT_MAX_LENGTH) {
  const normalized = (content ?? '').replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxLength) {
    return normalized
  }

  const truncated = normalized.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  const safeLength = lastSpace > maxLength * 0.6 ? lastSpace : maxLength
  return `${truncated.slice(0, safeLength).trim()}…`
}

/**
 * Builds supporting evidence items from retrieval results.
 * @param {import('../../data/knowledge/knowledgeRetrieval.js').RetrievalResult[]} results
 * @returns {SupportingEvidenceItem[]}
 */
export function buildSupportingEvidence(results) {
  return results.map((result, index) => ({
    citationId: result.document.id,
    citationIndex: index + 1,
    excerpt: buildEvidenceExcerpt(result.document.content),
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    title: result.document.title,
    campgroundName: result.campgroundName,
    documentType: result.document.documentType,
  }))
}

/**
 * Formats an organization name for inline answer references.
 * @param {string} sourceName
 * @returns {string}
 */
export function formatOrganizationReference(sourceName) {
  const trimmed = (sourceName ?? '').trim()
  if (trimmed.length === 0) {
    return 'the official source'
  }

  if (/^(the|a|an)\s/i.test(trimmed)) {
    return trimmed
  }

  return `the ${trimmed}`
}

/**
 * Replaces [Source N] references with human-friendly organization names.
 * Removes generic "Source N" labels from the answer body and Sources block.
 * @param {string} answer
 * @param {Array<{ sourceName: string, sourceUrl: string }>} sources
 * @returns {string}
 */
export function transformSourceReferences(answer, sources) {
  if (typeof answer !== 'string' || answer.length === 0) {
    return answer ?? ''
  }

  let transformed = answer

  sources.forEach((source, index) => {
    const sourceNumber = index + 1
    const organization = formatOrganizationReference(source.sourceName)
    const citationPattern = new RegExp(`\\[Source\\s+${sourceNumber}\\]`, 'gi')
    transformed = transformed.replace(citationPattern, organization)
  })

  transformed = transformed.replace(/\bSources:\s*\n(?:-?\s*\[Source\s+\d+\][^\n]*\n?)+/gi, '')
  transformed = transformed.replace(/\n{3,}/g, '\n\n').trim()

  return transformed
}

/**
 * Strips trailing generic Sources blocks that duplicate the UI Sources section.
 * @param {string} answer
 * @returns {string}
 */
export function stripGenericSourcesBlock(answer) {
  return (answer ?? '')
    .replace(/\bSources:\s*\n(?:-?\s*(?:\[Source\s+\d+\]|the\s)[^\n]*\n?)+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {string} sourceUrl
 * @returns {string}
 */
function normalizeSourceUrl(sourceUrl) {
  try {
    const url = new URL(sourceUrl)
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return (sourceUrl ?? '').trim().toLowerCase()
  }
}
