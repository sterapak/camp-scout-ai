/**
 * Drizzle schema for Camp Scout AI's SQLite store.
 *
 * Currently just durable AI budget accounting: one row per time bucket
 * (a UTC day key like "2026-07-07" or an hour key like "2026-07-07T15"),
 * accumulating usage so the daily/hourly spend caps survive restarts and are
 * shared across requests on the single instance.
 */
import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const aiBudgetUsage = sqliteTable('ai_budget_usage', {
  bucketKey: text('bucket_key').primaryKey(),
  requests: integer('requests').notNull().default(0),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  costUsd: real('cost_usd').notNull().default(0),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`),
})

export type AiBudgetUsageRow = typeof aiBudgetUsage.$inferSelect
