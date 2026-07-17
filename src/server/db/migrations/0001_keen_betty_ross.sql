CREATE TABLE `alerts_sent` (
	`id` text PRIMARY KEY NOT NULL,
	`watch_id` text NOT NULL,
	`dedup_key` text NOT NULL,
	`site_id` text NOT NULL,
	`site_name` text,
	`date` text NOT NULL,
	`channel` text NOT NULL,
	`deep_link` text,
	`message_body` text,
	`delivery_status` text DEFAULT 'sent' NOT NULL,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_sent_dedup_key_unique` ON `alerts_sent` (`dedup_key`);--> statement-breakpoint
CREATE TABLE `availability_snapshots` (
	`snapshot_key` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`facility_id` text NOT NULL,
	`month_key` text NOT NULL,
	`payload` text NOT NULL,
	`payload_hash` text NOT NULL,
	`fetched_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `owner_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`phone` text,
	`email` text,
	`sms_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watches` (
	`id` text PRIMARY KEY NOT NULL,
	`platform` text NOT NULL,
	`facility_id` text NOT NULL,
	`place_id` text,
	`campground_name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`min_nights` integer DEFAULT 1 NOT NULL,
	`site_filters` text,
	`status` text DEFAULT 'active' NOT NULL,
	`poll_interval_seconds` integer,
	`last_polled_at` text,
	`last_poll_status` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
