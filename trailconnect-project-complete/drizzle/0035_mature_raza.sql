CREATE TABLE `eventDateOptionAvailabilities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`optionId` int NOT NULL,
	`userId` int NOT NULL,
	`available` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventDateOptionAvailabilities_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventDateOptionAvailabilities_option_user_unique` UNIQUE(`optionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `eventDateOptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`createdBy` int NOT NULL,
	`startsAt` datetime NOT NULL,
	`label` varchar(120),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventDateOptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventDateOptions_event_startsAt_unique` UNIQUE(`eventId`,`startsAt`)
);
--> statement-breakpoint
CREATE TABLE `eventDayOfBriefVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`meetingPoint` varchar(300),
	`meetingInstructions` text,
	`emergencyPlan` text,
	`operationalRoute` text,
	`backupPlan` text,
	`routeImageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventDayOfBriefVersions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventOperationalDecisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`outcome` enum('maintained','adapted','cancelled') NOT NULL,
	`note` varchar(600) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventOperationalDecisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `carpoolOffers` ADD `status` enum('active','withdrawn') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `carpoolOffers` ADD `withdrawalNote` varchar(600);--> statement-breakpoint
ALTER TABLE `carpoolOffers` ADD `withdrawnAt` datetime;--> statement-breakpoint
CREATE INDEX `eventDateOptionAvailabilities_user_idx` ON `eventDateOptionAvailabilities` (`userId`);--> statement-breakpoint
CREATE INDEX `eventDateOptions_event_idx` ON `eventDateOptions` (`eventId`);--> statement-breakpoint
CREATE INDEX `eventDayOfBriefVersions_event_created_idx` ON `eventDayOfBriefVersions` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `eventOperationalDecisions_event_created_idx` ON `eventOperationalDecisions` (`eventId`,`createdAt`);