CREATE TABLE `notification` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`payload` text NOT NULL,
	`read_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `notification_dedupe_key_unique` ON `notification` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `notification_user_recent_idx` ON `notification` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notification_user_unread_idx` ON `notification` (`user_id`,`read_at`,`created_at`);