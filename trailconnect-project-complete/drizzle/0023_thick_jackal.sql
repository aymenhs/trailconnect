ALTER TABLE `eventParticipants` ADD `levelAcknowledgedAt` datetime;--> statement-breakpoint
ALTER TABLE `eventParticipants` ADD `levelExceptionNote` varchar(600);--> statement-breakpoint
ALTER TABLE `eventParticipants` ADD `levelExceptionStatus` enum('none','pending','approved','declined') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `eventParticipants` ADD `levelExceptionDecidedAt` datetime;--> statement-breakpoint
ALTER TABLE `eventParticipants` ADD `levelExceptionDecidedBy` int;--> statement-breakpoint
ALTER TABLE `eventParticipants` ADD `levelExceptionDecisionNote` varchar(600);--> statement-breakpoint
ALTER TABLE `events` ADD `levelAdmissionPolicy` enum('declarative','confirmation','organizer_review') DEFAULT 'declarative' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `levelRequirementNote` varchar(600);