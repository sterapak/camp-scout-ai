-- Persist generated campground AI summaries so they survive restarts + deploys.
-- Previously they lived only in an in-memory Map: every deploy discarded all of
-- them and the next visitor paid full generation latency and cost again.
--
-- Keyed on (campground_id, snapshot_id) — the same key the in-memory cache used.
-- The snapshot id makes invalidation automatic: when a campground's knowledge
-- changes its snapshot id changes, the old row stops matching, and a fresh
-- summary is generated. Purely additive; no existing table is touched.
--
-- Hand-written to match 0002_multi_user.sql. `drizzle-kit generate` cannot be
-- used on this branch: there is no 0002_snapshot.json, so drizzle's last known
-- state is 0001 (pre multi-user) and it prompts to disambiguate the multi-user
-- tables as renames — which would emit a migration that recreates them.
CREATE TABLE IF NOT EXISTS `campground_summaries` (
	`campground_id` text NOT NULL,
	`snapshot_id` text NOT NULL,
	`summary_json` text NOT NULL,
	`knowledge_snapshot_json` text NOT NULL,
	`generated_at` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	PRIMARY KEY(`campground_id`, `snapshot_id`)
);
