import { describe, expect, it, vi } from "vitest";

vi.mock("jspdf", () => ({ jsPDF: vi.fn() }));

import {
  buildObligationExportRows,
  buildReceiptExportRows,
  buildReportExportRows,
  buildTaxpayerExportRows,
} from "../client/src/pages/MunicipalPages";
import { buildCsvContent } from "../shared/exportFormat";

describe("lignes d’export des registres", () => {
  it("n’exporte que les redevables renvoyés par la recherche active", () => {
    const rows = buildTaxpayerExportRows([{ reference: "RDV-CIBLE", type: "PERSON", firstName: "Awa", lastName: "Nzié", status: "ACTIVE", createdAt: "2026-08-20" }]);
    const csv = buildCsvContent([{ key: "reference", label: "Référence" }, { key: "name", label: "Redevable" }], rows);

    expect(rows).toHaveLength(1);
    expect(csv).toContain("RDV-CIBLE");
    expect(csv).not.toContain("RDV-HORS-FILTRE");
  });

  it("exporte uniquement les obligations déjà filtrées par recherche et état", () => {
    const rows = buildObligationExportRows([{ obligation: { reference: "OBL-DUE", dueDate: "2026-08-20", expectedAmount: 1000, remainingAmount: 1000, status: "DUE" }, taxpayer: { legalName: "Commerce ciblé" }, activity: { label: "Occupation temporaire" } }]);

    expect(rows).toEqual([expect.objectContaining({ reference: "OBL-DUE", taxpayer: "Commerce ciblé", status: "DUE" })]);
    expect(rows.map(row => row.reference)).not.toContain("OBL-PAID");
  });

  it("préserve la référence et le montant du reçu sélectionné pour l’export", () => {
    const rows = buildReceiptExportRows([{ receipt: { reference: "REC-CIBLE", qrPayload: "qr", integrityHash: "hash", issuedAt: "2026-08-20", status: "ISSUED" }, payment: { reference: "PAY-CIBLE", netAmount: 2500 }, taxpayer: { firstName: "Mina", lastName: "Koumba" } }]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ reference: "REC-CIBLE", taxpayer: "Koumba Mina", status: "ISSUED" });
    expect(String(rows[0].amount)).toContain("2");
  });

  it("reproduit dans le rapport les trois ventilations retournées pour la période filtrée", () => {
    const rows = buildReportExportRows({ byAgent: [{ label: "Agent ciblé", amount: 1000 }], bySector: [{ label: "Secteur ciblé", amount: 2000 }], byTax: [{ label: "Taxe ciblée", amount: 3000 }] });

    expect(rows).toHaveLength(3);
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ dimension: "Agent", label: "Agent ciblé" }),
      expect.objectContaining({ dimension: "Secteur", label: "Secteur ciblé" }),
      expect.objectContaining({ dimension: "Taxe", label: "Taxe ciblée" }),
    ]));
  });
});
