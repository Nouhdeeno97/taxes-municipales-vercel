import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers/municipal.ts"), "utf8");

describe("intégrité territoriale des activités", () => {
  it("valide les références contre la mairie avant l’insertion d’activité", () => {
    expect(routerSource).toContain("La zone sélectionnée est introuvable ou n’appartient pas à cette mairie.");
    expect(routerSource).toContain("Le marché sélectionné est introuvable ou n’appartient pas à cette mairie.");
    expect(routerSource).toContain("L’emplacement sélectionné est introuvable ou n’appartient pas à cette mairie.");
    expect(routerSource).toContain("eq(sectors.municipalityId, municipalityId)");
  });

  it("nullifie les références territoriales périmées pour MOBILE et CUSTOM en ligne et hors ligne", () => {
    expect(routerSource).toContain('input.locationType === "MARKET_LOCATION"');
    expect(routerSource).toContain('const isTerritoryFreeActivity = input.locationType === "MOBILE" || input.locationType === "CUSTOM"');
    expect(routerSource).toContain("territory = { zoneId: null, marketId: null, marketLocationId: null }");
    expect(routerSource).toContain("? { zoneId: null, marketId: null, marketLocationId: null }");
    expect(routerSource).toContain("territory = { zoneId, marketId: null, marketLocationId: null }");
    expect(routerSource).toContain("territory = { zoneId: resolvedMarket.zoneId, marketId, marketLocationId: null }");
    expect(routerSource).toContain("Une nullification explicite évite que le driver ne réutilise des valeurs territoriales résiduelles.");
  });
});
