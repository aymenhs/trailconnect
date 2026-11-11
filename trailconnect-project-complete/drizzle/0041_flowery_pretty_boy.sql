CREATE TABLE `participantPackingItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`participantId` int NOT NULL,
	`itemKey` varchar(220) NOT NULL,
	`checked` boolean NOT NULL DEFAULT false,
	`checkedAt` datetime,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `participantPackingItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `participantPackingItems_event_participant_item_unique` UNIQUE(`eventId`,`participantId`,`itemKey`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `participantGuidance` text;--> statement-breakpoint
ALTER TABLE `events` ADD `cancellationPolicy` varchar(1200);--> statement-breakpoint
CREATE INDEX `participantPackingItems_event_participant_idx` ON `participantPackingItems` (`eventId`,`participantId`);