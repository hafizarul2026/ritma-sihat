CREATE TABLE `daily_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`entry_date` text NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`amount` integer NOT NULL,
	`unit` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`client_request_id` text NOT NULL,
	`entry_time` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_entries_user_request_id` ON `daily_entries` (`user_id`,`client_request_id`);--> statement-breakpoint
CREATE INDEX `idx_daily_entries_user_date` ON `daily_entries` (`user_id`,`entry_date`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text NOT NULL,
	`display_name` text DEFAULT '' NOT NULL,
	`day_mode` text DEFAULT 'biasa' NOT NULL,
	`calorie_target` integer DEFAULT 1800 NOT NULL,
	`water_target_ml` integer DEFAULT 2200 NOT NULL,
	`exercise_target_min` integer DEFAULT 30 NOT NULL,
	`contact_consent` integer DEFAULT false NOT NULL,
	`marketing_whatsapp` integer DEFAULT false NOT NULL,
	`marketing_email` integer DEFAULT false NOT NULL,
	`consent_at` text NOT NULL,
	`notice_version` text DEFAULT '2026-08-22' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
