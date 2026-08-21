CREATE TYPE "public"."activity_location_type" AS ENUM('ZONE', 'MARKET', 'MARKET_LOCATION', 'MOBILE', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."activity_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'CLOSED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."appearance_mode" AS ENUM('LIGHT', 'DARK', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."calendar_unit" AS ENUM('DAY', 'WEEK', 'MONTH', 'QUARTER', 'SEMESTER', 'YEAR', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."daily_closing_status" AS ENUM('OPEN', 'SUBMITTED', 'CLOSED', 'REOPENED');--> statement-breakpoint
CREATE TYPE "public"."deposit_item_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('PENDING', 'SUBMITTED', 'VALIDATED', 'PARTIALLY_VALIDATED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."exemption_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACTIVATED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."market_location_status" AS ENUM('AVAILABLE', 'OCCUPIED', 'RESERVED', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."obligation_status" AS ENUM('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'EXEMPTED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING_SYNC', 'PENDING', 'VALIDATED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."receipt_print_type" AS ENUM('ORIGINAL', 'DUPLICATE', 'REPRINT');--> statement-breakpoint
CREATE TYPE "public"."receipt_status" AS ENUM('PROVISIONAL', 'FINAL', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."sync_operation" AS ENUM('CREATE', 'UPDATE', 'CANCEL', 'SUBMIT');--> statement-breakpoint
CREATE TYPE "public"."sync_resolution" AS ENUM('PENDING', 'SERVER', 'LOCAL', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('PENDING', 'PROCESSING', 'SYNCED', 'FAILED', 'CONFLICT');--> statement-breakpoint
CREATE TYPE "public"."taxpayer_contact_kind" AS ENUM('PHONE', 'EMAIL', 'WHATSAPP', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."taxpayer_status" AS ENUM('ACTIVE', 'INACTIVE', 'MERGED');--> statement-breakpoint
CREATE TYPE "public"."taxpayer_type" AS ENUM('PERSON', 'COMPANY');--> statement-breakpoint
CREATE TYPE "public"."territory_type" AS ENUM('SECTOR', 'ZONE', 'MARKET', 'MARKET_LOCATION');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"activityTypeId" varchar(36) NOT NULL,
	"currentTaxpayerId" varchar(36),
	"label" varchar(220) NOT NULL,
	"locationType" "activity_location_type" NOT NULL,
	"zoneId" varchar(36),
	"marketId" varchar(36),
	"marketLocationId" varchar(36),
	"address" text,
	"status" "activity_status" DEFAULT 'ACTIVE' NOT NULL,
	"startedAt" timestamp NOT NULL,
	"endedAt" timestamp,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "activity_categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" varchar(160) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_ownerships" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"activityId" varchar(36) NOT NULL,
	"taxpayerId" varchar(36) NOT NULL,
	"isPrimary" boolean DEFAULT true NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"transferredBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_tax_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"activityId" varchar(36) NOT NULL,
	"taxRuleId" varchar(36) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_types" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"categoryId" varchar(36) NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" varchar(160) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"actorId" integer,
	"action" varchar(96) NOT NULL,
	"module" varchar(64) NOT NULL,
	"entityType" varchar(64) NOT NULL,
	"entityId" varchar(64) NOT NULL,
	"beforeValue" jsonb,
	"afterValue" jsonb,
	"deviceId" varchar(128),
	"ipAddress" varchar(64),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cash_counts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"depositId" varchar(36) NOT NULL,
	"countedAmount" numeric(14, 2) NOT NULL,
	"denominations" jsonb NOT NULL,
	"countedBy" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_counts_depositId_unique" UNIQUE("depositId")
);
--> statement-breakpoint
CREATE TABLE "daily_closings" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"agentId" integer NOT NULL,
	"businessDate" timestamp NOT NULL,
	"expectedAmount" numeric(14, 2) NOT NULL,
	"depositedAmount" numeric(14, 2) NOT NULL,
	"differenceAmount" numeric(14, 2) NOT NULL,
	"status" "daily_closing_status" DEFAULT 'OPEN' NOT NULL,
	"closedBy" integer,
	"closedAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposit_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"depositId" varchar(36) NOT NULL,
	"paymentTransactionId" varchar(36) NOT NULL,
	"acceptedAmount" numeric(14, 2),
	"status" "deposit_item_status" DEFAULT 'PENDING' NOT NULL,
	"rejectionReason" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"agentId" integer NOT NULL,
	"expectedAmount" numeric(14, 2) NOT NULL,
	"depositedAmount" numeric(14, 2) NOT NULL,
	"differenceAmount" numeric(14, 2) NOT NULL,
	"status" "deposit_status" DEFAULT 'PENDING' NOT NULL,
	"submittedAt" timestamp,
	"validatedAt" timestamp,
	"validatedBy" integer,
	"observation" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation_roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"invitationId" varchar(36) NOT NULL,
	"roleId" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_locations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"marketId" varchar(36) NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" varchar(120) NOT NULL,
	"status" "market_location_status" DEFAULT 'AVAILABLE' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"zoneId" varchar(36) NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(160) NOT NULL,
	"address" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "municipalities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(180) NOT NULL,
	"platformName" varchar(180) DEFAULT 'Gestion des taxes municipales' NOT NULL,
	"logoUrl" varchar(2048),
	"primaryColor" varchar(16) DEFAULT '#0F5CDB' NOT NULL,
	"appearanceMode" "appearance_mode" DEFAULT 'LIGHT' NOT NULL,
	"currency" varchar(8) DEFAULT 'XOF' NOT NULL,
	"timezone" varchar(64) DEFAULT 'Africa/Abidjan' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "municipalities_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"paymentTransactionId" varchar(36) NOT NULL,
	"paymentMethodId" varchar(36) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"externalReference" varchar(160),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_items" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"paymentTransactionId" varchar(36) NOT NULL,
	"taxObligationId" varchar(36) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"code" varchar(32) NOT NULL,
	"label" varchar(96) NOT NULL,
	"isCash" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"taxpayerId" varchar(36) NOT NULL,
	"collectedBy" integer NOT NULL,
	"deviceId" varchar(128),
	"offlineOperationId" varchar(96),
	"grossAmount" numeric(14, 2) NOT NULL,
	"netAmount" numeric(14, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"collectedAt" timestamp NOT NULL,
	"validatedAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_transactions_offlineOperationId_unique" UNIQUE("offlineOperationId")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"code" varchar(96) NOT NULL,
	"module" varchar(64) NOT NULL,
	"action" varchar(32) NOT NULL,
	"label" varchar(160) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "receipt_print_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"receiptId" varchar(36) NOT NULL,
	"printType" "receipt_print_type" NOT NULL,
	"printedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deviceId" varchar(128)
);
--> statement-breakpoint
CREATE TABLE "receipts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"paymentTransactionId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"qrPayload" text NOT NULL,
	"integrityHash" varchar(128) NOT NULL,
	"status" "receipt_status" DEFAULT 'FINAL' NOT NULL,
	"issuedAt" timestamp NOT NULL,
	"immutableSnapshot" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receipts_paymentTransactionId_unique" UNIQUE("paymentTransactionId")
);
--> statement-breakpoint
CREATE TABLE "reference_sequences" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"entity" varchar(48) NOT NULL,
	"year" integer NOT NULL,
	"currentNumber" integer DEFAULT 0 NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"roleId" varchar(36) NOT NULL,
	"permissionId" varchar(36) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36),
	"code" varchar(64) NOT NULL,
	"label" varchar(120) NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sectors" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(120) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"agentId" integer NOT NULL,
	"supervisorId" integer NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"assignedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_conflicts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"syncOperationId" varchar(36) NOT NULL,
	"localPayload" jsonb NOT NULL,
	"serverPayload" jsonb,
	"resolution" "sync_resolution" DEFAULT 'PENDING' NOT NULL,
	"resolvedBy" integer,
	"resolvedAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_operations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"deviceId" varchar(128) NOT NULL,
	"operationId" varchar(96) NOT NULL,
	"entityType" varchar(64) NOT NULL,
	"entityId" varchar(64) NOT NULL,
	"operation" "sync_operation" NOT NULL,
	"payloadHash" varchar(128) NOT NULL,
	"status" "sync_status" DEFAULT 'PENDING' NOT NULL,
	"result" jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"processedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "tax_categories" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"code" varchar(48) NOT NULL,
	"label" varchar(160) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_exemptions" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"taxpayerId" varchar(36) NOT NULL,
	"taxTypeId" varchar(36),
	"rate" numeric(7, 4) DEFAULT '1' NOT NULL,
	"reason" text NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"status" "exemption_status" DEFAULT 'PENDING' NOT NULL,
	"approvedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_obligations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"taxpayerId" varchar(36) NOT NULL,
	"activityId" varchar(36) NOT NULL,
	"taxTypeId" varchar(36) NOT NULL,
	"taxRuleId" varchar(36) NOT NULL,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"dueDate" timestamp NOT NULL,
	"expectedAmount" numeric(14, 2) NOT NULL,
	"penaltyAmount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discountAmount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"adjustmentAmount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"remainingAmount" numeric(14, 2) NOT NULL,
	"status" "obligation_status" DEFAULT 'PENDING' NOT NULL,
	"generatedAutomatically" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_periodicities" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36),
	"code" varchar(48) NOT NULL,
	"label" varchar(120) NOT NULL,
	"calendarUnit" "calendar_unit" NOT NULL,
	"intervalCount" integer DEFAULT 1 NOT NULL,
	"calendarConfig" jsonb,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rule_scopes" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"taxRuleId" varchar(36) NOT NULL,
	"activityTypeId" varchar(36),
	"activityLabelQuery" varchar(220),
	"sectorId" varchar(36),
	"zoneId" varchar(36),
	"marketId" varchar(36),
	"marketLocationId" varchar(36),
	"taxpayerType" "taxpayer_type",
	"taxpayerNationalId" varchar(128),
	"taxpayerFiscalId" varchar(128),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"taxTypeId" varchar(36) NOT NULL,
	"periodicityId" varchar(36) NOT NULL,
	"code" varchar(64) NOT NULL,
	"label" varchar(180) NOT NULL,
	"baseAmount" numeric(14, 2) NOT NULL,
	"minimumAmount" numeric(14, 2),
	"maximumAmount" numeric(14, 2),
	"graceDays" integer DEFAULT 0 NOT NULL,
	"penaltyRate" numeric(7, 4) DEFAULT '0' NOT NULL,
	"allowsPartial" boolean DEFAULT true NOT NULL,
	"validFrom" timestamp NOT NULL,
	"validTo" timestamp,
	"priority" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_types" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"categoryId" varchar(36),
	"code" varchar(48) NOT NULL,
	"label" varchar(180) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxpayer_contacts" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"taxpayerId" varchar(36) NOT NULL,
	"kind" "taxpayer_contact_kind" NOT NULL,
	"value" varchar(320) NOT NULL,
	"isPrimary" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxpayer_merges" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sourceTaxpayerId" varchar(36) NOT NULL,
	"targetTaxpayerId" varchar(36) NOT NULL,
	"reason" text NOT NULL,
	"mergedBy" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxpayers" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"reference" varchar(64) NOT NULL,
	"type" "taxpayer_type" NOT NULL,
	"firstName" varchar(120),
	"lastName" varchar(120),
	"legalName" varchar(220),
	"nationalId" varchar(96),
	"taxId" varchar(96),
	"status" "taxpayer_status" DEFAULT 'ACTIVE' NOT NULL,
	"mergedIntoId" varchar(36),
	"createdBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"deletedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "tester_access_tokens" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"redeemedAt" timestamp,
	"revokedAt" timestamp,
	"createdBy" integer NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tester_access_tokens_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "user_invitations" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"municipalityId" varchar(36) NOT NULL,
	"email" varchar(320) NOT NULL,
	"displayName" varchar(180),
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"invitedBy" integer NOT NULL,
	"activatedUserId" integer,
	"expiresAt" timestamp,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"roleId" varchar(36) NOT NULL,
	"assignedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"expiresAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "user_territory_assignments" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"territoryType" "territory_type" NOT NULL,
	"territoryId" varchar(36) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp,
	"isActive" boolean DEFAULT true NOT NULL,
	"assignedBy" integer,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"municipalityId" varchar(36),
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"localUsername" varchar(64),
	"passwordHash" varchar(255),
	"credentialVersion" integer DEFAULT 1 NOT NULL,
	"mustChangePassword" boolean DEFAULT false NOT NULL,
	"failedLoginAttempts" integer DEFAULT 0 NOT NULL,
	"lockedUntil" timestamp,
	"archivedAt" timestamp,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"sectorId" varchar(36) NOT NULL,
	"code" varchar(32) NOT NULL,
	"name" varchar(120) NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_activityTypeId_activity_types_id_fk" FOREIGN KEY ("activityTypeId") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_currentTaxpayerId_taxpayers_id_fk" FOREIGN KEY ("currentTaxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_zoneId_zones_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_marketId_markets_id_fk" FOREIGN KEY ("marketId") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_marketLocationId_market_locations_id_fk" FOREIGN KEY ("marketLocationId") REFERENCES "public"."market_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_categories" ADD CONSTRAINT "activity_categories_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_ownerships" ADD CONSTRAINT "activity_ownerships_activityId_activities_id_fk" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_ownerships" ADD CONSTRAINT "activity_ownerships_taxpayerId_taxpayers_id_fk" FOREIGN KEY ("taxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_ownerships" ADD CONSTRAINT "activity_ownerships_transferredBy_users_id_fk" FOREIGN KEY ("transferredBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tax_assignments" ADD CONSTRAINT "activity_tax_assignments_activityId_activities_id_fk" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_tax_assignments" ADD CONSTRAINT "activity_tax_assignments_taxRuleId_tax_rules_id_fk" FOREIGN KEY ("taxRuleId") REFERENCES "public"."tax_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_types" ADD CONSTRAINT "activity_types_categoryId_activity_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."activity_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_users_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_depositId_deposits_id_fk" FOREIGN KEY ("depositId") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_counts" ADD CONSTRAINT "cash_counts_countedBy_users_id_fk" FOREIGN KEY ("countedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_closedBy_users_id_fk" FOREIGN KEY ("closedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_items" ADD CONSTRAINT "deposit_items_depositId_deposits_id_fk" FOREIGN KEY ("depositId") REFERENCES "public"."deposits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposit_items" ADD CONSTRAINT "deposit_items_paymentTransactionId_payment_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_validatedBy_users_id_fk" FOREIGN KEY ("validatedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_roles" ADD CONSTRAINT "invitation_roles_invitationId_user_invitations_id_fk" FOREIGN KEY ("invitationId") REFERENCES "public"."user_invitations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation_roles" ADD CONSTRAINT "invitation_roles_roleId_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_locations" ADD CONSTRAINT "market_locations_marketId_markets_id_fk" FOREIGN KEY ("marketId") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_zoneId_zones_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentTransactionId_payment_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_paymentMethodId_payment_methods_id_fk" FOREIGN KEY ("paymentMethodId") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_paymentTransactionId_payment_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_items" ADD CONSTRAINT "payment_items_taxObligationId_tax_obligations_id_fk" FOREIGN KEY ("taxObligationId") REFERENCES "public"."tax_obligations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_taxpayerId_taxpayers_id_fk" FOREIGN KEY ("taxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_collectedBy_users_id_fk" FOREIGN KEY ("collectedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_print_history" ADD CONSTRAINT "receipt_print_history_receiptId_receipts_id_fk" FOREIGN KEY ("receiptId") REFERENCES "public"."receipts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_print_history" ADD CONSTRAINT "receipt_print_history_printedBy_users_id_fk" FOREIGN KEY ("printedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentTransactionId_payment_transactions_id_fk" FOREIGN KEY ("paymentTransactionId") REFERENCES "public"."payment_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_sequences" ADD CONSTRAINT "reference_sequences_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_permissions_id_fk" FOREIGN KEY ("permissionId") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_assignments" ADD CONSTRAINT "supervisor_assignments_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_assignments" ADD CONSTRAINT "supervisor_assignments_supervisorId_users_id_fk" FOREIGN KEY ("supervisorId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supervisor_assignments" ADD CONSTRAINT "supervisor_assignments_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_syncOperationId_sync_operations_id_fk" FOREIGN KEY ("syncOperationId") REFERENCES "public"."sync_operations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "sync_conflicts_resolvedBy_users_id_fk" FOREIGN KEY ("resolvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_operations" ADD CONSTRAINT "sync_operations_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_categories" ADD CONSTRAINT "tax_categories_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_exemptions" ADD CONSTRAINT "tax_exemptions_taxpayerId_taxpayers_id_fk" FOREIGN KEY ("taxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_exemptions" ADD CONSTRAINT "tax_exemptions_taxTypeId_tax_types_id_fk" FOREIGN KEY ("taxTypeId") REFERENCES "public"."tax_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_exemptions" ADD CONSTRAINT "tax_exemptions_approvedBy_users_id_fk" FOREIGN KEY ("approvedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxpayerId_taxpayers_id_fk" FOREIGN KEY ("taxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_activityId_activities_id_fk" FOREIGN KEY ("activityId") REFERENCES "public"."activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxTypeId_tax_types_id_fk" FOREIGN KEY ("taxTypeId") REFERENCES "public"."tax_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_obligations" ADD CONSTRAINT "tax_obligations_taxRuleId_tax_rules_id_fk" FOREIGN KEY ("taxRuleId") REFERENCES "public"."tax_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_periodicities" ADD CONSTRAINT "tax_periodicities_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_taxRuleId_tax_rules_id_fk" FOREIGN KEY ("taxRuleId") REFERENCES "public"."tax_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_activityTypeId_activity_types_id_fk" FOREIGN KEY ("activityTypeId") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_sectorId_sectors_id_fk" FOREIGN KEY ("sectorId") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_zoneId_zones_id_fk" FOREIGN KEY ("zoneId") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_marketId_markets_id_fk" FOREIGN KEY ("marketId") REFERENCES "public"."markets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rule_scopes" ADD CONSTRAINT "tax_rule_scopes_marketLocationId_market_locations_id_fk" FOREIGN KEY ("marketLocationId") REFERENCES "public"."market_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_taxTypeId_tax_types_id_fk" FOREIGN KEY ("taxTypeId") REFERENCES "public"."tax_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_periodicityId_tax_periodicities_id_fk" FOREIGN KEY ("periodicityId") REFERENCES "public"."tax_periodicities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_types" ADD CONSTRAINT "tax_types_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_types" ADD CONSTRAINT "tax_types_categoryId_tax_categories_id_fk" FOREIGN KEY ("categoryId") REFERENCES "public"."tax_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_contacts" ADD CONSTRAINT "taxpayer_contacts_taxpayerId_taxpayers_id_fk" FOREIGN KEY ("taxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_merges" ADD CONSTRAINT "taxpayer_merges_sourceTaxpayerId_taxpayers_id_fk" FOREIGN KEY ("sourceTaxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_merges" ADD CONSTRAINT "taxpayer_merges_targetTaxpayerId_taxpayers_id_fk" FOREIGN KEY ("targetTaxpayerId") REFERENCES "public"."taxpayers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayer_merges" ADD CONSTRAINT "taxpayer_merges_mergedBy_users_id_fk" FOREIGN KEY ("mergedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayers" ADD CONSTRAINT "taxpayers_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "taxpayers" ADD CONSTRAINT "taxpayers_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_access_tokens" ADD CONSTRAINT "tester_access_tokens_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tester_access_tokens" ADD CONSTRAINT "tester_access_tokens_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_invitedBy_users_id_fk" FOREIGN KEY ("invitedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD CONSTRAINT "user_invitations_activatedUserId_users_id_fk" FOREIGN KEY ("activatedUserId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_roles_id_fk" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_territory_assignments" ADD CONSTRAINT "user_territory_assignments_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_territory_assignments" ADD CONSTRAINT "user_territory_assignments_assignedBy_users_id_fk" FOREIGN KEY ("assignedBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_municipalityId_municipalities_id_fk" FOREIGN KEY ("municipalityId") REFERENCES "public"."municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_sectorId_sectors_id_fk" FOREIGN KEY ("sectorId") REFERENCES "public"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "activity_reference_unique" ON "activities" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE INDEX "activity_owner_idx" ON "activities" USING btree ("currentTaxpayerId","status");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_category_code_unique" ON "activity_categories" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE INDEX "activity_owner_active_idx" ON "activity_ownerships" USING btree ("activityId","endDate");--> statement-breakpoint
CREATE INDEX "activity_tax_active_idx" ON "activity_tax_assignments" USING btree ("activityId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_type_code_unique" ON "activity_types" USING btree ("categoryId","code");--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("municipalityId","entityType","entityId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_closing_unique" ON "daily_closings" USING btree ("municipalityId","agentId","businessDate");--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_payment_unique" ON "deposit_items" USING btree ("depositId","paymentTransactionId");--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_item_payment_global_unique" ON "deposit_items" USING btree ("paymentTransactionId");--> statement-breakpoint
CREATE UNIQUE INDEX "deposit_reference_unique" ON "deposits" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_role_unique" ON "invitation_roles" USING btree ("invitationId","roleId");--> statement-breakpoint
CREATE UNIQUE INDEX "market_location_code_unique" ON "market_locations" USING btree ("marketId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "market_code_unique" ON "markets" USING btree ("zoneId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_obligation_unique" ON "payment_items" USING btree ("paymentTransactionId","taxObligationId");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_method_code_unique" ON "payment_methods" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_reference_unique" ON "payment_transactions" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE INDEX "payment_agent_date_idx" ON "payment_transactions" USING btree ("collectedBy","collectedAt");--> statement-breakpoint
CREATE UNIQUE INDEX "receipt_reference_unique" ON "receipts" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE UNIQUE INDEX "reference_sequence_unique" ON "reference_sequences" USING btree ("municipalityId","entity","year");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_unique" ON "role_permissions" USING btree ("roleId","permissionId");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_scope_code_unique" ON "roles" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "sector_code_unique" ON "sectors" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE INDEX "supervisor_assignment_agent_active_idx" ON "supervisor_assignments" USING btree ("agentId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "sync_idempotence_unique" ON "sync_operations" USING btree ("deviceId","operationId");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_category_code_unique" ON "tax_categories" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "obligation_reference_unique" ON "tax_obligations" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE INDEX "obligation_taxpayer_status_idx" ON "tax_obligations" USING btree ("taxpayerId","status","dueDate");--> statement-breakpoint
CREATE UNIQUE INDEX "periodicity_scope_code_unique" ON "tax_periodicities" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE INDEX "tax_rule_scope_group_idx" ON "tax_rule_scopes" USING btree ("taxRuleId","activityTypeId","zoneId","marketId");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_rule_code_unique" ON "tax_rules" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_type_code_unique" ON "tax_types" USING btree ("municipalityId","code");--> statement-breakpoint
CREATE INDEX "taxpayer_contact_search_idx" ON "taxpayer_contacts" USING btree ("value");--> statement-breakpoint
CREATE UNIQUE INDEX "taxpayer_reference_unique" ON "taxpayers" USING btree ("municipalityId","reference");--> statement-breakpoint
CREATE INDEX "taxpayer_search_idx" ON "taxpayers" USING btree ("municipalityId","lastName","firstName");--> statement-breakpoint
CREATE INDEX "tester_access_user_idx" ON "tester_access_tokens" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "tester_access_expiry_idx" ON "tester_access_tokens" USING btree ("expiresAt");--> statement-breakpoint
CREATE UNIQUE INDEX "user_invitation_municipality_email_unique" ON "user_invitations" USING btree ("municipalityId","email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_unique" ON "user_roles" USING btree ("userId","roleId");--> statement-breakpoint
CREATE INDEX "territory_assignment_user_idx" ON "user_territory_assignments" USING btree ("userId","isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "users_local_username_unique" ON "users" USING btree ("localUsername");--> statement-breakpoint
CREATE UNIQUE INDEX "zone_code_unique" ON "zones" USING btree ("sectorId","code");