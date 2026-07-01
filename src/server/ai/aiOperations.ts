/**
 * AI operations orchestration — integrates kill switch, budgets, logging, and metrics.
 */

import { randomUUID } from 'node:crypto'

import type { AnswerProviderName } from '../openai/createAnswerProvider.js'
import {
  AI_BUDGET_EXCEEDED_MESSAGE,
  AI_DISABLED_MESSAGE,
  AI_MAINTENANCE_MESSAGE,
  isAiEnabled,
  isAiMaintenanceMode,
} from './aiConfig.js'
import { appendAuditLogEntry, auditEntryFromRecord } from './aiAuditLog.js'
import { checkAiBudgetExceeded, logBudgetExceeded } from './aiBudget.js'
import { evaluateCostAlerts } from './aiCostAlerts.js'
import { evaluateRequestThresholdWarnings } from './aiRequestThresholds.js'
import { resolveCorrelationId, CORRELATION_ID_HEADER } from './aiCorrelationId.js'
import { logAiDisabled, logAiMaintenanceMode, logAiRequest } from './aiRequestLogger.js'
import {
  buildRequestRecord,
  recordAiRequest,
  recordCacheHit,
  recordCacheMiss,
} from './aiUsageStore.js'

/** @type {boolean} */
let aiDisabledLogged = false

/** @type {boolean} */
let maintenanceModeLogged = false

/**
 * Ensures startup logs for AI configuration are emitted once.
 */
export function logAiStartupState() {
  if (!isAiEnabled() && !aiDisabledLogged) {
    logAiDisabled('startup')
    aiDisabledLogged = true
  }

  if (isAiMaintenanceMode() && !maintenanceModeLogged) {
    logAiMaintenanceMode()
    maintenanceModeLogged = true
  }
}

/**
 * Resolves the effective answer provider considering AI_ENABLED kill switch.
 * @param {import('../openai/createAnswerProvider.js').AnswerProviderName | undefined} configuredProvider
 * @param {{ protectedAccess?: boolean, skipKillSwitch?: boolean }} [options]
 * @returns {import('../openai/createAnswerProvider.js').AnswerProviderName}
 */
export function resolveEffectiveProvider(
  configuredProvider: AnswerProviderName | undefined,
  options: { skipKillSwitch?: boolean } = {},
): AnswerProviderName {
  if (!options.skipKillSwitch && !isAiEnabled()) {
    if (!aiDisabledLogged) {
      logAiDisabled('resolveEffectiveProvider')
      aiDisabledLogged = true
    }
    return 'fake'
  }

  return configuredProvider === 'openai' ? 'openai' : 'fake'
}

/**
 * Checks whether an AI endpoint request should be blocked.
 * @param {{
 *   endpoint: string,
 *   correlationId: string,
 *   wouldUseOpenAi: boolean,
 *   skipMaintenanceCheck?: boolean,
 *   skipBudgetCheck?: boolean,
 * }} params
 * @returns {{ blocked: false } | { blocked: true, statusCode: number, body: { error: string, correlationId: string } }}
 */
export function checkAiEndpointAccess(params) {
  logAiStartupState()

  if (!params.skipMaintenanceCheck && isAiMaintenanceMode()) {
    return {
      blocked: true,
      statusCode: 503,
      body: {
        error: AI_MAINTENANCE_MESSAGE,
        correlationId: params.correlationId,
      },
    }
  }

  if (params.wouldUseOpenAi && !params.skipBudgetCheck) {
    const budgetCheck = checkAiBudgetExceeded()
    if (budgetCheck.exceeded) {
      logBudgetExceeded(budgetCheck.reason ?? 'Budget exceeded', params.correlationId)
      return {
        blocked: true,
        statusCode: 503,
        body: {
          error: AI_BUDGET_EXCEEDED_MESSAGE,
          correlationId: params.correlationId,
        },
      }
    }
  }

  return { blocked: false }
}

/**
 * Records AI request completion with logging, audit, and metrics.
 * @param {{
 *   endpoint: string,
 *   correlationId: string,
 *   requestId?: string,
 *   model?: string,
 *   provider: string,
 *   promptTokenEstimate?: number,
 *   completionTokens?: number,
 *   latencyMs: number,
 *   clientIp: string,
 *   authenticatedUser?: string,
 *   responseStatus: number,
 *   cacheHit?: boolean,
 *   persistAudit?: boolean,
 * }} params
 */
export function finalizeAiRequest(params) {
  const requestId = params.requestId ?? randomUUID()
  const record = buildRequestRecord({
    ...params,
    requestId,
  })

  recordAiRequest(record)
  logAiRequest({
    timestamp: record.timestamp,
    endpoint: record.endpoint,
    requestId: record.requestId,
    correlationId: record.correlationId,
    model: record.model,
    provider: record.provider,
    promptTokenEstimate: record.promptTokenEstimate,
    completionTokens: record.completionTokens,
    latencyMs: record.latencyMs,
    clientIp: record.clientIp,
    authenticatedUser: record.authenticatedUser,
    responseStatus: record.responseStatus,
  })

  appendAuditLogEntry(auditEntryFromRecord(record), { persist: params.persistAudit !== false })
  evaluateRequestThresholdWarnings(record)
  evaluateCostAlerts()
}

/**
 * Sets correlation ID response header.
 * @param {import('http').ServerResponse} res
 * @param {string} correlationId
 */
export function setCorrelationIdHeader(res, correlationId) {
  res.setHeader(CORRELATION_ID_HEADER, correlationId)
}

/**
 * Resolves authenticated user label from request (token fingerprint only).
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function resolveAuthenticatedUser(req) {
  const authHeader = req.headers?.authorization ?? req.headers?.Authorization
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return 'bearer-token'
  }

  const customHeader = req.headers?.['x-camp-scout-api-token']
  if (typeof customHeader === 'string' && customHeader.length > 0) {
    return 'api-token'
  }

  return 'anonymous'
}

/**
 * Extracts token/completion counts from handler response body.
 * @param {unknown} body
 * @returns {{ inputTokens?: number, outputTokens?: number, model?: string, cacheHit?: boolean }}
 */
export function extractTokenMetricsFromResponse(body) {
  if (!body || typeof body !== 'object') {
    return {}
  }

  /** @type {Record<string, unknown>} */
  const record = body

  return {
    inputTokens: typeof record.inputTokens === 'number' ? record.inputTokens : undefined,
    outputTokens: typeof record.outputTokens === 'number' ? record.outputTokens : undefined,
    model: typeof record.model === 'string' ? record.model : undefined,
    cacheHit: typeof record.cached === 'boolean' ? record.cached : undefined,
  }
}

/**
 * Resets ops state for tests.
 */
export function resetAiOperationsState() {
  aiDisabledLogged = false
  maintenanceModeLogged = false
}

export {
  resolveCorrelationId,
  CORRELATION_ID_HEADER,
  AI_DISABLED_MESSAGE,
  AI_MAINTENANCE_MESSAGE,
  AI_BUDGET_EXCEEDED_MESSAGE,
  recordCacheHit,
  recordCacheMiss,
}
