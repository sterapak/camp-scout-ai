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

const nowDefault = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`

/**
 * Availability watches: one row per "watch this campground for a freed-up
 * reservation" request. The scheduler polls each active watch, diffs the fresh
 * availability against the last snapshot, and alerts on a Reserved -> Available
 * flip (a cancellation) within the watch's date range + site filters.
 */
export const watches = sqliteTable('watches', {
  id: text('id').primaryKey(), // uuid
  // 'recgov' (Recreation.gov) or 'reservecalifornia' (Phase 2).
  platform: text('platform').notNull(),
  // Recreation.gov campground id (e.g. "232447"); RC FacilityId in Phase 2.
  facilityId: text('facility_id').notNull(),
  placeId: text('place_id'), // RC only (park id), null for recgov
  campgroundName: text('campground_name').notNull(),
  startDate: text('start_date').notNull(), // 'YYYY-MM-DD' inclusive
  endDate: text('end_date').notNull(), // 'YYYY-MM-DD' inclusive
  minNights: integer('min_nights').notNull().default(1),
  // Optional JSON filters: { siteTypes?: string[], loops?: string[], siteIds?: string[], minPeople?: number }
  siteFilters: text('site_filters'),
  status: text('status').notNull().default('active'), // active | paused | expired
  pollIntervalSeconds: integer('poll_interval_seconds'), // null -> global default
  lastPolledAt: text('last_polled_at'),
  lastPollStatus: text('last_poll_status'), // 'ok' | 'error: ...' (for the UI)
  createdAt: text('created_at').notNull().default(nowDefault),
})

export type WatchRow = typeof watches.$inferSelect

/**
 * Latest availability snapshot per (platform, facilityId, monthKey). Keyed by
 * facility+month (NOT per watch) so overlapping watches on one campground share
 * a single fetch. `payloadHash` lets the diff short-circuit when nothing changed.
 */
export const availabilitySnapshots = sqliteTable('availability_snapshots', {
  // "<platform>:<facilityId>:<YYYY-MM>"
  snapshotKey: text('snapshot_key').primaryKey(),
  platform: text('platform').notNull(),
  facilityId: text('facility_id').notNull(),
  monthKey: text('month_key').notNull(), // 'YYYY-MM'
  // Normalized JSON: { [siteId]: { siteName, siteType, loop, maxPeople, dates: { 'YYYY-MM-DD': 'available'|'reserved'|'closed' } } }
  payload: text('payload').notNull(),
  payloadHash: text('payload_hash').notNull(),
  fetchedAt: text('fetched_at').notNull().default(nowDefault),
})

export type AvailabilitySnapshotRow = typeof availabilitySnapshots.$inferSelect

/**
 * One row per alert actually sent, for dedup + the "recent alerts" UI. dedupKey
 * = "<watchId>|<siteId>|<date>"; a freed (watch, site, date) is never re-alerted
 * unless it flips back to reserved and frees again (re-arm), plus a cooldown.
 */
export const alertsSent = sqliteTable('alerts_sent', {
  id: text('id').primaryKey(), // uuid
  watchId: text('watch_id').notNull(),
  dedupKey: text('dedup_key').notNull().unique(),
  siteId: text('site_id').notNull(),
  siteName: text('site_name'),
  date: text('date').notNull(), // 'YYYY-MM-DD'
  channel: text('channel').notNull(), // 'sms' | 'email'
  deepLink: text('deep_link'),
  messageBody: text('message_body'),
  deliveryStatus: text('delivery_status').notNull().default('sent'), // sent | failed
  sentAt: text('sent_at').notNull().default(nowDefault),
})

export type AlertSentRow = typeof alertsSent.$inferSelect

/**
 * Single-row owner contact + channel preferences (v1 is single-user). Twilio /
 * email provider SECRETS live in env, not here — this is just who to notify and
 * on which channels.
 */
export const ownerSettings = sqliteTable('owner_settings', {
  id: integer('id').primaryKey().default(1), // always 1
  phone: text('phone'), // E.164
  email: text('email'),
  smsEnabled: integer('sms_enabled', { mode: 'boolean' }).notNull().default(true),
  emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull().default(nowDefault),
})

export type OwnerSettingsRow = typeof ownerSettings.$inferSelect
