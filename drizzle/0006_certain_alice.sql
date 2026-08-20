ALTER TABLE `municipalities` ADD `platformName` varchar(180) DEFAULT 'Gestion des taxes municipales' NOT NULL;--> statement-breakpoint
ALTER TABLE `municipalities` ADD `logoUrl` varchar(2048);--> statement-breakpoint
ALTER TABLE `municipalities` ADD `primaryColor` varchar(16) DEFAULT '#0F5CDB' NOT NULL;--> statement-breakpoint
ALTER TABLE `municipalities` ADD `appearanceMode` enum('LIGHT','DARK','SYSTEM') DEFAULT 'LIGHT' NOT NULL;