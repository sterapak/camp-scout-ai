/** @jest-environment node */

import {
  API_ACCESS_NOT_CONFIGURED_MESSAGE,
  API_RATE_LIMIT_MESSAGE,
  API_UNAUTHORIZED_MESSAGE,
  CAMP_SCOUT_API_TOKEN_ENV,
  checkRouteRateLimit,
  extractRequestApiToken,
  isApiAccessConfigured,
  resetRateLimitState,
  resolveProtectedAnswerProvider,
  tokensMatch,
  validateApiAccess,
} from './apiProtection.js'
import { ASK_ROUTE_PATH } from './askRoute.js'

describe('apiProtection', () => {
  const originalToken = process.env[CAMP_SCOUT_API_TOKEN_ENV]
  const originalProvider = process.env.OPENAI_ANSWER_PROVIDER

  beforeEach(() => {
    resetRateLimitState()
    process.env[CAMP_SCOUT_API_TOKEN_ENV] = 'test-api-token'
    process.env.OPENAI_ANSWER_PROVIDER = 'openai'
  })

  afterEach(() => {
    resetRateLimitState()

    if (originalToken === undefined) {
      delete process.env[CAMP_SCOUT_API_TOKEN_ENV]
    } else {
      process.env[CAMP_SCOUT_API_TOKEN_ENV] = originalToken
    }

    if (originalProvider === undefined) {
      delete process.env.OPENAI_ANSWER_PROVIDER
    } else {
      process.env.OPENAI_ANSWER_PROVIDER = originalProvider
    }
  })

  it('detects whether API access is configured', () => {
    expect(isApiAccessConfigured()).toBe(true)

    delete process.env[CAMP_SCOUT_API_TOKEN_ENV]
    expect(isApiAccessConfigured()).toBe(false)
  })

  it('extracts bearer and custom header tokens', () => {
    expect(extractRequestApiToken({
      headers: { authorization: 'Bearer secret-token' },
    })).toBe('secret-token')

    expect(extractRequestApiToken({
      headers: { 'x-camp-scout-api-token': 'header-token' },
    })).toBe('header-token')
  })

  it('matches tokens using a timing-safe comparison', () => {
    expect(tokensMatch('same-token', 'same-token')).toBe(true)
    expect(tokensMatch('wrong-token', 'same-token')).toBe(false)
  })

  it('blocks access when the API token is not configured', () => {
    delete process.env[CAMP_SCOUT_API_TOKEN_ENV]

    const result = validateApiAccess({ headers: {} })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.statusCode).toBe(503)
      expect(result.body.error).toBe(API_ACCESS_NOT_CONFIGURED_MESSAGE)
    }
  })

  it('rejects missing or invalid API tokens', () => {
    const missing = validateApiAccess({ headers: {} })
    expect(missing.ok).toBe(false)
    if (!missing.ok) {
      expect(missing.statusCode).toBe(401)
      expect(missing.body.error).toBe(API_UNAUTHORIZED_MESSAGE)
    }

    const invalid = validateApiAccess({
      headers: { authorization: 'Bearer wrong-token' },
    })
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) {
      expect(invalid.statusCode).toBe(401)
    }
  })

  it('accepts a valid API token', () => {
    const result = validateApiAccess({
      headers: { authorization: 'Bearer test-api-token' },
    })

    expect(result).toEqual({ ok: true })
  })

  it('enforces per-IP/per-route rate limits', () => {
    process.env.API_RATE_LIMIT_ASK_PER_MINUTE = '2'

    expect(checkRouteRateLimit(ASK_ROUTE_PATH, '127.0.0.1', 1_000).ok).toBe(true)
    expect(checkRouteRateLimit(ASK_ROUTE_PATH, '127.0.0.1', 1_001).ok).toBe(true)

    const limited = checkRouteRateLimit(ASK_ROUTE_PATH, '127.0.0.1', 1_002)
    expect(limited.ok).toBe(false)
    if (!limited.ok) {
      expect(limited.statusCode).toBe(429)
      expect(limited.body.error).toBe(API_RATE_LIMIT_MESSAGE)
    }
  })

  it('keeps OpenAI disabled until protected access is validated', () => {
    process.env.OPENAI_ANSWER_PROVIDER = 'openai'
    expect(resolveProtectedAnswerProvider()).toBe('openai')

    process.env.OPENAI_ANSWER_PROVIDER = 'fake'
    expect(resolveProtectedAnswerProvider()).toBe('fake')
  })
})
