/** @jest-environment node */
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { checkAiBudgetExceeded } from '../ai/aiBudget.js'
import { __resetDbForTests } from './index.js'
import { getBudgetUsage, recordBudgetUsage, __resetBudgetForTests } from './budgetRepository.js'

describe('durable AI budget (SQLite)', () => {
  let dir: string
  let previousPath: string | undefined

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'campscout-db-'))
    previousPath = process.env.DATABASE_PATH
    process.env.DATABASE_PATH = join(dir, 'budget.sqlite') // real file, not :memory:
    __resetDbForTests(null) // drop the memoized :memory: connection from jest.setup
  })

  afterEach(() => {
    __resetDbForTests(null)
    if (previousPath === undefined) delete process.env.DATABASE_PATH
    else process.env.DATABASE_PATH = previousPath
    rmSync(dir, { recursive: true, force: true })
  })

  it('accumulates the current day and hour buckets', () => {
    const now = new Date('2026-07-07T15:30:00Z')
    recordBudgetUsage({ inputTokens: 100, outputTokens: 50, costUsd: 0.02, now })
    recordBudgetUsage({ inputTokens: 100, outputTokens: 50, costUsd: 0.02, now })

    const usage = getBudgetUsage(now)
    expect(usage.daily.requests).toBe(2)
    expect(usage.daily.inputTokens).toBe(200)
    expect(usage.daily.estimatedCostUsd).toBeCloseTo(0.04)
    expect(usage.hourly.requests).toBe(2)
  })

  it('survives a restart — totals persist to disk and reload on a fresh connection', () => {
    const now = new Date('2026-07-07T15:30:00Z')
    recordBudgetUsage({ inputTokens: 200, outputTokens: 80, costUsd: 0.05, now })

    __resetDbForTests(null) // simulate process restart: reopen the same file
    const usage = getBudgetUsage(now)

    expect(usage.daily.requests).toBe(1)
    expect(usage.daily.estimatedCostUsd).toBeCloseTo(0.05)
  })

  it('enforces the daily $5 default cap through checkAiBudgetExceeded', () => {
    const now = new Date('2026-07-07T15:30:00Z')
    __resetBudgetForTests()
    // one costly request past the fail-closed default
    recordBudgetUsage({ inputTokens: 1000, outputTokens: 500, costUsd: 5.5, now })

    const result = checkAiBudgetExceeded(now)
    expect(result.exceeded).toBe(true)
    expect(result.window).toBe('daily')
  })

  it('fails CLOSED when the budget ledger cannot be read (blocks, not allows)', () => {
    // Point at an unopenable path (parent is a file, so the DB can't be created).
    const notADir = join(dir, 'not-a-dir')
    writeFileSync(notADir, 'x')
    process.env.DATABASE_PATH = join(notADir, 'budget.sqlite')
    __resetDbForTests(null)

    const result = checkAiBudgetExceeded()
    expect(result.exceeded).toBe(true)
    expect(result.reason).toMatch(/failing closed/i)
  })
})
