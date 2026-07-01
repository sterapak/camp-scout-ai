/**
 * Extracts verified campground pricing from official knowledge documents.
 * Never estimates or invents fees — only parses amounts explicitly present in text.
 */

import type { RetrievalResult } from './knowledgeRetrieval.js'

export type CampgroundFeeType = 'camping' | 'day_use' | 'supplemental' | 'fine'

export interface ExtractedCampgroundFee {
  amountUsd: number
  label: string
  feeType: CampgroundFeeType
  excerpt: string
}

export interface CampgroundPricingRecord {
  campgroundId: string
  campgroundName: string
  documentId: string
  documentType: string
  sourceName: string
  sourceUrl: string
  fees: ExtractedCampgroundFee[]
  lowestCampingFeeUsd?: number
}

export interface RankedCampgroundPricing {
  campgroundId: string
  campgroundName: string
  lowestCampingFeeUsd: number
  feeLabel: string
  sourceName: string
  sourceUrl: string
  documentId: string
}

const PRICE_DOCUMENT_TYPE_ORDER = ['reservation', 'rules', 'description', 'alert']

const CAMPING_FEE_RULES = [
  {
    pattern: /\bsingle site fee is \$(\d+(?:\.\d{2})?)/gi,
    label: 'single site fee',
    feeType: 'camping' as const,
  },
  {
    pattern: /\bdouble site fee is \$(\d+(?:\.\d{2})?)/gi,
    label: 'double site fee',
    feeType: 'camping' as const,
  },
  {
    pattern: /\$(\d+(?:\.\d{2})?)\s*(?:per|\/)\s*night\b/gi,
    label: 'nightly rate',
    feeType: 'camping' as const,
  },
  {
    pattern: /\bcamping fees?\b[^.$]{0,40}\$(\d+(?:\.\d{2})?)/gi,
    label: 'camping fee',
    feeType: 'camping' as const,
  },
  {
    pattern: /\bsite fees?\b[^.$]{0,40}\$(\d+(?:\.\d{2})?)/gi,
    label: 'site fee',
    feeType: 'camping' as const,
  },
]

const DAY_USE_FEE_RULES = [
  {
    pattern: /\bday[- ]use fee[^.$]{0,40}\$(\d+(?:\.\d{2})?)/gi,
    label: 'day-use fee',
    feeType: 'day_use' as const,
  },
  {
    pattern: /\$(\d+(?:\.\d{2})?)[^.$]{0,30}day[- ]use fee/gi,
    label: 'day-use fee',
    feeType: 'day_use' as const,
  },
  {
    pattern: /\$(\d+(?:\.\d{2})?)\s*(?:per vehicle )?for the day\b/gi,
    label: 'day-use fee',
    feeType: 'day_use' as const,
  },
  {
    pattern: /\bentry fee[^.$]{0,40}\$(\d+(?:\.\d{2})?)/gi,
    label: 'entry fee',
    feeType: 'day_use' as const,
  },
]

const SUPPLEMENTAL_FEE_RULES = [
  {
    pattern: /\bsecond vehicle \$(\d+(?:\.\d{2})?)/gi,
    label: 'second vehicle fee',
    feeType: 'supplemental' as const,
  },
  {
    pattern: /\badditional vehicle fees?\b[^.$]{0,40}\$(\d+(?:\.\d{2})?)/gi,
    label: 'additional vehicle fee',
    feeType: 'supplemental' as const,
  },
]

/**
 * @param {string} content
 * @param {string} matchText
 * @returns {string}
 */
function buildFeeExcerpt(content, matchText) {
  const index = content.indexOf(matchText)
  if (index === -1) {
    return matchText.trim()
  }

  const start = Math.max(0, index - 40)
  const end = Math.min(content.length, index + matchText.length + 40)
  return content.slice(start, end).replace(/\s+/g, ' ').trim()
}

/**
 * @param {string} content
 * @param {{ pattern: RegExp, label: string, feeType: CampgroundFeeType }} rule
 * @returns {ExtractedCampgroundFee[]}
 */
function extractFeesWithRule(content, rule) {
  const fees = []
  const pattern = new RegExp(rule.pattern.source, rule.pattern.flags)
  let match = pattern.exec(content)

  while (match) {
    const amountUsd = Number.parseFloat(match[1])
    if (Number.isFinite(amountUsd) && amountUsd > 0) {
      fees.push({
        amountUsd,
        label: rule.label,
        feeType: rule.feeType,
        excerpt: buildFeeExcerpt(content, match[0]),
      })
    }

    match = pattern.exec(content)
  }

  return fees
}

/**
 * Extracts fee amounts explicitly present in document content.
 * @param {string} content
 * @returns {ExtractedCampgroundFee[]}
 */
export function extractFeesFromContent(content) {
  const normalizedContent = (content ?? '').trim()
  if (normalizedContent.length === 0) {
    return []
  }

  const campingFees = CAMPING_FEE_RULES.flatMap((rule) => extractFeesWithRule(normalizedContent, rule))
  const dayUseFees = DAY_USE_FEE_RULES.flatMap((rule) => extractFeesWithRule(normalizedContent, rule))
  const supplementalFees = SUPPLEMENTAL_FEE_RULES.flatMap((rule) => extractFeesWithRule(normalizedContent, rule))

  return [...campingFees, ...dayUseFees, ...supplementalFees]
}

/**
 * @param {RetrievalResult} result
 * @returns {CampgroundPricingRecord | null}
 */
export function extractCampgroundPricingFromResult(result) {
  const fees = extractFeesFromContent(result.document.content)
  if (fees.length === 0) {
    return null
  }

  const campingFees = fees.filter((fee) => fee.feeType === 'camping')
  const lowestCampingFeeUsd = campingFees.length > 0
    ? Math.min(...campingFees.map((fee) => fee.amountUsd))
    : undefined

  return {
    campgroundId: result.document.campgroundId,
    campgroundName: result.campgroundName ?? result.document.campgroundId,
    documentId: result.document.id,
    documentType: result.document.documentType,
    sourceName: result.sourceName,
    sourceUrl: result.sourceUrl,
    fees,
    lowestCampingFeeUsd,
  }
}

/**
 * @param {RetrievalResult[]} results
 * @returns {CampgroundPricingRecord[]}
 */
export function extractCampgroundPricingFromResults(results) {
  return results
    .map((result) => extractCampgroundPricingFromResult(result))
    .filter((record) => record !== null)
}

/**
 * Ranks campgrounds by lowest verified nightly/site camping fee.
 * Only campgrounds with explicit camping fee amounts are included.
 * @param {CampgroundPricingRecord[]} records
 * @returns {RankedCampgroundPricing[]}
 */
export function rankCampgroundsByCampingFee(records) {
  /** @type {Map<string, RankedCampgroundPricing>} */
  const rankedByCampground = new Map()

  for (const record of records) {
    const campingFees = record.fees.filter((fee) => fee.feeType === 'camping')
    if (campingFees.length === 0) {
      continue
    }

    const lowestFee = campingFees.reduce((currentLowest, fee) => (
      fee.amountUsd < currentLowest.amountUsd ? fee : currentLowest
    ))

    const existing = rankedByCampground.get(record.campgroundId)
    if (existing && existing.lowestCampingFeeUsd <= lowestFee.amountUsd) {
      continue
    }

    rankedByCampground.set(record.campgroundId, {
      campgroundId: record.campgroundId,
      campgroundName: record.campgroundName,
      lowestCampingFeeUsd: lowestFee.amountUsd,
      feeLabel: lowestFee.label,
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
      documentId: record.documentId,
    })
  }

  return [...rankedByCampground.values()].sort(
    (left, right) => left.lowestCampingFeeUsd - right.lowestCampingFeeUsd,
  )
}

/**
 * @param {RankedCampgroundPricing[]} rankedCampgrounds
 * @returns {boolean}
 */
export function hasSufficientPricingForCheapestComparison(rankedCampgrounds) {
  return rankedCampgrounds.length >= 2
}

export const INSUFFICIENT_PRICING_COMPARISON_MESSAGE =
  'The official reservation and policy documents in my knowledge base do not include enough verified nightly camping fees to compare campground prices or determine the cheapest campground. Many campgrounds direct visitors to ReserveCalifornia.com or Recreation.gov for current rates. I can help with other official facts like reservations, rules, and amenities from verified sources.'

/**
 * Sorts retrieval results for pricing questions: reservation and rules before descriptions.
 * @param {RetrievalResult[]} results
 * @returns {RetrievalResult[]}
 */
export function sortResultsForPriceQuestion(results) {
  return [...results].sort((left, right) => {
    const leftTypeRank = PRICE_DOCUMENT_TYPE_ORDER.indexOf(left.document.documentType)
    const rightTypeRank = PRICE_DOCUMENT_TYPE_ORDER.indexOf(right.document.documentType)
    const normalizedLeftTypeRank = leftTypeRank === -1 ? PRICE_DOCUMENT_TYPE_ORDER.length : leftTypeRank
    const normalizedRightTypeRank = rightTypeRank === -1 ? PRICE_DOCUMENT_TYPE_ORDER.length : rightTypeRank

    if (normalizedLeftTypeRank !== normalizedRightTypeRank) {
      return normalizedLeftTypeRank - normalizedRightTypeRank
    }

    const leftHasCampingFee = extractFeesFromContent(left.document.content)
      .some((fee) => fee.feeType === 'camping')
    const rightHasCampingFee = extractFeesFromContent(right.document.content)
      .some((fee) => fee.feeType === 'camping')

    if (leftHasCampingFee !== rightHasCampingFee) {
      return leftHasCampingFee ? -1 : 1
    }

    return right.relevanceScore - left.relevanceScore
  })
}

/**
 * Builds a verified pricing summary block for the LLM prompt.
 * @param {CampgroundPricingRecord[]} pricingRecords
 * @param {RankedCampgroundPricing[]} [rankedCampgrounds]
 * @returns {string}
 */
export function buildVerifiedPricingPromptSection(pricingRecords, rankedCampgrounds = []) {
  if (pricingRecords.length === 0) {
    return ''
  }

  const lines = [
    'Verified pricing extracted from official sources (do not add amounts not listed here):',
  ]

  for (const record of pricingRecords) {
    for (const fee of record.fees) {
      lines.push(
        `- ${record.campgroundName} (${record.documentType}): ${fee.label} $${fee.amountUsd.toFixed(2)} — ${record.sourceName} (${record.sourceUrl})`,
      )
    }
  }

  if (rankedCampgrounds.length > 0) {
    lines.push('')
    lines.push('Campgrounds ranked by lowest verified camping/site fee (official data only):')
    rankedCampgrounds.forEach((entry, index) => {
      lines.push(
        `${index + 1}. ${entry.campgroundName} — $${entry.lowestCampingFeeUsd.toFixed(2)} (${entry.feeLabel}) — ${entry.sourceName}`,
      )
    })
  }

  return lines.join('\n')
}
