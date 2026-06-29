/**
 * Prometheus-compatible AI usage metrics.
 */

import { getUsageSummary, getEndpointMonitoring } from './aiUsageStore.js'

/**
 * Escapes a label value for Prometheus format.
 * @param {string} value
 * @returns {string}
 */
function escapeLabel(value) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

/**
 * Formats a counter metric line.
 * @param {string} name
 * @param {number} value
 * @param {Record<string, string>} [labels]
 * @returns {string}
 */
function formatCounter(name, value, labels = {}) {
  const labelStr = Object.entries(labels)
    .map(([key, val]) => `${key}="${escapeLabel(val)}"`)
    .join(',')

  return labelStr.length > 0
    ? `${name}{${labelStr}} ${value}`
    : `${name} ${value}`
}

/**
 * Generates Prometheus text exposition format for AI metrics.
 * @returns {string}
 */
export function renderPrometheusMetrics() {
  const summary = getUsageSummary()
  const monitoring = getEndpointMonitoring()

  const lines = [
    '# HELP ai_requests_total Total number of AI requests processed.',
    '# TYPE ai_requests_total counter',
    formatCounter('ai_requests_total', summary.totalRequests),
    '',
    '# HELP ai_requests_failed_total Total number of failed AI requests.',
    '# TYPE ai_requests_failed_total counter',
    formatCounter('ai_requests_failed_total', summary.failedRequests),
    '',
    '# HELP ai_requests_successful_total Total number of successful AI requests.',
    '# TYPE ai_requests_successful_total counter',
    formatCounter('ai_requests_successful_total', summary.successfulRequests),
    '',
    '# HELP ai_requests_today Total AI requests today (UTC).',
    '# TYPE ai_requests_today gauge',
    formatCounter('ai_requests_today', summary.requestsToday),
    '',
    '# HELP ai_latency_average_ms Average AI request latency in milliseconds.',
    '# TYPE ai_latency_average_ms gauge',
    formatCounter('ai_latency_average_ms', summary.averageResponseTimeMs),
    '',
    '# HELP ai_input_tokens_total Total estimated input tokens.',
    '# TYPE ai_input_tokens_total counter',
    formatCounter('ai_input_tokens_total', summary.estimatedInputTokens),
    '',
    '# HELP ai_output_tokens_total Total estimated output tokens.',
    '# TYPE ai_output_tokens_total counter',
    formatCounter('ai_output_tokens_total', summary.estimatedOutputTokens),
    '',
    '# HELP ai_estimated_cost_usd_total Total estimated OpenAI cost in USD.',
    '# TYPE ai_estimated_cost_usd_total counter',
    formatCounter('ai_estimated_cost_usd_total', Math.round(summary.estimatedOpenAiCostUsd * 1_000_000) / 1_000_000),
    '',
    '# HELP ai_cache_hits_total Total AI cache hits.',
    '# TYPE ai_cache_hits_total counter',
    formatCounter('ai_cache_hits_total', summary.cacheHits),
    '',
    '# HELP ai_cache_misses_total Total AI cache misses.',
    '# TYPE ai_cache_misses_total counter',
    formatCounter('ai_cache_misses_total', summary.cacheMisses),
    '',
    '# HELP ai_fake_provider_requests_total Requests served by the fake provider.',
    '# TYPE ai_fake_provider_requests_total counter',
    formatCounter('ai_fake_provider_requests_total', summary.fakeProviderRequests),
    '',
    '# HELP ai_openai_provider_requests_total Requests served by the OpenAI provider.',
    '# TYPE ai_openai_provider_requests_total counter',
    formatCounter('ai_openai_provider_requests_total', summary.openAiProviderRequests),
    '',
    '# HELP ai_http_responses_total HTTP response counts by status code.',
    '# TYPE ai_http_responses_total counter',
    formatCounter('ai_http_responses_total', monitoring.responses401, { status: '401' }),
    formatCounter('ai_http_responses_total', monitoring.responses429, { status: '429' }),
    formatCounter('ai_http_responses_total', monitoring.responses502, { status: '502' }),
    formatCounter('ai_http_responses_total', monitoring.responses503, { status: '503' }),
    '',
    '# HELP ai_requests_per_minute Current hour requests per minute.',
    '# TYPE ai_requests_per_minute gauge',
    formatCounter('ai_requests_per_minute', monitoring.requestsPerMinute),
  ]

  for (const [endpoint, count] of Object.entries(summary.requestsByEndpoint)) {
    lines.push(formatCounter('ai_requests_by_endpoint_total', count, { endpoint }))
  }

  for (const [provider, count] of Object.entries(summary.requestsByProvider)) {
    lines.push(formatCounter('ai_requests_by_provider_total', count, { provider }))
  }

  return `${lines.join('\n')}\n`
}
