CREATE TABLE `eventSeries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`sourceEventId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`cadence` enum('weekly','biweekly','monthly') NOT NULL,
	`status` enum('active','paused') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventSeries_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventSeries_owner_source_unique` UNIQUE(`ownerId`,`sourceEventId`)
);
--> statement-breakpoint
CREATE TABLE `eventSeriesInterests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seriesId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventSeriesInterests_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventSeriesInterests_series_user_unique` UNIQUE(`seriesId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `eventSeries_owner_status_idx` ON `eventSeries` (`ownerId`,`status`);--> statement-breakpoint
CREATE INDEX `eventSeriesInterests_user_idx` ON `eventSeriesInterests` (`userId`);