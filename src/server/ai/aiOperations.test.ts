/** @jest-environment node */

import { appendAuditLogEntry, queryRecentAuditLog, resetAuditLog } from './aiAuditLog.js'
import { checkAiBudgetExceeded, resetBudgetLogState } from './aiBudget.js'
import {
  AI_ENABLED_ENV,
  AI_MAINTENANCE_MODE_ENV,
  isAiEnabled,
  parseBooleanEnv,
  resolveAiBudgetLimits,
} from './aiConfig.js'
import { evaluateCostAlerts, resetCostAlertState } from './aiCostAlerts.js'
import { estimateRequestCost } from './aiCostCalculator.js'
import { buildAiDashboard } from './aiDashboard.js'
import {
  checkAiEndpointAccess,
  finalizeAiRequest,
  resetAiOperationsState,
  resolveEffectiveProvider,
} from './aiOperations.js'
import {
  buildRequestRecord,
  getUsageSummary,
  recordAiRequest,
  resetAiUsageStore,
} from './aiUsageStore.js'
import { renderPrometheusMetrics } from './aiMetrics.js'
import {
  generateReconciliationReport,
  reconciliationReportToCsv,
} from './aiReconciliation.js'

describe('aiConfig', () => {
  const originalAiEnabled = process.env[AI_ENABLED_ENV]
  const originalMaintenance = process.env[AI_MAINTENANCE_MODE_ENV]

  afterEach(() => {
    if (originalAiEnabled === undefined) {
      delete process.env[AI_ENABLED_ENV]
    } else {
      process.env[AI_ENABLED_ENV] = originalAiEnabled
    }

    if (originalMaintenance === undefined) {
      delete process.env[AI_MAINTENANCE_MODE_ENV]
    } else {
      process.env[AI_MAINTENANCE_MODE_ENV] = originalMaintenance
    }
  })

  it('defaults AI_ENABLED to false', () => {
    delete process.env[AI_ENABLED_ENV]
    expect(isAiEnabled()).toBe(false)
  })

  it('parses boolean env values', () => {
    expect(parseBooleanEnv('true', false)).toBe(true)
    expect(parseBooleanEnv('false', true)).toBe(false)
    expect(parseBooleanEnv('yes', false)).toBe(true)
    expect(parseBooleanEnv(undefined, false)).toBe(false)
  })

  it('resolves budget limits from env', () => {
    process.env.AI_DAILY_REQUEST_LIMIT = '100'
    process.env.AI_HOURLY_DOLLAR_LIMIT = '5.50'

    const limits = resolveAiBudgetLimits()
    expect(limits.dailyRequestLimit).toBe(100)
    expect(limits.hourlyDollarLimit).toBe(5.5)

    delete process.env.AI_DAILY_REQUEST_LIMIT
    delete process.env.AI_HOURLY_DOLLAR_LIMIT
  })
})

describe('aiOperations kill switch', () => {
  const originalAiEnabled = process.env[AI_ENABLED_ENV]

  beforeEach(() => {
    resetAiOperationsState()
  })

  afterEach(() => {
    if (originalAiEnabled === undefined) {
      delete process.env[AI_ENABLED_ENV]
    } else {
      process.env[AI_ENABLED_ENV] = originalAiEnabled
    }
  })

  it('forces fake provider when AI_ENABLED is false', () => {
    delete process.env[AI_ENABLED_ENV]
    expect(resolveEffectiveProvider('openai')).toBe('fake')
  })

  it('allows openai when AI_ENABLED is true', () => {
    process.env[AI_ENABLED_ENV] = 'true'
    expect(resolveEffectiveProvider('openai')).toBe('openai')
  })
})

describe('aiOperations maintenance mode', () => {
  const originalMaintenance = process.env[AI_MAINTENANCE_MODE_ENV]

  beforeEach(() => {
    resetAiOperationsState()
  })

  afterEach(() => {
    if (originalMaintenance === undefined) {
      delete process.env[AI_MAINTENANCE_MODE_ENV]
    } else {
      process.env[AI_MAINTENANCE_MODE_ENV] = originalMaintenance
    }
  })

  it('blocks AI endpoints when maintenance mode is enabled', () => {
    process.env[AI_MAINTENANCE_MODE_ENV] = 'true'

    const result = checkAiEndpointAccess({
      endpoint: '/api/ask',
      correlationId: 'test-correlation',
      wouldUseOpenAi: false,
    })

    expect(result.blocked).toBe(true)
    if (result.blocked) {
      expect(result.statusCode).toBe(503)
      expect(result.body.error).toContain('maintenance')
    }
  })
})

describe('aiUsageStore and budgets', () => {
  beforeEach(() => {
    resetAiUsageStore()
    resetBudgetLogState()
    resetCostAlertState()
    resetAuditLog()
    resetAiOperationsState()
  })

  it('tracks request metrics', () => {
    const record = buildRequestRecord({
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'fake',
      latencyMs: 42,
      clientIp: '127.0.0.1',
      authenticatedUser: 'bearer-token',
      responseStatus: 200,
      promptTokenEstimate: 100,
      completionTokens: 50,
    })

    recordAiRequest(record)

    const summary = getUsageSummary()
    expect(summary.totalRequests).toBe(1)
    expect(summary.estimatedInputTokens).toBe(100)
    expect(summary.fakeProviderRequests).toBe(1)
  })

  it('detects daily budget exceeded', () => {
    process.env.AI_DAILY_REQUEST_LIMIT = '1'

    recordAiRequest(buildRequestRecord({
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'openai',
      latencyMs: 10,
      clientIp: '127.0.0.1',
      responseStatus: 200,
    }))

    const check = checkAiBudgetExceeded()
    expect(check.exceeded).toBe(true)

    delete process.env.AI_DAILY_REQUEST_LIMIT
  })

  it('blocks AI endpoints with 503 when AI_DAILY_BUDGET_USD is exceeded', () => {
    process.env.AI_DAILY_BUDGET_USD = '0.001'

    recordAiRequest(buildRequestRecord({
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'openai',
      promptTokenEstimate: 500_000,
      completionTokens: 500_000,
      latencyMs: 10,
      clientIp: '127.0.0.1',
      responseStatus: 200,
    }))

    const access = checkAiEndpointAccess({
      endpoint: '/api/ask',
      correlationId: 'corr-block',
      wouldUseOpenAi: true,
    })

    expect(access.blocked).toBe(true)
    if (access.blocked) {
      expect(access.statusCode).toBe(503)
      expect(access.body.error).toContain('budget')
    }

    delete process.env.AI_DAILY_BUDGET_USD
  })

  it('evaluates cost alerts at thresholds', () => {
    process.env.AI_DAILY_DOLLAR_LIMIT = '1'

    finalizeAiRequest({
      endpoint: '/api/ask',
      correlationId: 'corr-1',
      provider: 'openai',
      promptTokenEstimate: 500_000,
      completionTokens: 500_000,
      latencyMs: 100,
      clientIp: '127.0.0.1',
      responseStatus: 200,
      persistAudit: false,
    })

    evaluateCostAlerts()

    delete process.env.AI_DAILY_DOLLAR_LIMIT
  })
})

describe('aiAuditLog', () => {
  beforeEach(() => {
    resetAuditLog('/tmp/camp-scout-ai-test-audit.jsonl')
  })

  afterEach(() => {
    resetAuditLog('/tmp/camp-scout-ai-test-audit.jsonl')
  })

  it('stores and queries recent audit entries', () => {
    appendAuditLogEntry({
      timestamp: new Date().toISOString(),
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'fake',
      model: 'gpt-4o-mini',
      inputTokens: 10,
      outputTokens: 20,
      latencyMs: 30,
      authenticatedCaller: 'bearer-token',
      responseStatus: 200,
    }, { persist: false })

    const entries = queryRecentAuditLog()
    expect(entries).toHaveLength(1)
    expect(entries[0].endpoint).toBe('/api/ask')
  })
})

describe('aiMetrics and dashboard', () => {
  beforeEach(() => {
    resetAiUsageStore()
  })

  it('renders Prometheus metrics', () => {
    recordAiRequest(buildRequestRecord({
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'fake',
      latencyMs: 25,
      clientIp: '127.0.0.1',
      responseStatus: 200,
    }))

    const metrics = renderPrometheusMetrics()
    expect(metrics).toContain('ai_requests_total')
    expect(metrics).toContain('ai_requests_total 1')
  })

  it('builds dashboard without secrets', () => {
    const dashboard = buildAiDashboard()
    expect(dashboard.spend).toBeDefined()
    expect(dashboard.monitoring).toBeDefined()
    expect(JSON.stringify(dashboard)).not.toMatch(/sk-/)
  })
})

describe('aiReconciliation', () => {
  beforeEach(() => {
    resetAiUsageStore()
  })

  it('generates reconciliation report with variance', () => {
    recordAiRequest(buildRequestRecord({
      endpoint: '/api/ask',
      requestId: 'req-1',
      correlationId: 'corr-1',
      provider: 'openai',
      latencyMs: 10,
      clientIp: '127.0.0.1',
      responseStatus: 200,
      promptTokenEstimate: 100,
      completionTokens: 50,
    }))

    const report = generateReconciliationReport({
      openAiReportedRequests: 2,
      openAiReportedInputTokens: 200,
    })

    expect(report.localRequestCount).toBe(1)
    expect(report.discrepancies.length).toBeGreaterThan(0)

    const csv = reconciliationReportToCsv(report)
    expect(csv).toContain('requests')
  })
})

describe('aiCostCalculator', () => {
  it('estimates request cost from tokens', () => {
    const cost = estimateRequestCost(1_000_000, 1_000_000)
    expect(cost).toBeGreaterThan(0)
  })
})
