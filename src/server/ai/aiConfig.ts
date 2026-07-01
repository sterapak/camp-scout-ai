/**
 * AI operations configuration from environment variables.
 * Server-only; never import from React client code.
 */

export const AI_ENABLED_ENV = 'AI_ENABLED'
export const AI_MAINTENANCE_MODE_ENV = 'AI_MAINTENANCE_MODE'

export const AI_DAILY_REQUEST_LIMIT_ENV = 'AI_DAILY_REQUEST_LIMIT'
export const AI_DAILY_INPUT_TOKEN_LIMIT_ENV = 'AI_DAILY_INPUT_TOKEN_LIMIT'
export const AI_DAILY_OUTPUT_TOKEN_LIMIT_ENV = 'AI_DAILY_OUTPUT_TOKEN_LIMIT'
export const AI_DAILY_DOLLAR_LIMIT_ENV = 'AI_DAILY_DOLLAR_LIMIT'
export const AI_DAILY_BUDGET_USD_ENV = 'AI_DAILY_BUDGET_USD'

export const AI_MAX_PROMPT_TOKENS_ENV = 'AI_MAX_PROMPT_TOKENS'
export const AI_MAX_REQUEST_COST_USD_ENV = 'AI_MAX_REQUEST_COST_USD'
export const AI_SLOW_REQUEST_MS_ENV = 'AI_SLOW_REQUEST_MS'

export const AI_HOURLY_REQUEST_LIMIT_ENV = 'AI_HOURLY_REQUEST_LIMIT'
export const AI_HOURLY_TOKEN_LIMIT_ENV = 'AI_HOURLY_TOKEN_LIMIT'
export const AI_HOURLY_DOLLAR_LIMIT_ENV = 'AI_HOURLY_DOLLAR_LIMIT'

export const AI_AUDIT_LOG_PATH_ENV = 'AI_AUDIT_LOG_PATH'
export const AI_AUDIT_LOG_RETENTION_DAYS_ENV = 'AI_AUDIT_LOG_RETENTION_DAYS'

export const AI_COST_ALERT_WEBHOOK_URL_ENV = 'AI_COST_ALERT_WEBHOOK_URL'
export const AI_COST_ALERT_EMAIL_ENV = 'AI_COST_ALERT_EMAIL'

export const AI_MAINTENANCE_MESSAGE =
  'AI services are temporarily unavailable for maintenance. Please try again later.'
export const AI_BUDGET_EXCEEDED_MESSAGE =
  'AI usage budget has been exceeded. Service will resume when the budget resets.'
export const AI_DISABLED_MESSAGE = 'AI is globally disabled. Using fake provider only.'

const DEFAULT_AUDIT_LOG_PATH = '.ai-audit/audit-log.jsonl'
const DEFAULT_AUDIT_RETENTION_DAYS = 30

/**
 * Parses a boolean environment variable.
 * @param {string | undefined} value
 * @param {boolean} defaultValue
 * @returns {boolean}
 */
export function parseBooleanEnv(value, defaultValue) {
  if (value === undefined || value === null || value === '') {
    return defaultValue
  }

  const normalized = String(value).trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false
  }

  return defaultValue
}

/**
 * Parses a positive integer limit from env, returning undefined when unset.
 * @param {string | undefined} value
 * @returns {number | undefined}
 */
export function parseOptionalLimit(value) {
  if (value === undefined || value === null || value === '') {
    return undefined
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

/**
 * @returns {boolean}
 */
export function isAiEnabled() {
  return parseBooleanEnv(process.env[AI_ENABLED_ENV], false)
}

/**
 * @returns {boolean}
 */
export function isAiMaintenanceMode() {
  return parseBooleanEnv(process.env[AI_MAINTENANCE_MODE_ENV], false)
}

/**
 * @returns {{
 *   dailyRequestLimit?: number,
 *   dailyInputTokenLimit?: number,
 *   dailyOutputTokenLimit?: number,
 *   dailyDollarLimit?: number,
 *   hourlyRequestLimit?: number,
 *   hourlyTokenLimit?: number,
 *   hourlyDollarLimit?: number,
 * }}
 */
export function resolveAiBudgetLimits() {
  const dailyBudgetUsd = parseOptionalLimit(process.env[AI_DAILY_BUDGET_USD_ENV])
    ?? parseOptionalLimit(process.env[AI_DAILY_DOLLAR_LIMIT_ENV])

  return {
    dailyRequestLimit: parseOptionalLimit(process.env[AI_DAILY_REQUEST_LIMIT_ENV]),
    dailyInputTokenLimit: parseOptionalLimit(process.env[AI_DAILY_INPUT_TOKEN_LIMIT_ENV]),
    dailyOutputTokenLimit: parseOptionalLimit(process.env[AI_DAILY_OUTPUT_TOKEN_LIMIT_ENV]),
    dailyDollarLimit: dailyBudgetUsd,
    hourlyRequestLimit: parseOptionalLimit(process.env[AI_HOURLY_REQUEST_LIMIT_ENV]),
    hourlyTokenLimit: parseOptionalLimit(process.env[AI_HOURLY_TOKEN_LIMIT_ENV]),
    hourlyDollarLimit: parseOptionalLimit(process.env[AI_HOURLY_DOLLAR_LIMIT_ENV]),
  }
}

/**
 * @returns {number | undefined}
 */
export function resolveMaxPromptTokensThreshold() {
  return parseOptionalLimit(process.env[AI_MAX_PROMPT_TOKENS_ENV])
}

/**
 * @returns {number | undefined}
 */
export function resolveMaxRequestCostThreshold() {
  return parseOptionalLimit(process.env[AI_MAX_REQUEST_COST_USD_ENV])
}

/**
 * @returns {number | undefined}
 */
export function resolveSlowRequestMsThreshold() {
  return parseOptionalLimit(process.env[AI_SLOW_REQUEST_MS_ENV])
}

/**
 * @returns {string}
 */
export function resolveAuditLogPath() {
  const configured = process.env[AI_AUDIT_LOG_PATH_ENV]
  if (typeof configured === 'string' && configured.trim().length > 0) {
    return configured.trim()
  }
  return DEFAULT_AUDIT_LOG_PATH
}

/**
 * @returns {number}
 */
export function resolveAuditLogRetentionDays() {
  const parsed = Number.parseInt(process.env[AI_AUDIT_LOG_RETENTION_DAYS_ENV] ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_AUDIT_RETENTION_DAYS
}

/**
 * Cost alert thresholds as fractions (0.5 = 50%).
 * @returns {number[]}
 */
export function resolveCostAlertThresholds() {
  return [0.5, 0.75, 0.9, 1.0]
}
