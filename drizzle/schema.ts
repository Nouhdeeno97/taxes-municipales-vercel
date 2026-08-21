import { randomUUID } from "crypto";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

const uuid = (name = "id") => varchar(name, { length: 36 }).$defaultFn(() => randomUUID());
const createdAt = () => timestamp("createdAt", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt", { withTimezone: true }).defaultNow().$onUpdateFn(() => new Date()).notNull();

export const appearanceModeEnum = pgEnum("appearance_mode", ["LIGHT", "DARK", "SYSTEM"]);
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const invitationStatusEnum = pgEnum("invitation_status", ["PENDING", "ACTIVATED", "CANCELLED", "EXPIRED"]);
export const marketLocationStatusEnum = pgEnum("market_location_status", ["AVAILABLE", "OCCUPIED", "RESERVED", "INACTIVE"]);
export const territoryTypeEnum = pgEnum("territory_type", ["SECTOR", "ZONE", "MARKET", "MARKET_LOCATION"]);
export const taxpayerTypeEnum = pgEnum("taxpayer_type", ["PERSON", "COMPANY"]);
export const taxpayerStatusEnum = pgEnum("taxpayer_status", ["ACTIVE", "INACTIVE", "MERGED"]);
export const taxpayerContactKindEnum = pgEnum("taxpayer_contact_kind", ["PHONE", "EMAIL", "WHATSAPP", "OTHER"]);
export const activityLocationTypeEnum = pgEnum("activity_location_type", ["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]);
export const activityStatusEnum = pgEnum("activity_status", ["ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED", "EXPIRED"]);
export const calendarUnitEnum = pgEnum("calendar_unit", ["DAY", "WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR", "CUSTOM"]);
export const exemptionStatusEnum = pgEnum("exemption_status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]);
export const obligationStatusEnum = pgEnum("obligation_status", ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "EXEMPTED"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING_SYNC", "PENDING", "VALIDATED", "CANCELLED", "REFUNDED"]);
export const receiptStatusEnum = pgEnum("receipt_status", ["PROVISIONAL", "FINAL", "CANCELLED"]);
export const receiptPrintTypeEnum = pgEnum("receipt_print_type", ["ORIGINAL", "DUPLICATE", "REPRINT"]);
export const depositStatusEnum = pgEnum("deposit_status", ["PENDING", "SUBMITTED", "VALIDATED", "PARTIALLY_VALIDATED", "REJECTED"]);
export const depositItemStatusEnum = pgEnum("deposit_item_status", ["PENDING", "ACCEPTED", "REJECTED"]);
export const dailyClosingStatusEnum = pgEnum("daily_closing_status", ["OPEN", "SUBMITTED", "CLOSED", "REOPENED"]);
export const syncOperationEnum = pgEnum("sync_operation", ["CREATE", "UPDATE", "CANCEL", "SUBMIT"]);
export const syncStatusEnum = pgEnum("sync_status", ["PENDING", "PROCESSING", "SYNCED", "FAILED", "CONFLICT"]);
export const syncResolutionEnum = pgEnum("sync_resolution", ["PENDING", "SERVER", "LOCAL", "MANUAL"]);

export const municipalities = pgTable("municipalities", {
  id: uuid().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  platformName: varchar("platformName", { length: 180 }).notNull().default("Gestion des taxes municipales"),
  logoUrl: varchar("logoUrl", { length: 2048 }),
  primaryColor: varchar("primaryColor", { length: 16 }).notNull().default("#0F5CDB"),
  appearanceMode: appearanceModeEnum("appearanceMode").notNull().default("LIGHT"),
  currency: varchar("currency", { length: 8 }).notNull().default("XOF"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Abidjan"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  localUsername: varchar("localUsername", { length: 64 }),
  passwordHash: varchar("passwordHash", { length: 255 }),
  credentialVersion: integer("credentialVersion").notNull().default(1),
  mustChangePassword: boolean("mustChangePassword").notNull().default(false),
  failedLoginAttempts: integer("failedLoginAttempts").notNull().default(0),
  lockedUntil: timestamp("lockedUntil"),
  archivedAt: timestamp("archivedAt"),
  role: userRoleEnum("role").default("user").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, table => [uniqueIndex("users_local_username_unique").on(table.localUsername)]);

export const roles = pgTable("roles", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  isSystem: boolean("isSystem").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("roles_scope_code_unique").on(table.municipalityId, table.code)]);

export const permissions = pgTable("permissions", {
  id: uuid().primaryKey(),
  code: varchar("code", { length: 96 }).notNull().unique(),
  module: varchar("module", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  createdAt: createdAt(),
});

export const userRoles = pgTable("user_roles", {
  id: uuid().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  roleId: uuid("roleId").notNull().references(() => roles.id),
  assignedBy: integer("assignedBy").references(() => users.id),
  assignedAt: createdAt(),
  expiresAt: timestamp("expiresAt"),
}, table => [uniqueIndex("user_role_unique").on(table.userId, table.roleId)]);

export const userInvitations = pgTable("user_invitations", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("displayName", { length: 180 }),
  status: invitationStatusEnum("status").notNull().default("PENDING"),
  invitedBy: integer("invitedBy").notNull().references(() => users.id),
  activatedUserId: integer("activatedUserId").references(() => users.id),
  expiresAt: timestamp("expiresAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("user_invitation_municipality_email_unique").on(table.municipalityId, table.email)]);

export const invitationRoles = pgTable("invitation_roles", {
  id: uuid().primaryKey(),
  invitationId: uuid("invitationId").notNull().references(() => userInvitations.id),
  roleId: uuid("roleId").notNull().references(() => roles.id),
}, table => [uniqueIndex("invitation_role_unique").on(table.invitationId, table.roleId)]);

/** Lien à usage unique réservé aux testeurs sans identité Manus OAuth. */
export const testerAccessTokens = pgTable("tester_access_tokens", {
  id: uuid().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  redeemedAt: timestamp("redeemedAt"),
  revokedAt: timestamp("revokedAt"),
  createdBy: integer("createdBy").notNull().references(() => users.id),
  createdAt: createdAt(),
}, table => [index("tester_access_user_idx").on(table.userId), index("tester_access_expiry_idx").on(table.expiresAt)]);

export const rolePermissions = pgTable("role_permissions", {
  id: uuid().primaryKey(),
  roleId: uuid("roleId").notNull().references(() => roles.id),
  permissionId: uuid("permissionId").notNull().references(() => permissions.id),
}, table => [uniqueIndex("role_permission_unique").on(table.roleId, table.permissionId)]);

export const supervisorAssignments = pgTable("supervisor_assignments", {
  id: uuid().primaryKey(),
  agentId: integer("agentId").notNull().references(() => users.id),
  supervisorId: integer("supervisorId").notNull().references(() => users.id),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  assignedBy: integer("assignedBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("supervisor_assignment_agent_active_idx").on(table.agentId, table.isActive)]);

export const sectors = pgTable("sectors", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("sector_code_unique").on(table.municipalityId, table.code)]);

export const zones = pgTable("zones", {
  id: uuid().primaryKey(),
  sectorId: uuid("sectorId").notNull().references(() => sectors.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("zone_code_unique").on(table.sectorId, table.code)]);

export const markets = pgTable("markets", {
  id: uuid().primaryKey(),
  zoneId: uuid("zoneId").notNull().references(() => zones.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("market_code_unique").on(table.zoneId, table.code)]);

export const marketLocations = pgTable("market_locations", {
  id: uuid().primaryKey(),
  marketId: uuid("marketId").notNull().references(() => markets.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  status: marketLocationStatusEnum("status").notNull().default("AVAILABLE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("market_location_code_unique").on(table.marketId, table.code)]);

export const userTerritoryAssignments = pgTable("user_territory_assignments", {
  id: uuid().primaryKey(),
  userId: integer("userId").notNull().references(() => users.id),
  territoryType: territoryTypeEnum("territoryType").notNull(),
  territoryId: varchar("territoryId", { length: 36 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  assignedBy: integer("assignedBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("territory_assignment_user_idx").on(table.userId, table.isActive)]);

export const taxpayers = pgTable("taxpayers", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  type: taxpayerTypeEnum("type").notNull(),
  firstName: varchar("firstName", { length: 120 }),
  lastName: varchar("lastName", { length: 120 }),
  legalName: varchar("legalName", { length: 220 }),
  nationalId: varchar("nationalId", { length: 96 }),
  taxId: varchar("taxId", { length: 96 }),
  status: taxpayerStatusEnum("status").notNull().default("ACTIVE"),
  mergedIntoId: uuid("mergedIntoId"),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  uniqueIndex("taxpayer_reference_unique").on(table.municipalityId, table.reference),
  index("taxpayer_search_idx").on(table.municipalityId, table.lastName, table.firstName),
]);

export const taxpayerContacts = pgTable("taxpayer_contacts", {
  id: uuid().primaryKey(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  kind: taxpayerContactKindEnum("kind").notNull(),
  value: varchar("value", { length: 320 }).notNull(),
  isPrimary: boolean("isPrimary").notNull().default(false),
  createdAt: createdAt(),
}, table => [index("taxpayer_contact_search_idx").on(table.value)]);

export const taxpayerMerges = pgTable("taxpayer_merges", {
  id: uuid().primaryKey(),
  sourceTaxpayerId: uuid("sourceTaxpayerId").notNull().references(() => taxpayers.id),
  targetTaxpayerId: uuid("targetTaxpayerId").notNull().references(() => taxpayers.id),
  reason: text("reason").notNull(),
  mergedBy: integer("mergedBy").notNull().references(() => users.id),
  mergedAt: createdAt(),
});

export const activityCategories = pgTable("activity_categories", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("activity_category_code_unique").on(table.municipalityId, table.code)]);

export const activityTypes = pgTable("activity_types", {
  id: uuid().primaryKey(),
  categoryId: uuid("categoryId").notNull().references(() => activityCategories.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("activity_type_code_unique").on(table.categoryId, table.code)]);

export const activities = pgTable("activities", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  activityTypeId: uuid("activityTypeId").notNull().references(() => activityTypes.id),
  currentTaxpayerId: uuid("currentTaxpayerId").references(() => taxpayers.id),
  label: varchar("label", { length: 220 }).notNull(),
  locationType: activityLocationTypeEnum("locationType").notNull(),
  zoneId: uuid("zoneId").references(() => zones.id),
  marketId: uuid("marketId").references(() => markets.id),
  marketLocationId: uuid("marketLocationId").references(() => marketLocations.id),
  address: text("address"),
  status: activityStatusEnum("status").notNull().default("ACTIVE"),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  uniqueIndex("activity_reference_unique").on(table.municipalityId, table.reference),
  index("activity_owner_idx").on(table.currentTaxpayerId, table.status),
]);

export const activityOwnerships = pgTable("activity_ownerships", {
  id: uuid().primaryKey(),
  activityId: uuid("activityId").notNull().references(() => activities.id),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  isPrimary: boolean("isPrimary").notNull().default(true),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  transferredBy: integer("transferredBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("activity_owner_active_idx").on(table.activityId, table.endDate)]);

export const taxCategories = pgTable("tax_categories", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("tax_category_code_unique").on(table.municipalityId, table.code)]);

export const taxTypes = pgTable("tax_types", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  categoryId: uuid("categoryId").references(() => taxCategories.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("tax_type_code_unique").on(table.municipalityId, table.code)]);

export const taxPeriodicities = pgTable("tax_periodicities", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  calendarUnit: calendarUnitEnum("calendarUnit").notNull(),
  intervalCount: integer("intervalCount").notNull().default(1),
  calendarConfig: jsonb("calendarConfig"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("periodicity_scope_code_unique").on(table.municipalityId, table.code)]);

export const taxRules = pgTable("tax_rules", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  taxTypeId: uuid("taxTypeId").notNull().references(() => taxTypes.id),
  periodicityId: uuid("periodicityId").notNull().references(() => taxPeriodicities.id),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  baseAmount: decimal("baseAmount", { precision: 14, scale: 2 }).notNull(),
  minimumAmount: decimal("minimumAmount", { precision: 14, scale: 2 }),
  maximumAmount: decimal("maximumAmount", { precision: 14, scale: 2 }),
  graceDays: integer("graceDays").notNull().default(0),
  penaltyRate: decimal("penaltyRate", { precision: 7, scale: 4 }).notNull().default("0"),
  allowsPartial: boolean("allowsPartial").notNull().default(true),
  validFrom: timestamp("validFrom").notNull(),
  validTo: timestamp("validTo"),
  priority: integer("priority").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdBy: integer("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("tax_rule_code_unique").on(table.municipalityId, table.code)]);

export const taxRuleScopes = pgTable("tax_rule_scopes", {
  id: uuid().primaryKey(),
  taxRuleId: uuid("taxRuleId").notNull().references(() => taxRules.id),
  activityTypeId: uuid("activityTypeId").references(() => activityTypes.id),
  activityLabelQuery: varchar("activityLabelQuery", { length: 220 }),
  sectorId: uuid("sectorId").references(() => sectors.id),
  zoneId: uuid("zoneId").references(() => zones.id),
  marketId: uuid("marketId").references(() => markets.id),
  marketLocationId: uuid("marketLocationId").references(() => marketLocations.id),
  taxpayerType: taxpayerTypeEnum("taxpayerType"),
  taxpayerNationalId: varchar("taxpayerNationalId", { length: 128 }),
  taxpayerFiscalId: varchar("taxpayerFiscalId", { length: 128 }),
  createdAt: createdAt(),
}, table => [index("tax_rule_scope_group_idx").on(table.taxRuleId, table.activityTypeId, table.zoneId, table.marketId)]);

export const taxExemptions = pgTable("tax_exemptions", {
  id: uuid().primaryKey(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  taxTypeId: uuid("taxTypeId").references(() => taxTypes.id),
  rate: decimal("rate", { precision: 7, scale: 4 }).notNull().default("1"),
  reason: text("reason").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  status: exemptionStatusEnum("status").notNull().default("PENDING"),
  approvedBy: integer("approvedBy").references(() => users.id),
  createdAt: createdAt(),
});

export const activityTaxAssignments = pgTable("activity_tax_assignments", {
  id: uuid().primaryKey(),
  activityId: uuid("activityId").notNull().references(() => activities.id),
  taxRuleId: uuid("taxRuleId").notNull().references(() => taxRules.id),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [index("activity_tax_active_idx").on(table.activityId, table.isActive)]);

export const taxObligations = pgTable("tax_obligations", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  activityId: uuid("activityId").notNull().references(() => activities.id),
  taxTypeId: uuid("taxTypeId").notNull().references(() => taxTypes.id),
  taxRuleId: uuid("taxRuleId").notNull().references(() => taxRules.id),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  expectedAmount: decimal("expectedAmount", { precision: 14, scale: 2 }).notNull(),
  penaltyAmount: decimal("penaltyAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  discountAmount: decimal("discountAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  adjustmentAmount: decimal("adjustmentAmount", { precision: 14, scale: 2 }).notNull().default("0"),
  remainingAmount: decimal("remainingAmount", { precision: 14, scale: 2 }).notNull(),
  status: obligationStatusEnum("status").notNull().default("PENDING"),
  generatedAutomatically: boolean("generatedAutomatically").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  uniqueIndex("obligation_reference_unique").on(table.municipalityId, table.reference),
  index("obligation_taxpayer_status_idx").on(table.taxpayerId, table.status, table.dueDate),
]);

export const paymentMethods = pgTable("payment_methods", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 32 }).notNull(),
  label: varchar("label", { length: 96 }).notNull(),
  isCash: boolean("isCash").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("payment_method_code_unique").on(table.municipalityId, table.code)]);

export const paymentTransactions = pgTable("payment_transactions", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  collectedBy: integer("collectedBy").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 128 }),
  offlineOperationId: varchar("offlineOperationId", { length: 96 }).unique(),
  grossAmount: decimal("grossAmount", { precision: 14, scale: 2 }).notNull(),
  netAmount: decimal("netAmount", { precision: 14, scale: 2 }).notNull(),
  status: paymentStatusEnum("status").notNull().default("PENDING"),
  collectedAt: timestamp("collectedAt").notNull(),
  validatedAt: timestamp("validatedAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  uniqueIndex("payment_reference_unique").on(table.municipalityId, table.reference),
  index("payment_agent_date_idx").on(table.collectedBy, table.collectedAt),
]);

export const paymentItems = pgTable("payment_items", {
  id: uuid().primaryKey(),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  taxObligationId: uuid("taxObligationId").notNull().references(() => taxObligations.id),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("payment_obligation_unique").on(table.paymentTransactionId, table.taxObligationId)]);

export const paymentAllocations = pgTable("payment_allocations", {
  id: uuid().primaryKey(),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  paymentMethodId: uuid("paymentMethodId").notNull().references(() => paymentMethods.id),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  externalReference: varchar("externalReference", { length: 160 }),
  createdAt: createdAt(),
});

export const receipts = pgTable("receipts", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id).unique(),
  reference: varchar("reference", { length: 64 }).notNull(),
  qrPayload: text("qrPayload").notNull(),
  integrityHash: varchar("integrityHash", { length: 128 }).notNull(),
  status: receiptStatusEnum("status").notNull().default("FINAL"),
  issuedAt: timestamp("issuedAt").notNull(),
  immutableSnapshot: jsonb("immutableSnapshot").notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("receipt_reference_unique").on(table.municipalityId, table.reference)]);

export const receiptPrintHistory = pgTable("receipt_print_history", {
  id: uuid().primaryKey(),
  receiptId: uuid("receiptId").notNull().references(() => receipts.id),
  printType: receiptPrintTypeEnum("printType").notNull(),
  printedBy: integer("printedBy").references(() => users.id),
  printedAt: createdAt(),
  deviceId: varchar("deviceId", { length: 128 }),
});

export const deposits = pgTable("deposits", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  agentId: integer("agentId").notNull().references(() => users.id),
  expectedAmount: decimal("expectedAmount", { precision: 14, scale: 2 }).notNull(),
  depositedAmount: decimal("depositedAmount", { precision: 14, scale: 2 }).notNull(),
  differenceAmount: decimal("differenceAmount", { precision: 14, scale: 2 }).notNull(),
  status: depositStatusEnum("status").notNull().default("PENDING"),
  submittedAt: timestamp("submittedAt"),
  validatedAt: timestamp("validatedAt"),
  validatedBy: integer("validatedBy").references(() => users.id),
  observation: text("observation"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("deposit_reference_unique").on(table.municipalityId, table.reference)]);

export const depositItems = pgTable("deposit_items", {
  id: uuid().primaryKey(),
  depositId: uuid("depositId").notNull().references(() => deposits.id),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  acceptedAmount: decimal("acceptedAmount", { precision: 14, scale: 2 }),
  status: depositItemStatusEnum("status").notNull().default("PENDING"),
  rejectionReason: text("rejectionReason"),
  createdAt: createdAt(),
}, table => [
  uniqueIndex("deposit_payment_unique").on(table.depositId, table.paymentTransactionId),
  uniqueIndex("deposit_item_payment_global_unique").on(table.paymentTransactionId),
]);

export const cashCounts = pgTable("cash_counts", {
  id: uuid().primaryKey(),
  depositId: uuid("depositId").notNull().references(() => deposits.id).unique(),
  countedAmount: decimal("countedAmount", { precision: 14, scale: 2 }).notNull(),
  denominations: jsonb("denominations").notNull(),
  countedBy: integer("countedBy").notNull().references(() => users.id),
  countedAt: createdAt(),
});

export const dailyClosings = pgTable("daily_closings", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  agentId: integer("agentId").notNull().references(() => users.id),
  businessDate: timestamp("businessDate").notNull(),
  expectedAmount: decimal("expectedAmount", { precision: 14, scale: 2 }).notNull(),
  depositedAmount: decimal("depositedAmount", { precision: 14, scale: 2 }).notNull(),
  differenceAmount: decimal("differenceAmount", { precision: 14, scale: 2 }).notNull(),
  status: dailyClosingStatusEnum("status").notNull().default("OPEN"),
  closedBy: integer("closedBy").references(() => users.id),
  closedAt: timestamp("closedAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("daily_closing_unique").on(table.municipalityId, table.agentId, table.businessDate)]);

export const referenceSequences = pgTable("reference_sequences", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  entity: varchar("entity", { length: 48 }).notNull(),
  year: integer("year").notNull(),
  currentNumber: integer("currentNumber").notNull().default(0),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("reference_sequence_unique").on(table.municipalityId, table.entity, table.year)]);

export const auditLogs = pgTable("audit_logs", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  actorId: integer("actorId").references(() => users.id),
  action: varchar("action", { length: 96 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  beforeValue: jsonb("beforeValue"),
  afterValue: jsonb("afterValue"),
  deviceId: varchar("deviceId", { length: 128 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: createdAt(),
}, table => [index("audit_entity_idx").on(table.municipalityId, table.entityType, table.entityId, table.createdAt)]);

export const syncOperations = pgTable("sync_operations", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  operationId: varchar("operationId", { length: 96 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  operation: syncOperationEnum("operation").notNull(),
  payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
  status: syncStatusEnum("status").notNull().default("PENDING"),
  result: jsonb("result"),
  createdAt: createdAt(),
  processedAt: timestamp("processedAt"),
}, table => [uniqueIndex("sync_idempotence_unique").on(table.deviceId, table.operationId)]);

export const syncConflicts = pgTable("sync_conflicts", {
  id: uuid().primaryKey(),
  syncOperationId: uuid("syncOperationId").notNull().references(() => syncOperations.id),
  localPayload: jsonb("localPayload").notNull(),
  serverPayload: jsonb("serverPayload"),
  resolution: syncResolutionEnum("resolution").notNull().default("PENDING"),
  resolvedBy: integer("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
