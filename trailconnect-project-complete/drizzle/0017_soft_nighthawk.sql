ALTER TABLE `events` ADD `terrainType` enum('maintained','natural','rocky','scramble','mixed') DEFAULT 'maintained' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `technicality` enum('none','low','moderate','high') DEFAULT 'none' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `exposureLevel` enum('low','moderate','high') DEFAULT 'low' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `navigationLevel` enum('marked','basic','advanced') DEFAULT 'marked' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `routeCondition` enum('normal','variable','wet_or_muddy','winter_or_icy') DEFAULT 'normal' NOT NULL;