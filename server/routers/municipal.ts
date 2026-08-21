import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { createHash, randomUUID } from "crypto";
import { z } from "zod";
import {
  activities,
  activityCategories,
  activityOwnerships,
  activityTaxAssignments,
  activityTypes,
  auditLogs,
  cashCounts,
  dailyClosings,
  depositItems,
  deposits,
  marketLocations,
  markets,
  municipalities,
  paymentAllocations,
  paymentItems,
  paymentMethods,
  paymentTransactions,
  permissions,
  receiptPrintHistory,
  receipts,
  rolePermissions,
  roles,
  sectors,
  syncConflicts,
  syncOperations,
  taxObligations,
  taxCategories,
  taxExemptions,
  taxPeriodicities,
  taxRuleScopes,
  taxRules,
  taxTypes,
  taxpayers,
  taxpayerMerges,
  userRoles,
  invitationRoles,
  userInvitations,
  userTerritoryAssignments,
  users,
  zones,
} from "../../drizzle/schema";
import { archiveLocalUser, createLocalUser, createTesterAccess, requireDb, resetLocalPassword, setLocalUserActive } from "../db";
import { getActivePermissionGrants, requireAccess, requireTerritoryAccess } from "../access";
import { amountsMatch, isPaymentEligibleForDeposit, nextObligationState, receiptIntegrityHash, syncConflictResolutionPlan, syncReplayDisposition } from "../domainRules";
import { requireAdmin, requireMunicipality, requirePlatformAdmin } from "../policies";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { previewTaxAmount } from "../../shared/taxCalculation";
import { storagePut } from "../storage";

const money = z.number().finite().positive().max(1_000_000_000);
const moneyValue = (value: number) => value.toFixed(2);
const reference = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
const activityLocationTypeInput = z.enum(["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]);
export const paginatedListInput = z.object({ page: z.number().int().min(0).default(0), pageSize: z.number().int().min(5).max(100).default(25) });
export const activitySelectionInput = z.object({
  all: z.boolean().default(false),
  activityTypeIds: z.array(z.string().uuid()).max(100).default([]),
  activityLocationTypes: z.array(activityLocationTypeInput).max(5).default([]),
  activityIds: z.array(z.string().uuid()).max(500).default([]),
}).refine(value => value.all || value.activityTypeIds.length > 0 || value.activityLocationTypes.length > 0 || value.activityIds.length > 0, {
  message: "Sélectionnez toutes les activités, au moins un type d’activité, un type de localisation ou une activité recherchée.",
});

async function audit(
  db: Pick<Awaited<ReturnType<typeof requireDb>>, "insert">,
  event: { municipalityId: string; actorId: number; action: string; module: string; entityType: string; entityId: string; beforeValue?: unknown; afterValue?: unknown; deviceId?: string },
) {
  await db.insert(auditLogs).values({
    municipalityId: event.municipalityId,
    actorId: event.actorId,
    action: event.action,
    module: event.module,
    entityType: event.entityType,
    entityId: event.entityId,
    beforeValue: event.beforeValue,
    afterValue: event.afterValue,
    deviceId: event.deviceId,
  });
}

async function ensureDatabaseMaintenancePermission(db: Awaited<ReturnType<typeof requireDb>>) {
  const existing = await db.select({ id: permissions.id }).from(permissions).where(eq(permissions.code, "database.maintenance")).limit(1);
  if (!existing[0]) {
    await db.insert(permissions).values({ id: randomUUID(), code: "database.maintenance", module: "database", action: "maintenance", label: "Maintenance de la base de données" });
  }
}

function mustGet<T>(value: T | undefined, message: string): T {
  if (!value) throw new TRPCError({ code: "NOT_FOUND", message });
  return value;
}

const taxpayerInput = z.object({
  type: z.enum(["PERSON", "COMPANY"]),
  firstName: z.string().trim().max(120).optional(),
  lastName: z.string().trim().max(120).optional(),
  legalName: z.string().trim().max(220).optional(),
  nationalId: z.string().trim().max(96).optional(),
  taxId: z.string().trim().max(96).optional(),
});

const taxpayerCreateInput = taxpayerInput.extend({
  clientTaxpayerId: z.string().uuid().optional(),
  offlineOperationId: z.string().uuid().optional(),
  deviceId: z.string().trim().min(1).max(128).optional(),
});

export const deferredCreateInput = z.object({
  deviceId: z.string().trim().min(4).max(128),
  operationId: z.string().uuid(),
  entityId: z.string().uuid(),
  payloadHash: z.string().trim().min(16).max(128),
  command: z.enum(["ACTIVITY", "ACTIVITY_CATEGORY", "ACTIVITY_TYPE", "SECTOR", "ZONE", "MARKET", "MARKET_LOCATION", "TAX_CATEGORY", "TAX_TYPE", "PERIODICITY", "TAX_RULE", "ASSIGN_RULE", "GENERATE_OBLIGATIONS", "DEPOSIT_DRAFT", "CLOSING_DRAFT"]),
  payload: z.unknown(),
});

type TaxpayerIdentity = { type: "PERSON" | "COMPANY"; firstName?: string | null; lastName?: string | null; legalName?: string | null; nationalId?: string | null; taxId?: string | null };

export function offlineTaxpayerReplayDisposition(existing: (TaxpayerIdentity & { id: string; municipalityId: string }) | undefined, input: TaxpayerIdentity, municipalityId: string, clientTaxpayerId?: string) {
  if (!clientTaxpayerId) return { kind: "CREATE" as const, id: randomUUID() };
  if (!existing) return { kind: "CREATE" as const, id: clientTaxpayerId };
  const samePayload = existing.municipalityId === municipalityId
    && existing.type === input.type
    && (existing.firstName ?? undefined) === (input.firstName ?? undefined)
    && (existing.lastName ?? undefined) === (input.lastName ?? undefined)
    && (existing.legalName ?? undefined) === (input.legalName ?? undefined)
    && (existing.nationalId ?? undefined) === (input.nationalId ?? undefined)
    && (existing.taxId ?? undefined) === (input.taxId ?? undefined);
  return samePayload ? { kind: "REPLAY" as const, id: existing.id } : { kind: "CONFLICT" as const, id: existing.id };
}

export const municipalRouter = router({
  branding: publicProcedure.query(async () => {
    const db = await requireDb();
    const rows = await db.select({ name: municipalities.name, platformName: municipalities.platformName, logoUrl: municipalities.logoUrl, primaryColor: municipalities.primaryColor, appearanceMode: municipalities.appearanceMode })
      .from(municipalities).where(eq(municipalities.isActive, true)).limit(1);
    return rows[0] ?? null;
  }),
  help: router({
    permissions: protectedProcedure.query(async ({ ctx }) => getActivePermissionGrants(ctx.user)),
  }),
  databaseMaintenance: router({
    access: protectedProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      await ensureDatabaseMaintenancePermission(db);
      const municipalityId = await requireAccess(ctx.user, "database", "maintenance");
      return { municipalityId, backupMode: "SUPABASE_MANUAL", permissionCode: "database.maintenance" };
    }),
  }),
  bootstrap: protectedProcedure
    .input(z.object({ code: z.string().trim().min(2).max(32), name: z.string().trim().min(3).max(180) }))
    .mutation(async ({ ctx, input }) => {
      requirePlatformAdmin(ctx.user);
      const db = await requireDb();
      if (ctx.user.municipalityId) {
        throw new TRPCError({ code: "CONFLICT", message: "Ce compte est déjà rattaché à une mairie." });
      }
      const municipalityId = randomUUID();
      await db.insert(municipalities).values({ id: municipalityId, code: input.code.toUpperCase(), name: input.name });
      await db.update(users).set({ municipalityId }).where(eq(users.id, ctx.user.id));
      const roleId = randomUUID(); const permissionId = randomUUID();
      await db.insert(roles).values({ id: roleId, municipalityId, code: "ADMINISTRATEUR", label: "Administrateur municipal", isSystem: true });
      await db.insert(permissions).values({ id: permissionId, code: `municipality:${municipalityId}:all`, module: "*", action: "*", label: "Accès complet de l’administrateur municipal" });
      await db.insert(rolePermissions).values({ id: randomUUID(), roleId, permissionId });
      await db.insert(userRoles).values({ id: randomUUID(), userId: ctx.user.id, roleId, assignedBy: ctx.user.id });
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "administration", entityType: "municipality", entityId: municipalityId, afterValue: input });
      return { id: municipalityId, code: input.code.toUpperCase(), name: input.name };
    }),

  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const municipalityId = await requireAccess(ctx.user, "dashboard", "read");
    const db = await requireDb();
    const [taxpayerCount, obligationCount, paymentRows, depositRows, syncRows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(taxpayers).where(and(eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"))),
      db.select({ count: sql<number>`count(*)` }).from(taxObligations).where(and(eq(taxObligations.municipalityId, municipalityId), inArray(taxObligations.status, ["PENDING", "PARTIALLY_PAID", "OVERDUE"]))),
      db.select({ amount: paymentTransactions.netAmount, date: paymentTransactions.collectedAt }).from(paymentTransactions).where(and(eq(paymentTransactions.municipalityId, municipalityId), eq(paymentTransactions.status, "VALIDATED"))),
      db.select({ amount: deposits.depositedAmount, status: deposits.status }).from(deposits).where(eq(deposits.municipalityId, municipalityId)),
      db.select({ count: sql<number>`count(*)` }).from(syncOperations).where(and(eq(syncOperations.municipalityId, municipalityId), inArray(syncOperations.status, ["PENDING", "FAILED", "CONFLICT"]))),
    ]);
    const receiptsToday = paymentRows.filter(row => new Date(row.date).toDateString() === new Date().toDateString()).reduce((sum, row) => sum + Number(row.amount), 0);
    const declared = depositRows.reduce((sum, row) => sum + Number(row.amount), 0);
    return {
      taxpayers: Number(taxpayerCount[0]?.count ?? 0),
      dueObligations: Number(obligationCount[0]?.count ?? 0),
      receiptsToday,
      declared,
      pendingSync: Number(syncRows[0]?.count ?? 0),
    };
  }),

  activeMunicipality: protectedProcedure.query(async ({ ctx }) => {
    const municipalityId = requireMunicipality(ctx.user);
    const db = await requireDb();
    const municipality = await db.select({ id: municipalities.id, code: municipalities.code, name: municipalities.name, platformName: municipalities.platformName, logoUrl: municipalities.logoUrl, primaryColor: municipalities.primaryColor, appearanceMode: municipalities.appearanceMode, currency: municipalities.currency, timezone: municipalities.timezone })
      .from(municipalities)
      .where(eq(municipalities.id, municipalityId))
      .limit(1);
    return mustGet(municipality[0], "Mairie active introuvable.");
  }),

  platformSettings: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = requireMunicipality(ctx.user);
      const db = await requireDb();
      const rows = await db.select({ id: municipalities.id, code: municipalities.code, name: municipalities.name, platformName: municipalities.platformName, logoUrl: municipalities.logoUrl, primaryColor: municipalities.primaryColor, appearanceMode: municipalities.appearanceMode, currency: municipalities.currency, timezone: municipalities.timezone })
        .from(municipalities).where(eq(municipalities.id, municipalityId)).limit(1);
      return mustGet(rows[0], "Mairie active introuvable.");
    }),
    update: protectedProcedure.input(z.object({
      name: z.string().trim().min(3).max(180),
      platformName: z.string().trim().min(3).max(180),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Utilisez une couleur hexadécimale, par exemple #0F5CDB."),
      appearanceMode: z.enum(["LIGHT", "DARK", "SYSTEM"]),
    })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user);
      const municipalityId = requireMunicipality(ctx.user); const db = await requireDb();
      const before = await db.select({ name: municipalities.name, platformName: municipalities.platformName, primaryColor: municipalities.primaryColor, appearanceMode: municipalities.appearanceMode }).from(municipalities).where(eq(municipalities.id, municipalityId)).limit(1);
      await db.update(municipalities).set(input).where(eq(municipalities.id, municipalityId));
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "UPDATE", module: "platform-settings", entityType: "municipality", entityId: municipalityId, beforeValue: before[0], afterValue: input });
      return { success: true };
    }),
    uploadLogo: protectedProcedure.input(z.object({ dataUrl: z.string().max(1_500_000) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user);
      const municipalityId = requireMunicipality(ctx.user);
      const matched = input.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!matched) throw new TRPCError({ code: "BAD_REQUEST", message: "Le logo doit être une image PNG, JPEG ou WebP valide." });
      const [, contentType, encoded] = matched; const content = Buffer.from(encoded, "base64");
      if (!content.length || content.length > 1_000_000) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Le logo doit peser au maximum 1 Mo." });
      const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
      const uploaded = await storagePut(`municipalities/${municipalityId}/logo.${extension}`, content, contentType);
      const db = await requireDb(); const before = await db.select({ logoUrl: municipalities.logoUrl }).from(municipalities).where(eq(municipalities.id, municipalityId)).limit(1);
      await db.update(municipalities).set({ logoUrl: uploaded.url }).where(eq(municipalities.id, municipalityId));
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "UPDATE_LOGO", module: "platform-settings", entityType: "municipality", entityId: municipalityId, beforeValue: before[0], afterValue: { logoUrl: uploaded.url } });
      return { logoUrl: uploaded.url };
    }),
  }),

  taxpayers: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().trim().max(120).optional(), page: z.number().int().min(0).default(0), pageSize: z.number().int().min(5).max(100).default(25) }).optional())
      .query(async ({ ctx, input }) => {
        const municipalityId = await requireAccess(ctx.user, "taxpayers", "read");
        const db = await requireDb();
        const search = input?.search;
        const page = input?.page ?? 0;
        const pageSize = input?.pageSize ?? 25;
        const filters = and(
          eq(taxpayers.municipalityId, municipalityId),
          search ? or(like(taxpayers.reference, `%${search}%`), like(taxpayers.nationalId, `%${search}%`), like(taxpayers.taxId, `%${search}%`), like(taxpayers.firstName, `%${search}%`), like(taxpayers.lastName, `%${search}%`), like(taxpayers.legalName, `%${search}%`)) : undefined,
        );
        const [rows, totals] = await Promise.all([
          db.select().from(taxpayers).where(filters).orderBy(desc(taxpayers.createdAt)).limit(pageSize).offset(page * pageSize),
          db.select({ count: sql<number>`count(*)` }).from(taxpayers).where(filters),
        ]);
        return { rows, page, pageSize, total: Number(totals[0]?.count ?? 0) };
    }),
    searchForPayment: protectedProcedure.input(z.object({ query: z.string().trim().min(2).max(120) })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "payments", "create");
      const db = await requireDb();
      const query = input.query;
      return db.select({ id: taxpayers.id, reference: taxpayers.reference, firstName: taxpayers.firstName, lastName: taxpayers.lastName, legalName: taxpayers.legalName, nationalId: taxpayers.nationalId, taxId: taxpayers.taxId, status: taxpayers.status })
        .from(taxpayers)
        .where(and(eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"), or(
          like(taxpayers.reference, `%${query}%`),
          like(taxpayers.nationalId, `%${query}%`),
          like(taxpayers.taxId, `%${query}%`),
          like(taxpayers.firstName, `%${query}%`),
          like(taxpayers.lastName, `%${query}%`),
          like(taxpayers.legalName, `%${query}%`),
        ))).orderBy(desc(taxpayers.createdAt)).limit(20);
    }),
    searchForActivity: protectedProcedure.input(z.object({ query: z.string().trim().min(2).max(120) })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "create");
      const db = await requireDb();
      const query = input.query;
      return db.select({ id: taxpayers.id, reference: taxpayers.reference, firstName: taxpayers.firstName, lastName: taxpayers.lastName, legalName: taxpayers.legalName, nationalId: taxpayers.nationalId, taxId: taxpayers.taxId, status: taxpayers.status })
        .from(taxpayers)
        .where(and(eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"), or(
          like(taxpayers.reference, `%${query}%`),
          like(taxpayers.nationalId, `%${query}%`),
          like(taxpayers.taxId, `%${query}%`),
          like(taxpayers.firstName, `%${query}%`),
          like(taxpayers.lastName, `%${query}%`),
          like(taxpayers.legalName, `%${query}%`),
        ))).orderBy(desc(taxpayers.createdAt)).limit(20);
    }),
    duplicates: protectedProcedure.input(taxpayerInput).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "taxpayers", "read");
      const db = await requireDb();
      const candidates = [
        input.nationalId ? eq(taxpayers.nationalId, input.nationalId) : undefined,
        input.taxId ? eq(taxpayers.taxId, input.taxId) : undefined,
      ].filter(Boolean) as ReturnType<typeof eq>[];
      if (!candidates.length) return [];
      return db.select().from(taxpayers).where(and(eq(taxpayers.municipalityId, municipalityId), or(...candidates))).limit(10);
    }),
    create: protectedProcedure.input(taxpayerCreateInput).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "taxpayers", "create");
      const db = await requireDb();
      const { clientTaxpayerId, offlineOperationId, deviceId, ...taxpayerData } = input;
      if (Boolean(clientTaxpayerId) !== Boolean(offlineOperationId) || Boolean(clientTaxpayerId) !== Boolean(deviceId)) throw new TRPCError({ code: "BAD_REQUEST", message: "Une création hors connexion doit fournir l’identifiant local, l’opération et l’appareil." });
      const existingByClientId = clientTaxpayerId
        ? await db.select().from(taxpayers).where(and(eq(taxpayers.id, clientTaxpayerId), eq(taxpayers.municipalityId, municipalityId))).limit(1)
        : [];
      const replay = offlineTaxpayerReplayDisposition(existingByClientId[0], taxpayerData, municipalityId, clientTaxpayerId);
      if (replay.kind === "REPLAY") return { ...existingByClientId[0], idempotent: true };
      if (replay.kind === "CONFLICT") throw new TRPCError({ code: "CONFLICT", message: "Cette opération hors connexion a déjà créé un redevable différent. Vérifiez le conflit avant de relancer." });
      const identityChecks = [taxpayerData.nationalId ? eq(taxpayers.nationalId, taxpayerData.nationalId) : undefined, taxpayerData.taxId ? eq(taxpayers.taxId, taxpayerData.taxId) : undefined].filter(Boolean) as ReturnType<typeof eq>[];
      if (identityChecks.length) {
        const duplicate = await db.select({ id: taxpayers.id, reference: taxpayers.reference }).from(taxpayers).where(and(eq(taxpayers.municipalityId, municipalityId), or(...identityChecks))).limit(1);
        if (duplicate[0]) throw new TRPCError({ code: "CONFLICT", message: `Doublon détecté : ${duplicate[0].reference}. Utilisez la fusion administrative si nécessaire.` });
      }
      if (taxpayerData.type === "PERSON" && (!taxpayerData.firstName || !taxpayerData.lastName)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le nom et le prénom sont requis pour une personne physique." });
      if (taxpayerData.type === "COMPANY" && !taxpayerData.legalName) throw new TRPCError({ code: "BAD_REQUEST", message: "La raison sociale est requise pour une personne morale." });
      const id = replay.id;
      const payload = { id, municipalityId, reference: reference("RED"), ...taxpayerData, createdBy: ctx.user.id } as const;
      await db.transaction(async tx => {
        await tx.insert(taxpayers).values(payload);
        if (offlineOperationId && deviceId) {
          const payloadHash = createHash("sha256").update(JSON.stringify({ id, municipalityId, taxpayerData })).digest("hex");
          await tx.insert(syncOperations).values({ id: randomUUID(), municipalityId, deviceId, operationId: offlineOperationId, entityType: "taxpayer", entityId: id, operation: "CREATE", payloadHash, status: "SYNCED", result: { taxpayerId: id } });
        }
        await audit(tx, { municipalityId, actorId: ctx.user.id, action: offlineOperationId ? "CREATE_OFFLINE" : "CREATE", module: "taxpayers", entityType: "taxpayer", entityId: id, afterValue: payload, deviceId });
      });
      return { ...payload, idempotent: false };
    }),
    merge: protectedProcedure.input(z.object({ sourceTaxpayerId: z.string().uuid(), targetTaxpayerId: z.string().uuid(), reason: z.string().trim().min(5).max(1000) })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "taxpayers", "merge");
      if (input.sourceTaxpayerId === input.targetTaxpayerId) throw new TRPCError({ code: "BAD_REQUEST", message: "Les deux redevables doivent être distincts." });
      const db = await requireDb();
      await db.transaction(async tx => {
        const rows = await tx.select().from(taxpayers).where(and(eq(taxpayers.municipalityId, municipalityId), inArray(taxpayers.id, [input.sourceTaxpayerId, input.targetTaxpayerId])));
        const source = mustGet(rows.find(row => row.id === input.sourceTaxpayerId), "Redevable source introuvable.");
        const target = mustGet(rows.find(row => row.id === input.targetTaxpayerId), "Redevable cible introuvable.");
        if (source.status !== "ACTIVE" || target.status !== "ACTIVE") throw new TRPCError({ code: "CONFLICT", message: "La fusion exige deux redevables actifs." });
        await tx.insert(taxpayerMerges).values({ sourceTaxpayerId: source.id, targetTaxpayerId: target.id, reason: input.reason, mergedBy: ctx.user.id });
        await tx.update(activities).set({ currentTaxpayerId: target.id }).where(eq(activities.currentTaxpayerId, source.id));
        await tx.update(taxObligations).set({ taxpayerId: target.id }).where(eq(taxObligations.taxpayerId, source.id));
        await tx.update(taxpayers).set({ status: "MERGED", mergedIntoId: target.id }).where(eq(taxpayers.id, source.id));
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "MERGE", module: "taxpayers", entityType: "taxpayer", entityId: source.id, beforeValue: source, afterValue: { mergedIntoId: target.id, reason: input.reason } });
      });
      return { success: true };
    }),
  }),

  activities: router({
    list: protectedProcedure.input(z.object({ query: z.string().trim().max(160).optional(), page: z.number().int().min(0).default(0), pageSize: z.number().int().min(5).max(100).default(25) }).optional()).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "read");
      const db = await requireDb();
      const page = input?.page ?? 0;
      const pageSize = input?.pageSize ?? 25;
      const text = input?.query?.trim();
      const filters = and(eq(activities.municipalityId, municipalityId), text ? or(like(activities.reference, `%${text}%`), like(activities.label, `%${text}%`), like(taxpayers.reference, `%${text}%`), like(taxpayers.nationalId, `%${text}%`), like(taxpayers.taxId, `%${text}%`), like(taxpayers.firstName, `%${text}%`), like(taxpayers.lastName, `%${text}%`), like(taxpayers.legalName, `%${text}%`)) : undefined);
      const [rows, totals] = await Promise.all([
        db.select({ activity: activities, taxpayer: taxpayers, market: markets }).from(activities)
          .leftJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id))
          .leftJoin(markets, eq(activities.marketId, markets.id))
          .where(filters).orderBy(desc(activities.createdAt)).limit(pageSize).offset(page * pageSize),
        db.select({ count: sql<number>`count(*)` }).from(activities).leftJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id)).where(filters),
      ]);
      return { rows, page, pageSize, total: Number(totals[0]?.count ?? 0) };
    }),
    search: protectedProcedure.input(z.object({ query: z.string().trim().max(160).optional(), activityTypeId: z.string().uuid().optional(), locationType: z.enum(["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]).optional(), page: z.number().int().min(0).default(0) })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "read"); const db = await requireDb(); const text = input.query?.trim();
      const filters = [eq(activities.municipalityId, municipalityId), input.activityTypeId ? eq(activities.activityTypeId, input.activityTypeId) : undefined, input.locationType ? eq(activities.locationType, input.locationType) : undefined, text ? or(like(activities.reference, `%${text}%`), like(activities.label, `%${text}%`), like(taxpayers.reference, `%${text}%`), like(taxpayers.nationalId, `%${text}%`), like(taxpayers.taxId, `%${text}%`), like(taxpayers.firstName, `%${text}%`), like(taxpayers.lastName, `%${text}%`), like(taxpayers.legalName, `%${text}%`)) : undefined].filter(Boolean) as any[];
      const rows = await db.select({ activity: activities, taxpayer: taxpayers, type: activityTypes, market: markets }).from(activities).leftJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id)).leftJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id)).leftJoin(markets, eq(activities.marketId, markets.id)).where(and(...filters)).orderBy(desc(activities.createdAt)).limit(50).offset(input.page * 50);
      return { rows, page: input.page, hasMore: rows.length === 50 };
    }),
    selectionLots: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "read"); const db = await requireDb();
      const [typeRows, locationTypeRows] = await Promise.all([
        db.select({ id: activityTypes.id, label: activityTypes.label, count: sql<number>`count(${activities.id})` }).from(activities).innerJoin(activityTypes, eq(activities.activityTypeId, activityTypes.id)).where(and(eq(activities.municipalityId, municipalityId), eq(activities.status, "ACTIVE"))).groupBy(activityTypes.id, activityTypes.label).orderBy(activityTypes.label),
        db.select({ locationType: activities.locationType, count: sql<number>`count(${activities.id})` }).from(activities).where(and(eq(activities.municipalityId, municipalityId), eq(activities.status, "ACTIVE"))).groupBy(activities.locationType).orderBy(activities.locationType),
      ]);
      return { activityTypes: typeRows.map(row => ({ ...row, count: Number(row.count) })), locationTypes: locationTypeRows.map(row => ({ ...row, count: Number(row.count) })) };
    }),
    create: protectedProcedure.input(z.object({ taxpayerId: z.string().uuid(), activityTypeId: z.string().uuid(), label: z.string().trim().min(2).max(220), locationType: z.enum(["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]), zoneId: z.string().uuid().optional(), marketId: z.string().uuid().optional(), marketLocationId: z.string().uuid().optional(), address: z.string().trim().max(500).optional(), startedAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "create");
      if (input.marketLocationId) await requireTerritoryAccess(ctx.user, "MARKET_LOCATION", input.marketLocationId);
      else if (input.marketId) await requireTerritoryAccess(ctx.user, "MARKET", input.marketId);
      else if (input.zoneId) await requireTerritoryAccess(ctx.user, "ZONE", input.zoneId);
      const db = await requireDb();
      const taxpayer = await db.select({ id: taxpayers.id, type: taxpayers.type, nationalId: taxpayers.nationalId, taxId: taxpayers.taxId }).from(taxpayers).where(and(eq(taxpayers.id, input.taxpayerId), eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"))).limit(1);
      mustGet(taxpayer[0], "Le redevable actif est introuvable.");
      const id = randomUUID();
      const payload = { id, municipalityId, reference: reference("ACT"), currentTaxpayerId: input.taxpayerId, activityTypeId: input.activityTypeId, label: input.label, locationType: input.locationType, zoneId: input.zoneId, marketId: input.marketId, marketLocationId: input.marketLocationId, address: input.address, startedAt: input.startedAt, createdBy: ctx.user.id };
      const resolvedLocation = input.marketLocationId ? (await db.select({ marketId: marketLocations.marketId }).from(marketLocations).where(eq(marketLocations.id, input.marketLocationId)).limit(1))[0] : undefined;
      const resolvedMarketId = input.marketId ?? resolvedLocation?.marketId;
      let initialObligationCount = 0;
      await db.transaction(async tx => {
        await tx.insert(activities).values(payload);
        await tx.insert(activityOwnerships).values({ activityId: id, taxpayerId: input.taxpayerId, startDate: input.startedAt, transferredBy: ctx.user.id });
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "CREATE", module: "activities", entityType: "activity", entityId: id, afterValue: payload });
        initialObligationCount = 0;
      });
      return { ...payload, initialObligationCount };
    }),
    transfer: protectedProcedure.input(z.object({ activityId: z.string().uuid(), targetTaxpayerId: z.string().uuid(), transferredAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "activities", "update");
      const db = await requireDb();
      await db.transaction(async tx => {
        const activity = mustGet((await tx.select().from(activities).where(and(eq(activities.id, input.activityId), eq(activities.municipalityId, municipalityId))).limit(1))[0], "Activité introuvable.");
        const target = mustGet((await tx.select().from(taxpayers).where(and(eq(taxpayers.id, input.targetTaxpayerId), eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"))).limit(1))[0], "Nouveau propriétaire introuvable.");
        await tx.update(activityOwnerships).set({ endDate: input.transferredAt }).where(and(eq(activityOwnerships.activityId, activity.id), sql`${activityOwnerships.endDate} IS NULL`));
        await tx.insert(activityOwnerships).values({ activityId: activity.id, taxpayerId: target.id, startDate: input.transferredAt, transferredBy: ctx.user.id });
        await tx.update(activities).set({ currentTaxpayerId: target.id }).where(eq(activities.id, activity.id));
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "TRANSFER", module: "activities", entityType: "activity", entityId: activity.id, beforeValue: { taxpayerId: activity.currentTaxpayerId }, afterValue: { taxpayerId: target.id } });
      });
      return { success: true };
    }),
  }),

  territory: router({
    tree: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "territory", "read");
      const db = await requireDb();
      const [sectorRows, zoneRows, marketRows, locationRows] = await Promise.all([
        db.select().from(sectors).where(eq(sectors.municipalityId, municipalityId)),
        db.select({ zone: zones }).from(zones).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(sectors.municipalityId, municipalityId)),
        db.select({ market: markets }).from(markets).innerJoin(zones, eq(markets.zoneId, zones.id)).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(sectors.municipalityId, municipalityId)),
        db.select({ location: marketLocations }).from(marketLocations).innerJoin(markets, eq(marketLocations.marketId, markets.id)).innerJoin(zones, eq(markets.zoneId, zones.id)).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(sectors.municipalityId, municipalityId)),
      ]);
      return { sectors: sectorRows, zones: zoneRows.map(row => row.zone), markets: marketRows.map(row => row.market), locations: locationRows.map(row => row.location) };
    }),
    createSector: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "territory", "manage"); const db = await requireDb(); const id = randomUUID();
      await db.insert(sectors).values({ id, municipalityId, code: input.code.toUpperCase(), name: input.name });
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "territory", entityType: "sector", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createZone: protectedProcedure.input(z.object({ sectorId: z.string().uuid(), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "territory", "manage"); const db = await requireDb();
      mustGet((await db.select({ id: sectors.id }).from(sectors).where(and(eq(sectors.id, input.sectorId), eq(sectors.municipalityId, municipalityId))).limit(1))[0], "Secteur introuvable.");
      const id = randomUUID(); await db.insert(zones).values({ id, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "territory", entityType: "zone", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createMarket: protectedProcedure.input(z.object({ zoneId: z.string().uuid(), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(160), address: z.string().trim().max(500).optional() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "territory", "manage"); const db = await requireDb();
      const zone = mustGet((await db.select({ municipalityId: sectors.municipalityId }).from(zones).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(zones.id, input.zoneId)).limit(1))[0], "Zone introuvable."); if (zone.municipalityId !== municipalityId) throw new TRPCError({ code: "FORBIDDEN", message: "La zone ne relève pas de votre mairie." });
      const id = randomUUID(); await db.insert(markets).values({ id, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "territory", entityType: "market", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createLocation: protectedProcedure.input(z.object({ marketId: z.string().uuid(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "territory", "manage"); const db = await requireDb();
      const market = mustGet((await db.select({ municipalityId: sectors.municipalityId }).from(markets).innerJoin(zones, eq(markets.zoneId, zones.id)).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(markets.id, input.marketId)).limit(1))[0], "Marché introuvable."); if (market.municipalityId !== municipalityId) throw new TRPCError({ code: "FORBIDDEN", message: "Le marché ne relève pas de votre mairie." });
      const id = randomUUID(); await db.insert(marketLocations).values({ id, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "territory", entityType: "market_location", entityId: id, afterValue: input }); return { id, ...input };
    }),
  }),

  catalog: router({
    options: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "administration", "read"); const db = await requireDb();
      const [activityCategoryRows, activityTypeRows, taxCategoryRows, taxTypeRows, periodicityRows, paymentMethodRows] = await Promise.all([
        db.select().from(activityCategories).where(eq(activityCategories.municipalityId, municipalityId)),
        db.select({ type: activityTypes, category: activityCategories }).from(activityTypes).innerJoin(activityCategories, eq(activityTypes.categoryId, activityCategories.id)).where(eq(activityCategories.municipalityId, municipalityId)),
        db.select().from(taxCategories).where(eq(taxCategories.municipalityId, municipalityId)),
        db.select().from(taxTypes).where(eq(taxTypes.municipalityId, municipalityId)),
        db.select().from(taxPeriodicities).where(or(eq(taxPeriodicities.municipalityId, municipalityId), isNull(taxPeriodicities.municipalityId))),
        db.select().from(paymentMethods).where(eq(paymentMethods.municipalityId, municipalityId)),
      ]);
      return { activityCategories: activityCategoryRows, activityTypes: activityTypeRows, taxCategories: taxCategoryRows, taxTypes: taxTypeRows, periodicities: periodicityRows, paymentMethods: paymentMethodRows };
    }),
    createActivityCategory: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID();
      await db.insert(activityCategories).values({ id, municipalityId, code: input.code.toUpperCase(), label: input.label }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "activity_category", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createActivityType: protectedProcedure.input(z.object({ categoryId: z.string().uuid(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb();
      mustGet((await db.select({ id: activityCategories.id }).from(activityCategories).where(and(eq(activityCategories.id, input.categoryId), eq(activityCategories.municipalityId, municipalityId))).limit(1))[0], "Catégorie d’activité introuvable.");
      const id = randomUUID(); await db.insert(activityTypes).values({ id, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "activity_type", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createTaxCategory: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID();
      await db.insert(taxCategories).values({ id, municipalityId, code: input.code.toUpperCase(), label: input.label }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "tax_category", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createTaxType: protectedProcedure.input(z.object({ categoryId: z.string().uuid().optional(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(180) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb();
      if (input.categoryId) mustGet((await db.select({ id: taxCategories.id }).from(taxCategories).where(and(eq(taxCategories.id, input.categoryId), eq(taxCategories.municipalityId, municipalityId))).limit(1))[0], "Catégorie de taxe introuvable.");
      const id = randomUUID(); await db.insert(taxTypes).values({ id, municipalityId, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "tax_type", entityId: id, afterValue: input }); return { id, ...input };
    }),
    setTaxTypeActive: protectedProcedure.input(z.object({ taxTypeId: z.string().uuid(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb();
      const taxType = mustGet((await db.select().from(taxTypes).where(and(eq(taxTypes.id, input.taxTypeId), eq(taxTypes.municipalityId, municipalityId))).limit(1))[0], "Type de taxe introuvable.");
      await db.update(taxTypes).set({ isActive: input.isActive }).where(eq(taxTypes.id, taxType.id));
      await audit(db, { municipalityId, actorId: ctx.user.id, action: input.isActive ? "ACTIVATE" : "DEACTIVATE", module: "catalog", entityType: "tax_type", entityId: taxType.id, beforeValue: taxType, afterValue: { isActive: input.isActive } });
      return { id: taxType.id, isActive: input.isActive };
    }),
    createPeriodicity: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(120), calendarUnit: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR", "CUSTOM"]), intervalCount: z.number().int().min(1).max(365).default(1) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID();
      await db.insert(taxPeriodicities).values({ id, municipalityId, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "tax_periodicity", entityId: id, afterValue: input }); return { id, ...input };
    }),
    createPaymentMethod: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(32), label: z.string().trim().min(2).max(96), isCash: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID();
      await db.insert(paymentMethods).values({ id, municipalityId, ...input, code: input.code.toUpperCase() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "catalog", entityType: "payment_method", entityId: id, afterValue: input }); return { id, ...input };
    }),
  }),

  taxation: router({
    rules: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb();
      return db.select({ rule: taxRules, taxType: taxTypes, periodicity: taxPeriodicities }).from(taxRules)
        .innerJoin(taxTypes, eq(taxRules.taxTypeId, taxTypes.id)).innerJoin(taxPeriodicities, eq(taxRules.periodicityId, taxPeriodicities.id))
        .where(eq(taxRules.municipalityId, municipalityId)).orderBy(desc(taxRules.createdAt));
    }),
    obligations: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "read"); const db = await requireDb();
      return db.select({ obligation: taxObligations, taxpayer: taxpayers, activity: activities }).from(taxObligations)
        .leftJoin(taxpayers, eq(taxObligations.taxpayerId, taxpayers.id)).leftJoin(activities, eq(taxObligations.activityId, activities.id))
        .where(eq(taxObligations.municipalityId, municipalityId)).orderBy(desc(taxObligations.dueDate)).limit(200);
    }),
    obligationsPage: protectedProcedure.input(z.object({ page: z.number().int().min(0).default(0), pageSize: z.number().int().min(5).max(100).default(10), search: z.string().trim().max(160).optional(), status: z.string().trim().max(48).optional() })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "read"); const db = await requireDb();
      const text = input.search?.trim();
      const filters = and(eq(taxObligations.municipalityId, municipalityId), input.status ? eq(taxObligations.status, input.status as typeof taxObligations.$inferSelect.status) : undefined, text ? or(like(taxObligations.reference, `%${text}%`), like(taxpayers.reference, `%${text}%`), like(taxpayers.nationalId, `%${text}%`), like(taxpayers.taxId, `%${text}%`), like(taxpayers.firstName, `%${text}%`), like(taxpayers.lastName, `%${text}%`), like(taxpayers.legalName, `%${text}%`), like(activities.label, `%${text}%`)) : undefined);
      const [rows, totals] = await Promise.all([
        db.select({ obligation: taxObligations, taxpayer: taxpayers, activity: activities }).from(taxObligations)
          .leftJoin(taxpayers, eq(taxObligations.taxpayerId, taxpayers.id)).leftJoin(activities, eq(taxObligations.activityId, activities.id))
          .where(filters).orderBy(desc(taxObligations.dueDate)).limit(input.pageSize).offset(input.page * input.pageSize),
        db.select({ count: sql<number>`count(*)` }).from(taxObligations).leftJoin(taxpayers, eq(taxObligations.taxpayerId, taxpayers.id)).leftJoin(activities, eq(taxObligations.activityId, activities.id)).where(filters),
      ]);
      return { rows, page: input.page, pageSize: input.pageSize, total: Number(totals[0]?.count ?? 0) };
    }),
    createObligation: protectedProcedure.input(z.object({ taxpayerId: z.string().uuid(), activityId: z.string().uuid(), taxTypeId: z.string().uuid(), taxRuleId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), dueDate: z.coerce.date(), expectedAmount: money })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "create"); const db = await requireDb(); const id = randomUUID();
      const payload = { id, municipalityId, reference: reference("OBL"), ...input, expectedAmount: moneyValue(input.expectedAmount), remainingAmount: moneyValue(input.expectedAmount) };
      await db.insert(taxObligations).values(payload); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "obligations", entityType: "obligation", entityId: id, afterValue: payload }); return payload;
    }),
    createRule: protectedProcedure.input(z.object({ taxTypeId: z.string().uuid(), periodicityId: z.string().uuid(), code: z.string().trim().min(2).max(64), label: z.string().trim().min(2).max(180), baseAmount: money, graceDays: z.number().int().min(0).max(365).default(0), penaltyRate: z.number().min(0).max(1).default(0), validFrom: z.coerce.date(), validTo: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb();
      mustGet((await db.select({ id: taxTypes.id }).from(taxTypes).where(and(eq(taxTypes.id, input.taxTypeId), eq(taxTypes.municipalityId, municipalityId))).limit(1))[0], "Type de taxe introuvable.");
      mustGet((await db.select({ id: taxPeriodicities.id }).from(taxPeriodicities).where(and(eq(taxPeriodicities.id, input.periodicityId), or(eq(taxPeriodicities.municipalityId, municipalityId), isNull(taxPeriodicities.municipalityId)))).limit(1))[0], "Périodicité introuvable.");
      const id = randomUUID(); await db.insert(taxRules).values({ id, municipalityId, ...input, code: input.code.toUpperCase(), baseAmount: moneyValue(input.baseAmount), penaltyRate: moneyValue(input.penaltyRate), createdBy: ctx.user.id });
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "fiscality", entityType: "tax_rule", entityId: id, afterValue: input }); return { id, ...input };
    }),
    setRuleActive: protectedProcedure.input(z.object({ taxRuleId: z.string().uuid(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb();
      const rule = mustGet((await db.select().from(taxRules).where(and(eq(taxRules.id, input.taxRuleId), eq(taxRules.municipalityId, municipalityId))).limit(1))[0], "Règle fiscale introuvable.");
      await db.update(taxRules).set({ isActive: input.isActive }).where(eq(taxRules.id, rule.id));
      await audit(db, { municipalityId, actorId: ctx.user.id, action: input.isActive ? "ACTIVATE" : "DEACTIVATE", module: "fiscality", entityType: "tax_rule", entityId: rule.id, beforeValue: rule, afterValue: { isActive: input.isActive } });
      return { id: rule.id, isActive: input.isActive };
    }),
    assignRuleToActivity: protectedProcedure.input(z.object({ activityId: z.string().uuid(), taxRuleId: z.string().uuid(), startDate: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb();
      mustGet((await db.select({ id: activities.id }).from(activities).where(and(eq(activities.id, input.activityId), eq(activities.municipalityId, municipalityId))).limit(1))[0], "Activité introuvable."); mustGet((await db.select({ id: taxRules.id }).from(taxRules).where(and(eq(taxRules.id, input.taxRuleId), eq(taxRules.municipalityId, municipalityId))).limit(1))[0], "Règle fiscale introuvable.");
      const id = randomUUID(); await db.insert(activityTaxAssignments).values({ id, ...input }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "ASSIGN", module: "fiscality", entityType: "activity_tax_assignment", entityId: id, afterValue: input }); return { id, ...input };
    }),
    assignRuleToSelection: protectedProcedure.input(z.object({ taxRuleId: z.string().uuid(), startDate: z.coerce.date(), selection: activitySelectionInput, offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(500).default(200) })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb();
      const rule = mustGet((await db.select({ id: taxRules.id, label: taxRules.label }).from(taxRules).where(and(eq(taxRules.id, input.taxRuleId), eq(taxRules.municipalityId, municipalityId), eq(taxRules.isActive, true))).limit(1))[0], "Règle fiscale active introuvable.");
      const choices = [input.selection.activityTypeIds.length ? inArray(activities.activityTypeId, input.selection.activityTypeIds) : undefined, input.selection.activityLocationTypes.length ? inArray(activities.locationType, input.selection.activityLocationTypes) : undefined, input.selection.activityIds.length ? inArray(activities.id, input.selection.activityIds) : undefined].filter(Boolean) as any[];
      const targets = await db.select({ id: activities.id }).from(activities).where(and(eq(activities.municipalityId, municipalityId), eq(activities.status, "ACTIVE"), input.selection.all ? undefined : or(...choices))).orderBy(activities.id).limit(input.limit).offset(input.offset);
      let assignedCount = 0;
      for (const target of targets) {
        const existing = await db.select({ id: activityTaxAssignments.id }).from(activityTaxAssignments).where(and(eq(activityTaxAssignments.activityId, target.id), eq(activityTaxAssignments.taxRuleId, rule.id), eq(activityTaxAssignments.isActive, true))).limit(1);
        if (existing[0]) continue;
        await db.insert(activityTaxAssignments).values({ id: randomUUID(), activityId: target.id, taxRuleId: rule.id, startDate: input.startDate }); assignedCount += 1;
      }
      const nextOffset = targets.length === input.limit ? input.offset + input.limit : undefined;
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "ASSIGN_GROUP", module: "fiscality", entityType: "activity_tax_assignment_batch", entityId: rule.id, afterValue: { selection: input.selection, startDate: input.startDate, targetCount: targets.length, assignedCount, offset: input.offset, nextOffset } });
      return { ruleLabel: rule.label, targetCount: targets.length, assignedCount, nextOffset };
    }),
    createExemption: protectedProcedure.input(z.object({ taxpayerId: z.string().uuid(), taxTypeId: z.string().uuid().optional(), rate: z.number().min(0).max(1).default(1), reason: z.string().trim().min(5).max(1000), startDate: z.coerce.date(), endDate: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "fiscality", "manage"); const db = await requireDb(); mustGet((await db.select({ id: taxpayers.id }).from(taxpayers).where(and(eq(taxpayers.id, input.taxpayerId), eq(taxpayers.municipalityId, municipalityId))).limit(1))[0], "Redevable introuvable.");
      const id = randomUUID(); await db.insert(taxExemptions).values({ id, ...input, rate: moneyValue(input.rate), status: "PENDING" }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "fiscality", entityType: "tax_exemption", entityId: id, afterValue: input }); return { id, ...input };
    }),
    approveExemption: protectedProcedure.input(z.object({ exemptionId: z.string().uuid(), approved: z.boolean() })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "fiscality", "approve"); const db = await requireDb(); const exemption = mustGet((await db.select({ exemption: taxExemptions, municipalityId: taxpayers.municipalityId }).from(taxExemptions).innerJoin(taxpayers, eq(taxExemptions.taxpayerId, taxpayers.id)).where(eq(taxExemptions.id, input.exemptionId)).limit(1))[0], "Exonération introuvable."); if (exemption.municipalityId !== municipalityId) throw new TRPCError({ code: "FORBIDDEN", message: "Exonération hors périmètre." });
      await db.update(taxExemptions).set({ status: input.approved ? "APPROVED" : "REJECTED", approvedBy: ctx.user.id }).where(eq(taxExemptions.id, input.exemptionId)); await audit(db, { municipalityId, actorId: ctx.user.id, action: input.approved ? "APPROVE" : "REJECT", module: "fiscality", entityType: "tax_exemption", entityId: input.exemptionId, afterValue: input }); return { success: true };
    }),
    generateForActivity: protectedProcedure.input(z.object({ activityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), dueDate: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "generate"); const db = await requireDb(); const activity = mustGet((await db.select().from(activities).where(and(eq(activities.id, input.activityId), eq(activities.municipalityId, municipalityId))).limit(1))[0], "Activité introuvable."); if (!activity.currentTaxpayerId) throw new TRPCError({ code: "CONFLICT", message: "L’activité n’a pas de redevable actif." });
      const assignments = await db.select({ assignment: activityTaxAssignments, rule: taxRules }).from(activityTaxAssignments).innerJoin(taxRules, eq(activityTaxAssignments.taxRuleId, taxRules.id)).where(and(eq(activityTaxAssignments.activityId, activity.id), eq(activityTaxAssignments.isActive, true), eq(taxRules.isActive, true)));
      const created: string[] = []; for (const { assignment, rule } of assignments) { const existing = await db.select({ id: taxObligations.id }).from(taxObligations).where(and(eq(taxObligations.activityId, activity.id), eq(taxObligations.taxRuleId, assignment.taxRuleId), eq(taxObligations.periodStart, input.periodStart), eq(taxObligations.periodEnd, input.periodEnd))).limit(1); if (existing[0]) continue; const exemption = (await db.select().from(taxExemptions).where(and(eq(taxExemptions.taxpayerId, activity.currentTaxpayerId), or(isNull(taxExemptions.taxTypeId), eq(taxExemptions.taxTypeId, rule.taxTypeId)), eq(taxExemptions.status, "APPROVED"), lte(taxExemptions.startDate, input.periodEnd), or(isNull(taxExemptions.endDate), gte(taxExemptions.endDate, input.periodStart)))).limit(1))[0]; const amount = previewTaxAmount({ baseAmount: Number(rule.baseAmount), exemptionRate: Number(exemption?.rate ?? 0) }); if (amount.baseAmount <= 0) throw new TRPCError({ code: "CONFLICT", message: `La règle ${rule.label} ne possède pas de montant tarifaire positif.` }); const id = randomUUID(); const remaining = amount.totalAmount; await db.insert(taxObligations).values({ id, municipalityId, reference: reference("OBL"), taxpayerId: activity.currentTaxpayerId, activityId: activity.id, taxTypeId: rule.taxTypeId, taxRuleId: rule.id, periodStart: input.periodStart, periodEnd: input.periodEnd, dueDate: input.dueDate, expectedAmount: moneyValue(amount.baseAmount), discountAmount: moneyValue(amount.exemptionAmount), remainingAmount: moneyValue(remaining), status: remaining === 0 ? "EXEMPTED" : "PENDING" }); created.push(id); }
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "GENERATE", module: "obligations", entityType: "tax_obligation_batch", entityId: activity.id, afterValue: { ...input, created } }); return { createdCount: created.length, created };
    }),
    generateForSelection: protectedProcedure.input(z.object({ taxRuleId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), dueDate: z.coerce.date(), selection: activitySelectionInput, offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(500).default(200) })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "generate"); const db = await requireDb();
      const rule = mustGet((await db.select().from(taxRules).where(and(eq(taxRules.id, input.taxRuleId), eq(taxRules.municipalityId, municipalityId), eq(taxRules.isActive, true))).limit(1))[0], "Règle fiscale active introuvable.");
      if (Number(rule.baseAmount) <= 0) throw new TRPCError({ code: "CONFLICT", message: `La règle ${rule.label} ne possède pas de montant tarifaire positif.` });
      const choices = [input.selection.activityTypeIds.length ? inArray(activities.activityTypeId, input.selection.activityTypeIds) : undefined, input.selection.activityLocationTypes.length ? inArray(activities.locationType, input.selection.activityLocationTypes) : undefined, input.selection.activityIds.length ? inArray(activities.id, input.selection.activityIds) : undefined].filter(Boolean) as any[];
      const targets = await db.select({ activity: activities, taxpayer: taxpayers }).from(activities).innerJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id)).where(and(eq(activities.municipalityId, municipalityId), eq(activities.status, "ACTIVE"), input.selection.all ? undefined : or(...choices))).orderBy(activities.id).limit(input.limit).offset(input.offset);
      const created: string[] = []; let notAssignedCount = 0;
      for (const { activity, taxpayer } of targets) {
        const assignment = await db.select({ id: activityTaxAssignments.id }).from(activityTaxAssignments).where(and(eq(activityTaxAssignments.activityId, activity.id), eq(activityTaxAssignments.taxRuleId, rule.id), eq(activityTaxAssignments.isActive, true))).limit(1);
        if (!assignment[0]) { notAssignedCount += 1; continue; }
        const existing = await db.select({ id: taxObligations.id }).from(taxObligations).where(and(eq(taxObligations.activityId, activity.id), eq(taxObligations.taxRuleId, rule.id), eq(taxObligations.periodStart, input.periodStart), eq(taxObligations.periodEnd, input.periodEnd))).limit(1);
        if (existing[0]) continue;
        const exemption = (await db.select().from(taxExemptions).where(and(eq(taxExemptions.taxpayerId, taxpayer.id), or(isNull(taxExemptions.taxTypeId), eq(taxExemptions.taxTypeId, rule.taxTypeId)), eq(taxExemptions.status, "APPROVED"), lte(taxExemptions.startDate, input.periodEnd), or(isNull(taxExemptions.endDate), gte(taxExemptions.endDate, input.periodStart)))).limit(1))[0];
        const amount = previewTaxAmount({ baseAmount: Number(rule.baseAmount), exemptionRate: Number(exemption?.rate ?? 0) }); const id = randomUUID();
        await db.insert(taxObligations).values({ id, municipalityId, reference: reference("OBL"), taxpayerId: taxpayer.id, activityId: activity.id, taxTypeId: rule.taxTypeId, taxRuleId: rule.id, periodStart: input.periodStart, periodEnd: input.periodEnd, dueDate: input.dueDate, expectedAmount: moneyValue(amount.baseAmount), discountAmount: moneyValue(amount.exemptionAmount), remainingAmount: moneyValue(amount.totalAmount), status: amount.totalAmount === 0 ? "EXEMPTED" : "PENDING" }); created.push(id);
      }
      const nextOffset = targets.length === input.limit ? input.offset + input.limit : undefined;
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "GENERATE_SELECTION", module: "obligations", entityType: "tax_obligation_selection_batch", entityId: rule.id, afterValue: { selection: input.selection, targetCount: targets.length, notAssignedCount, created, offset: input.offset, nextOffset } });
      return { targetCount: targets.length, createdCount: created.length, notAssignedCount, created, nextOffset };
    }),
    generateForRuleGroup: protectedProcedure.input(z.object({ taxRuleId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), dueDate: z.coerce.date(), offset: z.number().int().min(0).default(0), limit: z.number().int().min(1).max(500).default(200) })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "obligations", "generate"); const db = await requireDb();
      const rule = mustGet((await db.select().from(taxRules).where(and(eq(taxRules.id, input.taxRuleId), eq(taxRules.municipalityId, municipalityId), eq(taxRules.isActive, true))).limit(1))[0], "Règle fiscale active introuvable.");
      const scopeRows = await db.select().from(taxRuleScopes).where(eq(taxRuleScopes.taxRuleId, rule.id));
      const scopes = scopeRows.length ? scopeRows : [undefined];
      const targetIds = new Set<string>();
      for (const scope of scopes) {
        const rows = await db.select({ activity: activities, taxpayer: taxpayers }).from(activities).innerJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id)).where(and(
          eq(activities.municipalityId, municipalityId), eq(activities.status, "ACTIVE"),
          scope?.activityTypeId ? eq(activities.activityTypeId, scope.activityTypeId) : undefined,
          scope?.activityLabelQuery ? sql`lower(${activities.label}) like ${`%${scope.activityLabelQuery.toLowerCase()}%`}` : undefined,
          scope?.zoneId ? eq(activities.zoneId, scope.zoneId) : undefined,
          scope?.marketId ? eq(activities.marketId, scope.marketId) : undefined,
          scope?.marketLocationId ? eq(activities.marketLocationId, scope.marketLocationId) : undefined,
          scope?.taxpayerType ? eq(taxpayers.type, scope.taxpayerType) : undefined,
          scope?.taxpayerNationalId ? eq(taxpayers.nationalId, scope.taxpayerNationalId) : undefined,
          scope?.taxpayerFiscalId ? eq(taxpayers.taxId, scope.taxpayerFiscalId) : undefined,
        )).orderBy(activities.id).limit(input.limit).offset(input.offset);
        rows.forEach(row => targetIds.add(row.activity.id));
      }
      const targets = await Promise.all(Array.from(targetIds).map(async activityId => mustGet((await db.select({ activity: activities, taxpayer: taxpayers }).from(activities).innerJoin(taxpayers, eq(activities.currentTaxpayerId, taxpayers.id)).where(eq(activities.id, activityId)).limit(1))[0], "Activité de groupe introuvable.")));
      const created: string[] = [];
      for (const { activity, taxpayer } of targets) {
        const existing = await db.select({ id: taxObligations.id }).from(taxObligations).where(and(eq(taxObligations.activityId, activity.id), eq(taxObligations.taxRuleId, rule.id), eq(taxObligations.periodStart, input.periodStart), eq(taxObligations.periodEnd, input.periodEnd))).limit(1); if (existing[0]) continue;
        const exemption = (await db.select().from(taxExemptions).where(and(eq(taxExemptions.taxpayerId, taxpayer.id), or(isNull(taxExemptions.taxTypeId), eq(taxExemptions.taxTypeId, rule.taxTypeId)), eq(taxExemptions.status, "APPROVED"), lte(taxExemptions.startDate, input.periodEnd), or(isNull(taxExemptions.endDate), gte(taxExemptions.endDate, input.periodStart)))).limit(1))[0];
        const amount = previewTaxAmount({ baseAmount: Number(rule.baseAmount), exemptionRate: Number(exemption?.rate ?? 0) }); if (amount.baseAmount <= 0) throw new TRPCError({ code: "CONFLICT", message: `La règle ${rule.label} ne possède pas de montant tarifaire positif.` }); const id = randomUUID();
        await db.insert(taxObligations).values({ id, municipalityId, reference: reference("OBL"), taxpayerId: taxpayer.id, activityId: activity.id, taxTypeId: rule.taxTypeId, taxRuleId: rule.id, periodStart: input.periodStart, periodEnd: input.periodEnd, dueDate: input.dueDate, expectedAmount: moneyValue(amount.baseAmount), discountAmount: moneyValue(amount.exemptionAmount), remainingAmount: moneyValue(amount.totalAmount), status: amount.totalAmount === 0 ? "EXEMPTED" : "PENDING" }); created.push(id);
      }
      const reachedLimit = targetIds.size >= input.limit;
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "GENERATE_GROUP", module: "obligations", entityType: "tax_obligation_group_batch", entityId: rule.id, afterValue: { ...input, targetCount: targetIds.size, created } });
      return { targetCount: targetIds.size, createdCount: created.length, created, nextOffset: reachedLimit ? input.offset + input.limit : undefined };
    }),
    applyAdjustment: protectedProcedure.input(z.object({ obligationId: z.string().uuid(), adjustmentAmount: z.number().finite(), discountAmount: z.number().finite().min(0).optional(), reason: z.string().trim().min(5).max(1000) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "obligations", "adjust"); const db = await requireDb();
      const obligation = mustGet((await db.select().from(taxObligations).where(and(eq(taxObligations.id, input.obligationId), eq(taxObligations.municipalityId, municipalityId))).limit(1))[0], "Obligation introuvable.");
      if (obligation.status === "PAID" || obligation.status === "CANCELLED") throw new TRPCError({ code: "CONFLICT", message: "Cette obligation ne peut plus être ajustée." });
      const nextAdjustment = Number(obligation.adjustmentAmount) + input.adjustmentAmount; const nextDiscount = Number(obligation.discountAmount) + (input.discountAmount ?? 0);
      const due = Math.max(0, Number(obligation.expectedAmount) + Number(obligation.penaltyAmount) + nextAdjustment - nextDiscount);
      const paid = Number(obligation.expectedAmount) + Number(obligation.penaltyAmount) + Number(obligation.adjustmentAmount) - Number(obligation.discountAmount) - Number(obligation.remainingAmount);
      const remaining = Math.max(0, due - paid);
      await db.update(taxObligations).set({ adjustmentAmount: moneyValue(nextAdjustment), discountAmount: moneyValue(nextDiscount), remainingAmount: moneyValue(remaining), status: remaining === 0 ? "PAID" : paid > 0 ? "PARTIALLY_PAID" : "PENDING" }).where(eq(taxObligations.id, obligation.id));
      await audit(db, { municipalityId, actorId: ctx.user.id, action: "ADJUST", module: "obligations", entityType: "obligation", entityId: obligation.id, beforeValue: obligation, afterValue: { adjustmentAmount: nextAdjustment, discountAmount: nextDiscount, reason: input.reason } }); return { success: true };
    }),
  }),

  payments: router({
    methods: protectedProcedure.query(async ({ ctx }) => { const municipalityId = await requireAccess(ctx.user, "payments", "read"); const db = await requireDb(); return db.select().from(paymentMethods).where(and(eq(paymentMethods.municipalityId, municipalityId), eq(paymentMethods.isActive, true))); }),
    list: protectedProcedure.query(async ({ ctx }) => { const municipalityId = await requireAccess(ctx.user, "payments", "read"); const db = await requireDb(); return db.select({ payment: paymentTransactions, taxpayer: taxpayers, receipt: receipts }).from(paymentTransactions).leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id)).leftJoin(receipts, eq(receipts.paymentTransactionId, paymentTransactions.id)).where(eq(paymentTransactions.municipalityId, municipalityId)).orderBy(desc(paymentTransactions.collectedAt)).limit(100); }),
    listPage: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional() })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "payments", "read"); const db = await requireDb(); const text = input.search ? `%${input.search.toLowerCase()}%` : undefined;
      const conditions = and(eq(paymentTransactions.municipalityId, municipalityId), text ? or(sql`lower(${paymentTransactions.reference}) like ${text}`, sql`lower(coalesce(${taxpayers.firstName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.lastName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.legalName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.nationalId}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.taxId}, '')) like ${text}`) : undefined);
      const rows = await db.select({ payment: paymentTransactions, taxpayer: taxpayers, receipt: receipts }).from(paymentTransactions).leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id)).leftJoin(receipts, eq(receipts.paymentTransactionId, paymentTransactions.id)).where(conditions).orderBy(desc(paymentTransactions.collectedAt)).limit(input.pageSize).offset(input.page * input.pageSize);
      const total = await db.select({ count: sql<number>`count(*)` }).from(paymentTransactions).leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id)).where(conditions);
      return { rows, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),
    collect: protectedProcedure.input(z.object({ taxpayerId: z.string().uuid(), items: z.array(z.object({ obligationId: z.string().uuid(), amount: money })).min(1), allocations: z.array(z.object({ paymentMethodId: z.string().uuid(), amount: money, externalReference: z.string().trim().max(160).optional() })).min(1), collectedAt: z.coerce.date(), deviceId: z.string().trim().max(128).optional(), offlineOperationId: z.string().trim().max(96).optional() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "payments", "create"); const db = await requireDb();
      const itemTotal = input.items.reduce((sum, item) => sum + item.amount, 0); const allocationTotal = input.allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
      if (!amountsMatch(itemTotal, allocationTotal)) throw new TRPCError({ code: "BAD_REQUEST", message: "Le total des allocations de paiement doit égaler le total affecté aux obligations." });
      if (input.offlineOperationId) { const existing = await db.select().from(paymentTransactions).where(eq(paymentTransactions.offlineOperationId, input.offlineOperationId)).limit(1); if (existing[0]) return { id: existing[0].id, reference: existing[0].reference, idempotent: true }; }
      const id = randomUUID(); const paymentReference = reference("PAY"); const receiptReference = reference("REC"); const receiptId = randomUUID();
      await db.transaction(async tx => {
        const obligations = await tx.select().from(taxObligations).where(and(eq(taxObligations.municipalityId, municipalityId), eq(taxObligations.taxpayerId, input.taxpayerId), inArray(taxObligations.id, input.items.map(item => item.obligationId))));
        if (obligations.length !== input.items.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Une obligation est inconnue ou n’appartient pas au redevable sélectionné." });
        for (const item of input.items) { const obligation = mustGet(obligations.find(row => row.id === item.obligationId), "Obligation introuvable."); if (Number(obligation.remainingAmount) + 0.004 < item.amount) throw new TRPCError({ code: "BAD_REQUEST", message: `Le montant dépasse le restant dû pour ${obligation.reference}.` }); }
        await tx.insert(paymentTransactions).values({ id, municipalityId, reference: paymentReference, taxpayerId: input.taxpayerId, collectedBy: ctx.user.id, deviceId: input.deviceId, offlineOperationId: input.offlineOperationId, grossAmount: moneyValue(itemTotal), netAmount: moneyValue(itemTotal), status: "VALIDATED", collectedAt: input.collectedAt, validatedAt: new Date() });
        await tx.insert(paymentItems).values(input.items.map(item => ({ paymentTransactionId: id, taxObligationId: item.obligationId, amount: moneyValue(item.amount) })));
        await tx.insert(paymentAllocations).values(input.allocations.map(allocation => ({ paymentTransactionId: id, paymentMethodId: allocation.paymentMethodId, amount: moneyValue(allocation.amount), externalReference: allocation.externalReference })));
        for (const item of input.items) { const obligation = mustGet(obligations.find(row => row.id === item.obligationId), "Obligation introuvable."); const next = nextObligationState(Number(obligation.remainingAmount), item.amount); await tx.update(taxObligations).set({ remainingAmount: moneyValue(next.remaining), status: next.status }).where(eq(taxObligations.id, obligation.id)); }
        const snapshot = { receiptReference, paymentReference, taxpayerId: input.taxpayerId, amount: moneyValue(itemTotal), collectedAt: input.collectedAt.toISOString(), items: input.items, allocations: input.allocations };
        const integrityHash = receiptIntegrityHash(snapshot);
        await tx.insert(receipts).values({ id: receiptId, municipalityId, paymentTransactionId: id, reference: receiptReference, qrPayload: `TAXMUN:${receiptReference}:${integrityHash}`, integrityHash, immutableSnapshot: snapshot, issuedAt: new Date(), status: "FINAL" });
        await tx.insert(receiptPrintHistory).values({ receiptId, printType: "ORIGINAL", printedBy: ctx.user.id, deviceId: input.deviceId });
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "COLLECT", module: "payments", entityType: "payment", entityId: id, afterValue: { paymentReference, receiptReference, amount: moneyValue(itemTotal) }, deviceId: input.deviceId });
      });
      return { id, reference: paymentReference, receiptId, receiptReference, idempotent: false };
    }),
    reprintReceipt: protectedProcedure.input(z.object({ receiptId: z.string().uuid(), deviceId: z.string().trim().max(128).optional() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "receipts", "reprint"); const db = await requireDb(); const receipt = mustGet((await db.select().from(receipts).where(and(eq(receipts.id, input.receiptId), eq(receipts.municipalityId, municipalityId))).limit(1))[0], "Reçu introuvable.");
      await db.insert(receiptPrintHistory).values({ receiptId: receipt.id, printType: "REPRINT", printedBy: ctx.user.id, deviceId: input.deviceId }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "REPRINT", module: "receipts", entityType: "receipt", entityId: receipt.id, afterValue: { reference: receipt.reference }, deviceId: input.deviceId }); return receipt;
    }),
  }),

  receipts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "receipts", "read");
      const db = await requireDb();
      return db.select({ receipt: receipts, payment: paymentTransactions, taxpayer: taxpayers }).from(receipts)
        .innerJoin(paymentTransactions, eq(receipts.paymentTransactionId, paymentTransactions.id))
        .leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id))
        .where(eq(receipts.municipalityId, municipalityId)).orderBy(desc(receipts.issuedAt)).limit(200);
    }),
    listPage: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional() })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "receipts", "read"); const db = await requireDb(); const text = input.search ? `%${input.search.toLowerCase()}%` : undefined;
      const conditions = and(eq(receipts.municipalityId, municipalityId), text ? or(sql`lower(${receipts.reference}) like ${text}`, sql`lower(coalesce(${taxpayers.firstName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.lastName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.legalName}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.nationalId}, '')) like ${text}`, sql`lower(coalesce(${taxpayers.taxId}, '')) like ${text}`) : undefined);
      const rows = await db.select({ receipt: receipts, payment: paymentTransactions, taxpayer: taxpayers }).from(receipts).innerJoin(paymentTransactions, eq(receipts.paymentTransactionId, paymentTransactions.id)).leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id)).where(conditions).orderBy(desc(receipts.issuedAt)).limit(input.pageSize).offset(input.page * input.pageSize);
      const total = await db.select({ count: sql<number>`count(*)` }).from(receipts).innerJoin(paymentTransactions, eq(receipts.paymentTransactionId, paymentTransactions.id)).leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id)).where(conditions);
      return { rows, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),
    printHistory: protectedProcedure.input(z.object({ receiptId: z.string().uuid() })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "receipts", "read");
      const db = await requireDb();
      const receipt = mustGet((await db.select({ id: receipts.id }).from(receipts).where(and(eq(receipts.id, input.receiptId), eq(receipts.municipalityId, municipalityId))).limit(1))[0], "Reçu introuvable.");
      return db.select().from(receiptPrintHistory).where(eq(receiptPrintHistory.receiptId, receipt.id)).orderBy(desc(receiptPrintHistory.printedAt));
    }),
  }),

  deposits: router({
    list: protectedProcedure.query(async ({ ctx }) => { const municipalityId = await requireAccess(ctx.user, "deposits", "read"); const db = await requireDb(); return db.select().from(deposits).where(eq(deposits.municipalityId, municipalityId)).orderBy(desc(deposits.createdAt)).limit(100); }),
    listPage: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional(), submittedOn: z.coerce.date().optional() })).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "deposits", "read"); const db = await requireDb();
      const text = input.search ? `%${input.search.toLowerCase()}%` : undefined;
      const startOfDay = input.submittedOn ? new Date(input.submittedOn.getFullYear(), input.submittedOn.getMonth(), input.submittedOn.getDate()) : undefined;
      const endOfDay = startOfDay ? new Date(startOfDay.getFullYear(), startOfDay.getMonth(), startOfDay.getDate() + 1) : undefined;
      const conditions = and(eq(deposits.municipalityId, municipalityId), text ? or(sql`lower(${deposits.reference}) like ${text}`, sql`lower(coalesce(${users.name}, '')) like ${text}`) : undefined, startOfDay ? gte(deposits.submittedAt, startOfDay) : undefined, endOfDay ? lte(deposits.submittedAt, endOfDay) : undefined);
      const rows = await db.select({ deposit: deposits, agentName: users.name, agentUsername: users.localUsername }).from(deposits).leftJoin(users, eq(deposits.agentId, users.id)).where(conditions).orderBy(desc(deposits.submittedAt), desc(deposits.createdAt)).limit(input.pageSize).offset(input.page * input.pageSize);
      const totalRow = await db.select({ count: sql<number>`count(*)` }).from(deposits).leftJoin(users, eq(deposits.agentId, users.id)).where(conditions);
      return { rows, total: Number(totalRow[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),
    eligibleByAgent: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional() }).optional()).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "deposits", "read"); const db = await requireDb(); const page = input?.page ?? 0; const pageSize = input?.pageSize ?? 10; const text = input?.search ? `%${input.search.toLowerCase()}%` : undefined;
      const conditions = and(eq(paymentTransactions.municipalityId, municipalityId), eq(paymentTransactions.status, "VALIDATED"), isNull(depositItems.id), text ? or(sql`lower(coalesce(${users.name}, '')) like ${text}`, sql`lower(coalesce(${users.localUsername}, '')) like ${text}`) : undefined);
      const groups = await db.select({ agentId: paymentTransactions.collectedBy, agentName: users.name, agentUsername: users.localUsername, paymentCount: sql<number>`count(${paymentTransactions.id})`, totalAmount: sql<string>`coalesce(sum(${paymentTransactions.netAmount}), 0)` }).from(paymentTransactions).leftJoin(depositItems, eq(depositItems.paymentTransactionId, paymentTransactions.id)).leftJoin(users, eq(paymentTransactions.collectedBy, users.id)).where(conditions).groupBy(paymentTransactions.collectedBy, users.name, users.localUsername).orderBy(desc(sql`sum(${paymentTransactions.netAmount})`));
      return { rows: groups.slice(page * pageSize, (page + 1) * pageSize).map(group => ({ ...group, paymentCount: Number(group.paymentCount), totalAmount: Number(group.totalAmount) })), total: groups.length, page, pageSize };
    }),
    eligiblePayments: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "deposits", "create"); const db = await requireDb();
      return db.select({ payment: paymentTransactions, taxpayer: taxpayers }).from(paymentTransactions)
        .leftJoin(taxpayers, eq(paymentTransactions.taxpayerId, taxpayers.id))
        .leftJoin(depositItems, eq(depositItems.paymentTransactionId, paymentTransactions.id))
        .where(and(eq(paymentTransactions.municipalityId, municipalityId), eq(paymentTransactions.collectedBy, ctx.user.id), eq(paymentTransactions.status, "VALIDATED"), isNull(depositItems.id)))
        .orderBy(desc(paymentTransactions.collectedAt)).limit(100);
    }),
    declare: protectedProcedure.input(z.object({ paymentIds: z.array(z.string().uuid()).min(1), depositedAmount: money, observation: z.string().trim().max(1000).optional() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "deposits", "create"); const db = await requireDb(); const id = randomUUID();
      const selected = await db.select({ payment: paymentTransactions, depositItemId: depositItems.id }).from(paymentTransactions).leftJoin(depositItems, eq(depositItems.paymentTransactionId, paymentTransactions.id)).where(and(eq(paymentTransactions.municipalityId, municipalityId), inArray(paymentTransactions.id, input.paymentIds)));
      const isUniqueSelection = new Set(input.paymentIds).size === input.paymentIds.length;
      const ineligible = selected.find(row => !isPaymentEligibleForDeposit({ status: row.payment.status, collectedBy: row.payment.collectedBy, actorId: ctx.user.id, alreadyAssigned: Boolean(row.depositItemId) }));
      if (!isUniqueSelection || selected.length !== input.paymentIds.length || ineligible) throw new TRPCError({ code: "CONFLICT", message: "Chaque encaissement doit être validé, appartenir à l’agent et ne pas déjà figurer dans un versement." });
      const paymentRows = selected.map(row => row.payment); const expectedAmount = paymentRows.reduce((sum, row) => sum + Number(row.netAmount), 0); const differenceAmount = input.depositedAmount - expectedAmount;
      await db.transaction(async tx => { await tx.insert(deposits).values({ id, municipalityId, reference: reference("VER"), agentId: ctx.user.id, expectedAmount: moneyValue(expectedAmount), depositedAmount: moneyValue(input.depositedAmount), differenceAmount: moneyValue(differenceAmount), status: "SUBMITTED", submittedAt: new Date(), observation: input.observation }); await tx.insert(depositItems).values(paymentRows.map(payment => ({ depositId: id, paymentTransactionId: payment.id }))); await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "DECLARE", module: "deposits", entityType: "deposit", entityId: id, afterValue: { paymentIds: input.paymentIds, expectedAmount, depositedAmount: input.depositedAmount } }); });
      return { id, differenceAmount };
    }),
    validate: protectedProcedure.input(z.object({ depositId: z.string().uuid(), countedAmount: money, denominations: z.record(z.string(), z.number().int().min(0)) })).mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "deposits", "validate"); const db = await requireDb(); const deposit = mustGet((await db.select().from(deposits).where(and(eq(deposits.id, input.depositId), eq(deposits.municipalityId, municipalityId))).limit(1))[0], "Versement introuvable.");
      const difference = input.countedAmount - Number(deposit.expectedAmount); const status = amountsMatch(input.countedAmount, Number(deposit.expectedAmount)) ? "VALIDATED" : "PARTIALLY_VALIDATED";
      await db.transaction(async tx => { await tx.insert(cashCounts).values({ depositId: deposit.id, countedAmount: moneyValue(input.countedAmount), denominations: input.denominations, countedBy: ctx.user.id }); await tx.update(deposits).set({ depositedAmount: moneyValue(input.countedAmount), differenceAmount: moneyValue(difference), status, validatedAt: new Date(), validatedBy: ctx.user.id }).where(eq(deposits.id, deposit.id)); await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "VALIDATE", module: "deposits", entityType: "deposit", entityId: deposit.id, beforeValue: deposit, afterValue: { countedAmount: input.countedAmount, status } }); }); return { success: true, status };
    }),
  }),

  closings: router({
    list: protectedProcedure.query(async ({ ctx }) => { const municipalityId = await requireAccess(ctx.user, "closings", "read"); const db = await requireDb(); return db.select().from(dailyClosings).where(eq(dailyClosings.municipalityId, municipalityId)).orderBy(desc(dailyClosings.businessDate)).limit(100); }),
    close: protectedProcedure.input(z.object({ businessDate: z.coerce.date(), expectedAmount: money, depositedAmount: money })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "closings", "create"); const db = await requireDb(); const id = randomUUID(); const differenceAmount = input.depositedAmount - input.expectedAmount;
      await db.insert(dailyClosings).values({ id, municipalityId, agentId: ctx.user.id, businessDate: input.businessDate, expectedAmount: moneyValue(input.expectedAmount), depositedAmount: moneyValue(input.depositedAmount), differenceAmount: moneyValue(differenceAmount), status: "SUBMITTED" }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "SUBMIT", module: "closings", entityType: "daily_closing", entityId: id, afterValue: { businessDate: input.businessDate, expectedAmount: input.expectedAmount, depositedAmount: input.depositedAmount } }); return { id, differenceAmount };
    }),
  }),

  reports: router({
    collectionSummary: protectedProcedure.input(z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() }).optional()).query(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "reports", "read"); const db = await requireDb();
      const rows = await db.select({ amount: paymentItems.amount, collectedAt: paymentTransactions.collectedAt, agentId: users.id, agentName: users.name, taxType: taxTypes.label, sector: sectors.name }).from(paymentTransactions)
        .innerJoin(paymentItems, eq(paymentItems.paymentTransactionId, paymentTransactions.id)).innerJoin(taxObligations, eq(paymentItems.taxObligationId, taxObligations.id)).leftJoin(taxTypes, eq(taxObligations.taxTypeId, taxTypes.id)).leftJoin(activities, eq(taxObligations.activityId, activities.id)).leftJoin(markets, eq(activities.marketId, markets.id)).leftJoin(zones, eq(markets.zoneId, zones.id)).leftJoin(sectors, eq(zones.sectorId, sectors.id)).leftJoin(users, eq(paymentTransactions.collectedBy, users.id))
        .where(and(eq(paymentTransactions.municipalityId, municipalityId), eq(paymentTransactions.status, "VALIDATED"), input?.from ? gte(paymentTransactions.collectedAt, input.from) : undefined, input?.to ? lte(paymentTransactions.collectedAt, input.to) : undefined));
      const aggregate = (items: Array<{ label: string; amount: number }>) => Object.values(items.reduce<Record<string, { label: string; amount: number }>>((acc, item) => { const key = item.label || "Non renseigné"; acc[key] = { label: key, amount: (acc[key]?.amount ?? 0) + item.amount }; return acc; }, {})).sort((a, b) => b.amount - a.amount);
      return { total: rows.reduce((sum, row) => sum + Number(row.amount), 0), transactionLines: rows.length, byAgent: aggregate(rows.map(row => ({ label: row.agentName || `Agent #${row.agentId ?? "?"}`, amount: Number(row.amount) }))), bySector: aggregate(rows.map(row => ({ label: row.sector || "Non rattaché", amount: Number(row.amount) }))), byTax: aggregate(rows.map(row => ({ label: row.taxType || "Taxe non renseignée", amount: Number(row.amount) }))), generatedAt: new Date() };
    }),
  }),

  administration: router({
    users: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select({ id: users.id, name: users.name, email: users.email, localUsername: users.localUsername, role: users.role, isActive: users.isActive, archivedAt: users.archivedAt, lastSignedIn: users.lastSignedIn, loginMethod: users.loginMethod, accessMode: sql<string>`case when ${users.localUsername} is not null then 'LOCAL' when ${users.openId} like 'tester:%' then 'LIEN TEMPORAIRE' else 'COMPTE INTERNE' end`, roles: sql<string>`string_agg(distinct ${roles.label}, ', ')` }).from(users).leftJoin(userRoles, and(eq(userRoles.userId, users.id), isNull(userRoles.expiresAt))).leftJoin(roles, eq(userRoles.roleId, roles.id)).where(eq(users.municipalityId, municipalityId)).groupBy(users.id).orderBy(users.name); }),
    usersPage: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional(), status: z.enum(["ALL", "ACTIVE", "INACTIVE", "ARCHIVED"]).default("ALL") })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const text = input.search ? `%${input.search.toLowerCase()}%` : undefined;
      const conditions = and(eq(users.municipalityId, municipalityId), input.status === "ACTIVE" ? and(eq(users.isActive, true), isNull(users.archivedAt)) : input.status === "INACTIVE" ? and(eq(users.isActive, false), isNull(users.archivedAt)) : input.status === "ARCHIVED" ? sql`${users.archivedAt} is not null` : undefined, text ? or(sql`lower(coalesce(${users.name}, '')) like ${text}`, sql`lower(coalesce(${users.email}, '')) like ${text}`, sql`lower(coalesce(${users.localUsername}, '')) like ${text}`) : undefined);
      const rows = await db.select({ id: users.id, name: users.name, email: users.email, localUsername: users.localUsername, role: users.role, isActive: users.isActive, archivedAt: users.archivedAt, lastSignedIn: users.lastSignedIn, loginMethod: users.loginMethod, accessMode: sql<string>`case when ${users.localUsername} is not null then 'LOCAL' when ${users.openId} like 'tester:%' then 'LIEN TEMPORAIRE' else 'COMPTE INTERNE' end`, roles: sql<string>`string_agg(distinct ${roles.label}, ', ')` }).from(users).leftJoin(userRoles, and(eq(userRoles.userId, users.id), isNull(userRoles.expiresAt))).leftJoin(roles, eq(userRoles.roleId, roles.id)).where(conditions).groupBy(users.id).orderBy(users.name).limit(input.pageSize).offset(input.page * input.pageSize);
      const total = await db.select({ count: sql<number>`count(*)` }).from(users).where(conditions);
      return { rows, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),
    roles: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select().from(roles).where(or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId))).orderBy(roles.label); }),
    permissions: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select().from(permissions).orderBy(permissions.module, permissions.action); }),
    rolePermissionMatrix: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId }).from(rolePermissions).innerJoin(roles, eq(rolePermissions.roleId, roles.id)).where(or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId))); }),
    invitations: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select({ id: userInvitations.id, email: userInvitations.email, displayName: userInvitations.displayName, status: userInvitations.status, expiresAt: userInvitations.expiresAt, createdAt: userInvitations.createdAt, roles: sql<string>`string_agg(distinct ${roles.label}, ', ')` }).from(userInvitations).leftJoin(invitationRoles, eq(invitationRoles.invitationId, userInvitations.id)).leftJoin(roles, eq(invitationRoles.roleId, roles.id)).where(eq(userInvitations.municipalityId, municipalityId)).groupBy(userInvitations.id).orderBy(desc(userInvitations.createdAt)); }),
    createRole: protectedProcedure.input(z.object({ code: z.string().trim().min(2).max(64), label: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID(); await db.insert(roles).values({ id, municipalityId, code: input.code.toUpperCase(), label: input.label }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "administration", entityType: "role", entityId: id, afterValue: input }); return { id, ...input }; }),
    createPermission: protectedProcedure.input(z.object({ module: z.string().trim().min(2).max(64), action: z.string().trim().min(2).max(32), label: z.string().trim().min(2).max(160) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const id = randomUUID(); const code = `${input.module}.${input.action}`.toLowerCase(); await db.insert(permissions).values({ id, code, ...input }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "administration", entityType: "permission", entityId: id, afterValue: { ...input, code } }); return { id, code, ...input }; }),
    setRolePermissions: protectedProcedure.input(z.object({ roleId: z.string().uuid(), permissionIds: z.array(z.string().uuid()).max(100) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const uniquePermissionIds = Array.from(new Set(input.permissionIds)); mustGet((await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, input.roleId), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))).limit(1))[0], "Rôle introuvable."); if (uniquePermissionIds.length) { const selected = await db.select({ id: permissions.id }).from(permissions).where(inArray(permissions.id, uniquePermissionIds)); if (selected.length !== uniquePermissionIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Une permission sélectionnée est introuvable." }); } await db.transaction(async tx => { await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, input.roleId)); if (uniquePermissionIds.length) await tx.insert(rolePermissions).values(uniquePermissionIds.map(permissionId => ({ id: randomUUID(), roleId: input.roleId, permissionId }))); }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "UPDATE", module: "administration", entityType: "role_permissions", entityId: input.roleId, afterValue: input }); return { success: true }; }),
    setUserRoles: protectedProcedure.input(z.object({ userId: z.number().int().positive(), roleIds: z.array(z.string().uuid()).max(20), expiresAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const uniqueRoleIds = Array.from(new Set(input.roleIds)); mustGet((await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); if (uniqueRoleIds.length) { const selected = await db.select({ id: roles.id }).from(roles).where(and(inArray(roles.id, uniqueRoleIds), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))); if (selected.length !== uniqueRoleIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Un rôle sélectionné est introuvable ou hors mairie." }); } await db.transaction(async tx => { await tx.delete(userRoles).where(eq(userRoles.userId, input.userId)); if (uniqueRoleIds.length) await tx.insert(userRoles).values(uniqueRoleIds.map(roleId => ({ id: randomUUID(), userId: input.userId, roleId, expiresAt: input.expiresAt, assignedBy: ctx.user.id }))); }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "ASSIGN", module: "administration", entityType: "user_roles", entityId: String(input.userId), afterValue: input }); return { success: true }; }),
    assignRole: protectedProcedure.input(z.object({ userId: z.number().int().positive(), roleId: z.string().uuid(), expiresAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); mustGet((await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); mustGet((await db.select({ id: roles.id }).from(roles).where(and(eq(roles.id, input.roleId), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))).limit(1))[0], "Rôle introuvable."); const id = randomUUID(); await db.insert(userRoles).values({ id, ...input, assignedBy: ctx.user.id }).onConflictDoUpdate({ target: [userRoles.userId, userRoles.roleId], set: { expiresAt: input.expiresAt, assignedBy: ctx.user.id } }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "ASSIGN", module: "administration", entityType: "user_role", entityId: id, afterValue: input }); return { id }; }),
    setUserActive: protectedProcedure.input(z.object({ userId: z.number().int().positive(), isActive: z.boolean() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); if (ctx.user.id === input.userId && !input.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas désactiver votre propre compte." }); const db = await requireDb(); const target = mustGet((await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); if (target.archivedAt) throw new TRPCError({ code: "CONFLICT", message: "Un compte archivé ne peut pas être réactivé." }); if (target.loginMethod === "local-password") await setLocalUserActive(target.id, input.isActive); else await db.update(users).set({ isActive: input.isActive }).where(eq(users.id, input.userId)); await audit(db, { municipalityId, actorId: ctx.user.id, action: input.isActive ? "ACTIVATE" : "DEACTIVATE", module: "administration", entityType: "user", entityId: String(input.userId), beforeValue: { isActive: target.isActive }, afterValue: input }); return { success: true }; }),
    createInvitation: protectedProcedure.input(z.object({ email: z.string().trim().email().max(320), displayName: z.string().trim().min(2).max(180).optional(), roleIds: z.array(z.string().uuid()).min(1).max(20), expiresAt: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const email = input.email.toLowerCase(); const roleIds = Array.from(new Set(input.roleIds)); const selected = await db.select({ id: roles.id }).from(roles).where(and(inArray(roles.id, roleIds), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))); if (selected.length !== roleIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Un rôle sélectionné est introuvable ou hors mairie." }); const existing = (await db.select().from(userInvitations).where(and(eq(userInvitations.municipalityId, municipalityId), eq(userInvitations.email, email))).limit(1))[0]; if (existing?.status === "ACTIVATED") throw new TRPCError({ code: "CONFLICT", message: "Ce compte est déjà activé dans la mairie. Modifiez directement ses rôles." }); const invitationId = existing?.id ?? randomUUID(); await db.transaction(async tx => { if (existing) await tx.update(userInvitations).set({ displayName: input.displayName ?? null, status: "PENDING", invitedBy: ctx.user.id, expiresAt: input.expiresAt ?? null }).where(eq(userInvitations.id, invitationId)); else await tx.insert(userInvitations).values({ id: invitationId, municipalityId, email, displayName: input.displayName ?? null, invitedBy: ctx.user.id, expiresAt: input.expiresAt ?? null }); await tx.delete(invitationRoles).where(eq(invitationRoles.invitationId, invitationId)); await tx.insert(invitationRoles).values(roleIds.map(roleId => ({ id: randomUUID(), invitationId, roleId }))); }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "INVITE", module: "administration", entityType: "user_invitation", entityId: invitationId, afterValue: { ...input, email, roleIds } }); return { id: invitationId, email }; }),
    createTesterAccess: protectedProcedure.input(z.object({ displayName: z.string().trim().min(2).max(180), email: z.string().trim().email().max(320).optional().or(z.literal("")), roleIds: z.array(z.string().uuid()).min(1).max(20), expiresInHours: z.number().int().min(1).max(168).default(24) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const roleIds = Array.from(new Set(input.roleIds)); const selected = await db.select({ id: roles.id }).from(roles).where(and(inArray(roles.id, roleIds), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))); if (selected.length !== roleIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Un rôle sélectionné est introuvable ou hors mairie." }); const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000); const access = await createTesterAccess({ municipalityId, displayName: input.displayName, email: input.email || null, roleIds, createdBy: ctx.user.id, expiresAt }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "administration", entityType: "tester_access", entityId: String(access.userId), afterValue: { displayName: input.displayName, roleIds, expiresAt, authentication: "temporary_link" } }); return { userId: access.userId, path: `/acces-test/${access.rawToken}`, expiresAt }; }),
    createLocalUser: protectedProcedure.input(z.object({ displayName: z.string().trim().min(2).max(180), localUsername: z.string().trim().min(3).max(64), password: z.string().min(10).max(512), roleIds: z.array(z.string().uuid()).min(1).max(20), isAdministrator: z.boolean().default(false) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const roleIds = Array.from(new Set(input.roleIds)); const selected = await db.select({ id: roles.id }).from(roles).where(and(inArray(roles.id, roleIds), or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)))); if (selected.length !== roleIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Un rôle sélectionné est introuvable ou hors mairie." }); if ((await db.select({ id: users.id }).from(users).where(eq(users.localUsername, input.localUsername.trim().toLowerCase())).limit(1))[0]) throw new TRPCError({ code: "CONFLICT", message: "Cet identifiant est déjà utilisé." }); let created; try { created = await createLocalUser({ municipalityId, displayName: input.displayName, localUsername: input.localUsername, password: input.password, roleIds, createdBy: ctx.user.id, isAdministrator: input.isAdministrator }); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Création du compte impossible." }); } await audit(db, { municipalityId, actorId: ctx.user.id, action: "CREATE", module: "administration", entityType: "user", entityId: String(created.userId), afterValue: { displayName: input.displayName, localUsername: created.localUsername, roleIds, accessMode: "LOCAL", isAdministrator: input.isAdministrator } }); return created; }),
    resetLocalPassword: protectedProcedure.input(z.object({ userId: z.number().int().positive(), password: z.string().min(10).max(512) })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const target = mustGet((await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); if (target.loginMethod !== "local-password") throw new TRPCError({ code: "BAD_REQUEST", message: "Seul un compte local possède un mot de passe municipal réinitialisable." }); try { await resetLocalPassword(target.id, input.password); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Réinitialisation impossible." }); } await audit(db, { municipalityId, actorId: ctx.user.id, action: "RESET_PASSWORD", module: "administration", entityType: "user", entityId: String(target.id), afterValue: { accessMode: "LOCAL", localUsername: target.localUsername } }); return { success: true }; }),
    archiveLocalUser: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); if (ctx.user.id === input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas archiver votre propre compte." }); const db = await requireDb(); const target = mustGet((await db.select().from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); if (target.archivedAt) throw new TRPCError({ code: "CONFLICT", message: "Ce compte est déjà archivé." }); try { await archiveLocalUser(target.id); } catch (error) { throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Archivage impossible." }); } await audit(db, { municipalityId, actorId: ctx.user.id, action: "ARCHIVE", module: "administration", entityType: "user", entityId: String(target.id), beforeValue: { isActive: target.isActive }, afterValue: { archived: true, accessMode: "LOCAL", localUsername: target.localUsername } }); return { success: true }; }),
    auditLog: protectedProcedure.input(z.object({ module: z.string().trim().max(64).optional(), actorId: z.number().int().positive().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), limit: z.number().int().min(1).max(500).default(150) }).optional()).query(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); return db.select({ id: auditLogs.id, action: auditLogs.action, module: auditLogs.module, entityType: auditLogs.entityType, entityId: auditLogs.entityId, beforeValue: auditLogs.beforeValue, afterValue: auditLogs.afterValue, createdAt: auditLogs.createdAt, actorId: auditLogs.actorId, actorName: users.name, actorUsername: users.localUsername }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(and(eq(auditLogs.municipalityId, municipalityId), input?.module ? eq(auditLogs.module, input.module) : undefined, input?.actorId ? eq(auditLogs.actorId, input.actorId) : undefined, input?.from ? gte(auditLogs.createdAt, input.from) : undefined, input?.to ? lte(auditLogs.createdAt, input.to) : undefined)).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 150); }),
    auditLogPage: protectedProcedure.input(paginatedListInput.extend({ search: z.string().trim().max(160).optional(), module: z.string().trim().max(64).optional(), actorId: z.number().int().positive().optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional() })).query(async ({ ctx, input }) => {
      requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const text = input.search ? `%${input.search.toLowerCase()}%` : undefined; const conditions = and(eq(auditLogs.municipalityId, municipalityId), input.module ? eq(auditLogs.module, input.module) : undefined, input.actorId ? eq(auditLogs.actorId, input.actorId) : undefined, input.from ? gte(auditLogs.createdAt, input.from) : undefined, input.to ? lte(auditLogs.createdAt, input.to) : undefined, text ? or(sql`lower(${auditLogs.module}) like ${text}`, sql`lower(${auditLogs.action}) like ${text}`, sql`lower(${auditLogs.entityType}) like ${text}`, sql`lower(coalesce(${auditLogs.entityId}, '')) like ${text}`, sql`lower(coalesce(${users.name}, '')) like ${text}`, sql`lower(coalesce(${users.localUsername}, '')) like ${text}`) : undefined);
      const rows = await db.select({ id: auditLogs.id, action: auditLogs.action, module: auditLogs.module, entityType: auditLogs.entityType, entityId: auditLogs.entityId, beforeValue: auditLogs.beforeValue, afterValue: auditLogs.afterValue, createdAt: auditLogs.createdAt, actorId: auditLogs.actorId, actorName: users.name, actorUsername: users.localUsername }).from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(conditions).orderBy(desc(auditLogs.createdAt)).limit(input.pageSize).offset(input.page * input.pageSize);
      const total = await db.select({ count: sql<number>`count(*)` }).from(auditLogs).where(conditions);
      return { rows, total: Number(total[0]?.count ?? 0), page: input.page, pageSize: input.pageSize };
    }),
    cancelInvitation: protectedProcedure.input(z.object({ invitationId: z.string().uuid() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); const invitation = mustGet((await db.select().from(userInvitations).where(and(eq(userInvitations.id, input.invitationId), eq(userInvitations.municipalityId, municipalityId))).limit(1))[0], "Invitation introuvable."); if (invitation.status === "ACTIVATED") throw new TRPCError({ code: "CONFLICT", message: "Une invitation activée ne peut pas être annulée." }); await db.update(userInvitations).set({ status: "CANCELLED" }).where(eq(userInvitations.id, input.invitationId)); await audit(db, { municipalityId, actorId: ctx.user.id, action: "CANCEL", module: "administration", entityType: "user_invitation", entityId: input.invitationId, afterValue: input }); return { success: true }; }),
    assignTerritory: protectedProcedure.input(z.object({ userId: z.number().int().positive(), territoryType: z.enum(["SECTOR", "ZONE", "MARKET", "MARKET_LOCATION"]), territoryId: z.string().uuid(), startDate: z.coerce.date(), endDate: z.coerce.date().optional() })).mutation(async ({ ctx, input }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "administration", "manage"); const db = await requireDb(); mustGet((await db.select({ id: users.id }).from(users).where(and(eq(users.id, input.userId), eq(users.municipalityId, municipalityId))).limit(1))[0], "Utilisateur hors mairie."); const id = randomUUID(); await db.insert(userTerritoryAssignments).values({ id, ...input, assignedBy: ctx.user.id }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "ASSIGN", module: "administration", entityType: "territory_assignment", entityId: id, afterValue: input }); return { id }; }),
  }),

  sync: router({
    status: protectedProcedure.query(async ({ ctx }) => { const municipalityId = await requireAccess(ctx.user, "synchronization", "read"); const db = await requireDb(); return db.select().from(syncOperations).where(eq(syncOperations.municipalityId, municipalityId)).orderBy(desc(syncOperations.createdAt)).limit(100); }),
    conflicts: protectedProcedure.query(async ({ ctx }) => {
      const municipalityId = await requireAccess(ctx.user, "synchronization", "read"); const db = await requireDb();
      return db.select({ conflict: syncConflicts, operation: syncOperations }).from(syncConflicts).innerJoin(syncOperations, eq(syncConflicts.syncOperationId, syncOperations.id)).where(eq(syncOperations.municipalityId, municipalityId)).orderBy(desc(syncConflicts.createdAt)).limit(100);
    }),
    register: protectedProcedure.input(z.object({ deviceId: z.string().trim().min(4).max(128), operationId: z.string().trim().min(8).max(96), entityType: z.string().trim().min(2).max(64), entityId: z.string().trim().min(2).max(64), operation: z.enum(["CREATE", "UPDATE", "CANCEL", "SUBMIT"]), payloadHash: z.string().trim().min(16).max(128), payload: z.unknown() })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "synchronization", "create"); const db = await requireDb(); const existing = await db.select().from(syncOperations).where(and(eq(syncOperations.deviceId, input.deviceId), eq(syncOperations.operationId, input.operationId))).limit(1);
      if (existing[0]) { if (syncReplayDisposition(existing[0].payloadHash, input.payloadHash) === "IDEMPOTENT") return { status: existing[0].status, idempotent: true }; const conflictId = randomUUID(); await db.insert(syncConflicts).values({ id: conflictId, syncOperationId: existing[0].id, localPayload: input.payload, serverPayload: existing[0].result }); await db.update(syncOperations).set({ status: "CONFLICT" }).where(eq(syncOperations.id, existing[0].id)); throw new TRPCError({ code: "CONFLICT", message: "Conflit de synchronisation détecté et journalisé." }); }
      const id = randomUUID(); await db.insert(syncOperations).values({ id, municipalityId, deviceId: input.deviceId, operationId: input.operationId, entityType: input.entityType, entityId: input.entityId, operation: input.operation, payloadHash: input.payloadHash, status: "SYNCED", result: { acceptedAt: new Date().toISOString() }, processedAt: new Date() }); await audit(db, { municipalityId, actorId: ctx.user.id, action: "SYNC", module: "synchronization", entityType: input.entityType, entityId: input.entityId, afterValue: { operationId: input.operationId }, deviceId: input.deviceId }); return { id, status: "SYNCED", idempotent: false };
    }),
    replayCreate: protectedProcedure.input(deferredCreateInput).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "synchronization", "create");
      const db = await requireDb();
      const existing = await db.select().from(syncOperations).where(and(eq(syncOperations.deviceId, input.deviceId), eq(syncOperations.operationId, input.operationId))).limit(1);
      if (existing[0]) {
        if (syncReplayDisposition(existing[0].payloadHash, input.payloadHash) === "IDEMPOTENT") return { status: existing[0].status, entityId: existing[0].entityId, idempotent: true };
        const conflictId = randomUUID();
        await db.insert(syncConflicts).values({ id: conflictId, syncOperationId: existing[0].id, localPayload: input.payload, serverPayload: existing[0].result });
        await db.update(syncOperations).set({ status: "CONFLICT" }).where(eq(syncOperations.id, existing[0].id));
        throw new TRPCError({ code: "CONFLICT", message: "Le même brouillon local contient des données différentes ; le conflit est journalisé." });
      }

      const inputByCommand = {
        SECTOR: z.object({ code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(120) }),
        ZONE: z.object({ sectorId: z.string().uuid(), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(120) }),
        MARKET: z.object({ zoneId: z.string().uuid(), code: z.string().trim().min(2).max(32), name: z.string().trim().min(2).max(160), address: z.string().trim().max(500).optional() }),
        MARKET_LOCATION: z.object({ marketId: z.string().uuid(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(120) }),
        ACTIVITY_CATEGORY: z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) }),
        ACTIVITY_TYPE: z.object({ categoryId: z.string().uuid(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) }),
        TAX_CATEGORY: z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(160) }),
        TAX_TYPE: z.object({ categoryId: z.string().uuid().optional(), code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(180) }),
        PERIODICITY: z.object({ code: z.string().trim().min(2).max(48), label: z.string().trim().min(2).max(120), calendarUnit: z.enum(["DAY", "WEEK", "MONTH", "QUARTER", "SEMESTER", "YEAR", "CUSTOM"]), intervalCount: z.number().int().min(1).max(365) }),
        TAX_RULE: z.object({ taxTypeId: z.string().uuid(), periodicityId: z.string().uuid(), code: z.string().trim().min(2).max(64), label: z.string().trim().min(2).max(180), baseAmount: z.number().nonnegative(), graceDays: z.number().int().min(0).max(365), penaltyRate: z.number().min(0).max(1), validFrom: z.coerce.date() }),
        ASSIGN_RULE: z.object({ activityId: z.string().uuid(), taxRuleId: z.string().uuid(), startDate: z.coerce.date() }),
        GENERATE_OBLIGATIONS: z.object({ activityId: z.string().uuid(), periodStart: z.coerce.date(), periodEnd: z.coerce.date(), dueDate: z.coerce.date() }),
        DEPOSIT_DRAFT: z.object({ paymentIds: z.array(z.string().uuid()).min(1), depositedAmount: money, observation: z.string().trim().max(1000).optional() }),
        CLOSING_DRAFT: z.object({ businessDate: z.coerce.date(), expectedAmount: money.nonnegative(), depositedAmount: money.nonnegative() }),
        ACTIVITY: z.object({ taxpayerId: z.string().uuid(), activityTypeId: z.string().uuid(), label: z.string().trim().min(2).max(220), locationType: z.enum(["ZONE", "MARKET", "MARKET_LOCATION", "MOBILE", "CUSTOM"]), zoneId: z.string().uuid().optional(), marketId: z.string().uuid().optional(), marketLocationId: z.string().uuid().optional(), address: z.string().trim().max(500).optional(), startedAt: z.coerce.date() }),
      } as const;
      const payload = inputByCommand[input.command].parse(input.payload) as Record<string, any>;

      await db.transaction(async tx => {
        await tx.insert(syncOperations).values({ id: randomUUID(), municipalityId, deviceId: input.deviceId, operationId: input.operationId, entityType: input.command.toLowerCase(), entityId: input.entityId, operation: "CREATE", payloadHash: input.payloadHash, status: "PROCESSING" });
        if (input.command === "SECTOR") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "territory", "manage");
          await tx.insert(sectors).values({ id: input.entityId, municipalityId, code: String(payload.code).toUpperCase(), name: String(payload.name) });
        } else if (input.command === "ZONE") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "territory", "manage");
          mustGet((await tx.select({ id: sectors.id }).from(sectors).where(and(eq(sectors.id, payload.sectorId), eq(sectors.municipalityId, municipalityId))).limit(1))[0], "Secteur parent introuvable après synchronisation.");
          await tx.insert(zones).values({ id: input.entityId, sectorId: String(payload.sectorId), code: String(payload.code).toUpperCase(), name: String(payload.name) });
        } else if (input.command === "MARKET") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "territory", "manage");
          const zone = mustGet((await tx.select({ municipalityId: sectors.municipalityId }).from(zones).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(zones.id, payload.zoneId)).limit(1))[0], "Zone parente introuvable après synchronisation.");
          if (zone.municipalityId !== municipalityId) throw new TRPCError({ code: "FORBIDDEN", message: "La zone parente ne relève pas de votre mairie." });
          await tx.insert(markets).values({ id: input.entityId, zoneId: String(payload.zoneId), code: String(payload.code).toUpperCase(), name: String(payload.name), address: payload.address ? String(payload.address) : undefined });
        } else if (input.command === "MARKET_LOCATION") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "territory", "manage");
          const market = mustGet((await tx.select({ municipalityId: sectors.municipalityId }).from(markets).innerJoin(zones, eq(markets.zoneId, zones.id)).innerJoin(sectors, eq(zones.sectorId, sectors.id)).where(eq(markets.id, payload.marketId)).limit(1))[0], "Marché parent introuvable après synchronisation.");
          if (market.municipalityId !== municipalityId) throw new TRPCError({ code: "FORBIDDEN", message: "Le marché parent ne relève pas de votre mairie." });
          await tx.insert(marketLocations).values({ id: input.entityId, marketId: String(payload.marketId), code: String(payload.code).toUpperCase(), label: String(payload.label) });
        } else if (input.command === "ACTIVITY_CATEGORY") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage");
          await tx.insert(activityCategories).values({ id: input.entityId, municipalityId, code: payload.code.toUpperCase(), label: payload.label });
        } else if (input.command === "ACTIVITY_TYPE") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage");
          mustGet((await tx.select({ id: activityCategories.id }).from(activityCategories).where(and(eq(activityCategories.id, payload.categoryId), eq(activityCategories.municipalityId, municipalityId))).limit(1))[0], "Catégorie d’activité introuvable après synchronisation.");
          await tx.insert(activityTypes).values({ id: input.entityId, categoryId: String(payload.categoryId), code: String(payload.code).toUpperCase(), label: String(payload.label) });
        } else if (input.command === "TAX_CATEGORY") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage");
          await tx.insert(taxCategories).values({ id: input.entityId, municipalityId, code: String(payload.code).toUpperCase(), label: String(payload.label) });
        } else if (input.command === "TAX_TYPE") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage");
          if (payload.categoryId) mustGet((await tx.select({ id: taxCategories.id }).from(taxCategories).where(and(eq(taxCategories.id, payload.categoryId), eq(taxCategories.municipalityId, municipalityId))).limit(1))[0], "Catégorie de taxe introuvable après synchronisation.");
          await tx.insert(taxTypes).values({ id: input.entityId, municipalityId, categoryId: payload.categoryId ? String(payload.categoryId) : undefined, code: String(payload.code).toUpperCase(), label: String(payload.label) });
        } else if (input.command === "PERIODICITY") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "administration", "manage");
          await tx.insert(taxPeriodicities).values({ id: input.entityId, municipalityId, code: String(payload.code).toUpperCase(), label: String(payload.label), calendarUnit: payload.calendarUnit, intervalCount: payload.intervalCount });
        } else if (input.command === "TAX_RULE") {
          requireAdmin(ctx.user); await requireAccess(ctx.user, "fiscality", "manage");
          mustGet((await tx.select({ id: taxTypes.id }).from(taxTypes).where(and(eq(taxTypes.id, payload.taxTypeId), eq(taxTypes.municipalityId, municipalityId))).limit(1))[0], "Type de taxe introuvable après synchronisation.");
          mustGet((await tx.select({ id: taxPeriodicities.id }).from(taxPeriodicities).where(and(eq(taxPeriodicities.id, payload.periodicityId), or(eq(taxPeriodicities.municipalityId, municipalityId), isNull(taxPeriodicities.municipalityId)))).limit(1))[0], "Périodicité introuvable après synchronisation.");
          await tx.insert(taxRules).values({ id: input.entityId, municipalityId, taxTypeId: payload.taxTypeId, periodicityId: payload.periodicityId, code: String(payload.code).toUpperCase(), label: String(payload.label), baseAmount: moneyValue(payload.baseAmount), graceDays: payload.graceDays, penaltyRate: moneyValue(payload.penaltyRate), validFrom: payload.validFrom, createdBy: ctx.user.id });
        } else if (input.command === "ASSIGN_RULE") {
          await requireAccess(ctx.user, "fiscality", "manage");
          mustGet((await tx.select({ id: activities.id }).from(activities).where(and(eq(activities.id, payload.activityId), eq(activities.municipalityId, municipalityId))).limit(1))[0], "Activité introuvable après synchronisation.");
          mustGet((await tx.select({ id: taxRules.id }).from(taxRules).where(and(eq(taxRules.id, payload.taxRuleId), eq(taxRules.municipalityId, municipalityId))).limit(1))[0], "Règle fiscale introuvable après synchronisation.");
          const assignment = await tx.select({ id: activityTaxAssignments.id }).from(activityTaxAssignments).where(and(eq(activityTaxAssignments.activityId, payload.activityId), eq(activityTaxAssignments.taxRuleId, payload.taxRuleId), eq(activityTaxAssignments.startDate, payload.startDate))).limit(1);
          if (!assignment[0]) await tx.insert(activityTaxAssignments).values({ id: input.entityId, activityId: payload.activityId, taxRuleId: payload.taxRuleId, startDate: payload.startDate });
        } else if (input.command === "GENERATE_OBLIGATIONS") {
          await requireAccess(ctx.user, "obligations", "generate");
          const activity = mustGet((await tx.select().from(activities).where(and(eq(activities.id, payload.activityId), eq(activities.municipalityId, municipalityId))).limit(1))[0], "Activité introuvable après synchronisation.");
          if (!activity.currentTaxpayerId) throw new TRPCError({ code: "CONFLICT", message: "L’activité n’a pas de redevable actif." });
          const assignments = await tx.select({ assignment: activityTaxAssignments, rule: taxRules }).from(activityTaxAssignments).innerJoin(taxRules, eq(activityTaxAssignments.taxRuleId, taxRules.id)).where(and(eq(activityTaxAssignments.activityId, activity.id), eq(activityTaxAssignments.isActive, true), eq(taxRules.isActive, true)));
          for (const { assignment, rule } of assignments) {
            const existingObligation = await tx.select({ id: taxObligations.id }).from(taxObligations).where(and(eq(taxObligations.activityId, activity.id), eq(taxObligations.taxRuleId, assignment.taxRuleId), eq(taxObligations.periodStart, payload.periodStart), eq(taxObligations.periodEnd, payload.periodEnd))).limit(1);
            if (existingObligation[0]) continue;
            const exemption = (await tx.select().from(taxExemptions).where(and(eq(taxExemptions.taxpayerId, activity.currentTaxpayerId), or(isNull(taxExemptions.taxTypeId), eq(taxExemptions.taxTypeId, rule.taxTypeId)), eq(taxExemptions.status, "APPROVED"), lte(taxExemptions.startDate, payload.periodEnd), or(isNull(taxExemptions.endDate), gte(taxExemptions.endDate, payload.periodStart)))).limit(1))[0];
            const amount = previewTaxAmount({ baseAmount: Number(rule.baseAmount), exemptionRate: Number(exemption?.rate ?? 0) });
            if (amount.baseAmount <= 0) throw new TRPCError({ code: "CONFLICT", message: `La règle ${rule.label} ne possède pas de montant tarifaire positif.` });
            await tx.insert(taxObligations).values({ id: randomUUID(), municipalityId, reference: reference("OBL"), taxpayerId: activity.currentTaxpayerId, activityId: activity.id, taxTypeId: rule.taxTypeId, taxRuleId: rule.id, periodStart: payload.periodStart, periodEnd: payload.periodEnd, dueDate: payload.dueDate, expectedAmount: moneyValue(amount.baseAmount), discountAmount: moneyValue(amount.exemptionAmount), remainingAmount: moneyValue(amount.totalAmount), status: amount.totalAmount === 0 ? "EXEMPTED" : "PENDING" });
          }
        } else if (input.command === "DEPOSIT_DRAFT") {
          await requireAccess(ctx.user, "deposits", "create");
          const selected = await tx.select({ payment: paymentTransactions, depositItemId: depositItems.id }).from(paymentTransactions).leftJoin(depositItems, eq(depositItems.paymentTransactionId, paymentTransactions.id)).where(and(eq(paymentTransactions.municipalityId, municipalityId), inArray(paymentTransactions.id, payload.paymentIds)));
          const uniqueSelection = new Set(payload.paymentIds).size === payload.paymentIds.length;
          const ineligible = selected.find(row => !isPaymentEligibleForDeposit({ status: row.payment.status, collectedBy: row.payment.collectedBy, actorId: ctx.user.id, alreadyAssigned: Boolean(row.depositItemId) }));
          if (!uniqueSelection || selected.length !== payload.paymentIds.length || ineligible) throw new TRPCError({ code: "CONFLICT", message: "Le brouillon de versement ne peut plus être soumis : un encaissement est absent, déjà versé ou hors périmètre." });
          const paymentRows = selected.map(row => row.payment); const expectedAmount = paymentRows.reduce((sum, row) => sum + Number(row.netAmount), 0); const differenceAmount = Number(payload.depositedAmount) - expectedAmount;
          await tx.insert(deposits).values({ id: input.entityId, municipalityId, reference: reference("VER"), agentId: ctx.user.id, expectedAmount: moneyValue(expectedAmount), depositedAmount: moneyValue(payload.depositedAmount), differenceAmount: moneyValue(differenceAmount), status: "SUBMITTED", submittedAt: new Date(), observation: payload.observation });
          await tx.insert(depositItems).values(paymentRows.map(payment => ({ depositId: input.entityId, paymentTransactionId: payment.id })));
          await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "DECLARE_OFFLINE", module: "deposits", entityType: "deposit", entityId: input.entityId, afterValue: { paymentIds: payload.paymentIds, expectedAmount, depositedAmount: payload.depositedAmount }, deviceId: input.deviceId });
        } else if (input.command === "CLOSING_DRAFT") {
          await requireAccess(ctx.user, "closings", "create");
          const differenceAmount = Number(payload.depositedAmount) - Number(payload.expectedAmount);
          await tx.insert(dailyClosings).values({ id: input.entityId, municipalityId, agentId: ctx.user.id, businessDate: payload.businessDate, expectedAmount: moneyValue(payload.expectedAmount), depositedAmount: moneyValue(payload.depositedAmount), differenceAmount: moneyValue(differenceAmount), status: "SUBMITTED" });
          await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "SUBMIT_OFFLINE", module: "closings", entityType: "daily_closing", entityId: input.entityId, afterValue: payload, deviceId: input.deviceId });
        } else {
          await requireAccess(ctx.user, "activities", "create");
          if (payload.marketLocationId) await requireTerritoryAccess(ctx.user, "MARKET_LOCATION", payload.marketLocationId);
          else if (payload.marketId) await requireTerritoryAccess(ctx.user, "MARKET", payload.marketId);
          else if (payload.zoneId) await requireTerritoryAccess(ctx.user, "ZONE", payload.zoneId);
          mustGet((await tx.select({ id: taxpayers.id }).from(taxpayers).where(and(eq(taxpayers.id, payload.taxpayerId), eq(taxpayers.municipalityId, municipalityId), eq(taxpayers.status, "ACTIVE"))).limit(1))[0], "Redevable actif introuvable après synchronisation.");
          await tx.insert(activities).values({ id: input.entityId, municipalityId, reference: reference("ACT"), currentTaxpayerId: payload.taxpayerId, activityTypeId: payload.activityTypeId, label: payload.label, locationType: payload.locationType, zoneId: payload.zoneId, marketId: payload.marketId, marketLocationId: payload.marketLocationId, address: payload.address, startedAt: payload.startedAt, createdBy: ctx.user.id });
          await tx.insert(activityOwnerships).values({ activityId: input.entityId, taxpayerId: payload.taxpayerId, startDate: payload.startedAt, transferredBy: ctx.user.id });
        }
        await tx.update(syncOperations).set({ status: "SYNCED", result: { entityId: input.entityId, command: input.command }, processedAt: new Date() }).where(and(eq(syncOperations.deviceId, input.deviceId), eq(syncOperations.operationId, input.operationId)));
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "SYNC", module: "synchronization", entityType: input.command.toLowerCase(), entityId: input.entityId, afterValue: { offlineOperationId: input.operationId, command: input.command }, deviceId: input.deviceId });
      });
      return { status: "SYNCED", entityId: input.entityId, idempotent: false };
    }),
    resolveConflict: protectedProcedure.input(z.object({ conflictId: z.string().uuid(), resolution: z.enum(["SERVER", "LOCAL", "MANUAL"]) })).mutation(async ({ ctx, input }) => {
      const municipalityId = await requireAccess(ctx.user, "synchronization", "resolve"); const db = await requireDb();
      const record = mustGet((await db.select({ conflict: syncConflicts, operation: syncOperations }).from(syncConflicts).innerJoin(syncOperations, eq(syncConflicts.syncOperationId, syncOperations.id)).where(and(eq(syncConflicts.id, input.conflictId), eq(syncOperations.municipalityId, municipalityId))).limit(1))[0], "Conflit de synchronisation introuvable.");
      if (record.conflict.resolution !== "PENDING") throw new TRPCError({ code: "CONFLICT", message: "Ce conflit a déjà été résolu." });
      const plan = syncConflictResolutionPlan(input.resolution);
      await db.transaction(async tx => {
        await tx.update(syncConflicts).set({ resolution: input.resolution, resolvedBy: ctx.user.id, resolvedAt: new Date() }).where(eq(syncConflicts.id, record.conflict.id));
        await tx.update(syncOperations).set({ status: plan.operationStatus, processedAt: new Date(), result: { resolution: input.resolution, localQueueAction: plan.localQueueAction, resolvedAt: new Date().toISOString() } }).where(eq(syncOperations.id, record.operation.id));
        await tx.insert(auditLogs).values({ municipalityId, actorId: ctx.user.id, action: "RESOLVE_CONFLICT", module: "synchronization", entityType: "sync_conflict", entityId: record.conflict.id, beforeValue: { resolution: "PENDING" }, afterValue: { resolution: input.resolution }, deviceId: record.operation.deviceId });
      });
      return { success: true, resolution: input.resolution, localQueueAction: plan.localQueueAction };
    }),
  }),

  audit: router({
    list: protectedProcedure.query(async ({ ctx }) => { requireAdmin(ctx.user); const municipalityId = await requireAccess(ctx.user, "audit", "read"); const db = await requireDb(); return db.select().from(auditLogs).where(eq(auditLogs.municipalityId, municipalityId)).orderBy(desc(auditLogs.createdAt)).limit(200); }),
  }),
});
