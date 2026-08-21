CREATE TABLE `activities` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`activityTypeId` varchar(36) NOT NULL,
	`currentTaxpayerId` varchar(36),
	`label` varchar(220) NOT NULL,
	`locationType` enum('ZONE','MARKET','MARKET_LOCATION','MOBILE','CUSTOM') NOT NULL,
	`zoneId` varchar(36),
	`marketId` varchar(36),
	`marketLocationId` varchar(36),
	`address` text,
	`status` enum('ACTIVE','INACTIVE','SUSPENDED','CLOSED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
	`startedAt` timestamp NOT NULL,
	`endedAt` timestamp,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `activities_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `activity_categories` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(160) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_category_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `activity_ownerships` (
	`id` varchar(36) NOT NULL,
	`activityId` varchar(36) NOT NULL,
	`taxpayerId` varchar(36) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT true,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`transferredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_ownerships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_tax_assignments` (
	`id` varchar(36) NOT NULL,
	`activityId` varchar(36) NOT NULL,
	`taxRuleId` varchar(36) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_tax_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_types` (
	`id` varchar(36) NOT NULL,
	`categoryId` varchar(36) NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(160) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `activity_type_code_unique` UNIQUE(`categoryId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`actorId` int,
	`action` varchar(96) NOT NULL,
	`module` varchar(64) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64) NOT NULL,
	`beforeValue` json,
	`afterValue` json,
	`deviceId` varchar(128),
	`ipAddress` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cash_counts` (
	`id` varchar(36) NOT NULL,
	`depositId` varchar(36) NOT NULL,
	`countedAmount` decimal(14,2) NOT NULL,
	`denominations` json NOT NULL,
	`countedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cash_counts_id` PRIMARY KEY(`id`),
	CONSTRAINT `cash_counts_depositId_unique` UNIQUE(`depositId`)
);
--> statement-breakpoint
CREATE TABLE `daily_closings` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`agentId` int NOT NULL,
	`businessDate` timestamp NOT NULL,
	`expectedAmount` decimal(14,2) NOT NULL,
	`depositedAmount` decimal(14,2) NOT NULL,
	`differenceAmount` decimal(14,2) NOT NULL,
	`status` enum('OPEN','SUBMITTED','CLOSED','REOPENED') NOT NULL DEFAULT 'OPEN',
	`closedBy` int,
	`closedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_closings_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_closing_unique` UNIQUE(`municipalityId`,`agentId`,`businessDate`)
);
--> statement-breakpoint
CREATE TABLE `deposit_items` (
	`id` varchar(36) NOT NULL,
	`depositId` varchar(36) NOT NULL,
	`paymentTransactionId` varchar(36) NOT NULL,
	`acceptedAmount` decimal(14,2),
	`status` enum('PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`rejectionReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `deposit_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `deposit_payment_unique` UNIQUE(`depositId`,`paymentTransactionId`)
);
--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`agentId` int NOT NULL,
	`expectedAmount` decimal(14,2) NOT NULL,
	`depositedAmount` decimal(14,2) NOT NULL,
	`differenceAmount` decimal(14,2) NOT NULL,
	`status` enum('PENDING','SUBMITTED','VALIDATED','PARTIALLY_VALIDATED','REJECTED') NOT NULL DEFAULT 'PENDING',
	`submittedAt` timestamp,
	`validatedAt` timestamp,
	`validatedBy` int,
	`observation` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `deposits_id` PRIMARY KEY(`id`),
	CONSTRAINT `deposit_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `market_locations` (
	`id` varchar(36) NOT NULL,
	`marketId` varchar(36) NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(120) NOT NULL,
	`status` enum('AVAILABLE','OCCUPIED','RESERVED','INACTIVE') NOT NULL DEFAULT 'AVAILABLE',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `market_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_location_code_unique` UNIQUE(`marketId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `markets` (
	`id` varchar(36) NOT NULL,
	`zoneId` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`address` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `markets_id` PRIMARY KEY(`id`),
	CONSTRAINT `market_code_unique` UNIQUE(`zoneId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `municipalities` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(180) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'XOF',
	`timezone` varchar(64) NOT NULL DEFAULT 'Africa/Abidjan',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `municipalities_id` PRIMARY KEY(`id`),
	CONSTRAINT `municipalities_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `payment_allocations` (
	`id` varchar(36) NOT NULL,
	`paymentTransactionId` varchar(36) NOT NULL,
	`paymentMethodId` varchar(36) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`externalReference` varchar(160),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_allocations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_items` (
	`id` varchar(36) NOT NULL,
	`paymentTransactionId` varchar(36) NOT NULL,
	`taxObligationId` varchar(36) NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_obligation_unique` UNIQUE(`paymentTransactionId`,`taxObligationId`)
);
--> statement-breakpoint
CREATE TABLE `payment_methods` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`label` varchar(96) NOT NULL,
	`isCash` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payment_methods_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_method_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `payment_transactions` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`taxpayerId` varchar(36) NOT NULL,
	`collectedBy` int NOT NULL,
	`deviceId` varchar(128),
	`offlineOperationId` varchar(96),
	`grossAmount` decimal(14,2) NOT NULL,
	`netAmount` decimal(14,2) NOT NULL,
	`status` enum('PENDING_SYNC','PENDING','VALIDATED','CANCELLED','REFUNDED') NOT NULL DEFAULT 'PENDING',
	`collectedAt` timestamp NOT NULL,
	`validatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_transactions_offlineOperationId_unique` UNIQUE(`offlineOperationId`),
	CONSTRAINT `payment_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` varchar(36) NOT NULL,
	`code` varchar(96) NOT NULL,
	`module` varchar(64) NOT NULL,
	`action` varchar(32) NOT NULL,
	`label` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `receipt_print_history` (
	`id` varchar(36) NOT NULL,
	`receiptId` varchar(36) NOT NULL,
	`printType` enum('ORIGINAL','DUPLICATE','REPRINT') NOT NULL,
	`printedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`deviceId` varchar(128),
	CONSTRAINT `receipt_print_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `receipts` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`paymentTransactionId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`qrPayload` text NOT NULL,
	`integrityHash` varchar(128) NOT NULL,
	`status` enum('PROVISIONAL','FINAL','CANCELLED') NOT NULL DEFAULT 'FINAL',
	`issuedAt` timestamp NOT NULL,
	`immutableSnapshot` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `receipts_id` PRIMARY KEY(`id`),
	CONSTRAINT `receipts_paymentTransactionId_unique` UNIQUE(`paymentTransactionId`),
	CONSTRAINT `receipt_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `reference_sequences` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`entity` varchar(48) NOT NULL,
	`year` int NOT NULL,
	`currentNumber` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reference_sequences_id` PRIMARY KEY(`id`),
	CONSTRAINT `reference_sequence_unique` UNIQUE(`municipalityId`,`entity`,`year`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` varchar(36) NOT NULL,
	`roleId` varchar(36) NOT NULL,
	`permissionId` varchar(36) NOT NULL,
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permission_unique` UNIQUE(`roleId`,`permissionId`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36),
	`code` varchar(64) NOT NULL,
	`label` varchar(120) NOT NULL,
	`isSystem` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_scope_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `sectors` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `sector_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `supervisor_assignments` (
	`id` varchar(36) NOT NULL,
	`agentId` int NOT NULL,
	`supervisorId` int NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`assignedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `supervisor_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_conflicts` (
	`id` varchar(36) NOT NULL,
	`syncOperationId` varchar(36) NOT NULL,
	`localPayload` json NOT NULL,
	`serverPayload` json,
	`resolution` enum('PENDING','SERVER','LOCAL','MANUAL') NOT NULL DEFAULT 'PENDING',
	`resolvedBy` int,
	`resolvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sync_conflicts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_operations` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`deviceId` varchar(128) NOT NULL,
	`operationId` varchar(96) NOT NULL,
	`entityType` varchar(64) NOT NULL,
	`entityId` varchar(64) NOT NULL,
	`operation` enum('CREATE','UPDATE','CANCEL','SUBMIT') NOT NULL,
	`payloadHash` varchar(128) NOT NULL,
	`status` enum('PENDING','PROCESSING','SYNCED','FAILED','CONFLICT') NOT NULL DEFAULT 'PENDING',
	`result` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `sync_operations_id` PRIMARY KEY(`id`),
	CONSTRAINT `sync_idempotence_unique` UNIQUE(`deviceId`,`operationId`)
);
--> statement-breakpoint
CREATE TABLE `tax_categories` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`code` varchar(48) NOT NULL,
	`label` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tax_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_category_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `tax_exemptions` (
	`id` varchar(36) NOT NULL,
	`taxpayerId` varchar(36) NOT NULL,
	`taxTypeId` varchar(36),
	`rate` decimal(7,4) NOT NULL DEFAULT '1',
	`reason` text NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`status` enum('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
	`approvedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tax_exemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_obligations` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`taxpayerId` varchar(36) NOT NULL,
	`activityId` varchar(36) NOT NULL,
	`taxTypeId` varchar(36) NOT NULL,
	`taxRuleId` varchar(36) NOT NULL,
	`periodStart` timestamp NOT NULL,
	`periodEnd` timestamp NOT NULL,
	`dueDate` timestamp NOT NULL,
	`expectedAmount` decimal(14,2) NOT NULL,
	`penaltyAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`discountAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`adjustmentAmount` decimal(14,2) NOT NULL DEFAULT '0',
	`remainingAmount` decimal(14,2) NOT NULL,
	`status` enum('PENDING','PARTIALLY_PAID','PAID','OVERDUE','CANCELLED','EXEMPTED') NOT NULL DEFAULT 'PENDING',
	`generatedAutomatically` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_obligations_id` PRIMARY KEY(`id`),
	CONSTRAINT `obligation_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `tax_periodicities` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36),
	`code` varchar(48) NOT NULL,
	`label` varchar(120) NOT NULL,
	`calendarUnit` enum('DAY','WEEK','MONTH','QUARTER','SEMESTER','YEAR','CUSTOM') NOT NULL,
	`intervalCount` int NOT NULL DEFAULT 1,
	`calendarConfig` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tax_periodicities_id` PRIMARY KEY(`id`),
	CONSTRAINT `periodicity_scope_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `tax_rule_scopes` (
	`id` varchar(36) NOT NULL,
	`taxRuleId` varchar(36) NOT NULL,
	`activityTypeId` varchar(36),
	`sectorId` varchar(36),
	`zoneId` varchar(36),
	`marketId` varchar(36),
	`marketLocationId` varchar(36),
	`taxpayerType` enum('PERSON','COMPANY'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `tax_rule_scopes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tax_rules` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`taxTypeId` varchar(36) NOT NULL,
	`periodicityId` varchar(36) NOT NULL,
	`code` varchar(64) NOT NULL,
	`label` varchar(180) NOT NULL,
	`baseAmount` decimal(14,2) NOT NULL,
	`minimumAmount` decimal(14,2),
	`maximumAmount` decimal(14,2),
	`graceDays` int NOT NULL DEFAULT 0,
	`penaltyRate` decimal(7,4) NOT NULL DEFAULT '0',
	`allowsPartial` boolean NOT NULL DEFAULT true,
	`validFrom` timestamp NOT NULL,
	`validTo` timestamp,
	`priority` int NOT NULL DEFAULT 0,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_rules_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_rule_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `tax_types` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`categoryId` varchar(36),
	`code` varchar(48) NOT NULL,
	`label` varchar(180) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_types_id` PRIMARY KEY(`id`),
	CONSTRAINT `tax_type_code_unique` UNIQUE(`municipalityId`,`code`)
);
--> statement-breakpoint
CREATE TABLE `taxpayer_contacts` (
	`id` varchar(36) NOT NULL,
	`taxpayerId` varchar(36) NOT NULL,
	`kind` enum('PHONE','EMAIL','WHATSAPP','OTHER') NOT NULL,
	`value` varchar(320) NOT NULL,
	`isPrimary` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxpayer_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxpayer_merges` (
	`id` varchar(36) NOT NULL,
	`sourceTaxpayerId` varchar(36) NOT NULL,
	`targetTaxpayerId` varchar(36) NOT NULL,
	`reason` text NOT NULL,
	`mergedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `taxpayer_merges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxpayers` (
	`id` varchar(36) NOT NULL,
	`municipalityId` varchar(36) NOT NULL,
	`reference` varchar(64) NOT NULL,
	`type` enum('PERSON','COMPANY') NOT NULL,
	`firstName` varchar(120),
	`lastName` varchar(120),
	`legalName` varchar(220),
	`nationalId` varchar(96),
	`taxId` varchar(96),
	`status` enum('ACTIVE','INACTIVE','MERGED') NOT NULL DEFAULT 'ACTIVE',
	`mergedIntoId` varchar(36),
	`createdBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deletedAt` timestamp,
	CONSTRAINT `taxpayers_id` PRIMARY KEY(`id`),
	CONSTRAINT `taxpayer_reference_unique` UNIQUE(`municipalityId`,`reference`)
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`roleId` varchar(36) NOT NULL,
	`assignedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp,
	CONSTRAINT `user_roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_role_unique` UNIQUE(`userId`,`roleId`)
);
--> statement-breakpoint
CREATE TABLE `user_territory_assignments` (
	`id` varchar(36) NOT NULL,
	`userId` int NOT NULL,
	`territoryType` enum('SECTOR','ZONE','MARKET','MARKET_LOCATION') NOT NULL,
	`territoryId` varchar(36) NOT NULL,
	`startDate` timestamp NOT NULL,
	`endDate` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`assignedBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_territory_assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `zones` (
	`id` varchar(36) NOT NULL,
	`sectorId` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(120) NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `zones_id` PRIMARY KEY(`id`),
	CONSTRAINT `zone_code_unique` UNIQUE(`sectorId`,`code`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `municipalityId` varchar(36);--> statement-breakpoint
ALTER TABLE `users` ADD `isActive` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_activityTypeId_activity_types_id_fk` FOREIGN KEY (`activityTypeId`) REFERENCES `activity_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_currentTaxpayerId_taxpayers_id_fk` FOREIGN KEY (`currentTaxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_zoneId_zones_id_fk` FOREIGN KEY (`zoneId`) REFERENCES `zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_marketId_markets_id_fk` FOREIGN KEY (`marketId`) REFERENCES `markets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_marketLocationId_market_locations_id_fk` FOREIGN KEY (`marketLocationId`) REFERENCES `market_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_categories` ADD CONSTRAINT `activity_categories_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_ownerships` ADD CONSTRAINT `activity_ownerships_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_ownerships` ADD CONSTRAINT `activity_ownerships_taxpayerId_taxpayers_id_fk` FOREIGN KEY (`taxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_ownerships` ADD CONSTRAINT `activity_ownerships_transferredBy_users_id_fk` FOREIGN KEY (`transferredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_tax_assignments` ADD CONSTRAINT `activity_tax_assignments_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_tax_assignments` ADD CONSTRAINT `activity_tax_assignments_taxRuleId_tax_rules_id_fk` FOREIGN KEY (`taxRuleId`) REFERENCES `tax_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_types` ADD CONSTRAINT `activity_types_categoryId_activity_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `activity_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actorId_users_id_fk` FOREIGN KEY (`actorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_counts` ADD CONSTRAINT `cash_counts_depositId_deposits_id_fk` FOREIGN KEY (`depositId`) REFERENCES `deposits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cash_counts` ADD CONSTRAINT `cash_counts_countedBy_users_id_fk` FOREIGN KEY (`countedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_closings` ADD CONSTRAINT `daily_closings_closedBy_users_id_fk` FOREIGN KEY (`closedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deposit_items` ADD CONSTRAINT `deposit_items_depositId_deposits_id_fk` FOREIGN KEY (`depositId`) REFERENCES `deposits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deposit_items` ADD CONSTRAINT `deposit_items_paymentTransactionId_payment_transactions_id_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_validatedBy_users_id_fk` FOREIGN KEY (`validatedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `market_locations` ADD CONSTRAINT `market_locations_marketId_markets_id_fk` FOREIGN KEY (`marketId`) REFERENCES `markets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `markets` ADD CONSTRAINT `markets_zoneId_zones_id_fk` FOREIGN KEY (`zoneId`) REFERENCES `zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_paymentTransactionId_payment_transactions_id_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_allocations` ADD CONSTRAINT `payment_allocations_paymentMethodId_payment_methods_id_fk` FOREIGN KEY (`paymentMethodId`) REFERENCES `payment_methods`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_paymentTransactionId_payment_transactions_id_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_items` ADD CONSTRAINT `payment_items_taxObligationId_tax_obligations_id_fk` FOREIGN KEY (`taxObligationId`) REFERENCES `tax_obligations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_methods` ADD CONSTRAINT `payment_methods_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_taxpayerId_taxpayers_id_fk` FOREIGN KEY (`taxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_transactions` ADD CONSTRAINT `payment_transactions_collectedBy_users_id_fk` FOREIGN KEY (`collectedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_print_history` ADD CONSTRAINT `receipt_print_history_receiptId_receipts_id_fk` FOREIGN KEY (`receiptId`) REFERENCES `receipts`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipt_print_history` ADD CONSTRAINT `receipt_print_history_printedBy_users_id_fk` FOREIGN KEY (`printedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_paymentTransactionId_payment_transactions_id_fk` FOREIGN KEY (`paymentTransactionId`) REFERENCES `payment_transactions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reference_sequences` ADD CONSTRAINT `reference_sequences_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permissionId_permissions_id_fk` FOREIGN KEY (`permissionId`) REFERENCES `permissions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `roles` ADD CONSTRAINT `roles_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sectors` ADD CONSTRAINT `sectors_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supervisor_assignments` ADD CONSTRAINT `supervisor_assignments_agentId_users_id_fk` FOREIGN KEY (`agentId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supervisor_assignments` ADD CONSTRAINT `supervisor_assignments_supervisorId_users_id_fk` FOREIGN KEY (`supervisorId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `supervisor_assignments` ADD CONSTRAINT `supervisor_assignments_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_syncOperationId_sync_operations_id_fk` FOREIGN KEY (`syncOperationId`) REFERENCES `sync_operations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_conflicts` ADD CONSTRAINT `sync_conflicts_resolvedBy_users_id_fk` FOREIGN KEY (`resolvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sync_operations` ADD CONSTRAINT `sync_operations_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_categories` ADD CONSTRAINT `tax_categories_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_exemptions` ADD CONSTRAINT `tax_exemptions_taxpayerId_taxpayers_id_fk` FOREIGN KEY (`taxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_exemptions` ADD CONSTRAINT `tax_exemptions_taxTypeId_tax_types_id_fk` FOREIGN KEY (`taxTypeId`) REFERENCES `tax_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_exemptions` ADD CONSTRAINT `tax_exemptions_approvedBy_users_id_fk` FOREIGN KEY (`approvedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_obligations` ADD CONSTRAINT `tax_obligations_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_obligations` ADD CONSTRAINT `tax_obligations_taxpayerId_taxpayers_id_fk` FOREIGN KEY (`taxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_obligations` ADD CONSTRAINT `tax_obligations_activityId_activities_id_fk` FOREIGN KEY (`activityId`) REFERENCES `activities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_obligations` ADD CONSTRAINT `tax_obligations_taxTypeId_tax_types_id_fk` FOREIGN KEY (`taxTypeId`) REFERENCES `tax_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_obligations` ADD CONSTRAINT `tax_obligations_taxRuleId_tax_rules_id_fk` FOREIGN KEY (`taxRuleId`) REFERENCES `tax_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_periodicities` ADD CONSTRAINT `tax_periodicities_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_taxRuleId_tax_rules_id_fk` FOREIGN KEY (`taxRuleId`) REFERENCES `tax_rules`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_activityTypeId_activity_types_id_fk` FOREIGN KEY (`activityTypeId`) REFERENCES `activity_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_zoneId_zones_id_fk` FOREIGN KEY (`zoneId`) REFERENCES `zones`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_marketId_markets_id_fk` FOREIGN KEY (`marketId`) REFERENCES `markets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rule_scopes` ADD CONSTRAINT `tax_rule_scopes_marketLocationId_market_locations_id_fk` FOREIGN KEY (`marketLocationId`) REFERENCES `market_locations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rules` ADD CONSTRAINT `tax_rules_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rules` ADD CONSTRAINT `tax_rules_taxTypeId_tax_types_id_fk` FOREIGN KEY (`taxTypeId`) REFERENCES `tax_types`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rules` ADD CONSTRAINT `tax_rules_periodicityId_tax_periodicities_id_fk` FOREIGN KEY (`periodicityId`) REFERENCES `tax_periodicities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_rules` ADD CONSTRAINT `tax_rules_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_types` ADD CONSTRAINT `tax_types_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tax_types` ADD CONSTRAINT `tax_types_categoryId_tax_categories_id_fk` FOREIGN KEY (`categoryId`) REFERENCES `tax_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayer_contacts` ADD CONSTRAINT `taxpayer_contacts_taxpayerId_taxpayers_id_fk` FOREIGN KEY (`taxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayer_merges` ADD CONSTRAINT `taxpayer_merges_sourceTaxpayerId_taxpayers_id_fk` FOREIGN KEY (`sourceTaxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayer_merges` ADD CONSTRAINT `taxpayer_merges_targetTaxpayerId_taxpayers_id_fk` FOREIGN KEY (`targetTaxpayerId`) REFERENCES `taxpayers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayer_merges` ADD CONSTRAINT `taxpayer_merges_mergedBy_users_id_fk` FOREIGN KEY (`mergedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayers` ADD CONSTRAINT `taxpayers_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `taxpayers` ADD CONSTRAINT `taxpayers_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_roleId_roles_id_fk` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_roles` ADD CONSTRAINT `user_roles_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_territory_assignments` ADD CONSTRAINT `user_territory_assignments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_territory_assignments` ADD CONSTRAINT `user_territory_assignments_assignedBy_users_id_fk` FOREIGN KEY (`assignedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `zones` ADD CONSTRAINT `zones_sectorId_sectors_id_fk` FOREIGN KEY (`sectorId`) REFERENCES `sectors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `activity_owner_idx` ON `activities` (`currentTaxpayerId`,`status`);--> statement-breakpoint
CREATE INDEX `activity_owner_active_idx` ON `activity_ownerships` (`activityId`,`endDate`);--> statement-breakpoint
CREATE INDEX `activity_tax_active_idx` ON `activity_tax_assignments` (`activityId`,`isActive`);--> statement-breakpoint
CREATE INDEX `audit_entity_idx` ON `audit_logs` (`municipalityId`,`entityType`,`entityId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `payment_agent_date_idx` ON `payment_transactions` (`collectedBy`,`collectedAt`);--> statement-breakpoint
CREATE INDEX `supervisor_assignment_agent_active_idx` ON `supervisor_assignments` (`agentId`,`isActive`);--> statement-breakpoint
CREATE INDEX `obligation_taxpayer_status_idx` ON `tax_obligations` (`taxpayerId`,`status`,`dueDate`);--> statement-breakpoint
CREATE INDEX `taxpayer_contact_search_idx` ON `taxpayer_contacts` (`value`);--> statement-breakpoint
CREATE INDEX `taxpayer_search_idx` ON `taxpayers` (`municipalityId`,`lastName`,`firstName`);--> statement-breakpoint
CREATE INDEX `territory_assignment_user_idx` ON `user_territory_assignments` (`userId`,`isActive`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_municipalityId_municipalities_id_fk` FOREIGN KEY (`municipalityId`) REFERENCES `municipalities`(`id`) ON DELETE no action ON UPDATE no action;