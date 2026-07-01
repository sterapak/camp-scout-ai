/** @jest-environment node */

import {
  AI_DAILY_BUDGET_USD_ENV,
  AI_DAILY_DOLLAR_LIMIT_ENV,
  AI_MAX_PROMPT_TOKENS_ENV,
  AI_MAX_REQUEST_COST_USD_ENV,
  AI_SLOW_REQUEST_MS_ENV,
  resolveAiBudgetLimits,
  resolveMaxPromptTokensThreshold,
  resolveMaxRequestCostThreshold,
  resolveSlowRequestMsThreshold,
} from './aiConfig.js'
import { evaluateRequestThresholdWarnings } from './aiRequestThresholds.js'

describe('aiConfig request thresholds', () => {
  const envBackup = {
    [AI_DAILY_BUDGET_USD_ENV]: process.env[AI_DAILY_BUDGET_USD_ENV],
    [AI_DAILY_DOLLAR_LIMIT_ENV]: process.env[AI_DAILY_DOLLAR_LIMIT_ENV],
    [AI_MAX_PROMPT_TOKENS_ENV]: process.env[AI_MAX_PROMPT_TOKENS_ENV],
    [AI_MAX_REQUEST_COST_USD_ENV]: process.env[AI_MAX_REQUEST_COST_USD_ENV],
    [AI_SLOW_REQUEST_MS_ENV]: process.env[AI_SLOW_REQUEST_MS_ENV],
  }

  afterEach(() => {
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  it('prefers AI_DAILY_BUDGET_USD over AI_DAILY_DOLLAR_LIMIT', () => {
    process.env[AI_DAILY_BUDGET_USD_ENV] = '3.50'
    process.env[AI_DAILY_DOLLAR_LIMIT_ENV] = '10'

    expect(resolveAiBudgetLimits().dailyDollarLimit).toBe(3.5)
  })

  it('falls back to AI_DAILY_DOLLAR_LIMIT when AI_DAILY_BUDGET_USD is unset', () => {
    delete process.env[AI_DAILY_BUDGET_USD_ENV]
    process.env[AI_DAILY_DOLLAR_LIMIT_ENV] = '7.25'

    expect(resolveAiBudgetLimits().dailyDollarLimit).toBe(7.25)
  })

  it('resolves per-request threshold env vars', () => {
    process.env[AI_MAX_PROMPT_TOKENS_ENV] = '1500'
    process.env[AI_MAX_REQUEST_COST_USD_ENV] = '0.05'
    process.env[AI_SLOW_REQUEST_MS_ENV] = '5000'

    expect(resolveMaxPromptTokensThreshold()).toBe(1500)
    expect(resolveMaxRequestCostThreshold()).toBe(0.05)
    expect(resolveSlowRequestMsThreshold()).toBe(5000)
  })
})

describe('aiRequestThresholds', () => {
  const envBackup = {
    [AI_MAX_PROMPT_TOKENS_ENV]: process.env[AI_MAX_PROMPT_TOKENS_ENV],
    [AI_MAX_REQUEST_COST_USD_ENV]: process.env[AI_MAX_REQUEST_COST_USD_ENV],
    [AI_SLOW_REQUEST_MS_ENV]: process.env[AI_SLOW_REQUEST_MS_ENV],
  }

  /** @type {jest.SpyInstance} */
  let stderrSpy

  beforeEach(() => {
    stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    stderrSpy.mockRestore()
    for (const [key, value] of Object.entries(envBackup)) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  })

  const baseRecord = {
    endpoint: '/api/ask',
    requestId: 'req-1',
    correlationId: 'corr-1',
    provider: 'openai',
    promptTokenEstimate: 100,
    completionTokens: 50,
    estimatedCostUsd: 0.001,
    latencyMs: 200,
  }

  it('logs WARN when prompt tokens exceed AI_MAX_PROMPT_TOKENS', () => {
    process.env[AI_MAX_PROMPT_TOKENS_ENV] = '80'

    evaluateRequestThresholdWarnings({
      ...baseRecord,
      promptTokenEstimate: 120,
    })

    const warnLines = stderrSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .filter((line) => line.includes('[AI warn]'))

    expect(warnLines).toHaveLength(1)
    expect(warnLines[0]).toContain('"reason":"prompt_tokens_exceeded"')
    expect(warnLines[0]).toContain('"level":"warning"')
  })

  it('logs WARN when request cost exceeds AI_MAX_REQUEST_COST_USD', () => {
    process.env[AI_MAX_REQUEST_COST_USD_ENV] = '0.01'

    evaluateRequestThresholdWarnings({
      ...baseRecord,
      estimatedCostUsd: 0.02,
    })

    const warnLines = stderrSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .filter((line) => line.includes('[AI warn]'))

    expect(warnLines).toHaveLength(1)
    expect(warnLines[0]).toContain('"reason":"request_cost_exceeded"')
  })

  it('logs WARN when latency exceeds AI_SLOW_REQUEST_MS', () => {
    process.env[AI_SLOW_REQUEST_MS_ENV] = '100'

    evaluateRequestThresholdWarnings({
      ...baseRecord,
      latencyMs: 250,
    })

    const warnLines = stderrSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .filter((line) => line.includes('[AI warn]'))

    expect(warnLines).toHaveLength(1)
    expect(warnLines[0]).toContain('"reason":"slow_request"')
  })

  it('does not log WARN when thresholds are unset', () => {
    delete process.env[AI_MAX_PROMPT_TOKENS_ENV]
    delete process.env[AI_MAX_REQUEST_COST_USD_ENV]
    delete process.env[AI_SLOW_REQUEST_MS_ENV]

    evaluateRequestThresholdWarnings({
      ...baseRecord,
      promptTokenEstimate: 999_999,
      estimatedCostUsd: 999,
      latencyMs: 999_999,
    })

    const warnLines = stderrSpy.mock.calls
      .map(([chunk]) => String(chunk))
      .filter((line) => line.includes('[AI warn]'))

    expect(warnLines).toHaveLength(0)
  })
})
