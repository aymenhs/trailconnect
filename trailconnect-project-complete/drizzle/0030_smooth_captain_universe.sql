CREATE TABLE `eventActionAssignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`action` enum('meeting','weather','transport','readiness','day_of') NOT NULL,
	`assigneeId` int NOT NULL,
	`assignedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `eventActionAssignments_id` PRIMARY KEY(`id`),
	CONSTRAINT `eventActionAssignments_event_action_unique` UNIQUE(`eventId`,`action`)
);
--> statement-breakpoint
CREATE INDEX `eventActionAssignments_assignee_idx` ON `eventActionAssignments` (`assigneeId`);