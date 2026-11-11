CREATE TABLE `eventDayOfBriefAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`briefUpdatedAt` datetime NOT NULL,
	`acknowledgedAt` datetime NOT NULL,
	CONSTRAINT `eventDayOfBriefAcknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventDayOfBriefAcknowledgements_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `eventRoutePlanHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`operationalRoute` text,
	`backupPlan` text,
	`routeImageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventRoutePlanHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `routeImageUrl` varchar(1024);--> statement-breakpoint
CREATE INDEX `eventDayOfBriefAcknowledgements_event_version_idx` ON `eventDayOfBriefAcknowledgements` (`eventId`,`briefUpdatedAt`);--> statement-breakpoint
CREATE INDEX `eventRoutePlanHistory_event_created_idx` ON `eventRoutePlanHistory` (`eventId`,`createdAt`);