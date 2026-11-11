CREATE TABLE `carpoolSeatReservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`offerId` int NOT NULL,
	`passengerId` int NOT NULL,
	`seatsRequested` int NOT NULL DEFAULT 1,
	`note` varchar(600),
	`status` enum('pending','accepted','declined','cancelled') NOT NULL DEFAULT 'pending',
	`processedAt` datetime,
	`processedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `carpoolSeatReservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `carpoolSeatReservations_offer_passenger_unique` UNIQUE(`offerId`,`passengerId`)
);
--> statement-breakpoint
CREATE INDEX `carpoolSeatReservations_offer_status_idx` ON `carpoolSeatReservations` (`offerId`,`status`);