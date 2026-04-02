ALTER TABLE `listing` ADD `outcome` text;--> statement-breakpoint
ALTER TABLE `listing` ADD `winner_user_id` text REFERENCES user(id) ON DELETE set null;--> statement-breakpoint
ALTER TABLE `listing` ADD `winning_bid_id` text REFERENCES bid(id) ON DELETE set null;
