/**
 * HTTP routes for Camp Scout AI API endpoints.
 * Server-only; wired into Vite dev/preview servers via askApiPlugin.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

import {
  checkRouteRateLimit,
  resolveClientIp,
  resolveProtectedAnswerProvider,
  validateApiAccess,
  type ApiAccessFailure,
} from './apiProtection.js'
import { handleAskRequest, INVALID_JSON_ERROR } from './askHandler.js'
import { handleSummaryRequest } from './summaryHandler.js'
import {
  JsonBodyTooLargeError,
  resolveMaxJsonBodyBytes,
} from './requestGuardrails.js'
import type { AnswerProvider } from '../openai/answerProvider.js'
import type { AnswerProviderName } from '../openai/createAnswerProvider.js'

export const ASK_ROUTE_PATH = '/api/ask'
export const SUMMARY_ROUTE_PATH = '/api/summary'
export const HEALTH_ROUTE_PATH = '/health'

const PROTECTED_ROUTE_PATHS = new Set([ASK_ROUTE_PATH, SUMMARY_ROUTE_PATH])

export interface AskRouteMiddlewareOptions {
  answerProvider?: AnswerProvider
  provider?: AnswerProviderName
  reloadOpenAiEnv?: () => void
  skipApiProtection?: boolean
  protectedAccess?: boolean
}

export function readJsonRequestBody(req: IncomingMessage, options: { maxBytes?: number } = {}): Promise<unknown> {
  const maxBytes = options.maxBytes ?? resolveMaxJsonBodyBytes()

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let totalBytes = 0

    req.on('data', (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
      totalBytes += buffer.length

      if (totalBytes > maxBytes) {
        reject(new JsonBodyTooLargeError())
        req.destroy()
        return
      }

      chunks.push(buffer)
    })

    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf8').trim()

      if (rawBody.length === 0) {
        resolve(null)
        return
      }

      try {
        resolve(JSON.parse(rawBody))
      } catch (error) {
        reject(error)
      }
    })

    req.on('error', reject)
  })
}

export function sendJsonResponse(res: ServerResponse, statusCode: number, body: unknown): void {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

export function createAskRouteMiddleware(options: AskRouteMiddlewareOptions = {}) {
  return async function apiRouteMiddleware(req: IncomingMessage, res: ServerResponse, next: () => void): Promise<void> {
    const pathname = req.url?.split('?')[0] ?? ''

    if (pathname === HEALTH_ROUTE_PATH) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJsonResponse(res, 405, { error: 'Method not allowed. Use GET.' })
        return
      }

      sendJsonResponse(res, 200, { status: 'ok' })
      return
    }

    if (!PROTECTED_ROUTE_PATHS.has(pathname)) {
      next()
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      sendJsonResponse(res, 405, { error: 'Method not allowed. Use POST.' })
      return
    }

    if (!options.skipApiProtection) {
      const access = validateApiAccess(req)
      if (!access.ok) {
        const failure = access as ApiAccessFailure
        sendJsonResponse(res, failure.statusCode, failure.body)
        return
      }

      const clientIp = resolveClientIp(req)
      const rateLimit = checkRouteRateLimit(pathname, clientIp)
      if (!rateLimit.ok) {
        const rateLimitFailure = rateLimit as ApiAccessFailure
        sendJsonResponse(res, rateLimitFailure.statusCode, rateLimitFailure.body)
        return
      }
    }

    try {
      options.reloadOpenAiEnv?.()
      const body = await readJsonRequestBody(req)
      const handlerOptions = {
        ...options,
        provider: options.skipApiProtection
          ? options.provider
          : resolveProtectedAnswerProvider(),
        protectedAccess: options.skipApiProtection ? options.protectedAccess === true : true,
      }
      const response =
        pathname === SUMMARY_ROUTE_PATH
          ? await handleSummaryRequest(body, handlerOptions)
          : await handleAskRequest(body, handlerOptions)
      sendJsonResponse(res, response.statusCode, response.body)
    } catch (error) {
      if (error instanceof JsonBodyTooLargeError) {
        sendJsonResponse(res, 413, { error: error.message })
        return
      }

      if (error instanceof SyntaxError) {
        sendJsonResponse(res, 400, { error: INVALID_JSON_ERROR })
        return
      }

      sendJsonResponse(res, 500, { error: 'An unexpected error occurred.' })
    }
  }
}
