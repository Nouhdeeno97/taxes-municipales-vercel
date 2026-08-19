import { randomUUID } from "crypto";
import {
  boolean,
  decimal,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

const uuid = (name = "id") => varchar(name, { length: 36 }).$defaultFn(() => randomUUID());
const createdAt = () => timestamp("createdAt").defaultNow().notNull();
const updatedAt = () => timestamp("updatedAt").defaultNow().onUpdateNow().notNull();

export const municipalities = mysqlTable("municipalities", {
  id: uuid().primaryKey(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  name: varchar("name", { length: 180 }).notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("XOF"),
  timezone: varchar("timezone", { length: 64 }).notNull().default("Africa/Abidjan"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const roles = mysqlTable("roles", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  isSystem: boolean("isSystem").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("roles_scope_code_unique").on(table.municipalityId, table.code)]);

export const permissions = mysqlTable("permissions", {
  id: uuid().primaryKey(),
  code: varchar("code", { length: 96 }).notNull().unique(),
  module: varchar("module", { length: 64 }).notNull(),
  action: varchar("action", { length: 32 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  createdAt: createdAt(),
});

export const userRoles = mysqlTable("user_roles", {
  id: uuid().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  roleId: uuid("roleId").notNull().references(() => roles.id),
  assignedBy: int("assignedBy").references(() => users.id),
  assignedAt: createdAt(),
  expiresAt: timestamp("expiresAt"),
}, table => [uniqueIndex("user_role_unique").on(table.userId, table.roleId)]);

export const userInvitations = mysqlTable("user_invitations", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("displayName", { length: 180 }),
  status: mysqlEnum("status", ["PENDING", "ACTIVATED", "CANCELLED", "EXPIRED"]).notNull().default("PENDING"),
  invitedBy: int("invitedBy").notNull().references(() => users.id),
  activatedUserId: int("activatedUserId").references(() => users.id),
  expiresAt: timestamp("expiresAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("user_invitation_municipality_email_unique").on(table.municipalityId, table.email)]);

export const invitationRoles = mysqlTable("invitation_roles", {
  id: uuid().primaryKey(),
  invitationId: uuid("invitationId").notNull().references(() => userInvitations.id),
  roleId: uuid("roleId").notNull().references(() => roles.id),
}, table => [uniqueIndex("invitation_role_unique").on(table.invitationId, table.roleId)]);

/** Lien à usage unique réservé aux testeurs sans identité Manus OAuth. */
export const testerAccessTokens = mysqlTable("tester_access_tokens", {
  id: uuid().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  redeemedAt: timestamp("redeemedAt"),
  revokedAt: timestamp("revokedAt"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: createdAt(),
}, table => [index("tester_access_user_idx").on(table.userId), index("tester_access_expiry_idx").on(table.expiresAt)]);

export const rolePermissions = mysqlTable("role_permissions", {
  id: uuid().primaryKey(),
  roleId: uuid("roleId").notNull().references(() => roles.id),
  permissionId: uuid("permissionId").notNull().references(() => permissions.id),
}, table => [uniqueIndex("role_permission_unique").on(table.roleId, table.permissionId)]);

export const supervisorAssignments = mysqlTable("supervisor_assignments", {
  id: uuid().primaryKey(),
  agentId: int("agentId").notNull().references(() => users.id),
  supervisorId: int("supervisorId").notNull().references(() => users.id),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  assignedBy: int("assignedBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("supervisor_assignment_agent_active_idx").on(table.agentId, table.isActive)]);

export const sectors = mysqlTable("sectors", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("sector_code_unique").on(table.municipalityId, table.code)]);

export const zones = mysqlTable("zones", {
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

export const markets = mysqlTable("markets", {
  id: uuid().primaryKey(),
  zoneId: uuid("zoneId").notNull().references(() => zones.id),
  code: varchar("code", { length: 32 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  address: text("address"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("market_code_unique").on(table.zoneId, table.code)]);

export const marketLocations = mysqlTable("market_locations", {
  id: uuid().primaryKey(),
  marketId: uuid("marketId").notNull().references(() => markets.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  status: mysqlEnum("status", ["AVAILABLE", "OCCUPIED", "RESERVED", "INACTIVE"]).notNull().default("AVAILABLE"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("market_location_code_unique").on(table.marketId, table.code)]);

export const userTerritoryAssignments = mysqlTable("user_territory_assignments", {
  id: uuid().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  territoryType: mysqlEnum("territoryType", ["SECTOR", "ZONE", "MARKET", "MARKET_LOCATION"]).notNull(),
  territoryId: varchar("territoryId", { length: 36 }).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  assignedBy: int("assignedBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("territory_assignment_user_idx").on(table.userId, table.isActive)]);

export const taxpayers = mysqlTable("taxpayers", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  type: mysqlEnum("type", ["PERSON", "COMPANY"]).notNull(),
  firstName: varchar("firstName", { length: 120 }),
  lastName: varchar("lastName", { length: 120 }),
  legalName: varchar("legalName", { length: 220 }),
  nationalId: varchar("nationalId", { length: 96 }),
  taxId: varchar("taxId", { length: 96 }),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "MERGED"]).notNull().default("ACTIVE"),
  mergedIntoId: uuid("mergedIntoId"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  uniqueIndex("taxpayer_reference_unique").on(table.municipalityId, table.reference),
  index("taxpayer_search_idx").on(table.municipalityId, table.lastName, table.firstName),
]);

export const taxpayerContacts = mysqlTable("taxpayer_contacts", {
  id: uuid().primaryKey(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  kind: mysqlEnum("kind", ["PHONE", "EMAIL", "WHATSAPP", "OTHER"]).notNull(),
  value: varchar("value", { length: 320 }).notNull(),
  isPrimary: boolean("isPrimary").notNull().default(false),
  createdAt: createdAt(),
}, table => [index("taxpayer_contact_search_idx").on(table.value)]);

export const taxpayerMerges = mysqlTable("taxpayer_merges", {
  id: uuid().primaryKey(),
  sourceTaxpayerId: uuid("sourceTaxpayerId").notNull().references(() => taxpayers.id),
  targetTaxpayerId: uuid("targetTaxpayerId").notNull().references(() => taxpayers.id),
  reason: text("reason").notNull(),
  mergedBy: int("mergedBy").notNull().references(() => users.id),
  mergedAt: createdAt(),
});

export const activityCategories = mysqlTable("activity_categories", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("activity_category_code_unique").on(table.municipalityId, table.code)]);

export const activityTypes = mysqlTable("activity_types", {
  id: uuid().primaryKey(),
  categoryId: uuid("categoryId").notNull().references(() => activityCategories.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("activity_type_code_unique").on(table.categoryId, table.code)]);

export const activities = mysqlTable("activities", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  activityTypeId: uuid("activityTypeId").notNull().references(() => activityTypes.id),
  currentTaxpayerId: uuid("currentTaxpayerId").references(() => taxpayers.id),
  label: varchar("label", { length: 220 }).notNull(),
  locationType: mysqlEnum("locationType", ["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]).notNull(),
  zoneId: uuid("zoneId").references(() => zones.id),
  marketId: uuid("marketId").references(() => markets.id),
  marketLocationId: uuid("marketLocationId").references(() => marketLocations.id),
  address: text("address"),
  status: mysqlEnum("status", ["ACTIVE", "INACTIVE", "SUSPENDED", "CLOSED", "EXPIRED"]).notNull().default("ACTIVE"),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt"),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: timestamp("deletedAt"),
}, table => [
  uniqueIndex("activity_reference_unique").on(table.municipalityId, table.reference),
  index("activity_owner_idx").on(table.currentTaxpayerId, table.status),
]);

export const activityOwnerships = mysqlTable("activity_ownerships", {
  id: uuid().primaryKey(),
  activityId: uuid("activityId").notNull().references(() => activities.id),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  isPrimary: boolean("isPrimary").notNull().default(true),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  transferredBy: int("transferredBy").references(() => users.id),
  createdAt: createdAt(),
}, table => [index("activity_owner_active_idx").on(table.activityId, table.endDate)]);

export const taxCategories = mysqlTable("tax_categories", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 160 }).notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("tax_category_code_unique").on(table.municipalityId, table.code)]);

export const taxTypes = mysqlTable("tax_types", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  categoryId: uuid("categoryId").references(() => taxCategories.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("tax_type_code_unique").on(table.municipalityId, table.code)]);

export const taxPeriodicities = mysqlTable("tax_periodicities", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").references(() => municipalities.id),
  code: varchar("code", { length: 48 }).notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  calendarUnit: mysqlEnum("calendarUnit", ["DAY", "WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR", "CUSTOM"]).notNull(),
  intervalCount: int("intervalCount").notNull().default(1),
  calendarConfig: json("calendarConfig"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("periodicity_scope_code_unique").on(table.municipalityId, table.code)]);

export const taxRules = mysqlTable("tax_rules", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  taxTypeId: uuid("taxTypeId").notNull().references(() => taxTypes.id),
  periodicityId: uuid("periodicityId").notNull().references(() => taxPeriodicities.id),
  code: varchar("code", { length: 64 }).notNull(),
  label: varchar("label", { length: 180 }).notNull(),
  baseAmount: decimal("baseAmount", { precision: 14, scale: 2 }).notNull(),
  minimumAmount: decimal("minimumAmount", { precision: 14, scale: 2 }),
  maximumAmount: decimal("maximumAmount", { precision: 14, scale: 2 }),
  graceDays: int("graceDays").notNull().default(0),
  penaltyRate: decimal("penaltyRate", { precision: 7, scale: 4 }).notNull().default("0"),
  allowsPartial: boolean("allowsPartial").notNull().default(true),
  validFrom: timestamp("validFrom").notNull(),
  validTo: timestamp("validTo"),
  priority: int("priority").notNull().default(0),
  isActive: boolean("isActive").notNull().default(true),
  createdBy: int("createdBy").references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("tax_rule_code_unique").on(table.municipalityId, table.code)]);

export const taxRuleScopes = mysqlTable("tax_rule_scopes", {
  id: uuid().primaryKey(),
  taxRuleId: uuid("taxRuleId").notNull().references(() => taxRules.id),
  activityTypeId: uuid("activityTypeId").references(() => activityTypes.id),
  sectorId: uuid("sectorId").references(() => sectors.id),
  zoneId: uuid("zoneId").references(() => zones.id),
  marketId: uuid("marketId").references(() => markets.id),
  marketLocationId: uuid("marketLocationId").references(() => marketLocations.id),
  taxpayerType: mysqlEnum("taxpayerType", ["PERSON", "COMPANY"]),
  createdAt: createdAt(),
});

export const taxExemptions = mysqlTable("tax_exemptions", {
  id: uuid().primaryKey(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  taxTypeId: uuid("taxTypeId").references(() => taxTypes.id),
  rate: decimal("rate", { precision: 7, scale: 4 }).notNull().default("1"),
  reason: text("reason").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "EXPIRED"]).notNull().default("PENDING"),
  approvedBy: int("approvedBy").references(() => users.id),
  createdAt: createdAt(),
});

export const activityTaxAssignments = mysqlTable("activity_tax_assignments", {
  id: uuid().primaryKey(),
  activityId: uuid("activityId").notNull().references(() => activities.id),
  taxRuleId: uuid("taxRuleId").notNull().references(() => taxRules.id),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [index("activity_tax_active_idx").on(table.activityId, table.isActive)]);

export const taxObligations = mysqlTable("tax_obligations", {
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
  status: mysqlEnum("status", ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "EXEMPTED"]).notNull().default("PENDING"),
  generatedAutomatically: boolean("generatedAutomatically").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  uniqueIndex("obligation_reference_unique").on(table.municipalityId, table.reference),
  index("obligation_taxpayer_status_idx").on(table.taxpayerId, table.status, table.dueDate),
]);

export const paymentMethods = mysqlTable("payment_methods", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  code: varchar("code", { length: 32 }).notNull(),
  label: varchar("label", { length: 96 }).notNull(),
  isCash: boolean("isCash").notNull().default(false),
  isActive: boolean("isActive").notNull().default(true),
  createdAt: createdAt(),
}, table => [uniqueIndex("payment_method_code_unique").on(table.municipalityId, table.code)]);

export const paymentTransactions = mysqlTable("payment_transactions", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  taxpayerId: uuid("taxpayerId").notNull().references(() => taxpayers.id),
  collectedBy: int("collectedBy").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 128 }),
  offlineOperationId: varchar("offlineOperationId", { length: 96 }).unique(),
  grossAmount: decimal("grossAmount", { precision: 14, scale: 2 }).notNull(),
  netAmount: decimal("netAmount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["PENDING_SYNC", "PENDING", "VALIDATED", "CANCELLED", "REFUNDED"]).notNull().default("PENDING"),
  collectedAt: timestamp("collectedAt").notNull(),
  validatedAt: timestamp("validatedAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [
  uniqueIndex("payment_reference_unique").on(table.municipalityId, table.reference),
  index("payment_agent_date_idx").on(table.collectedBy, table.collectedAt),
]);

export const paymentItems = mysqlTable("payment_items", {
  id: uuid().primaryKey(),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  taxObligationId: uuid("taxObligationId").notNull().references(() => taxObligations.id),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("payment_obligation_unique").on(table.paymentTransactionId, table.taxObligationId)]);

export const paymentAllocations = mysqlTable("payment_allocations", {
  id: uuid().primaryKey(),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  paymentMethodId: uuid("paymentMethodId").notNull().references(() => paymentMethods.id),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  externalReference: varchar("externalReference", { length: 160 }),
  createdAt: createdAt(),
});

export const receipts = mysqlTable("receipts", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id).unique(),
  reference: varchar("reference", { length: 64 }).notNull(),
  qrPayload: text("qrPayload").notNull(),
  integrityHash: varchar("integrityHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["PROVISIONAL", "FINAL", "CANCELLED"]).notNull().default("FINAL"),
  issuedAt: timestamp("issuedAt").notNull(),
  immutableSnapshot: json("immutableSnapshot").notNull(),
  createdAt: createdAt(),
}, table => [uniqueIndex("receipt_reference_unique").on(table.municipalityId, table.reference)]);

export const receiptPrintHistory = mysqlTable("receipt_print_history", {
  id: uuid().primaryKey(),
  receiptId: uuid("receiptId").notNull().references(() => receipts.id),
  printType: mysqlEnum("printType", ["ORIGINAL", "DUPLICATE", "REPRINT"]).notNull(),
  printedBy: int("printedBy").references(() => users.id),
  printedAt: createdAt(),
  deviceId: varchar("deviceId", { length: 128 }),
});

export const deposits = mysqlTable("deposits", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  reference: varchar("reference", { length: 64 }).notNull(),
  agentId: int("agentId").notNull().references(() => users.id),
  expectedAmount: decimal("expectedAmount", { precision: 14, scale: 2 }).notNull(),
  depositedAmount: decimal("depositedAmount", { precision: 14, scale: 2 }).notNull(),
  differenceAmount: decimal("differenceAmount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "SUBMITTED", "VALIDATED", "PARTIALLY_VALIDATED", "REJECTED"]).notNull().default("PENDING"),
  submittedAt: timestamp("submittedAt"),
  validatedAt: timestamp("validatedAt"),
  validatedBy: int("validatedBy").references(() => users.id),
  observation: text("observation"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("deposit_reference_unique").on(table.municipalityId, table.reference)]);

export const depositItems = mysqlTable("deposit_items", {
  id: uuid().primaryKey(),
  depositId: uuid("depositId").notNull().references(() => deposits.id),
  paymentTransactionId: uuid("paymentTransactionId").notNull().references(() => paymentTransactions.id),
  acceptedAmount: decimal("acceptedAmount", { precision: 14, scale: 2 }),
  status: mysqlEnum("status", ["PENDING", "ACCEPTED", "REJECTED"]).notNull().default("PENDING"),
  rejectionReason: text("rejectionReason"),
  createdAt: createdAt(),
}, table => [
  uniqueIndex("deposit_payment_unique").on(table.depositId, table.paymentTransactionId),
  uniqueIndex("deposit_item_payment_global_unique").on(table.paymentTransactionId),
]);

export const cashCounts = mysqlTable("cash_counts", {
  id: uuid().primaryKey(),
  depositId: uuid("depositId").notNull().references(() => deposits.id).unique(),
  countedAmount: decimal("countedAmount", { precision: 14, scale: 2 }).notNull(),
  denominations: json("denominations").notNull(),
  countedBy: int("countedBy").notNull().references(() => users.id),
  countedAt: createdAt(),
});

export const dailyClosings = mysqlTable("daily_closings", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  agentId: int("agentId").notNull().references(() => users.id),
  businessDate: timestamp("businessDate").notNull(),
  expectedAmount: decimal("expectedAmount", { precision: 14, scale: 2 }).notNull(),
  depositedAmount: decimal("depositedAmount", { precision: 14, scale: 2 }).notNull(),
  differenceAmount: decimal("differenceAmount", { precision: 14, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["OPEN", "SUBMITTED", "CLOSED", "REOPENED"]).notNull().default("OPEN"),
  closedBy: int("closedBy").references(() => users.id),
  closedAt: timestamp("closedAt"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("daily_closing_unique").on(table.municipalityId, table.agentId, table.businessDate)]);

export const referenceSequences = mysqlTable("reference_sequences", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  entity: varchar("entity", { length: 48 }).notNull(),
  year: int("year").notNull(),
  currentNumber: int("currentNumber").notNull().default(0),
  updatedAt: updatedAt(),
}, table => [uniqueIndex("reference_sequence_unique").on(table.municipalityId, table.entity, table.year)]);

export const auditLogs = mysqlTable("audit_logs", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  actorId: int("actorId").references(() => users.id),
  action: varchar("action", { length: 96 }).notNull(),
  module: varchar("module", { length: 64 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  beforeValue: json("beforeValue"),
  afterValue: json("afterValue"),
  deviceId: varchar("deviceId", { length: 128 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: createdAt(),
}, table => [index("audit_entity_idx").on(table.municipalityId, table.entityType, table.entityId, table.createdAt)]);

export const syncOperations = mysqlTable("sync_operations", {
  id: uuid().primaryKey(),
  municipalityId: uuid("municipalityId").notNull().references(() => municipalities.id),
  deviceId: varchar("deviceId", { length: 128 }).notNull(),
  operationId: varchar("operationId", { length: 96 }).notNull(),
  entityType: varchar("entityType", { length: 64 }).notNull(),
  entityId: varchar("entityId", { length: 64 }).notNull(),
  operation: mysqlEnum("operation", ["CREATE", "UPDATE", "CANCEL", "SUBMIT"]).notNull(),
  payloadHash: varchar("payloadHash", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["PENDING", "PROCESSING", "SYNCED", "FAILED", "CONFLICT"]).notNull().default("PENDING"),
  result: json("result"),
  createdAt: createdAt(),
  processedAt: timestamp("processedAt"),
}, table => [uniqueIndex("sync_idempotence_unique").on(table.deviceId, table.operationId)]);

export const syncConflicts = mysqlTable("sync_conflicts", {
  id: uuid().primaryKey(),
  syncOperationId: uuid("syncOperationId").notNull().references(() => syncOperations.id),
  localPayload: json("localPayload").notNull(),
  serverPayload: json("serverPayload"),
  resolution: mysqlEnum("resolution", ["PENDING", "SERVER", "LOCAL", "MANUAL"]).notNull().default("PENDING"),
  resolvedBy: int("resolvedBy").references(() => users.id),
  resolvedAt: timestamp("resolvedAt"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
