import { describe, expect, it, vi } from "vitest";

const getActivePermissionGrants = vi.hoisted(() => vi.fn());
vi.mock("./access", () => ({
  getActivePermissionGrants,
  requireAccess: vi.fn(),
  requireTerritoryAccess: vi.fn(),
}));

import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const limitedUser = {
  id: 91,
  openId: "local:agent-limite",
  municipalityId,
  name: "Agent de formation limité",
  email: null,
  localUsername: "agent.limite",
  loginMethod: "local-password",
  role: "user" as const,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(): TrpcContext {
  return { user: limitedUser, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("municipal.help.permissions", () => {
  it("ne retourne à un compte limité que les permissions réellement actives", async () => {
    const grants = [{ module: "dashboard", action: "read" }, { module: "payments", action: "create" }];
    getActivePermissionGrants.mockResolvedValue(grants);

    await expect(appRouter.createCaller(context()).municipal.help.permissions()).resolves.toEqual(grants);
    expect(getActivePermissionGrants).toHaveBeenCalledWith(expect.objectContaining({ id: limitedUser.id, municipalityId }));
    expect(getActivePermissionGrants).not.toHaveReturnedWith(expect.arrayContaining([{ module: "administration", action: "manage" }]));
  });
});
