-- Multi-user Phase 1: add users; scope watches/alerts/settings per user.
-- Existing watches/alerts_sent/owner_settings held only pre-launch test data (no
-- users existed), so they are dropped and recreated user-scoped. availability_
-- snapshots is shared per (facility, month) and is unchanged.
DROP TABLE IF EXISTS `watches`;--> statement-breakpoint
DROP TABLE IF EXISTS `alerts_sent`;--> statement-breakpoint
DROP TABLE IF EXISTS `owner_settings`;--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`google_sub` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`picture` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_google_sub_unique` ON `users` (`google_sub`);--> statement-breakpoint
CREATE TABLE `watches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
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
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `alerts_sent` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`watch_id` text NOT NULL,
	`dedup_key` text NOT NULL,
	`site_id` text NOT NULL,
	`site_name` text,
	`date` text NOT NULL,
	`channel` text NOT NULL,
	`deep_link` text,
	`message_body` text,
	`delivery_status` text DEFAULT 'sent' NOT NULL,
	`sent_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `alerts_sent_dedup_key_unique` ON `alerts_sent` (`dedup_key`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text,
	`email` text,
	`sms_enabled` integer DEFAULT true NOT NULL,
	`email_enabled` integer DEFAULT false NOT NULL,
	`phone_verified` integer DEFAULT false NOT NULL,
	`sms_consent_at` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
