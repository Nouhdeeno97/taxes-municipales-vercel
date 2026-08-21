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

  it("retire les références territoriales périmées pour MOBILE et CUSTOM en ligne et hors ligne", () => {
    expect(routerSource).toContain('input.locationType === "MARKET_LOCATION"');
    expect(routerSource).toContain('const isTerritoryFreeActivity = input.locationType === "MOBILE" || input.locationType === "CUSTOM"');
    expect(routerSource).toContain('payload.locationType === "MOBILE" || payload.locationType === "CUSTOM" ? {}');
    expect(routerSource).toContain("MOBILE et CUSTOM ne conservent jamais les références cachées, différées ou périmées");
  });
});
