CREATE TABLE `eventCoOrganizerInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`status` enum('pending','accepted','declined','revoked','invalid') NOT NULL DEFAULT 'pending',
	`expiresAt` datetime NOT NULL,
	`respondedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventCoOrganizerInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventCoOrganizerInvitations_event_invitee_unique` UNIQUE(`eventId`,`inviteeId`)
);
--> statement-breakpoint
CREATE TABLE `eventCoOrganizers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('co_organizer') NOT NULL DEFAULT 'co_organizer',
	`acceptedAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventCoOrganizers_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventCoOrganizers_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE INDEX `eventCoOrganizerInvitations_invitee_status_idx` ON `eventCoOrganizerInvitations` (`inviteeId`,`status`);--> statement-breakpoint
CREATE INDEX `eventCoOrganizers_user_idx` ON `eventCoOrganizers` (`userId`);