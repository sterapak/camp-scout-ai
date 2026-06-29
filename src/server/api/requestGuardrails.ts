/**
 * Request body guardrails for protected AI API routes.
 */

import type { ApiErrorResponse } from '../../shared/types/api.js'

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

export type GuardrailFailure = {
  ok: false
  statusCode: number
  body: ApiErrorResponse
}

export type GuardrailSuccess = { ok: true }

export type GuardrailResult = GuardrailSuccess | GuardrailFailure

function resolvePositiveIntEnv(envName: string, defaultValue: number): number {
  const parsed = Number.parseInt(process.env[envName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

export function resolveMaxQuestionLength(): number {
  return resolvePositiveIntEnv(API_MAX_QUESTION_LENGTH_ENV, DEFAULT_MAX_QUESTION_LENGTH)
}

export function resolveMaxTopDocumentCount(): number {
  return resolvePositiveIntEnv(API_MAX_TOP_DOCUMENT_COUNT_ENV, DEFAULT_MAX_TOP_DOCUMENT_COUNT)
}

export function resolveMaxCampgroundIdLength(): number {
  return resolvePositiveIntEnv(API_MAX_CAMPGROUND_ID_LENGTH_ENV, DEFAULT_MAX_CAMPGROUND_ID_LENGTH)
}

export function resolveMaxJsonBodyBytes(): number {
  return resolvePositiveIntEnv(API_MAX_JSON_BODY_BYTES_ENV, DEFAULT_MAX_JSON_BODY_BYTES)
}

export function looksLikeProbePattern(value: string): boolean {
  const normalized = (value ?? '').trim()
  if (normalized.length === 0) {
    return false
  }

  return PROBE_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function isValidTopDocumentCount(topDocumentCount: unknown): boolean {
  if (topDocumentCount === undefined) {
    return true
  }

  if (typeof topDocumentCount !== 'number' || !Number.isInteger(topDocumentCount)) {
    return false
  }

  return topDocumentCount >= 1 && topDocumentCount <= resolveMaxTopDocumentCount()
}

export interface AskGuardrailInput {
  question: string
  topDocumentCount?: number
  campgroundId?: string
  documentType?: string
}

export function validateAskRequestGuardrails(value: AskGuardrailInput): GuardrailResult {
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

export function validateSummaryRequestGuardrails(value: { campgroundId: string }): GuardrailResult {
  return validateCampgroundIdGuardrails(value.campgroundId)
}

export function validateCampgroundIdGuardrails(campgroundId: string): GuardrailResult {
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
