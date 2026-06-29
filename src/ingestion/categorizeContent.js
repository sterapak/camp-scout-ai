// @ts-nocheck
import { KNOWLEDGE_DOCUMENT_TYPES } from '../data/knowledgeSchema.js'

const DOCUMENT_TYPE_ORDER = ['description', 'rules', 'reservation', 'alert']

const CATEGORY_PATTERNS = {
  description: [
    /\boverview\b/i,
    /\blocated\b/i,
    /\belevation\b/i,
    /\bamenit/i,
    /\bcampground offers\b/i,
    /\bstate park\b/i,
    /\bnational park\b/i,
    /\baccommodat/i,
    /\btrail\b/i,
    /\bscenic\b/i,
    /\bforest\b/i,
    /\blake\b/i,
    /\briver\b/i,
    /\bmountain\b/i,
    /\bopen (year-round|seasonally)\b/i,
  ],
  rules: [
    /\brules?\b/i,
    /\bregulation/i,
    /\bquiet hours?\b/i,
    /\bfires?\b/i,
    /\bdogs?\b/i,
    /\bbear/i,
    /\bfood storage\b/i,
    /\bfood locker/i,
    /\bbear[- ]resistant\b/i,
    /\bbear canister/i,
    /\bmetal locker/i,
    /\bscented items\b/i,
    /\btoiletries\b/i,
    /\bmaximum\b/i,
    /\bprohibited\b/i,
    /\bnot permitted\b/i,
    /\brequired by law\b/i,
    /\bgenerator/i,
    /\bcheck-out\b/i,
    /\bcheck-in\b/i,
    /\bper site\b/i,
    /\bleash\b/i,
  ],
  reservation: [
    /\breserv/i,
    /\breservecalifornia\b/i,
    /\brecreation\.gov\b/i,
    /\bbooking\b/i,
    /\bfees?\b/i,
    /\bavailability\b/i,
    /\bfirst-come first-served\b/i,
    /\bcheck-in time\b/i,
    /\bcheck-out time\b/i,
    /\bcancellation\b/i,
    /\bkiosk\b/i,
    /\bday use\b/i,
    /\bentry fee\b/i,
    /\bmax (trailer|camper|motorhome)\b/i,
  ],
  alert: [
    /\balert\b/i,
    /\bwarning\b/i,
    /\badvisory\b/i,
    /\bnotice\b/i,
    /\bclosure\b/i,
    /\bhazard\b/i,
    /\bemergency\b/i,
    /\bincident update\b/i,
    /\bseasonal alert\b/i,
    /\bblack bear/i,
    /\bimpoundment\b/i,
    /\bnever feed\b/i,
    /\bbecome aggressive\b/i,
    /\bhuman food\b/i,
  ],
}

const NOISE_PATTERNS = [
  /^accessibility and parks$/i,
  /^organizational structure/i,
  /^frequently asked questions$/i,
  /^© copyright/i,
  /^last checked:/i,
  /^view the full gallery$/i,
  /^skip to main content$/i,
  /^open sunrise to sunset$/i,
  /^upcoming availability$/i,
  /^reservation availability$/i,
  /^reservecalifornia$/i,
  /^golden bear pass$/i,
  /^senior golden bear pass$/i,
  /^golden poppy vehicle day use annual pass$/i,
  /^california explorer vehicle day use annual pass$/i,
  /^current advisories and notices$/i,
  /^historical\/cultural site$/i,
  /^school field trip/i,
  /^special events/i,
  /^filming & photography$/i,
  /^weddings at state parks$/i,
  /^official websites use \.gov/i,
  /^secure \.gov websites use https/i,
  /^share sensitive information only on official, secure websites$/i,
]

/**
 * @typedef {Record<import('../data/knowledgeSchema.js').KnowledgeDocumentType, string[]>} CategorizedParagraphs
 */

/**
 * Scores a paragraph against a document type using keyword patterns.
 * @param {string} paragraph
 * @param {import('../data/knowledgeSchema.js').KnowledgeDocumentType} documentType
 * @returns {number}
 */
export function scoreParagraphForType(paragraph, documentType) {
  const patterns = CATEGORY_PATTERNS[documentType] ?? []
  let score = 0

  for (const pattern of patterns) {
    if (pattern.test(paragraph)) {
      score += 1
    }
  }

  return score
}

/**
 * Determines whether a paragraph should be excluded from knowledge content.
 * @param {string} paragraph
 * @returns {boolean}
 */
export function isNoiseParagraph(paragraph) {
  const trimmed = paragraph.trim()

  if (trimmed.length < 20) {
    return true
  }

  return NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

/**
 * Assigns extracted paragraphs to knowledge document categories.
 * @param {string[]} paragraphs
 * @returns {CategorizedParagraphs}
 */
export function categorizeParagraphs(paragraphs) {
  /** @type {CategorizedParagraphs} */
  const categorized = {
    description: [],
    rules: [],
    reservation: [],
    alert: [],
  }

  const usableParagraphs = paragraphs.filter((paragraph) => !isNoiseParagraph(paragraph))

  for (const paragraph of usableParagraphs) {
    let bestType = 'description'
    let bestScore = 0

    for (const documentType of DOCUMENT_TYPE_ORDER) {
      const score = scoreParagraphForType(paragraph, documentType)
      if (score > bestScore) {
        bestScore = score
        bestType = documentType
      }
    }

    if (bestScore === 0) {
      categorized.description.push(paragraph)
      continue
    }

    categorized[bestType].push(paragraph)
  }

  ensureMinimumCoverage(categorized, usableParagraphs)
  sortCategorizedParagraphs(categorized)

  return categorized
}

/**
 * Splits readable text into categorized paragraph groups.
 * @param {string} readableText
 * @returns {CategorizedParagraphs}
 */
export function categorizeContent(readableText) {
  const paragraphs = readableText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  return categorizeParagraphs(paragraphs)
}

/**
 * @param {CategorizedParagraphs} categorized
 * @param {string[]} fallbackParagraphs
 */
function ensureMinimumCoverage(categorized, fallbackParagraphs) {
  for (const documentType of ['description', 'rules', 'reservation']) {
    if (categorized[documentType].length === 0 && fallbackParagraphs.length > 0) {
      categorized[documentType].push(fallbackParagraphs[0])
    }
  }

  if (categorized.description.length === 0 && fallbackParagraphs.length > 0) {
    categorized.description.push(...fallbackParagraphs.slice(0, 3))
  }
}

/**
 * Returns document types that should be written for categorized content.
 * @param {CategorizedParagraphs} categorized
 * @returns {import('../data/knowledgeSchema.js').KnowledgeDocumentType[]}
 */
export function getDocumentTypesToWrite(categorized) {
  const requiredTypes = ['description', 'rules', 'reservation']
  const types = requiredTypes.filter((documentType) => categorized[documentType].length > 0)

  if (categorized.alert.length > 0) {
    types.push('alert')
  }

  return types.filter((documentType) => KNOWLEDGE_DOCUMENT_TYPES.includes(documentType))
}

/**
 * Prioritizes high-value paragraphs within each document category.
 * @param {CategorizedParagraphs} categorized
 */
export function sortCategorizedParagraphs(categorized) {
  categorized.rules = sortParagraphs(categorized.rules, scoreRulesParagraphPriority)
  categorized.alert = sortParagraphs(categorized.alert, scoreAlertParagraphPriority)
}

/**
 * @param {string[]} paragraphs
 * @param {(paragraph: string) => number} scoreFn
 * @returns {string[]}
 */
function sortParagraphs(paragraphs, scoreFn) {
  return [...paragraphs].sort((left, right) => scoreFn(right) - scoreFn(left))
}

/**
 * @param {string} paragraph
 * @returns {number}
 */
export function scoreRulesParagraphPriority(paragraph) {
  let score = 0

  if (/food storage/i.test(paragraph)) score += 4
  if (/bear/i.test(paragraph)) score += 3
  if (/locker|canister|bear-resistant/i.test(paragraph)) score += 3
  if (/toiletries|scented items/i.test(paragraph)) score += 2
  if (/federal law|impoundment|citation/i.test(paragraph)) score += 2

  return score
}

/**
 * @param {string} paragraph
 * @returns {number}
 */
export function scoreAlertParagraphPriority(paragraph) {
  let score = 0

  if (/alert|warning|advisory/i.test(paragraph)) score += 3
  if (/bear/i.test(paragraph)) score += 3
  if (/impoundment|aggressive|never feed/i.test(paragraph)) score += 2

  return score
}
