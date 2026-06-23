/** @jest-environment node */

import { EventEmitter } from 'events'
import { fakeAnswerProvider } from '../openai/fakeAnswerProvider.js'
import {
  ASK_ROUTE_PATH,
  createAskRouteMiddleware,
  readJsonRequestBody,
  sendJsonResponse,
} from './askRoute.js'
import {
  INSUFFICIENT_CONTEXT_STATUS,
  SUCCESS_STATUS,
} from '../rag/groundedAnswerGenerator.js'
import { EMPTY_QUESTION_ERROR } from './askHandler.js'

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

function createMockRequest({ method = 'POST', url = ASK_ROUTE_PATH, body = null }) {
  const req = new EventEmitter()
  req.method = method
  req.url = url

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

  it('returns a validation error for an empty question', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ body: { question: '   ' } })
    const { res, state } = createMockResponse()

    await middleware(req, res, jest.fn())

    expect(state.statusCode).toBe(400)
    expect(JSON.parse(state.body ?? '{}')).toEqual({ error: EMPTY_QUESTION_ERROR })
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

  it('passes through unrelated routes', async () => {
    const middleware = createAskRouteMiddleware({ answerProvider: fakeAnswerProvider })
    const req = createMockRequest({ url: '/api/other', body: { question: 'ignored' } })
    const { res } = createMockResponse()
    const next = jest.fn()

    await middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
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
