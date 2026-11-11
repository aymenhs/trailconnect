CREATE TABLE `communityGroupCoAdminInvitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`groupId` int NOT NULL,
	`inviterId` int NOT NULL,
	`inviteeId` int NOT NULL,
	`status` enum('pending','accepted','declined','revoked','invalid') NOT NULL DEFAULT 'pending',
	`expiresAt` datetime NOT NULL,
	`respondedAt` datetime,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `communityGroupCoAdminInvitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `communityGroupCoAdminInvitations_group_invitee_unique` UNIQUE(`groupId`,`inviteeId`)
);
--> statement-breakpoint
CREATE INDEX `communityGroupCoAdminInvitations_invitee_status_idx` ON `communityGroupCoAdminInvitations` (`inviteeId`,`status`);