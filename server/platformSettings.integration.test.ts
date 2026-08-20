import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireDb } = vi.hoisted(() => ({ requireDb: vi.fn() }));
vi.mock("./db", () => ({ requireDb }));

import { auditLogs } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const currentSettings = {
  id: municipalityId, code: "LBV", name: "Mairie de Libreville", platformName: "Gestion des taxes municipales", logoUrl: null,
  primaryColor: "#0F5CDB", appearanceMode: "LIGHT", currency: "XAF", timezone: "Africa/Libreville",
};

function context(): TrpcContext {
  return { user: { id: 7, openId: "manus:admin", municipalityId, name: "Administrateur municipal", email: "admin@mairie.ga", loginMethod: "manus", role: "admin", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

function selection(rows: unknown[]) {
  const result = Object.assign([...rows], { limit: vi.fn(() => Promise.resolve([...rows])) });
  return { from: vi.fn(() => ({ where: vi.fn(() => result) })) };
}

describe("municipal.platformSettings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("met à jour l’identité, la couleur et le thème puis écrit une trace d’audit", async () => {
    const audits: Record<string, unknown>[] = [];
    const db = {
      select: vi.fn(() => selection([{ name: currentSettings.name, platformName: currentSettings.platformName, primaryColor: currentSettings.primaryColor, appearanceMode: currentSettings.appearanceMode }])),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve()) })) })),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((value: Record<string, unknown>) => { if (table === auditLogs) audits.push(value); return Promise.resolve(); }) })),
    };
    requireDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).municipal.platformSettings.update({ name: "Mairie de Libreville", platformName: "Portail fiscal de Libreville", primaryColor: "#146C94", appearanceMode: "DARK" })).resolves.toEqual({ success: true });

    expect(db.update).toHaveBeenCalledTimes(1);
    expect(audits).toContainEqual(expect.objectContaining({ municipalityId, actorId: 7, action: "UPDATE", module: "platform-settings", entityType: "municipality", entityId: municipalityId, afterValue: expect.objectContaining({ platformName: "Portail fiscal de Libreville", appearanceMode: "DARK" }) }));
  });

  it("ne révèle publiquement que les données de marque nécessaires à la page de connexion", async () => {
    const db = { select: vi.fn(() => selection([currentSettings])) };
    requireDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).municipal.branding()).resolves.toEqual(expect.objectContaining({ name: "Mairie de Libreville", platformName: "Gestion des taxes municipales", primaryColor: "#0F5CDB", appearanceMode: "LIGHT" }));
  });
});
