CREATE TABLE `siteSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`defaultLocale` enum('fr','en') NOT NULL DEFAULT 'fr',
	`defaultTimezone` varchar(64) NOT NULL DEFAULT 'America/Toronto',
	`defaultUnits` enum('metric','imperial') NOT NULL DEFAULT 'metric',
	`requireEventApproval` boolean NOT NULL DEFAULT false,
	`communityPostingEnabled` boolean NOT NULL DEFAULT true,
	`externalAlertsEnabled` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`)
);
