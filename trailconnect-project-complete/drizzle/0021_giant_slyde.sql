ALTER TABLE `userProfiles` ADD `deletionRequestedAt` datetime;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `deletionScheduledAt` datetime;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `deletedAt` datetime;