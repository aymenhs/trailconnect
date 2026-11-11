CREATE TABLE `eventAccessRadarEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`authorId` int NOT NULL,
	`category` enum('trail','access','parking','permit','closure') NOT NULL,
	`status` enum('unknown','open','caution','restricted','closed') NOT NULL DEFAULT 'unknown',
	`label` varchar(140) NOT NULL,
	`note` varchar(600),
	`sourceLabel` varchar(120) NOT NULL,
	`sourceUrl` varchar(1024) NOT NULL,
	`checkedAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventAccessRadarEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventCarpoolHubs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`createdBy` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`instructions` varchar(600),
	`fallbackNote` varchar(600),
	`latitude` double,
	`longitude` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventCarpoolHubs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventOperationalDecisionAcknowledgements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`decisionId` int NOT NULL,
	`userId` int NOT NULL,
	`acknowledgedAt` datetime NOT NULL,
	CONSTRAINT `eventOperationalDecisionAcknowledgements_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventOperationalDecisionAcknowledgements_decision_user_unique` UNIQUE(`decisionId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `eventPaceGroupAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`assignedBy` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventPaceGroupAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventPaceGroupAssignments_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `eventPaceGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`createdBy` int NOT NULL,
	`leaderId` int,
	`label` varchar(100) NOT NULL,
	`paceDescription` varchar(400) NOT NULL,
	`rallyPoints` varchar(1200),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventPaceGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreparationPassportEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`eventId` int NOT NULL,
	`terrainReflection` varchar(600),
	`paceReflection` enum('comfortable','steady','challenging','not_recorded') NOT NULL DEFAULT 'not_recorded',
	`conditionsReflection` varchar(600),
	`equipmentReflection` varchar(600),
	`personalNote` varchar(1200),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreparationPassportEntries_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreparationPassportEntries_user_event_unique` UNIQUE(`userId`,`eventId`)
);
--> statement-breakpoint
ALTER TABLE `carpoolOffers` ADD `hubId` int;--> statement-breakpoint
ALTER TABLE `eventOperationalDecisions` ADD `effectiveFrom` datetime;--> statement-breakpoint
ALTER TABLE `eventOperationalDecisions` ADD `effectiveUntil` datetime;--> statement-breakpoint
ALTER TABLE `eventOperationalDecisions` ADD `planBActivated` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `eventOperationalDecisions` ADD `acknowledgementRequired` boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX `eventAccessRadarEntries_event_checked_idx` ON `eventAccessRadarEntries` (`eventId`,`checkedAt`);--> statement-breakpoint
CREATE INDEX `eventCarpoolHubs_event_idx` ON `eventCarpoolHubs` (`eventId`);--> statement-breakpoint
CREATE INDEX `eventOperationalDecisionAcknowledgements_user_idx` ON `eventOperationalDecisionAcknowledgements` (`userId`);--> statement-breakpoint
CREATE INDEX `eventPaceGroupAssignments_group_idx` ON `eventPaceGroupAssignments` (`groupId`);--> statement-breakpoint
CREATE INDEX `eventPaceGroups_event_idx` ON `eventPaceGroups` (`eventId`);--> statement-breakpoint
CREATE INDEX `userPreparationPassportEntries_user_updated_idx` ON `userPreparationPassportEntries` (`userId`,`updatedAt`);