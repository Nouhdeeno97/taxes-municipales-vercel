import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAccess, requireDb } = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  requireDb: vi.fn(),
}));

vi.mock("./db", () => ({ requireDb }));
vi.mock("./access", () => ({ getActivePermissionGrants: vi.fn(), requireAccess, requireTerritoryAccess: vi.fn() }));

import { auditLogs, receiptPrintHistory, receipts } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const receiptId = "92000000-0000-4000-8000-000000000001";
const receipt = {
  id: receiptId,
  municipalityId,
  reference: "FORM-LBV-REC-001",
  status: "FINAL",
  immutableSnapshot: { reference: "FORM-LBV-REC-001", amount: "1000.00" },
};

function context(): TrpcContext {
  return {
    user: { id: 7, openId: "manus:admin", municipalityId, name: "Administrateur municipal", email: "admin@mairie.ga", loginMethod: "manus", role: "admin", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("municipal.payments.reprintReceipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAccess.mockResolvedValue(municipalityId);
  });

  it("retourne le reçu final intact et trace la réimpression sans le modifier", async () => {
    const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve([receipt])) })) })) })),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((values: Record<string, unknown>) => { writes.push({ table, values }); return Promise.resolve(); }) })),
    };
    requireDb.mockResolvedValue(db);

    const result = await appRouter.createCaller(context()).municipal.payments.reprintReceipt({ receiptId, deviceId: "poste-recette-01" });

    expect(result).toBe(receipt);
    expect(result.immutableSnapshot).toEqual({ reference: "FORM-LBV-REC-001", amount: "1000.00" });
    expect(writes).toContainEqual({ table: receiptPrintHistory, values: expect.objectContaining({ receiptId, printType: "REPRINT", printedBy: 7, deviceId: "poste-recette-01" }) });
    expect(writes).toContainEqual({ table: auditLogs, values: expect.objectContaining({ municipalityId, actorId: 7, action: "REPRINT", module: "receipts", entityId: receiptId }) });
    expect(writes.some(write => write.table === receipts)).toBe(false);
  });
});
