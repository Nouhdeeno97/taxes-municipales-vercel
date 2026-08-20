import { describe, expect, it } from "vitest";
import { getOfflineCapabilityMessage } from "./offlineCapabilities";

describe("getOfflineCapabilityMessage", () => {
  it("explique les contrôles d’accès qui doivent rester en ligne", () => {
    expect(getOfflineCapabilityMessage("/utilisateurs")).toContain("exigent une connexion");
    expect(getOfflineCapabilityMessage("/roles-permissions")).toContain("manière sécurisée");
  });

  it("ne masque pas les parcours métier différables", () => {
    expect(getOfflineCapabilityMessage("/redevables")).toBeUndefined();
    expect(getOfflineCapabilityMessage("/activites")).toBeUndefined();
  });
});
