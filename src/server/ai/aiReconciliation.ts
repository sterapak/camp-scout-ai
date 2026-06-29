/**
 * OpenAI cost reconciliation report generation.
 */

import { getAllRecords } from './aiUsageStore.js'

export interface ReconciliationReport {
  generatedAt?: string
  localRequestCount: number
  localEstimatedInputTokens: number
  localEstimatedOutputTokens: number
  localEstimatedCostUsd: number
  openAiReportedRequests?: number
  openAiReportedInputTokens?: number
  openAiReportedOutputTokens?: number
  openAiReportedCostUsd?: number
  requestCountVariancePercent?: number
  inputTokenVariancePercent?: number
  outputTokenVariancePercent?: number
  costVariancePercent?: number
  discrepancies: string[]
}

interface OpenAiBillingInput {
  openAiReportedRequests?: number
  openAiReportedInputTokens?: number
  openAiReportedOutputTokens?: number
  openAiReportedCostUsd?: number
}

function computeVariancePercent(local: number, external: number): number | undefined {
  if (external === 0) {
    return local === 0 ? 0 : undefined
  }
  return Math.round(((local - external) / external) * 10000) / 100
}

/**
 * Generates a reconciliation report comparing local metrics to OpenAI billing data.
 * @param {{
 *   openAiReportedRequests?: number,
 *   openAiReportedInputTokens?: number,
 *   openAiReportedOutputTokens?: number,
 *   openAiReportedCostUsd?: number,
 * }} [openAiBilling]
 * @returns {ReconciliationReport}
 */
export function generateReconciliationReport(openAiBilling: OpenAiBillingInput = {}): ReconciliationReport {
  const records = getAllRecords()
  const openAiRecords = records.filter((r) => r.provider === 'openai')

  const localRequestCount = openAiRecords.length
  const localEstimatedInputTokens = openAiRecords.reduce((sum, r) => sum + r.promptTokenEstimate, 0)
  const localEstimatedOutputTokens = openAiRecords.reduce((sum, r) => sum + r.completionTokens, 0)
  const localEstimatedCostUsd = openAiRecords.reduce((sum, r) => sum + r.estimatedCostUsd, 0)

  /** @type {string[]} */
  const discrepancies = []

  const {
    openAiReportedRequests,
    openAiReportedInputTokens,
    openAiReportedOutputTokens,
    openAiReportedCostUsd,
  } = openAiBilling

  if (openAiReportedRequests !== undefined && openAiReportedRequests !== localRequestCount) {
    discrepancies.push(
      `Request count mismatch: local=${localRequestCount}, OpenAI=${openAiReportedRequests}`,
    )
  }

  if (openAiReportedInputTokens !== undefined && openAiReportedInputTokens !== localEstimatedInputTokens) {
    discrepancies.push(
      `Input token mismatch: local=${localEstimatedInputTokens}, OpenAI=${openAiReportedInputTokens}`,
    )
  }

  if (openAiReportedOutputTokens !== undefined && openAiReportedOutputTokens !== localEstimatedOutputTokens) {
    discrepancies.push(
      `Output token mismatch: local=${localEstimatedOutputTokens}, OpenAI=${openAiReportedOutputTokens}`,
    )
  }

  if (openAiReportedCostUsd !== undefined
    && Math.abs(openAiReportedCostUsd - localEstimatedCostUsd) > 0.0001) {
    discrepancies.push(
      `Cost mismatch: local=$${localEstimatedCostUsd.toFixed(6)}, OpenAI=$${openAiReportedCostUsd.toFixed(6)}`,
    )
  }

  return {
    generatedAt: new Date().toISOString(),
    localRequestCount,
    localEstimatedInputTokens,
    localEstimatedOutputTokens,
    localEstimatedCostUsd: Math.round(localEstimatedCostUsd * 1_000_000) / 1_000_000,
    openAiReportedRequests,
    openAiReportedInputTokens,
    openAiReportedOutputTokens,
    openAiReportedCostUsd,
    requestCountVariancePercent: openAiReportedRequests !== undefined
      ? computeVariancePercent(localRequestCount, openAiReportedRequests)
      : undefined,
    inputTokenVariancePercent: openAiReportedInputTokens !== undefined
      ? computeVariancePercent(localEstimatedInputTokens, openAiReportedInputTokens)
      : undefined,
    outputTokenVariancePercent: openAiReportedOutputTokens !== undefined
      ? computeVariancePercent(localEstimatedOutputTokens, openAiReportedOutputTokens)
      : undefined,
    costVariancePercent: openAiReportedCostUsd !== undefined
      ? computeVariancePercent(localEstimatedCostUsd, openAiReportedCostUsd)
      : undefined,
    discrepancies,
  }
}

/**
 * Converts a reconciliation report to CSV format.
 * @param {ReconciliationReport & { generatedAt?: string }} report
 * @returns {string}
 */
export function reconciliationReportToCsv(report) {
  const rows = [
    ['field', 'local', 'openai', 'variance_percent'],
    ['requests', report.localRequestCount, report.openAiReportedRequests ?? '', report.requestCountVariancePercent ?? ''],
    ['input_tokens', report.localEstimatedInputTokens, report.openAiReportedInputTokens ?? '', report.inputTokenVariancePercent ?? ''],
    ['output_tokens', report.localEstimatedOutputTokens, report.openAiReportedOutputTokens ?? '', report.outputTokenVariancePercent ?? ''],
    ['cost_usd', report.localEstimatedCostUsd, report.openAiReportedCostUsd ?? '', report.costVariancePercent ?? ''],
  ]

  return rows.map((row) => row.join(',')).join('\n')
}
