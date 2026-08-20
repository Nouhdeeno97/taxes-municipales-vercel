import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn();
const text = vi.fn();
const setFont = vi.fn();
const setFontSize = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => ({ save, text, setFont, setFontSize, addPage: vi.fn() })),
}));

import {
  OBLIGATION_EXPORT_COLUMNS,
  RECEIPT_EXPORT_COLUMNS,
  REPORT_EXPORT_COLUMNS,
  TAXPAYER_EXPORT_COLUMNS,
  buildObligationExportRows,
  buildReceiptExportRows,
  buildReportExportRows,
  buildTaxpayerExportRows,
  exportCsv,
  exportPdf,
} from "../client/src/pages/MunicipalPages";

type ExportCase = { filename: string; title: string; columns: typeof TAXPAYER_EXPORT_COLUMNS; rows: Record<string, string | number>[]; expectedReference: string; hiddenReference: string };

describe("téléchargements CSV et PDF des registres filtrés", () => {
  const anchors: Array<{ href: string; download: string; click: ReturnType<typeof vi.fn> }> = [];
  const createObjectURL = vi.fn(() => "blob:registre");
  const revokeObjectURL = vi.fn();

  beforeEach(() => {
    anchors.length = 0;
    save.mockReset(); text.mockReset(); setFont.mockReset(); setFontSize.mockReset(); createObjectURL.mockClear(); revokeObjectURL.mockClear();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    vi.stubGlobal("document", { createElement: vi.fn(() => { const anchor = { href: "", download: "", click: vi.fn() }; anchors.push(anchor); return anchor; }) });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("déclenche, pour chaque registre, les deux formats avec les colonnes réelles et le seul sous-ensemble filtré", async () => {
    const cases: ExportCase[] = [
      { filename: "registre-redevables", title: "Registre des redevables", columns: TAXPAYER_EXPORT_COLUMNS, rows: buildTaxpayerExportRows([{ reference: "RDV-FILTRE", type: "PERSON", firstName: "Awa", lastName: "Nzié", status: "ACTIVE", createdAt: "2026-08-20" }]), expectedReference: "RDV-FILTRE", hiddenReference: "RDV-EXCLU" },
      { filename: "echeancier-obligations", title: "Échéancier des obligations", columns: OBLIGATION_EXPORT_COLUMNS, rows: buildObligationExportRows([{ obligation: { reference: "OBL-FILTRE", dueDate: "2026-08-20", expectedAmount: 1000, remainingAmount: 750, status: "DUE" }, taxpayer: { legalName: "Activité ciblée" }, activity: { label: "Occupation du domaine public" } }]), expectedReference: "OBL-FILTRE", hiddenReference: "OBL-EXCLUE" },
      { filename: "registre-recus", title: "Registre des reçus", columns: RECEIPT_EXPORT_COLUMNS, rows: buildReceiptExportRows([{ receipt: { reference: "REC-FILTRE", qrPayload: "qr", integrityHash: "hash", issuedAt: "2026-08-20", status: "ISSUED" }, payment: { reference: "PAY-1", netAmount: 2500 }, taxpayer: { legalName: "Contribuable ciblé" } }]), expectedReference: "REC-FILTRE", hiddenReference: "REC-EXCLU" },
      { filename: "rapport-recettes", title: "Rapport des recettes", columns: REPORT_EXPORT_COLUMNS, rows: buildReportExportRows({ byAgent: [{ label: "Agent filtré", amount: 1000 }], bySector: [{ label: "Secteur filtré", amount: 2000 }], byTax: [{ label: "Taxe filtrée", amount: 3000 }] }), expectedReference: "Agent filtré", hiddenReference: "Agent exclu" },
    ];

    for (const item of cases) {
      exportCsv(item.filename, item.columns, item.rows);
      const blob = createObjectURL.mock.calls.at(-1)?.[0] as Blob;
      const csv = await blob.text();

      expect(anchors.at(-1)?.download).toBe(`${item.filename}.csv`);
      expect(csv).toContain(item.expectedReference);
      expect(csv).not.toContain(item.hiddenReference);
      item.columns.forEach(column => expect(csv).toContain(column.label));

      exportPdf(item.filename, item.title, item.columns, item.rows);
      expect(save).toHaveBeenLastCalledWith(`${item.filename}.pdf`);
      expect(text).toHaveBeenCalledWith(item.title, 12, 16);
      item.columns.forEach(column => expect(text).toHaveBeenCalledWith(column.label.slice(0, 24), expect.any(Number), expect.any(Number), expect.anything()));
      expect(text.mock.calls.some(call => call[0] === item.expectedReference)).toBe(true);
    }
  });
});
