/** @jest-environment node */

import { EventEmitter } from 'events'
import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import {
  API_ACCESS_NOT_CONFIGURED_MESSAGE,
  API_UNAUTHORIZED_MESSAGE,
  CAMP_SCOUT_API_TOKEN_ENV,
  resetRateLimitState,
} from './apiProtection.js'
import {
  ASK_ROUTE_PATH,
  DONATE_ROUTE_PATH,
  HEALTH_ROUTE_PATH,
  METRICS_ROUTE_PATH,
  AI_DASHBOARD_ROUTE_PATH,
  RUNTIME_CONFIG_PATH,
  SUMMARY_ROUTE_PATH,
  createAskRouteMiddleware,
  readJsonRequestBody,
  sendJsonResponse,
} from './askRoute.js'
import { AI_MAINTENANCE_MODE_ENV } from '../ai/aiConfig.js'
import { resetAiUsageStore } from '../ai/aiUsageStore.js'
import { resetAuditLog } from '../ai/aiAuditLog.js'
import { resetAiOperationsState } from '../ai/aiOperations.js'
import {
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
} from '../rag/groundedAnswerGenerator.js'
import { EMPTY_QUESTION_ERROR } from './askHandler.js'
import { DONATIONS_NOT_CONFIGURED_ERROR } from './donateHandler.js'

function createMockResponse() {
  /** @type {{ statusCode?: number, headers: Record<string, string>, body?: string, ended: boolean }} */
  const state = {
    headers: {},
    ended: false,
  }

  const res = {
    set statusCode(value) {
      state.statusCode = value
    },
    get statusCode() {
      return state.statusCode ?? 200
    },
    setHeader(name, value) {
      state.headers[name.toLowerCase()] = value
    },
    end(body) {
      state.body = body
      state.ended = true
    },
  }

  return { res, state }
}

function createMockRequest({
  method = 'POST',
  url = ASK_ROUTE_PATH,
  body = null,
  headers = { authorization: 'Bearer test-api-token' },
}) {
  const req = new EventEmitter()
  req.method = method
  req.url = url
  req.headers = headers
  req.socket = { remoteAddress: '127.0.0.1' }

  queueMicrotask(() => {
    if (body === null) {
      req.emit('end')
      return
    }

    req.emit('data', Buffer.from(JSON.stringify(body), 'utf8'))
    req.emit('end')
  })

  return req
}

describe('readJsonRequestBody', () => {
  it('parses JSON request bodies', async () => {
    const req = createMockRequest({ body: { question: 'What are quiet hours?' } })
    await expect(readJsonRequestBody(req)).resolves.toEqual({ question: 'What are quiet hours?' })
  })

  it('returns null for empty bodies', async () => {
    const req = createMockRequest({ body: null })
    await expect(readJsonRequestBody(req)).resolves.toBeNull()
  })
})

describe('createAskRouteMiddleware', () => {
  beforeEach(() => {
    resetRateLimitState()
    resetAiUsageStore()
    resetAuditLog('/tmp/camp-scout-ai-test-audit.jsonl')
    resetAiOperationsState()
    delete process.env[AI_MAINTENANCE_MODE_ENV]
    process.env[CAMP_SCOUT_API_TOKEN_ENV] = 'test-api-token'
  })

  it('handles POST /api/ask on the happy path', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      body: {
        question: 'What are the bear food storage rules?',
        campgroundId: 'yosemite-upper-pines',
      },
    })
    const { res, state } = createMockResponse()
    const next = jest.fn()

    await middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(state.statusCode).toBe(200)
    expect(state.headers['content-type']).toBe('application/json; charset=utf-8')

    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.status).toBe(SUCCESS_STATUS)
    expect(payload.answer).toContain('Fake provider answer for:')
    expect(payload.citations.length).toBeGreaterThan(0)
  })

  it('serves the browser runtime config script', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      method: 'GET',
      url: RUNTIME_CONFIG_PATH,
      body: null,
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)
    expect(state.headers['content-type']).toBe('application/javascript; charset=utf-8')
    expect(state.headers['cache-control']).toBe('no-store')
    expect(state.body).toBe(
      'window.__CAMP_SCOUT_RUNTIME__={"apiToken":"test-api-token"};'
    )
  })

  it('blocks unauthenticated access to /api/ask', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      headers: {},
      body: { question: 'What are the bear food storage rules?' },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(401)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toBe(API_UNAUTHORIZED_MESSAGE)
    expect(payload.correlationId).toBeDefined()
  })

  it('blocks access when the API token is not configured', async () => {
    delete process.env[CAMP_SCOUT_API_TOKEN_ENV]

    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      body: { question: 'What are the bear food storage rules?' },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(503)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toBe(API_ACCESS_NOT_CONFIGURED_MESSAGE)
    expect(payload.correlationId).toBeDefined()
  })

  it('returns a validation error for an empty question', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ body: { question: '   ' } })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(400)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toBe(EMPTY_QUESTION_ERROR)
    expect(payload.correlationId).toBeDefined()
  })

  it('returns insufficient_context without crashing', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ body: { question: 'zzzznonexistenttopicqwerty' } })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)

    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.status).toBe(INSUFFICIENT_CONTEXT_STATUS)
    expect(payload.citations).toEqual([])
  })

  it('handles POST /api/donate without API token protection', async () => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_PRICE_ID_5

    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      url: DONATE_ROUTE_PATH,
      headers: {},
      body: { amount: 5 },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(503)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toBe(DONATIONS_NOT_CONFIGURED_ERROR)
    expect(payload.correlationId).toBeDefined()
  })

  it('returns validation error for invalid donation amount', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      url: DONATE_ROUTE_PATH,
      headers: {},
      body: { amount: 15 },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(400)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toContain('amount')
  })

  it('passes through unrelated routes', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ url: '/api/other', body: { question: 'ignored' } })
    const { res } = createMockResponse()
    const next = jest.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('handles GET /health', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ method: 'GET', url: HEALTH_ROUTE_PATH, body: null })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.status).toBe('ok')
    expect(payload.correlationId).toBeDefined()
    expect(state.headers['x-correlation-id']).toBeDefined()
  })

  it('handles POST /api/summary on the happy path', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      url: SUMMARY_ROUTE_PATH,
      body: { campgroundId: 'yosemite-upper-pines' },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)

    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.status).toBe(SUCCESS_STATUS)
    expect(payload.sections.overview.length).toBeGreaterThan(0)
    expect(payload.citations.length).toBeGreaterThan(0)
  })

  it('returns maintenance response when AI_MAINTENANCE_MODE is enabled', async () => {
    process.env[AI_MAINTENANCE_MODE_ENV] = 'true'

    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      body: { question: 'What are quiet hours?' },
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(503)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.error).toContain('maintenance')
  })

  it('serves Prometheus metrics at GET /metrics', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ method: 'GET', url: METRICS_ROUTE_PATH, body: null })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)
    expect(state.headers['content-type']).toContain('text/plain')
    expect(state.body).toContain('ai_requests_total')
  })

  it('serves the AI dashboard at GET /api/ai/dashboard', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({
      method: 'GET',
      url: AI_DASHBOARD_ROUTE_PATH,
      body: null,
    })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(200)
    const payload = JSON.parse(state.body ?? '{}')
    expect(payload.spend).toBeDefined()
    expect(payload.monitoring).toBeDefined()
  })
})

describe('sendJsonResponse', () => {
  it('writes JSON responses with the expected content type', () => {
    const { res, state } = createMockResponse()

    sendJsonResponse(res, 201, { ok: true })

    expect(state.statusCode).toBe(201)
    expect(state.headers['content-type']).toBe('application/json; charset=utf-8')
    expect(state.body).toBe('{"ok":true}')
    expect(state.ended).toBe(true)
  })
})
