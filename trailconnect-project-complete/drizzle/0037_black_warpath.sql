CREATE TABLE `eventInvitationShareEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`actorId` int NOT NULL,
	`action` enum('copy','share') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventInvitationShareEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userInvitationTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userInvitationTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `eventInvitationShareEvents_event_created_idx` ON `eventInvitationShareEvents` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `userInvitationTemplates_user_updated_idx` ON `userInvitationTemplates` (`userId`,`updatedAt`);