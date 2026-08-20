import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireDb } = vi.hoisted(() => ({ requireDb: vi.fn() }));
vi.mock("./db", () => ({ requireDb }));

import { auditLogs, taxRuleScopes } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const activityTypeId = "20000000-0000-4000-8000-000000000411";

function context(): TrpcContext {
  return {
    user: { id: 7, openId: "manus:admin", municipalityId, name: "Administrateur municipal", email: "admin@mairie.ga", loginMethod: "manus", role: "admin", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function selection(rows: unknown[]) {
  const result = Object.assign([...rows], { limit: vi.fn(() => Promise.resolve([...rows])) });
  return { from: vi.fn(() => ({ where: vi.fn(() => result) })) };
}

describe("municipal.taxation.createRule — portée générique", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persiste les critères territoriaux non choisis comme null afin de ne pas bloquer l’obligation automatique", async () => {
    const scopeValues: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const db = {
      select: vi.fn(() => selection([{ id: "reference-id" }])),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((value: Record<string, unknown>) => {
        if (table === taxRuleScopes) scopeValues.push(value);
        if (table === auditLogs) audits.push(value);
        return Promise.resolve();
      }) })),
    };
    requireDb.mockResolvedValue(db);

    await appRouter.createCaller(context()).municipal.taxation.createRule({
      taxTypeId: "11111111-1111-4111-8111-111111111111",
      periodicityId: "22222222-2222-4222-8222-222222222222",
      code: "GEN-2026",
      label: "Taxe municipale générique de formation",
      baseAmount: 1200,
      graceDays: 0,
      penaltyRate: 0,
      validFrom: new Date("2026-08-20T00:00:00.000Z"),
      scope: { activityTypeId },
    });

    expect(scopeValues).toHaveLength(1);
    expect(scopeValues[0]).toEqual(expect.objectContaining({
      activityTypeId,
      sectorId: null,
      zoneId: null,
      marketId: null,
      marketLocationId: null,
      taxpayerType: null,
    }));
    expect(audits).toContainEqual(expect.objectContaining({ municipalityId, action: "CREATE", module: "fiscality", entityType: "tax_rule" }));
  });

  it("conserve les critères de groupe applicables aux activités et redevables futurs", async () => {
    const scopeValues: Record<string, unknown>[] = [];
    const db = {
      select: vi.fn(() => selection([{ id: "reference-id" }])),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((value: Record<string, unknown>) => {
        if (table === taxRuleScopes) scopeValues.push(value);
        return Promise.resolve();
      }) })),
    };
    requireDb.mockResolvedValue(db);

    await appRouter.createCaller(context()).municipal.taxation.createRule({
      taxTypeId: "11111111-1111-4111-8111-111111111111",
      periodicityId: "22222222-2222-4222-8222-222222222222",
      code: "GRP-2026",
      label: "Taxe de groupe kiosques",
      baseAmount: 1500,
      graceDays: 5,
      penaltyRate: 0,
      validFrom: new Date("2026-08-20T00:00:00.000Z"),
      scope: { activityTypeId, activityLabelQuery: "kiosque", taxpayerNationalId: "NAT-4455", taxpayerFiscalId: "FISC-7788" },
    });

    expect(scopeValues[0]).toEqual(expect.objectContaining({ activityTypeId, activityLabelQuery: "kiosque", taxpayerNationalId: "NAT-4455", taxpayerFiscalId: "FISC-7788" }));
  });
});
