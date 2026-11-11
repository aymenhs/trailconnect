CREATE TABLE `eventSafetyCheckIns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('departure','arrival','manual_ok') NOT NULL,
	`note` varchar(280),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventSafetyCheckIns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userSafetyConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`termsVersion` varchar(32) NOT NULL,
	`acceptedAt` datetime NOT NULL,
	`locationSharingEnabled` boolean NOT NULL DEFAULT false,
	`emergencyContactEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userSafetyConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `userSafetyConsents_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `eventSafetyCheckIns_event_user_idx` ON `eventSafetyCheckIns` (`eventId`,`userId`);