CREATE TABLE `listing` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`category` text NOT NULL,
	`condition` text NOT NULL,
	`starting_bid_cents` integer NOT NULL,
	`reserve_price_cents` integer,
	`starts_at` integer,
	`ends_at` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listing_sellerId_idx` ON `listing` (`seller_id`);--> statement-breakpoint
CREATE INDEX `listing_status_idx` ON `listing` (`status`);--> statement-breakpoint
CREATE TABLE `listing_image` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`public_id` text NOT NULL,
	`url` text NOT NULL,
	`is_main` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listing`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listing_image_listingId_idx` ON `listing_image` (`listing_id`);--> statement-breakpoint
CREATE INDEX `listing_image_main_idx` ON `listing_image` (`listing_id`,`is_main`);