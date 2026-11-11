CREATE TABLE `eventPreparationStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`meetingAcknowledged` boolean NOT NULL DEFAULT false,
	`transportConfirmed` boolean NOT NULL DEFAULT false,
	`checklistCompleted` boolean NOT NULL DEFAULT false,
	`offlineReady` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventPreparationStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventPreparationStates_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `eventPreparationStates_eventId_idx` ON `eventPreparationStates` (`eventId`);