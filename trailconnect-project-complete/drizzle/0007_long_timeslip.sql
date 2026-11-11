CREATE TABLE `activityCircles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` varchar(360),
	`visibility` enum('private','invite') NOT NULL DEFAULT 'private',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `activityCircles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `circleMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circleId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','member') NOT NULL DEFAULT 'member',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `circleMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `circleMembers_circle_user_unique` UNIQUE(`circleId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `communityGroupMembers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','moderator','member') NOT NULL DEFAULT 'member',
	`status` enum('pending','active','left','banned') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityGroupMembers_id` PRIMARY KEY(`id`),
	CONSTRAINT `communityGroupMembers_group_user_unique` UNIQUE(`groupId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `communityGroups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`description` text,
	`locationName` varchar(180),
	`coverImageUrl` varchar(1024),
	`visibility` enum('public','private','invite') NOT NULL DEFAULT 'public',
	`moderationStatus` enum('visible','under_review','hidden') NOT NULL DEFAULT 'visible',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityGroups_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `follows_follower_following_unique` UNIQUE(`followerId`,`followingId`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requesterId` int NOT NULL,
	`addresseeId` int NOT NULL,
	`status` enum('pending','accepted','declined','blocked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`),
	CONSTRAINT `friendships_requester_addressee_unique` UNIQUE(`requesterId`,`addresseeId`)
);
--> statement-breakpoint
CREATE TABLE `linkedSocialAccounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('instagram','facebook','strava','garmin','alltrails','gaia') NOT NULL,
	`providerAccountId` varchar(180),
	`profileUrl` varchar(1024),
	`consentedAt` datetime NOT NULL,
	`revokedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `linkedSocialAccounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `linkedSocialAccounts_user_provider_unique` UNIQUE(`userId`,`provider`)
);
--> statement-breakpoint
CREATE TABLE `phoneVerificationChallenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phoneHash` varchar(128) NOT NULL,
	`codeHash` varchar(128) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` datetime NOT NULL,
	`verifiedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `phoneVerificationChallenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `postMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`url` varchar(1024) NOT NULL,
	`sortOrder` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postMedia_id` PRIMARY KEY(`id`),
	CONSTRAINT `postMedia_post_sort_unique` UNIQUE(`postId`,`sortOrder`)
);
--> statement-breakpoint
CREATE TABLE `postReactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`postId` int NOT NULL,
	`userId` int NOT NULL,
	`reaction` enum('trail','summit','inspire') NOT NULL DEFAULT 'trail',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `postReactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `postReactions_post_user_unique` UNIQUE(`postId`,`userId`)
);
--> statement-breakpoint
CREATE TABLE `socialInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`destinationHash` varchar(128) NOT NULL,
	`channel` enum('email','sms','link','social') NOT NULL,
	`token` varchar(96) NOT NULL,
	`status` enum('pending','accepted','expired','cancelled') NOT NULL DEFAULT 'pending',
	`expiresAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `socialInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `socialInvitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `userAchievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('first_outing','summit','distance','elevation','community') NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` varchar(360),
	`earnedAt` datetime NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userAchievements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `posts` ADD `postType` enum('update','outing_recap','achievement') DEFAULT 'update' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `title` varchar(180);--> statement-breakpoint
ALTER TABLE `posts` ADD `summary` varchar(360);--> statement-breakpoint
ALTER TABLE `posts` ADD `visibility` enum('public','friends','private') DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `posts` ADD `locationName` varchar(180);--> statement-breakpoint
ALTER TABLE `posts` ADD `distanceKm` double;--> statement-breakpoint
ALTER TABLE `posts` ADD `elevationGain` int;--> statement-breakpoint
ALTER TABLE `posts` ADD `durationMinutes` int;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `coverImageUrl` varchar(1024);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `publicSlug` varchar(64);--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `profileVisibility` enum('public','friends','private') DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `phoneVerificationStatus` enum('unverified','pending','verified') DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD `phoneVerifiedAt` datetime;--> statement-breakpoint
ALTER TABLE `userProfiles` ADD CONSTRAINT `userProfiles_publicSlug_unique` UNIQUE(`publicSlug`);--> statement-breakpoint
CREATE INDEX `activityCircles_ownerId_idx` ON `activityCircles` (`ownerId`);--> statement-breakpoint
CREATE INDEX `circleMembers_userId_idx` ON `circleMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `communityGroupMembers_userId_idx` ON `communityGroupMembers` (`userId`);--> statement-breakpoint
CREATE INDEX `communityGroups_ownerId_idx` ON `communityGroups` (`ownerId`);--> statement-breakpoint
CREATE INDEX `communityGroups_moderation_idx` ON `communityGroups` (`moderationStatus`);--> statement-breakpoint
CREATE INDEX `follows_followingId_idx` ON `follows` (`followingId`);--> statement-breakpoint
CREATE INDEX `friendships_addressee_status_idx` ON `friendships` (`addresseeId`,`status`);--> statement-breakpoint
CREATE INDEX `phoneVerificationChallenges_user_created_idx` ON `phoneVerificationChallenges` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `postMedia_postId_idx` ON `postMedia` (`postId`);--> statement-breakpoint
CREATE INDEX `postReactions_userId_idx` ON `postReactions` (`userId`);--> statement-breakpoint
CREATE INDEX `socialInvitations_sender_status_idx` ON `socialInvitations` (`senderId`,`status`);--> statement-breakpoint
CREATE INDEX `userAchievements_user_earned_idx` ON `userAchievements` (`userId`,`earnedAt`);