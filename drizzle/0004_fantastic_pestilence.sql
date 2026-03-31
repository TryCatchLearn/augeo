CREATE TABLE `bid` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`bidder_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listing`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bidder_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bid_listing_createdAt_idx` ON `bid` (`listing_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `bid_listing_amount_idx` ON `bid` (`listing_id`,`amount_cents`);--> statement-breakpoint
CREATE INDEX `bid_bidderId_idx` ON `bid` (`bidder_id`);--> statement-breakpoint
ALTER TABLE `listing` ADD `current_bid_cents` integer;--> statement-breakpoint
ALTER TABLE `listing` ADD `bid_count` integer DEFAULT 0 NOT NULL;
