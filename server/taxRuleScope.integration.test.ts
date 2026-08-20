import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireDb } = vi.hoisted(() => ({ requireDb: vi.fn() }));
vi.mock("./db", () => ({ requireDb }));

import { auditLogs, taxRules, taxRuleScopes } from "../drizzle/schema";
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

describe("municipal.taxation.createRule — tarification indépendante", () => {
  beforeEach(() => vi.clearAllMocks());

  it("enregistre une règle tarifaire sans portée d’activité afin que l’affectation soit choisie séparément", async () => {
    const scopeValues: Record<string, unknown>[] = [];
    const ruleValues: Record<string, unknown>[] = [];
    const audits: Record<string, unknown>[] = [];
    const db = {
      select: vi.fn(() => selection([{ id: "reference-id" }])),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((value: Record<string, unknown>) => {
        if (table === taxRuleScopes) scopeValues.push(value);
        if (table === taxRules) ruleValues.push(value);
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
    });

    expect(scopeValues).toHaveLength(0);
    expect(ruleValues).toContainEqual(expect.objectContaining({
      taxTypeId: "11111111-1111-4111-8111-111111111111",
      periodicityId: "22222222-2222-4222-8222-222222222222",
      baseAmount: "1200.00",
    }));
    expect(audits).toContainEqual(expect.objectContaining({ municipalityId, action: "CREATE", module: "fiscality", entityType: "tax_rule" }));
  });

  it("refuse une règle dont le montant de base est nul", async () => {
    const db = { select: vi.fn(() => selection([{ id: "reference-id" }])) };
    requireDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).municipal.taxation.createRule({
      taxTypeId: "11111111-1111-4111-8111-111111111111",
      periodicityId: "22222222-2222-4222-8222-222222222222",
      code: "ZERO-2026",
      label: "Règle sans montant",
      baseAmount: 0,
      graceDays: 0,
      penaltyRate: 0,
      validFrom: new Date("2026-08-20T00:00:00.000Z"),
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
