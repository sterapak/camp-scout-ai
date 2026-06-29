/**
 * HTTP routes for Camp Scout AI API endpoints.
 * Server-only; wired into Vite dev/preview servers via askApiPlugin.
 */

import {
  checkRouteRateLimit,
  resolveClientIp,
  resolveProtectedAnswerProvider,
  validateApiAccess,
} from './apiProtection.js'
import { handleAskRequest, INVALID_JSON_ERROR } from './askHandler.js'
import { handleSummaryRequest } from './summaryHandler.js'
import {
  JsonBodyTooLargeError,
  resolveMaxJsonBodyBytes,
} from './requestGuardrails.js'
import { buildAiDashboard } from '../ai/aiDashboard.js'
import { queryRecentAuditLog } from '../ai/aiAuditLog.js'
import { renderPrometheusMetrics } from '../ai/aiMetrics.js'
import {
  generateReconciliationReport,
  reconciliationReportToCsv,
} from '../ai/aiReconciliation.js'
import {
  checkAiEndpointAccess,
  extractTokenMetricsFromResponse,
  finalizeAiRequest,
  resolveAuthenticatedUser,
  resolveCorrelationId,
  resolveEffectiveProvider,
  setCorrelationIdHeader,
} from '../ai/aiOperations.js'

export const ASK_ROUTE_PATH = '/api/ask'
export const SUMMARY_ROUTE_PATH = '/api/summary'
export const HEALTH_ROUTE_PATH = '/health'
export const METRICS_ROUTE_PATH = '/metrics'
export const AI_DASHBOARD_ROUTE_PATH = '/api/ai/dashboard'
export const AI_AUDIT_ROUTE_PATH = '/api/ai/audit'
export const AI_RECONCILIATION_ROUTE_PATH = '/api/ai/reconciliation'

const PROTECTED_ROUTE_PATHS = new Set([ASK_ROUTE_PATH, SUMMARY_ROUTE_PATH])
const AI_OPS_ROUTE_PATHS = new Set([
  AI_DASHBOARD_ROUTE_PATH,
  AI_AUDIT_ROUTE_PATH,
  AI_RECONCILIATION_ROUTE_PATH,
])

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
 * @param {{ correlationId?: string }} [options]
 */
export function sendJsonResponse(res, statusCode, body, options = {}) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (options.correlationId) {
    setCorrelationIdHeader(res, options.correlationId)
  }

  const payload = options.correlationId && body && typeof body === 'object' && !Array.isArray(body)
    ? { ...body, correlationId: options.correlationId }
    : body

  res.end(JSON.stringify(payload))
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} correlationId
 * @returns {boolean}
 */
function handleOpsRoutes(req, res, correlationId) {
  const pathname = req.url?.split('?')[0] ?? ''

  if (pathname === METRICS_ROUTE_PATH) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      sendJsonResponse(res, 405, { error: 'Method not allowed. Use GET.' }, { correlationId })
      return true
    }

    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    setCorrelationIdHeader(res, correlationId)
    res.end(renderPrometheusMetrics())
    return true
  }

  if (!AI_OPS_ROUTE_PATHS.has(pathname)) {
    return false
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    sendJsonResponse(res, 405, { error: 'Method not allowed. Use GET.' }, { correlationId })
    return true
  }

  const access = validateApiAccess(req)
  if (!access.ok) {
    sendJsonResponse(res, access.statusCode, access.body, { correlationId })
    finalizeAiRequest({
      endpoint: pathname,
      correlationId,
      provider: 'none',
      latencyMs: 0,
      clientIp: resolveClientIp(req),
      authenticatedUser: resolveAuthenticatedUser(req),
      responseStatus: access.statusCode,
      persistAudit: false,
    })
    return true
  }

  if (pathname === AI_DASHBOARD_ROUTE_PATH) {
    sendJsonResponse(res, 200, buildAiDashboard(), { correlationId })
    return true
  }

  if (pathname === AI_AUDIT_ROUTE_PATH) {
    const url = new URL(req.url ?? '', 'http://localhost')
    const limit = Number.parseInt(url.searchParams.get('limit') ?? '50', 10)
    sendJsonResponse(res, 200, {
      entries: queryRecentAuditLog(Number.isFinite(limit) ? limit : 50),
    }, { correlationId })
    return true
  }

  if (pathname === AI_RECONCILIATION_ROUTE_PATH) {
    const url = new URL(req.url ?? '', 'http://localhost')
    const format = url.searchParams.get('format')
    const report = generateReconciliationReport({
      openAiReportedRequests: parseOptionalQueryInt(url.searchParams.get('openaiRequests')),
      openAiReportedInputTokens: parseOptionalQueryInt(url.searchParams.get('openaiInputTokens')),
      openAiReportedOutputTokens: parseOptionalQueryInt(url.searchParams.get('openaiOutputTokens')),
      openAiReportedCostUsd: parseOptionalQueryFloat(url.searchParams.get('openaiCostUsd')),
    })

    if (format === 'csv') {
      res.statusCode = 200
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      setCorrelationIdHeader(res, correlationId)
      res.end(reconciliationReportToCsv(report))
      return true
    }

    sendJsonResponse(res, 200, report, { correlationId })
    return true
  }

  return false
}

/**
 * @param {string | null} value
 * @returns {number | undefined}
 */
function parseOptionalQueryInt(value) {
  if (value === null || value === '') {
    return undefined
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

/**
 * @param {string | null} value
 * @returns {number | undefined}
 */
function parseOptionalQueryFloat(value) {
  if (value === null || value === '') {
    return undefined
  }
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
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
    const correlationId = resolveCorrelationId(req)
    const startedAt = Date.now()
    const clientIp = resolveClientIp(req)

    if (handleOpsRoutes(req, res, correlationId)) {
      return
    }

    if (pathname === HEALTH_ROUTE_PATH) {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET')
        sendJsonResponse(res, 405, { error: 'Method not allowed. Use GET.' }, { correlationId })
        return
      }

      sendJsonResponse(res, 200, { status: 'ok' }, { correlationId })
      return
    }

    if (!PROTECTED_ROUTE_PATHS.has(pathname)) {
      next()
      return
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      sendJsonResponse(res, 405, { error: 'Method not allowed. Use POST.' }, { correlationId })
      return
    }

    if (!options.skipApiProtection) {
      const access = validateApiAccess(req)
      if (!access.ok) {
        sendJsonResponse(res, access.statusCode, access.body, { correlationId })
        finalizeAiRequest({
          endpoint: pathname,
          correlationId,
          provider: 'none',
          latencyMs: Date.now() - startedAt,
          clientIp,
          authenticatedUser: resolveAuthenticatedUser(req),
          responseStatus: access.statusCode,
        })
        return
      }

      const rateLimit = checkRouteRateLimit(pathname, clientIp)
      if (!rateLimit.ok) {
        sendJsonResponse(res, rateLimit.statusCode, rateLimit.body, { correlationId })
        finalizeAiRequest({
          endpoint: pathname,
          correlationId,
          provider: 'none',
          latencyMs: Date.now() - startedAt,
          clientIp,
          authenticatedUser: resolveAuthenticatedUser(req),
          responseStatus: rateLimit.statusCode,
        })
        return
      }
    }

    const configuredProvider = options.skipApiProtection
      ? (options.provider ?? 'fake')
      : resolveProtectedAnswerProvider()
    const effectiveProvider = resolveEffectiveProvider(configuredProvider, {
      skipKillSwitch: options.skipApiProtection === true,
    })

    const accessCheck = checkAiEndpointAccess({
      endpoint: pathname,
      correlationId,
      wouldUseOpenAi: effectiveProvider === 'openai',
      skipMaintenanceCheck: options.skipApiProtection === true,
      skipBudgetCheck: options.skipApiProtection === true,
    })

    if (accessCheck.blocked) {
      sendJsonResponse(res, accessCheck.statusCode, accessCheck.body, { correlationId })
      finalizeAiRequest({
        endpoint: pathname,
        correlationId,
        provider: 'fake',
        latencyMs: Date.now() - startedAt,
        clientIp,
        authenticatedUser: resolveAuthenticatedUser(req),
        responseStatus: accessCheck.statusCode,
      })
      return
    }

    try {
      options.reloadOpenAiEnv?.()
      const body = await readJsonRequestBody(req)
      const handlerOptions = {
        ...options,
        provider: effectiveProvider,
        protectedAccess: options.skipApiProtection ? options.protectedAccess === true : true,
      }
      const response =
        pathname === SUMMARY_ROUTE_PATH
          ? await handleSummaryRequest(body, handlerOptions)
          : await handleAskRequest(body, handlerOptions)

      const tokenMetrics = extractTokenMetricsFromResponse(response.body)
      sendJsonResponse(res, response.statusCode, response.body, { correlationId })

      finalizeAiRequest({
        endpoint: pathname,
        correlationId,
        model: tokenMetrics.model,
        provider: effectiveProvider,
        promptTokenEstimate: tokenMetrics.inputTokens,
        completionTokens: tokenMetrics.outputTokens,
        latencyMs: Date.now() - startedAt,
        clientIp,
        authenticatedUser: resolveAuthenticatedUser(req),
        responseStatus: response.statusCode,
        cacheHit: tokenMetrics.cacheHit,
        persistAudit: options.persistAudit !== false,
      })
    } catch (error) {
      if (error instanceof JsonBodyTooLargeError) {
        sendJsonResponse(res, 413, { error: error.message }, { correlationId })
        finalizeAiRequest({
          endpoint: pathname,
          correlationId,
          provider: effectiveProvider,
          latencyMs: Date.now() - startedAt,
          clientIp,
          authenticatedUser: resolveAuthenticatedUser(req),
          responseStatus: 413,
        })
        return
      }

      if (error instanceof SyntaxError) {
        sendJsonResponse(res, 400, { error: INVALID_JSON_ERROR }, { correlationId })
        finalizeAiRequest({
          endpoint: pathname,
          correlationId,
          provider: effectiveProvider,
          latencyMs: Date.now() - startedAt,
          clientIp,
          authenticatedUser: resolveAuthenticatedUser(req),
          responseStatus: 400,
        })
        return
      }

      sendJsonResponse(res, 500, { error: 'An unexpected error occurred.' }, { correlationId })
      finalizeAiRequest({
        endpoint: pathname,
        correlationId,
        provider: effectiveProvider,
        latencyMs: Date.now() - startedAt,
        clientIp,
        authenticatedUser: resolveAuthenticatedUser(req),
        responseStatus: 500,
      })
    }
  }
}
