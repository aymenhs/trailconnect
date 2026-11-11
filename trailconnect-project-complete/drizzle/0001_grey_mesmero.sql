CREATE TABLE `eventMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text NOT NULL,
	`imageUrl` varchar(1024),
	`ephemeralUntil` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `eventMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventParticipants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('pending','going','waitlist','cancelled') NOT NULL DEFAULT 'going',
	`checkedInAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventParticipants_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventParticipants_event_user_unique` UNIQUE(`eventId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`hostId` int NOT NULL,
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`locationName` varchar(180) NOT NULL,
	`latitude` double,
	`longitude` double,
	`startsAt` datetime NOT NULL,
	`visibility` enum('public','private','invite') NOT NULL DEFAULT 'public',
	`status` enum('draft','published','cancelled','completed') NOT NULL DEFAULT 'published',
	`difficulty` enum('beginner','intermediate','advanced','expert') NOT NULL,
	`distanceKm` double NOT NULL,
	`elevationGain` int NOT NULL,
	`durationMinutes` int NOT NULL,
	`capacity` int NOT NULL,
	`requiresApproval` boolean NOT NULL DEFAULT false,
	`carpoolEnabled` boolean NOT NULL DEFAULT false,
	`gpxUrl` varchar(1024),
	`coverImageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packingItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`label` varchar(180) NOT NULL,
	`category` enum('essential','safety','comfort','food') NOT NULL DEFAULT 'essential',
	`isRequired` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `packingItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`authorId` int NOT NULL,
	`eventId` int,
	`body` text NOT NULL,
	`imageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`bio` text,
	`avatarUrl` varchar(1024),
	`homeLocation` varchar(180),
	`experienceLevel` enum('beginner','intermediate','advanced','expert') NOT NULL DEFAULT 'beginner',
	`totalOutings` int NOT NULL DEFAULT 0,
	`totalDistanceKm` double NOT NULL DEFAULT 0,
	`totalElevationGain` int NOT NULL DEFAULT 0,
	`language` enum('fr','en') NOT NULL DEFAULT 'fr',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `eventMessages_eventId_createdAt_idx` ON `eventMessages` (`eventId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `eventParticipants_eventId_idx` ON `eventParticipants` (`eventId`);--> statement-breakpoint
CREATE INDEX `events_startsAt_idx` ON `events` (`startsAt`);--> statement-breakpoint
CREATE INDEX `events_hostId_idx` ON `events` (`hostId`);--> statement-breakpoint
CREATE INDEX `events_status_idx` ON `events` (`status`);--> statement-breakpoint
CREATE INDEX `packingItems_eventId_idx` ON `packingItems` (`eventId`);--> statement-breakpoint
CREATE INDEX `posts_createdAt_idx` ON `posts` (`createdAt`);--> statement-breakpoint
CREATE INDEX `posts_authorId_idx` ON `posts` (`authorId`);