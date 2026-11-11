CREATE TABLE `outdoorServiceConsents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('strava','garmin','apple_health','health_connect','inreach','zoleo','spot') NOT NULL,
	`purpose` enum('route_exchange','activity_import','check_in') NOT NULL,
	`status` enum('prepared','revoked') NOT NULL DEFAULT 'prepared',
	`consentedAt` datetime NOT NULL,
	`revokedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outdoorServiceConsents_id` PRIMARY KEY(`id`),
	CONSTRAINT `outdoorServiceConsents_user_provider_purpose_unique` UNIQUE(`userId`,`provider`,`purpose`)
);
--> statement-breakpoint
CREATE INDEX `outdoorServiceConsents_user_status_idx` ON `outdoorServiceConsents` (`userId`,`status`);