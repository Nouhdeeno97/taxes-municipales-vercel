import { beforeEach, describe, expect, it, vi } from "vitest";

const save = vi.fn();
const text = vi.fn();
const setFont = vi.fn();
const setFontSize = vi.fn();

vi.mock("jspdf", () => ({
  jsPDF: vi.fn(() => ({ save, text, setFont, setFontSize })),
}));

import { exportPdf } from "../client/src/pages/MunicipalPages";

describe("export PDF des registres", () => {
  beforeEach(() => {
    save.mockReset();
    text.mockReset();
    setFont.mockReset();
    setFontSize.mockReset();
  });

  it("compose un PDF avec le titre, les colonnes et les lignes filtrées", () => {
    exportPdf(
      "obligations-filtrees",
      "Registre des obligations",
      [{ key: "reference", label: "Référence" }, { key: "amount", label: "Montant" }],
      [{ reference: "OBL-001", amount: "1 000 XAF" }],
    );

    expect(text).toHaveBeenCalledWith("Registre des obligations", 12, 16);
    expect(text).toHaveBeenCalledWith("Référence", 12, expect.any(Number), expect.anything());
    expect(text).toHaveBeenCalledWith("OBL-001", 12, expect.any(Number), expect.anything());
    expect(save).toHaveBeenCalledWith("obligations-filtrees.pdf");
  });
});
