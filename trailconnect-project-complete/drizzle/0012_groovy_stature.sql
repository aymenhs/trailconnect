CREATE TABLE `communityGroupPosts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`authorId` int NOT NULL,
	`body` text NOT NULL,
	`imageUrl` varchar(1024),
	`linkUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityGroupPosts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `communityGroups` ADD `websiteUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `communityGroups` ADD CONSTRAINT `communityGroups_name_unique` UNIQUE(`name`);--> statement-breakpoint
CREATE INDEX `communityGroupPosts_group_created_idx` ON `communityGroupPosts` (`groupId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communityGroupPosts_author_idx` ON `communityGroupPosts` (`authorId`);