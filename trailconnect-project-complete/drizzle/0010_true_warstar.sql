CREATE TABLE `liveLocationShares` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`isActive` boolean NOT NULL DEFAULT false,
	`latitude` double,
	`longitude` double,
	`accuracyMeters` double,
	`expiresAt` datetime NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `liveLocationShares_id` PRIMARY KEY(`id`),
	CONSTRAINT `liveLocationShares_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `liveLocationShares_event_active_idx` ON `liveLocationShares` (`eventId`,`isActive`);