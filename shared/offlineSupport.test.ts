import { describe, expect, it } from "vitest";
import { canUseCachedOfflineIdentity, shouldPersistOfflineQuery } from "./offlineSupport";

describe("politique de continuité hors connexion", () => {
  it("conserve les réponses municipales consultées mais pas les autres réponses techniques", () => {
    expect(shouldPersistOfflineQuery(["municipal", "payments", "list"])).toBe(true);
    expect(shouldPersistOfflineQuery(["auth", "me"])).toBe(false);
    expect(shouldPersistOfflineQuery("municipal")).toBe(false);
  });

  it("ne réutilise une identité locale que pendant une indisponibilité réseau", () => {
    expect(canUseCachedOfflineIdentity(false, true)).toBe(true);
    expect(canUseCachedOfflineIdentity(true, true)).toBe(false);
    expect(canUseCachedOfflineIdentity(false, false)).toBe(false);
  });
});
