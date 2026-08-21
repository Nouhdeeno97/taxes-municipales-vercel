CREATE TABLE `invitation_roles` (
	`id` varchar(36) NOT NULL,
	`invitationId` varchar(36) NOT NULL,
	`roleId` varchar(36) NOT NULL,
	CONSTRAINT `invitation_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitation_role_unique` UNIQUE(`invitationId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `user_invitations` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`email` varchar(320) NOT NULL,
	`displayName` varchar(180),
	`status` enum('PENDING','ACTIVATED','CANCELLED','EXPIRED') NOT NULL DEFAULT 'PENDING',
	`invitedBy` int NOT NULL,
	`activatedUserId` int,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_invitation_municipality_email_unique` UNIQUE(`municipalityId`,`email`)
);
--> statement-breakpoint
ALTER TABLE `invitation_roles` ADD CONSTRAINT `invitation_roles_invitationId_user_invitations_id_fk` FOREIGN KEY (`invitationId`) REFERENCES `user_invitations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitation_roles` ADD CONSTRAINT `invitation_roles_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_invitedBy_users_id_fk` FOREIGN KEY (`invitedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD CONSTRAINT `user_invitations_activatedUserId_users_id_fk` FOREIGN KEY (`activatedUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;