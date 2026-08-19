import { describe, expect, it } from "vitest";
import { buildCsvContent, escapeCsvValue } from "./exportFormat";

describe("format d’export CSV", () => {
  it("protège les guillemets et les valeurs absentes", () => {
    expect(escapeCsvValue('Marché "central"')).toBe('"Marché ""central"""');
    expect(escapeCsvValue(null)).toBe('""');
  });

  it("exporte exactement les lignes fournies par le filtre actif", () => {
    const csv = buildCsvContent(
      [{ key: "reference", label: "Référence" }, { key: "status", label: "État" }],
      [{ reference: "OBL-002", status: "PENDING" }],
    );
    expect(csv).toBe('"Référence";"État"\n"OBL-002";"PENDING"');
    expect(csv).not.toContain("OBL-001");
  });
});
