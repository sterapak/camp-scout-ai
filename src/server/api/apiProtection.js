/**
 * API access protection for /api/ask and /api/summary.
 * Requires an internal token and applies per-IP rate limits.
 */

import { timingSafeEqual } from 'node:crypto'

import { resolveAnswerProviderName } from '../openai/createAnswerProvider.js'

export const CAMP_SCOUT_API_TOKEN_ENV = 'CAMP_SCOUT_API_TOKEN'
export const API_RATE_LIMIT_ASK_ENV = 'API_RATE_LIMIT_ASK_PER_MINUTE'
export const API_RATE_LIMIT_SUMMARY_ENV = 'API_RATE_LIMIT_SUMMARY_PER_MINUTE'
export const API_TOKEN_HEADER = 'x-camp-scout-api-token'

export const API_ACCESS_NOT_CONFIGURED_MESSAGE =
  'AI API access is not configured. Contact the site administrator.'
export const API_UNAUTHORIZED_MESSAGE = 'Unauthorized.'
export const API_RATE_LIMIT_MESSAGE = 'Too many requests. Please try again later.'

const DEFAULT_ASK_RATE_LIMIT = 20
const DEFAULT_SUMMARY_RATE_LIMIT = 10
const RATE_LIMIT_WINDOW_MS = 60_000

/** @type {Map<string, { count: number, resetAt: number }>} */
const rateLimitBuckets = new Map()

/**
 * @returns {string | undefined}
 */
export function resolveConfiguredApiToken() {
  const token = process.env[CAMP_SCOUT_API_TOKEN_ENV]
  if (typeof token !== 'string') {
    return undefined
  }

  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * @returns {boolean}
 */
export function isApiAccessConfigured() {
  return Boolean(resolveConfiguredApiToken())
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string | null}
 */
export function extractRequestApiToken(req) {
  const authHeader = req.headers?.authorization ?? req.headers?.Authorization
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }

  const customHeader = req.headers?.[API_TOKEN_HEADER] ?? req.headers?.[API_TOKEN_HEADER.toUpperCase()]
  if (typeof customHeader === 'string') {
    return customHeader.trim()
  }

  return null
}

/**
 * @param {string | null | undefined} provided
 * @param {string | undefined} expected
 * @returns {boolean}
 */
export function tokensMatch(provided, expected) {
  if (!provided || !expected) {
    return false
  }

  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

/**
 * Validates API token access for protected routes.
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: true } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function validateApiAccess(req) {
  const configuredToken = resolveConfiguredApiToken()

  if (!configuredToken) {
    return {
      ok: false,
      statusCode: 503,
      body: { error: API_ACCESS_NOT_CONFIGURED_MESSAGE },
    }
  }

  const providedToken = extractRequestApiToken(req)
  if (!tokensMatch(providedToken, configuredToken)) {
    return {
      ok: false,
      statusCode: 401,
      body: { error: API_UNAUTHORIZED_MESSAGE },
    }
  }

  return { ok: true }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function resolveClientIp(req) {
  const forwardedFor = req.headers?.['x-forwarded-for']
  if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = req.headers?.['x-real-ip']
  if (typeof realIp === 'string' && realIp.trim().length > 0) {
    return realIp.trim()
  }

  return req.socket?.remoteAddress ?? 'unknown'
}

/**
 * @param {string} envName
 * @param {number} defaultValue
 * @returns {number}
 */
function resolveRateLimit(envName, defaultValue) {
  const parsed = Number.parseInt(process.env[envName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

/**
 * @param {string} route
 * @returns {number}
 */
export function resolveRouteRateLimit(route) {
  if (route === '/api/summary') {
    return resolveRateLimit(API_RATE_LIMIT_SUMMARY_ENV, DEFAULT_SUMMARY_RATE_LIMIT)
  }

  return resolveRateLimit(API_RATE_LIMIT_ASK_ENV, DEFAULT_ASK_RATE_LIMIT)
}

/**
 * Checks per-IP/per-route rate limits.
 * @param {string} route
 * @param {string} clientIp
 * @param {number} [now]
 * @returns {{ ok: true } | { ok: false, statusCode: number, body: { error: string } }}
 */
export function checkRouteRateLimit(route, clientIp, now = Date.now()) {
  const maxRequests = resolveRouteRateLimit(route)
  const bucketKey = `${route}:${clientIp}`
  const bucket = rateLimitBuckets.get(bucketKey)

  if (!bucket || now >= bucket.resetAt) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    return { ok: true }
  }

  if (bucket.count >= maxRequests) {
    return {
      ok: false,
      statusCode: 429,
      body: { error: API_RATE_LIMIT_MESSAGE },
    }
  }

  bucket.count += 1
  return { ok: true }
}

/**
 * Resolves the answer provider after successful API authentication.
 * OpenAI is only allowed once protected access is configured and validated.
 * @returns {import('../openai/createAnswerProvider.js').AnswerProviderName}
 */
export function resolveProtectedAnswerProvider() {
  return resolveAnswerProviderName(undefined, { protectedAccess: true })
}

/**
 * Clears in-memory rate limit state (for tests).
 */
export function resetRateLimitState() {
  rateLimitBuckets.clear()
}
