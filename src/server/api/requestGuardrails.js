/**
 * Request body guardrails for protected AI API routes.
 */

export const API_MAX_QUESTION_LENGTH_ENV = 'API_MAX_QUESTION_LENGTH'
export const API_MAX_TOP_DOCUMENT_COUNT_ENV = 'API_MAX_TOP_DOCUMENT_COUNT'
export const API_MAX_CAMPGROUND_ID_LENGTH_ENV = 'API_MAX_CAMPGROUND_ID_LENGTH'
export const API_MAX_JSON_BODY_BYTES_ENV = 'API_MAX_JSON_BODY_BYTES'

export const DEFAULT_MAX_QUESTION_LENGTH = 500
export const DEFAULT_MAX_TOP_DOCUMENT_COUNT = 5
export const DEFAULT_MAX_CAMPGROUND_ID_LENGTH = 100
export const DEFAULT_MAX_JSON_BODY_BYTES = 16_384

export const QUESTION_TOO_LONG_ERROR = 'question exceeds the maximum allowed length.'
export const TOP_DOCUMENT_COUNT_INVALID_ERROR =
  'topDocumentCount must be a positive integer within the allowed limit.'
export const PROBE_PATTERN_DETECTED_ERROR = 'Request rejected due to invalid input.'
export const CAMPGROUND_ID_TOO_LONG_ERROR = 'campgroundId exceeds the maximum allowed length.'
export const CAMPGROUND_ID_INVALID_ERROR = 'campgroundId contains invalid characters.'
export const JSON_BODY_TOO_LARGE_ERROR = 'Request body is too large.'

const PROBE_PATTERNS = [
  /(.)\1{49,}/,
  /\b(load\s*test|loadtest|artillery|apachebench|hey\.load|k6-|siege)\b/i,
  /ignore (all )?(previous|prior) instructions/i,
  /\b(system|assistant)\s*:\s*/i,
  /\bunion\b.+\bselect\b/i,
  /\bdrop\s+table\b/i,
  /[\x00-\x08\x0b\x0c\x0e-\x1f]/,
]

/**
 * @param {string} envName
 * @param {number} defaultValue
 * @returns {number}
 */
function resolvePositiveIntEnv(envName, defaultValue) {
  const parsed = Number.parseInt(process.env[envName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

/**
 * @returns {number}
 */
export function resolveMaxQuestionLength() {
  return resolvePositiveIntEnv(API_MAX_QUESTION_LENGTH_ENV, DEFAULT_MAX_QUESTION_LENGTH)
}

/**
 * @returns {number}
 */
export function resolveMaxTopDocumentCount() {
  return resolvePositiveIntEnv(API_MAX_TOP_DOCUMENT_COUNT_ENV, DEFAULT_MAX_TOP_DOCUMENT_COUNT)
}

/**
 * @returns {number}
 */
export function resolveMaxCampgroundIdLength() {
  return resolvePositiveIntEnv(API_MAX_CAMPGROUND_ID_LENGTH_ENV, DEFAULT_MAX_CAMPGROUND_ID_LENGTH)
}

/**
 * @returns {number}
 */
export function resolveMaxJsonBodyBytes() {
  return resolvePositiveIntEnv(API_MAX_JSON_BODY_BYTES_ENV, DEFAULT_MAX_JSON_BODY_BYTES)
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function looksLikeProbePattern(value) {
  const normalized = (value ?? '').trim()
  if (normalized.length === 0) {
    return false
  }

  return PROBE_PATTERNS.some((pattern) => pattern.test(normalized))
}

/**
 * @param {unknown} topDocumentCount
 * @returns {boolean}
 */
export function isValidTopDocumentCount(topDocumentCount) {
  if (topDocumentCount === undefined) {
    return true
  }

  if (typeof topDocumentCount !== 'number' || !Number.isInteger(topDocumentCount)) {
    return false
  }

  return topDocumentCount >= 1 && topDocumentCount <= resolveMaxTopDocumentCount()
}

/**
 * Validates ask-specific request guardrails.
 * @param {{ question: string, topDocumentCount?: number }} value
 * @returns {{ ok: true } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function validateAskRequestGuardrails(value) {
  if (value.question.length > resolveMaxQuestionLength()) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: QUESTION_TOO_LONG_ERROR },
    }
  }

  if (looksLikeProbePattern(value.question)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: PROBE_PATTERN_DETECTED_ERROR },
    }
  }

  if (!isValidTopDocumentCount(value.topDocumentCount)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: TOP_DOCUMENT_COUNT_INVALID_ERROR },
    }
  }

  if (typeof value.campgroundId === 'string') {
    const campgroundGuardrail = validateCampgroundIdGuardrails(value.campgroundId)
    if (!campgroundGuardrail.ok) {
      return campgroundGuardrail
    }
  }

  if (typeof value.documentType === 'string' && looksLikeProbePattern(value.documentType)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: PROBE_PATTERN_DETECTED_ERROR },
    }
  }

  return { ok: true }
}

/**
 * Validates summary-specific request guardrails.
 * @param {{ campgroundId: string }} value
 * @returns {{ ok: true } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function validateSummaryRequestGuardrails(value) {
  return validateCampgroundIdGuardrails(value.campgroundId)
}

/**
 * @param {string} campgroundId
 * @returns {{ ok: true } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function validateCampgroundIdGuardrails(campgroundId) {
  if (campgroundId.length > resolveMaxCampgroundIdLength()) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: CAMPGROUND_ID_TOO_LONG_ERROR },
    }
  }

  if (looksLikeProbePattern(campgroundId)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: PROBE_PATTERN_DETECTED_ERROR },
    }
  }

  if (!/^[a-z0-9-]+$/.test(campgroundId)) {
    return {
      ok: false,
      statusCode: 400,
      body: { error: CAMPGROUND_ID_INVALID_ERROR },
    }
  }

  return { ok: true }
}

export class JsonBodyTooLargeError extends Error {
  constructor(message = JSON_BODY_TOO_LARGE_ERROR) {
    super(message)
    this.name = 'JsonBodyTooLargeError'
  }
}
