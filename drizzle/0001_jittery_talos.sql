CREATE TABLE `news_images` (
	`id` text PRIMARY KEY NOT NULL,
	`news_id` text NOT NULL,
	`object_key` text NOT NULL,
	`mime` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`news_id`) REFERENCES `news`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_news_images_news_id` ON `news_images` (`news_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_news_images_news_position` ON `news_images` (`news_id`,`position`);