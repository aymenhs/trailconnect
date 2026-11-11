ALTER TABLE `events` ADD `toiletsStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `toiletsStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `waterStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `parkingStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `receptionStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `cellReceptionStatus` varchar(20) DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `accessibilityNotes` text;--> statement-breakpoint
ALTER TABLE `events` ADD `facilitiesNotes` text;--> statement-breakpoint
ALTER TABLE `events` ADD `facilitiesVerifiedAt` datetime;
