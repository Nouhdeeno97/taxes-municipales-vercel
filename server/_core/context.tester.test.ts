import { beforeEach, describe, expect, it, vi } from "vitest";

const { authenticateRequest, getLocalSessionUser, getTesterSessionUser } = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getLocalSessionUser: vi.fn(),
  getTesterSessionUser: vi.fn(),
}));

vi.mock("./sdk", () => ({ sdk: { authenticateRequest } }));
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

describe("createContext — accès testeur", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("utilise la session testeur lorsque Manus retourne null", async () => {
    authenticateRequest.mockResolvedValue(null);
    getLocalSessionUser.mockResolvedValue(null);
    getTesterSessionUser.mockResolvedValue(tester);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(getLocalSessionUser).toHaveBeenCalledOnce();
    expect(getTesterSessionUser).toHaveBeenCalledOnce();
    expect(context.user).toEqual(tester);
  });

  it("utilise la session testeur lorsqu’une vérification Manus échoue", async () => {
    authenticateRequest.mockRejectedValue(new Error("session Manus absente"));
    getLocalSessionUser.mockResolvedValue(null);
    getTesterSessionUser.mockResolvedValue(tester);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(context.user).toEqual(tester);
  });

  it("préserve en priorité une session Manus valide", async () => {
    const manusUser = { ...tester, id: 1, openId: "manus:agent" };
    authenticateRequest.mockResolvedValue(manusUser);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(getLocalSessionUser).not.toHaveBeenCalled();
    expect(getTesterSessionUser).not.toHaveBeenCalled();
    expect(context.user).toEqual(manusUser);
  });

  it("privilégie la session locale sur le lien testeur lorsque Manus est absent", async () => {
    const localUser = { ...tester, id: 42, openId: "local:agent.mbouet", localUsername: "agent.mbouet" };
    authenticateRequest.mockResolvedValue(null);
    getLocalSessionUser.mockResolvedValue(localUser);

    const context = await createContext({ req: { headers: {} }, res: {} } as any);

    expect(context.user).toEqual(localUser);
    expect(getTesterSessionUser).not.toHaveBeenCalled();
  });
});
