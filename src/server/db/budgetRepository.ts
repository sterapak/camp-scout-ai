/**
 * Durable AI budget accounting, backed by SQLite so the daily/hourly spend
 * caps survive restarts. One row per UTC day ("2026-07-07") and per UTC hour
 * ("2026-07-07T15"), accumulated on every recorded request.
 */
import { eq, sql } from 'drizzle-orm'

import { getDb, type Db } from './index.js'
import { aiBudgetUsage } from './schema.js'

export interface BudgetWindow {
  requests: number
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
}

export interface BudgetUsage {
  daily: BudgetWindow
  hourly: BudgetWindow
}

const EMPTY_WINDOW: BudgetWindow = {
  requests: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUsd: 0,
}

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10)
}

function hourKey(now: Date): string {
  return now.toISOString().slice(0, 13)
}

function nowIso(): string {
  return new Date().toISOString()
}

function bumpBucket(
  db: Db,
  bucketKey: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
): void {
  db.insert(aiBudgetUsage)
    .values({ bucketKey, requests: 1, inputTokens, outputTokens, costUsd, updatedAt: nowIso() })
    .onConflictDoUpdate({
      target: aiBudgetUsage.bucketKey,
      set: {
        requests: sql`${aiBudgetUsage.requests} + 1`,
        inputTokens: sql`${aiBudgetUsage.inputTokens} + ${inputTokens}`,
        outputTokens: sql`${aiBudgetUsage.outputTokens} + ${outputTokens}`,
        costUsd: sql`${aiBudgetUsage.costUsd} + ${costUsd}`,
        updatedAt: nowIso(),
      },
    })
    .run()
}

/** Accumulate one request into the current day and hour buckets. */
export function recordBudgetUsage(
  params: { inputTokens?: number; outputTokens?: number; costUsd?: number; now?: Date },
  db: Db = getDb(),
): void {
  const now = params.now ?? new Date()
  const inputTokens = params.inputTokens ?? 0
  const outputTokens = params.outputTokens ?? 0
  const costUsd = params.costUsd ?? 0

  bumpBucket(db, dayKey(now), inputTokens, outputTokens, costUsd)
  bumpBucket(db, hourKey(now), inputTokens, outputTokens, costUsd)
}

function readBucket(db: Db, bucketKey: string): BudgetWindow {
  const row = db
    .select()
    .from(aiBudgetUsage)
    .where(eq(aiBudgetUsage.bucketKey, bucketKey))
    .get()

  if (!row) return { ...EMPTY_WINDOW }
  return {
    requests: row.requests,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    estimatedCostUsd: row.costUsd,
  }
}

/** Durable daily + hourly totals used by the budget cap check. */
export function getBudgetUsage(now: Date = new Date(), db: Db = getDb()): BudgetUsage {
  return {
    daily: readBucket(db, dayKey(now)),
    hourly: readBucket(db, hourKey(now)),
  }
}

/** Test helper: clear all accumulated budget rows. */
export function __resetBudgetForTests(db: Db = getDb()): void {
  db.delete(aiBudgetUsage).run()
}
