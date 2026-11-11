CREATE TABLE `userCommunityGroupTemplates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`label` varchar(120) NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`visibility` enum('public','private','invite') NOT NULL DEFAULT 'public',
	`coverImageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userCommunityGroupTemplates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communityGroupMembers` ADD `inviteMessage` text;--> statement-breakpoint
CREATE INDEX `userCommunityGroupTemplates_owner_updated_idx` ON `userCommunityGroupTemplates` (`ownerId`,`updatedAt`);