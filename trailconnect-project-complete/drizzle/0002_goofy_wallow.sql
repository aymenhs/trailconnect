CREATE TABLE `eventReminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`userId` int NOT NULL,
	`channel` enum('email','push') NOT NULL,
	`kind` enum('day_before','two_hours','safety') NOT NULL,
	`scheduledFor` datetime NOT NULL,
	`status` enum('pending','scheduled','sent','cancelled') NOT NULL DEFAULT 'pending',
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventReminders_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventReminders_event_user_channel_kind_unique` UNIQUE(`eventId`,`userId`,`channel`,`kind`)
);
--> statement-breakpoint
CREATE TABLE `userNotificationPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`inAppEnabled` boolean NOT NULL DEFAULT true,
	`emailEnabled` boolean NOT NULL DEFAULT false,
	`pushEnabled` boolean NOT NULL DEFAULT false,
	`eventUpdates` boolean NOT NULL DEFAULT true,
	`groupMessages` boolean NOT NULL DEFAULT true,
	`departureReminders` boolean NOT NULL DEFAULT true,
	`safetyAlerts` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userNotificationPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userNotificationPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `userNotifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('registration','event_update','group_message','departure_reminder','safety','account') NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` text NOT NULL,
	`actionPath` varchar(512),
	`isRead` boolean NOT NULL DEFAULT false,
	`readAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userNotifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `eventReminders_scheduleCronTaskUid_idx` ON `eventReminders` (`scheduleCronTaskUid`);--> statement-breakpoint
CREATE INDEX `userNotifications_user_read_created_idx` ON `userNotifications` (`userId`,`isRead`,`createdAt`);