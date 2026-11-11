ALTER TABLE `eventLogistics` ADD `terrainStatus` enum('unknown','open','caution','restricted','closed') DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `accessStatus` enum('unknown','open','caution','restricted','closed') DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `terrainAccessNote` text;--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `terrainSourceLabel` varchar(120);--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `terrainSourceUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `eventLogistics` ADD `terrainCheckedAt` datetime;