import { describe, expect, it } from "vitest";
import { previewTaxAmount } from "./taxCalculation";

describe("previewTaxAmount", () => {
  it("applique une exonération sans pénalité à l’échéance", () => {
    expect(previewTaxAmount({ baseAmount: 1000, exemptionRate: 0.2 })).toMatchObject({ exemptionAmount: 200, taxableAmount: 800, penaltyAmount: 0, totalAmount: 800 });
  });

  it("applique une pénalité seulement après l’échéance", () => {
    expect(previewTaxAmount({ baseAmount: 1000, penaltyRate: 0.05, daysLate: 1 })).toMatchObject({ penaltyAmount: 50, totalAmount: 1050 });
    expect(previewTaxAmount({ baseAmount: 1000, penaltyRate: 0.05, daysLate: 0 })).toMatchObject({ penaltyAmount: 0, totalAmount: 1000 });
  });

  it("borne les taux et évite les montants négatifs", () => {
    expect(previewTaxAmount({ baseAmount: -10, exemptionRate: 2, penaltyRate: -1, daysLate: 2 })).toMatchObject({ totalAmount: 0 });
  });
});
