import { beforeEach, describe, expect, it, vi } from "vitest";

const { getLocalSessionUser, getTesterSessionUser } = vi.hoisted(() => ({
  getLocalSessionUser: vi.fn(),
  getTesterSessionUser: vi.fn(),
}));

vi.mock("./localAccess", () => ({ getLocalSessionUser }));
vi.mock("./testerAccess", () => ({ getTesterSessionUser }));

import { createContext } from "./context";

const tester = {
  id: 27,
  openId: "tester:session-test",
  municipalityId: "20000000-0000-4000-8000-000000000001",
  role: "user",
  isActive: true,
};

describe("createContext — accès autonome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("utilise la session temporaire lorsqu’aucune session locale n’est présente", async () => {
    getLocalSessionUser.mockResolvedValue(null);
    getTesterSessionUser.mockResolvedValue(tester);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(getLocalSessionUser).toHaveBeenCalledOnce();
    expect(getTesterSessionUser).toHaveBeenCalledOnce();
    expect(context.user).toEqual(tester);
  });

  it("privilégie la session locale sur le lien temporaire", async () => {
    const localUser = { ...tester, id: 42, openId: "local:agent.mbouet", localUsername: "agent.mbouet" };
    getLocalSessionUser.mockResolvedValue(localUser);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(context.user).toEqual(localUser);
    expect(getTesterSessionUser).not.toHaveBeenCalled();
  });

  it("retourne une identité nulle si aucune session municipale n’est valide", async () => {
    getLocalSessionUser.mockResolvedValue(null);
    getTesterSessionUser.mockResolvedValue(null);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(context.user).toBeNull();
  });
});
