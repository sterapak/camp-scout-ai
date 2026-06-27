/**
 * HTTP routes for Camp Scout AI API endpoints.
 * Server-only; wired into Vite dev/preview servers via askApiPlugin.
 */

import { handleAskRequest, INVALID_JSON_ERROR } from './askHandler.js'
import { handleSummaryRequest } from './summaryHandler.js'

export const ASK_ROUTE_PATH = '/api/ask'
export const SUMMARY_ROUTE_PATH = '/api/summary'

/**
 * Reads and parses a JSON request body from a Node HTTP request.
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<unknown>}
 */
export function readJsonRequestBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []

    req.on('data', (chunk) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
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
 * Creates Connect-compatible middleware for Camp Scout AI API routes.
 * @param {{
 *   answerProvider?: import('../openai/answerProvider.js').AnswerProvider,
 *   provider?: import('../openai/createAnswerProvider.js').AnswerProviderName,
 *   reloadOpenAiEnv?: () => void,
 * }} [options]
 * @returns {(req: import('http').IncomingMessage, res: import('http').ServerResponse, next: () => void) => Promise<void>}
 */
export function createAskRouteMiddleware(options = {}) {
  return async function apiRouteMiddleware(req, res, next) {
    const pathname = req.url?.split('?')[0] ?? ''

    if (pathname !== ASK_ROUTE_PATH && pathname !== SUMMARY_ROUTE_PATH) {
      next()
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      sendJsonResponse(res, 405, { error: 'Method not allowed. Use POST.' })
      return
    }

    try {
      options.reloadOpenAiEnv?.()
      const body = await readJsonRequestBody(req)
      const response =
        pathname === SUMMARY_ROUTE_PATH
          ? await handleSummaryRequest(body, options)
          : await handleAskRequest(body, options)
      sendJsonResponse(res, response.statusCode, response.body)
    } catch (error) {
      if (error instanceof SyntaxError) {
        sendJsonResponse(res, 400, { error: INVALID_JSON_ERROR })
        return
      }

      sendJsonResponse(res, 500, { error: 'An unexpected error occurred.' })
    }
  }
}
