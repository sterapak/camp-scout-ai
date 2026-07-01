/**
 * Per-request AI threshold monitoring — logs WARN when limits are exceeded.
 */

import {
  resolveMaxPromptTokensThreshold,
  resolveMaxRequestCostThreshold,
  resolveSlowRequestMsThreshold,
} from './aiConfig.js'
import { logAiWarning } from './aiRequestLogger.js'

/**
 * @typedef {{
 *   endpoint: string,
 *   requestId: string,
 *   correlationId: string,
 *   provider: string,
 *   promptTokenEstimate: number,
 *   completionTokens: number,
 *   estimatedCostUsd: number,
 *   latencyMs: number,
 * }} RequestThresholdContext
 */

/**
 * Logs WARN when a completed request exceeds configured token, cost, or latency thresholds.
 * @param {RequestThresholdContext} record
 */
export function evaluateRequestThresholdWarnings(record) {
  const maxPromptTokens = resolveMaxPromptTokensThreshold()
  if (maxPromptTokens !== undefined && record.promptTokenEstimate > maxPromptTokens) {
    logAiWarning('prompt_tokens_exceeded', {
      endpoint: record.endpoint,
      requestId: record.requestId,
      correlationId: record.correlationId,
      provider: record.provider,
      promptTokenEstimate: record.promptTokenEstimate,
      threshold: maxPromptTokens,
    })
  }

  const maxRequestCost = resolveMaxRequestCostThreshold()
  if (maxRequestCost !== undefined
    && record.provider === 'openai'
    && record.estimatedCostUsd > maxRequestCost) {
    logAiWarning('request_cost_exceeded', {
      endpoint: record.endpoint,
      requestId: record.requestId,
      correlationId: record.correlationId,
      provider: record.provider,
      estimatedCostUsd: record.estimatedCostUsd,
      promptTokenEstimate: record.promptTokenEstimate,
      completionTokens: record.completionTokens,
      threshold: maxRequestCost,
    })
  }

  const slowRequestMs = resolveSlowRequestMsThreshold()
  if (slowRequestMs !== undefined && record.latencyMs > slowRequestMs) {
    logAiWarning('slow_request', {
      endpoint: record.endpoint,
      requestId: record.requestId,
      correlationId: record.correlationId,
      provider: record.provider,
      latencyMs: record.latencyMs,
      threshold: slowRequestMs,
    })
  }
}
