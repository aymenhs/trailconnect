ALTER TABLE `friendships` ADD `remindAt` datetime;--> statement-breakpoint
CREATE INDEX `friendships_addressee_remindAt_idx` ON `friendships` (`addresseeId`,`remindAt`);