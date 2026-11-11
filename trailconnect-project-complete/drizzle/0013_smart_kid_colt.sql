CREATE TABLE `communityGroupMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`moderationStatus` enum('visible','under_review','hidden') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communityGroupMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `directConversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userOneId` int NOT NULL,
	`userTwoId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `directConversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `directConversations_participants_unique` UNIQUE(`userOneId`,`userTwoId`)
);
--> statement-breakpoint
CREATE TABLE `directMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`senderId` int NOT NULL,
	`body` text NOT NULL,
	`moderationStatus` enum('visible','under_review','hidden') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `directMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userBlocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`blockerId` int NOT NULL,
	`blockedId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userBlocks_id` PRIMARY KEY(`id`),
	CONSTRAINT `userBlocks_blocker_blocked_unique` UNIQUE(`blockerId`,`blockedId`)
);
--> statement-breakpoint
CREATE TABLE `userMessagingPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`directMessagePolicy` enum('friends','everyone','none') NOT NULL DEFAULT 'friends',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userMessagingPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userMessagingPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `communityGroupMessages_group_created_idx` ON `communityGroupMessages` (`groupId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `communityGroupMessages_sender_idx` ON `communityGroupMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `directConversations_userOne_idx` ON `directConversations` (`userOneId`);--> statement-breakpoint
CREATE INDEX `directConversations_userTwo_idx` ON `directConversations` (`userTwoId`);--> statement-breakpoint
CREATE INDEX `directMessages_conversation_created_idx` ON `directMessages` (`conversationId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `directMessages_sender_idx` ON `directMessages` (`senderId`);--> statement-breakpoint
CREATE INDEX `userBlocks_blocked_idx` ON `userBlocks` (`blockedId`);