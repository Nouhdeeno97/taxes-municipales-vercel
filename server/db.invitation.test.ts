import { describe, expect, it, vi } from "vitest";
import { invitationRoles, roles, userInvitations, userRoles, users } from "../drizzle/schema";
import { activateInvitationForUser, normalizeInvitationEmail, prepareOAuthUpsertValues } from "./db";

describe("préautorisation interne des comptes", () => {
  it("normalise l’adresse d’invitation avant le rapprochement du compte", () => {
    expect(normalizeInvitationEmail("  Agent.Collecte@Mairie.ga ")).toBe("agent.collecte@mairie.ga");
  });

  it("conserve une adresse déjà normalisée", () => {
    expect(normalizeInvitationEmail("superviseur@mairie.ga")).toBe("superviseur@mairie.ga");
  });

  it("ne rattache pas un compte provisoire à une mairie avant l’activation de son invitation", () => {
    const provisional = prepareOAuthUpsertValues({
      openId: "provisional:preautorisation-test",
      email: "agent.preautorise@mairie.ga",
      loginMethod: "provisional",
    });

    expect(provisional.municipalityId).toBeNull();
    expect(provisional.role).toBe("user");
  });

  it("rattache seulement après activation le compte provisoire et lui attribue les rôles invités", async () => {
    const provisional = prepareOAuthUpsertValues({
      openId: "provisional:flux-complet-test",
      email: "agent.collecte@mairie.ga",
      loginMethod: "provisional",
    });
    const municipalityId = "20000000-0000-4000-8000-000000000001";
    const roleIds = ["role-collecte", "role-consultation"];
    const user = { id: 91, openId: provisional.openId, municipalityId: provisional.municipalityId, isActive: false };
    const invitation = { id: "invitation-oauth-91", municipalityId, invitedBy: 7 };
    const writes: Array<{ table: unknown; values: Record<string, unknown> }> = [];
    const selection = (rows: unknown[]) => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn(() => Promise.resolve(rows)) })) })) });
    const transaction = {
      update: vi.fn((table: unknown) => ({ set: vi.fn((values: Record<string, unknown>) => ({ where: vi.fn(() => { writes.push({ table, values }); return Promise.resolve(); }) })) })),
      insert: vi.fn((table: unknown) => ({ values: vi.fn((values: Record<string, unknown>) => ({ onConflictDoUpdate: vi.fn(() => { writes.push({ table, values }); return Promise.resolve(); }) })) })),
    };
    const db = {
      select: vi.fn()
        .mockReturnValueOnce(selection([invitation]))
        .mockReturnValueOnce({ from: vi.fn(() => ({ innerJoin: vi.fn(() => ({ where: vi.fn(() => Promise.resolve(roleIds.map(roleId => ({ roleId })))) })) })) }),
      transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction)),
    };

    expect(provisional.municipalityId).toBeNull();

    const activation = await activateInvitationForUser(provisional.openId, provisional.email, {
      db: db as never,
      getUserByOpenId: vi.fn(async () => user) as never,
    });

    expect(activation).toEqual({
      userId: 91,
      municipalityId,
      invitationId: "invitation-oauth-91",
    });
    expect(writes).toContainEqual({ table: users, values: { municipalityId, isActive: true, role: "user" } });
    expect(writes).toContainEqual({ table: userInvitations, values: expect.objectContaining({ status: "ACTIVATED", activatedUserId: 91 }) });
    expect(writes.filter(write => write.table === userRoles).map(write => write.values.roleId)).toEqual(roleIds);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(invitationRoles).toBeDefined();
    expect(roles).toBeDefined();
  });
});
