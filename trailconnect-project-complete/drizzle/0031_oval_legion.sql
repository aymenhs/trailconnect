CREATE TABLE `eventTerrainLandmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`createdBy` int NOT NULL,
	`type` enum('water','shelter','parking') NOT NULL,
	`label` varchar(120) NOT NULL,
	`note` varchar(600),
	`status` enum('reported','limited','unavailable','unknown') NOT NULL DEFAULT 'unknown',
	`latitude` double,
	`longitude` double,
	`verifiedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventTerrainLandmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `eventTerrainLandmarks_event_type_idx` ON `eventTerrainLandmarks` (`eventId`,`type`);