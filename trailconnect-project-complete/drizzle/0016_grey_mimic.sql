ALTER TABLE `events` ADD `difficultySuggested` enum('beginner','intermediate','advanced','expert');--> statement-breakpoint
ALTER TABLE `events` ADD `difficultyCalculatorVersion` varchar(40);--> statement-breakpoint
ALTER TABLE `events` ADD `difficultyOverrideReason` varchar(600);