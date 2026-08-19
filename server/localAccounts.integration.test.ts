import { beforeEach, describe, expect, it, vi } from "vitest";

const { archiveLocalUser, createLocalUser, requireAccess, requireDb, resetLocalPassword, setLocalUserActive } = vi.hoisted(() => ({
  archiveLocalUser: vi.fn(),
  createLocalUser: vi.fn(),
  requireAccess: vi.fn(),
  requireDb: vi.fn(),
  resetLocalPassword: vi.fn(),
  setLocalUserActive: vi.fn(),
}));

vi.mock("./db", () => ({ archiveLocalUser, createLocalUser, requireDb, resetLocalPassword, setLocalUserActive }));
vi.mock("./access", () => ({ getActivePermissionGrants: vi.fn(), requireAccess, requireTerritoryAccess: vi.fn() }));

import { auditLogs } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const roleId = "30000000-0000-4000-8000-000000000001";
const targetId = 51;
const target = {
  id: targetId,
  municipalityId,
  localUsername: "agent.mbouet",
  loginMethod: "local-password",
  isActive: true,
  archivedAt: null,
  credentialVersion: 1,
};

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

function lifecycleDb(rows: unknown[][]) {
  const audits: Record<string, unknown>[] = [];
  return {
    audits,
    select: vi.fn(() => selection(rows.shift() ?? [])),
    insert: vi.fn((table: unknown) => ({ values: vi.fn((value: Record<string, unknown>) => { if (table === auditLogs) audits.push(value); return Promise.resolve(); }) })),
  };
}

describe("municipal.administration — comptes locaux", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAccess.mockResolvedValue(municipalityId);
  });

  it("crée un compte local avec rôles et consigne sa création sans journaliser le mot de passe", async () => {
    const db = lifecycleDb([[{ id: roleId }], []]);
    requireDb.mockResolvedValue(db);
    createLocalUser.mockResolvedValue({ userId: targetId, localUsername: "agent.mbouet" });

    const result = await appRouter.createCaller(context()).municipal.administration.createLocalUser({
      displayName: "Agent de secteur", localUsername: "agent.mbouet", password: "MotDePasseSolide2026", roleIds: [roleId], isAdministrator: false,
    });

    expect(result).toEqual({ userId: targetId, localUsername: "agent.mbouet" });
    expect(createLocalUser).toHaveBeenCalledWith(expect.objectContaining({ municipalityId, createdBy: 7, roleIds: [roleId], password: "MotDePasseSolide2026" }));
    expect(db.audits).toContainEqual(expect.objectContaining({ actorId: 7, action: "CREATE", module: "administration", entityType: "user", entityId: String(targetId), afterValue: expect.not.objectContaining({ password: expect.anything() }) }));
  });

  it("réinitialise, désactive et archive un compte local en conservant une trace pour chaque action", async () => {
    const scenarios = [
      { action: "RESET_PASSWORD", invoke: () => appRouter.createCaller(context()).municipal.administration.resetLocalPassword({ userId: targetId, password: "NouveauMotDePasse2026" }), assertion: () => expect(resetLocalPassword).toHaveBeenCalledWith(targetId, "NouveauMotDePasse2026") },
      { action: "DEACTIVATE", invoke: () => appRouter.createCaller(context()).municipal.administration.setUserActive({ userId: targetId, isActive: false }), assertion: () => expect(setLocalUserActive).toHaveBeenCalledWith(targetId, false) },
      { action: "ARCHIVE", invoke: () => appRouter.createCaller(context()).municipal.administration.archiveLocalUser({ userId: targetId }), assertion: () => expect(archiveLocalUser).toHaveBeenCalledWith(targetId) },
    ];

    for (const scenario of scenarios) {
      vi.clearAllMocks();
      requireAccess.mockResolvedValue(municipalityId);
      const db = lifecycleDb([[target]]);
      requireDb.mockResolvedValue(db);
      await expect(scenario.invoke()).resolves.toEqual({ success: true });
      scenario.assertion();
      expect(db.audits).toContainEqual(expect.objectContaining({ actorId: 7, action: scenario.action, module: "administration", entityType: "user", entityId: String(targetId) }));
    }
  });

  it("réactive un compte local et enregistre l’action de manière explicite", async () => {
    const db = lifecycleDb([[{ ...target, isActive: false }]]);
    requireDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).municipal.administration.setUserActive({ userId: targetId, isActive: true })).resolves.toEqual({ success: true });

    expect(setLocalUserActive).toHaveBeenCalledWith(targetId, true);
    expect(db.audits).toContainEqual(expect.objectContaining({ action: "ACTIVATE", beforeValue: { isActive: false }, afterValue: { userId: targetId, isActive: true } }));
  });

  it("retourne les traces d’audit de la mairie, jointes à l’identité de leur auteur", async () => {
    const rows = [{ id: "audit-1", action: "ARCHIVE", module: "administration", entityType: "user", entityId: String(targetId), actorId: 7, actorName: "Administrateur municipal", actorUsername: null, createdAt: new Date() }];
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ leftJoin: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(rows)) })) })) })) })) })),
    };
    requireDb.mockResolvedValue(db);

    await expect(appRouter.createCaller(context()).municipal.administration.auditLog({ module: "administration", actorId: 7, limit: 50 })).resolves.toEqual(rows);
  });
});
