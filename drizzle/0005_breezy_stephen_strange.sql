ALTER TABLE `users` ADD `localUsername` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordHash` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `credentialVersion` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `failedLoginAttempts` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `lockedUntil` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_local_username_unique` UNIQUE(`localUsername`);