CREATE TABLE `moderationActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`adminId` int NOT NULL,
	`targetType` enum('user','event','post','message') NOT NULL,
	`targetId` int NOT NULL,
	`action` enum('suspend','ban','restore','hide','review','resolve_report') NOT NULL,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `moderationActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reporterId` int NOT NULL,
	`targetType` enum('user','event','post','message') NOT NULL,
	`targetId` int NOT NULL,
	`category` enum('safety','harassment','fraud','inappropriate_content','other') NOT NULL,
	`description` text NOT NULL,
	`status` enum('open','in_review','resolved','rejected') NOT NULL DEFAULT 'open',
	`reviewerId` int,
	`resolutionNote` text,
	`resolvedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `events` ADD `moderationStatus` enum('visible','under_review','hidden') DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `moderationStatus` enum('visible','under_review','hidden') DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `accountStatus` enum('active','suspended','banned') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `moderationNote` text;--> statement-breakpoint
ALTER TABLE `users` ADD `suspendedAt` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `bannedAt` datetime;--> statement-breakpoint
CREATE INDEX `moderationActions_target_createdAt_idx` ON `moderationActions` (`targetType`,`targetId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_status_createdAt_idx` ON `reports` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_target_idx` ON `reports` (`targetType`,`targetId`);