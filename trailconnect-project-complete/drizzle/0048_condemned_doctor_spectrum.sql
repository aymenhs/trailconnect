CREATE TABLE `eventWaitlistOffers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`participantId` int NOT NULL,
	`offeredBy` int NOT NULL,
	`expiresAt` datetime NOT NULL,
	`status` enum('pending','accepted','declined','expired','withdrawn') NOT NULL DEFAULT 'pending',
	`respondedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventWaitlistOffers_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventWaitlistOffers_event_participant_unique` UNIQUE(`eventId`,`participantId`)
);
--> statement-breakpoint
CREATE INDEX `eventWaitlistOffers_event_status_expiry_idx` ON `eventWaitlistOffers` (`eventId`,`status`,`expiresAt`);