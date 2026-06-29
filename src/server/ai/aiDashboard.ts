/**
 * AI spend and endpoint monitoring dashboard data.
 */

import { isAiEnabled, isAiMaintenanceMode } from './aiConfig.js'
import { getBudgetStatus } from './aiBudget.js'
import { getUsageSummary, getEndpointMonitoring } from './aiUsageStore.js'

/**
 * Builds dashboard payload for internal AI operations visibility.
 * No secrets are included.
 * @param {Date} [now]
 * @returns {Record<string, unknown>}
 */
export function buildAiDashboard(now = new Date()) {
  const usage = getUsageSummary(now)
  const monitoring = getEndpointMonitoring(now)
  const budget = getBudgetStatus(now)

  return {
    generatedAt: now.toISOString(),
    configuration: {
      aiEnabled: isAiEnabled(),
      maintenanceMode: isAiMaintenanceMode(),
    },
    spend: {
      totalRequests: usage.totalRequests,
      requestsToday: usage.requestsToday,
      estimatedInputTokens: usage.estimatedInputTokens,
      estimatedOutputTokens: usage.estimatedOutputTokens,
      estimatedOpenAiCostUsd: Math.round(usage.estimatedOpenAiCostUsd * 1_000_000) / 1_000_000,
      averageRequestSizeTokens: usage.averageRequestSizeTokens,
      averageResponseTimeMs: usage.averageResponseTimeMs,
      requestsByEndpoint: usage.requestsByEndpoint,
      requestsByProvider: usage.requestsByProvider,
    },
    monitoring: {
      requestsPerMinute: monitoring.requestsPerMinute,
      responses401: monitoring.responses401,
      responses429: monitoring.responses429,
      responses502: monitoring.responses502,
      responses503: monitoring.responses503,
      averageLatencyMs: monitoring.averageLatencyMs,
      slowestRequests: monitoring.slowestRequests,
      busiestIps: monitoring.busiestIps,
    },
    budget: {
      limits: budget.limits,
      usage: budget.usage,
      exceeded: budget.exceeded,
    },
    cache: {
      hits: usage.cacheHits,
      misses: usage.cacheMisses,
    },
  }
}
