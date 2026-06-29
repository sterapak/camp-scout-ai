/**
 * API access protection for /api/ask and /api/summary.
 * Requires an internal token and applies per-IP rate limits.
 */

import { timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'

import type { ApiErrorResponse } from '../../shared/types/api.js'
import { resolveAnswerProviderName, type AnswerProviderName } from '../openai/createAnswerProvider.js'

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

interface RateLimitBucket {
  count: number
  resetAt: number
}

const rateLimitBuckets = new Map<string, RateLimitBucket>()

export type ApiAccessFailure = {
  ok: false
  statusCode: number
  body: ApiErrorResponse
}

export type ApiAccessSuccess = { ok: true }

export type ApiAccessResult = ApiAccessSuccess | ApiAccessFailure

export function resolveConfiguredApiToken(): string | undefined {
  const token = process.env[CAMP_SCOUT_API_TOKEN_ENV]
  if (typeof token !== 'string') {
    return undefined
  }

  const trimmed = token.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

export function isApiAccessConfigured(): boolean {
  return Boolean(resolveConfiguredApiToken())
}

export function extractRequestApiToken(req: IncomingMessage): string | null {
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

export function tokensMatch(provided: string | null | undefined, expected: string | undefined): boolean {
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

export function validateApiAccess(req: IncomingMessage): ApiAccessResult {
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

export function resolveClientIp(req: IncomingMessage): string {
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

function resolveRateLimit(envName: string, defaultValue: number): number {
  const parsed = Number.parseInt(process.env[envName] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

export function resolveRouteRateLimit(route: string): number {
  if (route === '/api/summary') {
    return resolveRateLimit(API_RATE_LIMIT_SUMMARY_ENV, DEFAULT_SUMMARY_RATE_LIMIT)
  }

  return resolveRateLimit(API_RATE_LIMIT_ASK_ENV, DEFAULT_ASK_RATE_LIMIT)
}

export function checkRouteRateLimit(route: string, clientIp: string, now = Date.now()): ApiAccessResult {
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

export function resolveProtectedAnswerProvider(): AnswerProviderName {
  return resolveAnswerProviderName(undefined, { protectedAccess: true })
}

export function resetRateLimitState(): void {
  rateLimitBuckets.clear()
}
