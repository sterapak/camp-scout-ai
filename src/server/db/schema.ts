/**
 * Drizzle schema for Camp Scout AI's SQLite store.
 *
 * Currently just durable AI budget accounting: one row per time bucket
 * (a UTC day key like "2026-07-07" or an hour key like "2026-07-07T15"),
 * accumulating usage so the daily/hourly spend caps survive restarts and are
 * shared across requests on the single instance.
 */
import { sql } from 'drizzle-orm'
import { integer, primaryKey, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
 * Google-authenticated users. Identity comes from Google OAuth; the app is
 * multi-user (each user owns their own watches + notify settings). Sessions are
 * stateless signed-JWT cookies, so there is no sessions table.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // uuid
  googleSub: text('google_sub').notNull().unique(), // Google's stable subject id
  email: text('email').notNull(),
  name: text('name'),
  picture: text('picture'),
  createdAt: text('created_at').notNull().default(nowDefault),
})

export type UserRow = typeof users.$inferSelect

/**
 * Availability watches: one row per "watch this campground for a freed-up
 * reservation" request. The scheduler polls each active watch, diffs the fresh
 * availability against the last snapshot, and alerts on a Reserved -> Available
 * flip (a cancellation) within the watch's date range + site filters.
 */
export const watches = sqliteTable('watches', {
  id: text('id').primaryKey(), // uuid
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
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
 * Per-user contact + channel preferences (one row per user). Twilio / email
 * SECRETS live in env — this is just who to notify and on which channels.
 * phoneVerified + smsConsentAt are populated by the Phase-2 verification flow;
 * SMS to a user is gated on both once A2P 10DLC is live (Phase 3).
 */
export const userSettings = sqliteTable('user_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  phone: text('phone'), // E.164
  email: text('email'),
  smsEnabled: integer('sms_enabled', { mode: 'boolean' }).notNull().default(true),
  emailEnabled: integer('email_enabled', { mode: 'boolean' }).notNull().default(false),
  phoneVerified: integer('phone_verified', { mode: 'boolean' }).notNull().default(false),
  smsConsentAt: text('sms_consent_at'), // ISO timestamp of explicit SMS opt-in
  updatedAt: text('updated_at').notNull().default(nowDefault),
})

export type UserSettingsRow = typeof userSettings.$inferSelect

/**
 * Generated campground AI summaries, so they survive restarts and deploys.
 *
 * Previously these lived ONLY in an in-memory Map, so every deploy silently
 * discarded every summary and the next visitor paid full generation latency and
 * cost again. ~$0.0012 per summary is small per unit but recurs forever, and is
 * unbounded once summaries are generated on demand across the RIDB catalog.
 *
 * Primary key is (campground_id, snapshot_id) — the same key the in-memory cache
 * already used. Including the knowledge snapshot id is what makes invalidation
 * automatic: when a campground's knowledge changes its snapshot id changes, the
 * old row stops matching, and a fresh summary is generated. Old rows are
 * harmless history rather than stale reads.
 */
export const campgroundSummaries = sqliteTable(
  'campground_summaries',
  {
    campgroundId: text('campground_id').notNull(),
    snapshotId: text('snapshot_id').notNull(),
    /** Full CampgroundSummarySuccess payload, JSON-encoded. */
    summaryJson: text('summary_json').notNull(),
    /** Full KnowledgeSnapshot, JSON-encoded — returned to the client verbatim. */
    knowledgeSnapshotJson: text('knowledge_snapshot_json').notNull(),
    /** ISO 8601; powers the "Generated on <date>" line in the UI. */
    generatedAt: text('generated_at').notNull(),
    updatedAt: text('updated_at').notNull().default(nowDefault),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.campgroundId, table.snapshotId] }),
  }),
)

export type CampgroundSummaryRow = typeof campgroundSummaries.$inferSelect
