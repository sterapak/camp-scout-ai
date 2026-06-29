/**
 * HTTP routes for Camp Scout AI API endpoints.
 * Server-only; wired into Vite dev/preview servers via askApiPlugin.
 */

import {
  checkRouteRateLimit,
  resolveClientIp,
  resolveConfiguredApiToken,
  resolveProtectedAnswerProvider,
  validateApiAccess,
} from './apiProtection.js'
import { handleAskRequest, INVALID_JSON_ERROR } from './askHandler.js'
import { handleSummaryRequest } from './summaryHandler.js'
import {
  JsonBodyTooLargeError,
  resolveMaxJsonBodyBytes,
} from './requestGuardrails.js'

export const ASK_ROUTE_PATH = '/api/ask'
export const SUMMARY_ROUTE_PATH = '/api/summary'
export const HEALTH_ROUTE_PATH = '/health'
export const RUNTIME_CONFIG_PATH = '/camp-scout-runtime.js'

const PROTECTED_ROUTE_PATHS = new Set([ASK_ROUTE_PATH, SUMMARY_ROUTE_PATH])

/**
 * Reads and parses a JSON request body from a Node HTTP request.
 * @param {import('http').IncomingMessage} req
 * @param {{ maxBytes?: number }} [options]
 * @returns {Promise<unknown>}
 */
export function readJsonRequestBody(req, options = {}) {
  const maxBytes = options.maxBytes ?? resolveMaxJsonBodyBytes()

  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []
    let totalBytes = 0

    req.on('data', (chunk) => {
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

/**
 * Writes a JSON HTTP response.
 * @param {import('http').ServerResponse} res
 * @param {number} statusCode
 * @param {unknown} body
 */
export function sendJsonResponse(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

/**
 * @param {import('http').ServerResponse} res
 */
export function sendRuntimeConfigScript(res) {
  const token = resolveConfiguredApiToken() ?? ''

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(`window.__CAMP_SCOUT_RUNTIME__=${JSON.stringify({ apiToken: token })};`)
}

/**
 * Creates Connect-compatible middleware for Camp Scout AI API routes.
 * @param {{
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 *   reloadOpenAiEnv?: () => void,
 *   skipApiProtection?: boolean,
 * }} [options]
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => Promise<void>}
 */
export function createAskRouteMiddleware(options = {}) {
  return async function apiRouteMiddleware(req, res, next) {
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

    if (pathname === RUNTIME_CONFIG_PATH) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJsonResponse(res, 405, { error: 'Method not allowed. Use GET.' })
        return
      }

      sendRuntimeConfigScript(res)
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
        sendJsonResponse(res, access.statusCode, access.body)
        return
      }

      const clientIp = resolveClientIp(req)
      const rateLimit = checkRouteRateLimit(pathname, clientIp)
      if (!rateLimit.ok) {
        sendJsonResponse(res, rateLimit.statusCode, rateLimit.body)
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
