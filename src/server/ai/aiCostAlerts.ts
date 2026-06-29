/**
 * AI cost threshold alerting.
 */

import { resolveAiBudgetLimits, resolveCostAlertThresholds } from './aiConfig.js'
import { getBudgetUsage } from './aiUsageStore.js'

/** @type {Set<number>} */
const triggeredDailyThresholds = new Set()

/** @type {Set<number>} */
const triggeredHourlyThresholds = new Set()

/**
 * @typedef {'log' | 'email' | 'webhook'} AlertChannel
 */

/**
 * @param {number} threshold
 * @param {number} used
 * @param {number} limit
 * @param {'daily' | 'hourly'} window
 * @param {Set<number>} triggeredSet
 */
function checkThreshold(threshold, used, limit, window, triggeredSet) {
  if (limit === undefined || limit <= 0) {
    return
  }

  const ratio = used / limit
  if (ratio < threshold) {
    return
  }

  const key = Math.round(threshold * 100)
  const dedupeKey = `${window}:${key}`
  if (triggeredSet.has(dedupeKey)) {
    return
  }

  triggeredSet.add(dedupeKey)

  const percent = Math.round(threshold * 100)
  const message = `AI ${window} budget at ${percent}% (${used.toFixed(4)} / ${limit})`

  process.stderr.write(`[AI cost alert] ${JSON.stringify({
    level: ratio >= 1 ? 'critical' : 'warning',
    window,
    thresholdPercent: percent,
    used,
    limit,
    message,
    channels: {
      log: true,
      email: 'future',
      webhook: 'future',
    },
  })}\n`)
}

/**
 * Evaluates cost alert thresholds against current budget usage.
 * @param {Date} [now]
 */
export function evaluateCostAlerts(now = new Date()) {
  const limits = resolveAiBudgetLimits()
  const usage = getBudgetUsage(now)
  const thresholds = resolveCostAlertThresholds()

  for (const threshold of thresholds) {
    if (limits.dailyDollarLimit !== undefined) {
      checkThreshold(
        threshold,
        usage.daily.estimatedCostUsd,
        limits.dailyDollarLimit,
        'daily',
        triggeredDailyThresholds,
      )
    }

    if (limits.hourlyDollarLimit !== undefined) {
      checkThreshold(
        threshold,
        usage.hourly.estimatedCostUsd,
        limits.hourlyDollarLimit,
        'hourly',
        triggeredHourlyThresholds,
      )
    }
  }
}

/**
 * Clears alert deduplication state (for tests).
 */
export function resetCostAlertState() {
  triggeredDailyThresholds.clear()
  triggeredHourlyThresholds.clear()
}

/**
 * @returns {{ triggeredDaily: number[], triggeredHourly: number[] }}
 */
export function getTriggeredAlerts() {
  return {
    triggeredDaily: [...triggeredDailyThresholds],
    triggeredHourly: [...triggeredHourlyThresholds],
  }
}
