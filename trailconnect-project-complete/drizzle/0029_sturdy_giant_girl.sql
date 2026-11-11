CREATE TABLE `eventConditionReports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`category` enum('trail_surface','precipitation','snow_ice','access','water','parking','cellular') NOT NULL,
	`note` varchar(600) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventConditionReports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventWeatherUpdateAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`weatherUpdateId` int NOT NULL,
	`userId` int NOT NULL,
	`readAt` datetime NOT NULL,
	CONSTRAINT `eventWeatherUpdateAcknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventWeatherUpdateAcknowledgements_update_user_unique` UNIQUE(`weatherUpdateId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `eventWeatherUpdates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`note` varchar(600) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventWeatherUpdates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `eventMessages` ADD `isPinned` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `eventConditionReports_event_created_idx` ON `eventConditionReports` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `eventWeatherUpdateAcknowledgements_user_idx` ON `eventWeatherUpdateAcknowledgements` (`userId`);--> statement-breakpoint
CREATE INDEX `eventWeatherUpdates_event_created_idx` ON `eventWeatherUpdates` (`eventId`,`createdAt`);