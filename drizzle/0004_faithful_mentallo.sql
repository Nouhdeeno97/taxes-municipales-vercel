CREATE TABLE `tester_access_tokens` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`tokenHash` varchar(128) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`redeemedAt` timestamp,
	`revokedAt` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tester_access_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `tester_access_tokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
ALTER TABLE `tester_access_tokens` ADD CONSTRAINT `tester_access_tokens_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tester_access_tokens` ADD CONSTRAINT `tester_access_tokens_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tester_access_user_idx` ON `tester_access_tokens` (`userId`);--> statement-breakpoint
CREATE INDEX `tester_access_expiry_idx` ON `tester_access_tokens` (`expiresAt`);