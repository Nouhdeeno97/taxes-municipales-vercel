import { describe, expect, it } from "vitest";
import { hasPermission, hasTerritoryGrant } from "./access";

describe("contrôles d’accès", () => {
  it("autorise un droit explicite ou à joker sans surautoriser les autres actions", () => {
    expect(hasPermission([{ module: "payments", action: "create" }], "payments", "create")).toBe(true);
    expect(hasPermission([{ module: "payments", action: "create" }], "payments", "validate")).toBe(false);
    expect(hasPermission([{ module: "*", action: "read" }], "audit", "read")).toBe(true);
  });

  it("n’accepte que le périmètre territorial explicitement affecté", () => {
    const grants = [{ territoryType: "MARKET" as const, territoryId: "market-a" }];
    expect(hasTerritoryGrant(grants, "MARKET", "market-a")).toBe(true);
    expect(hasTerritoryGrant(grants, "MARKET", "market-b")).toBe(false);
    expect(hasTerritoryGrant(grants, "ZONE", "market-a")).toBe(false);
  });
});
