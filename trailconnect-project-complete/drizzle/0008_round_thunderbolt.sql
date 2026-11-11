CREATE TABLE `carpoolOffers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`driverId` int NOT NULL,
	`departureLocation` varchar(180) NOT NULL,
	`departureAt` datetime,
	`seatsTotal` int NOT NULL,
	`seatsAvailable` int NOT NULL,
	`note` varchar(600),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carpoolOffers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emergencyContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`contactName` varchar(160) NOT NULL,
	`relationship` varchar(120),
	`phoneHash` varchar(128) NOT NULL,
	`consentConfirmedAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emergencyContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `eventBookingRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`hikerId` int NOT NULL,
	`note` varchar(600),
	`status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
	`processedAt` datetime,
	`processedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventBookingRequests_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventBookingRequests_event_hiker_unique` UNIQUE(`eventId`,`hikerId`)
);
--> statement-breakpoint
CREATE TABLE `eventLogistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`meetingPoint` varchar(240),
	`meetingInstructions` text,
	`emergencyPlan` text,
	`equipmentNotes` text,
	`weatherPolicy` varchar(600),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventLogistics_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventLogistics_eventId_unique` UNIQUE(`eventId`)
);
--> statement-breakpoint
CREATE TABLE `guideProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('draft','pending_review','approved','suspended') NOT NULL DEFAULT 'draft',
	`headline` varchar(180),
	`bio` text,
	`languages` varchar(180),
	`serviceRegions` varchar(360),
	`certifications` varchar(1024),
	`insuranceConfirmedAt` datetime,
	`reviewedAt` datetime,
	`reviewedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guideProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `guideProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `hikerPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`preferredDifficulties` varchar(180),
	`interests` varchar(360),
	`preferredLanguages` varchar(180),
	`maxDistanceKm` int NOT NULL DEFAULT 50,
	`maxHikeDistanceKm` double NOT NULL DEFAULT 15,
	`maxElevationGain` int NOT NULL DEFAULT 1000,
	`carpoolPreference` enum('any','offer','need','none') NOT NULL DEFAULT 'any',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `hikerPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `hikerPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `outingType` enum('group_hike','guided_hike','training','private_group') DEFAULT 'group_hike' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `bookingMode` enum('instant','request') DEFAULT 'instant' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `priceCents` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `currency` enum('CAD') DEFAULT 'CAD' NOT NULL;--> statement-breakpoint
CREATE INDEX `carpoolOffers_eventId_idx` ON `carpoolOffers` (`eventId`);--> statement-breakpoint
CREATE INDEX `emergencyContacts_userId_idx` ON `emergencyContacts` (`userId`);--> statement-breakpoint
CREATE INDEX `eventBookingRequests_event_status_idx` ON `eventBookingRequests` (`eventId`,`status`);