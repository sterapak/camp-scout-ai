/**
 * Daily and hourly AI budget enforcement.
 */

import { resolveAiBudgetLimits } from './aiConfig.js'
import { getBudgetUsage } from './aiUsageStore.js'

/** @type {Set<string>} */
const loggedBudgetExceededKeys = new Set()

/**
 * Checks whether any configured budget limit has been exceeded.
 * @param {Date} [now]
 * @returns {{ exceeded: boolean, reason?: string, window?: 'daily' | 'hourly' }}
 */
export function checkAiBudgetExceeded(now = new Date()) {
  const limits = resolveAiBudgetLimits()
  const usage = getBudgetUsage(now)

  const dailyChecks = [
    { limit: limits.dailyRequestLimit, used: usage.daily.requests, label: 'daily request limit' },
    { limit: limits.dailyInputTokenLimit, used: usage.daily.inputTokens, label: 'daily input token limit' },
    { limit: limits.dailyOutputTokenLimit, used: usage.daily.outputTokens, label: 'daily output token limit' },
    { limit: limits.dailyDollarLimit, used: usage.daily.estimatedCostUsd, label: 'daily dollar limit' },
  ]

  for (const check of dailyChecks) {
    if (check.limit !== undefined && check.used >= check.limit) {
      return {
        exceeded: true,
        reason: `AI ${check.label} exceeded (${check.used} >= ${check.limit})`,
        window: 'daily',
      }
    }
  }

  const hourlyTokenTotal = usage.hourly.inputTokens + usage.hourly.outputTokens

  const hourlyChecks = [
    { limit: limits.hourlyRequestLimit, used: usage.hourly.requests, label: 'hourly request limit' },
    { limit: limits.hourlyTokenLimit, used: hourlyTokenTotal, label: 'hourly token limit' },
    { limit: limits.hourlyDollarLimit, used: usage.hourly.estimatedCostUsd, label: 'hourly dollar limit' },
  ]

  for (const check of hourlyChecks) {
    if (check.limit !== undefined && check.used >= check.limit) {
      return {
        exceeded: true,
        reason: `AI ${check.label} exceeded (${check.used} >= ${check.limit})`,
        window: 'hourly',
      }
    }
  }

  return { exceeded: false }
}

/**
 * Logs budget exceeded once per window/reason combination.
 * @param {string} reason
 * @param {string} correlationId
 */
export function logBudgetExceeded(reason, correlationId) {
  const logKey = `${reason}:${new Date().toISOString().slice(0, 13)}`
  if (loggedBudgetExceededKeys.has(logKey)) {
    return
  }

  loggedBudgetExceededKeys.add(logKey)
  process.stderr.write(`[AI budget exceeded] ${JSON.stringify({ reason, correlationId })}\n`)
}

/**
 * Clears budget log deduplication state (for tests).
 */
export function resetBudgetLogState() {
  loggedBudgetExceededKeys.clear()
}

/**
 * @returns {{ daily: ReturnType<typeof resolveAiBudgetLimits>, usage: ReturnType<typeof getBudgetUsage> }}
 */
export function getBudgetStatus(now = new Date()) {
  return {
    limits: resolveAiBudgetLimits(),
    usage: getBudgetUsage(now),
    exceeded: checkAiBudgetExceeded(now),
  }
}
