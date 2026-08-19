export type TaxPreviewInput = {
  baseAmount: number;
  exemptionRate?: number;
  penaltyRate?: number;
  daysLate?: number;
};

export type TaxPreview = {
  baseAmount: number;
  exemptionAmount: number;
  taxableAmount: number;
  penaltyAmount: number;
  totalAmount: number;
};

const money = (amount: number) => Math.round((Number.isFinite(amount) ? amount : 0) * 100) / 100;

export function previewTaxAmount({ baseAmount, exemptionRate = 0, penaltyRate = 0, daysLate = 0 }: TaxPreviewInput): TaxPreview {
  const normalizedBase = Math.max(0, baseAmount);
  const normalizedExemption = Math.min(1, Math.max(0, exemptionRate));
  const normalizedPenalty = Math.min(1, Math.max(0, penaltyRate));
  const exemptionAmount = money(normalizedBase * normalizedExemption);
  const taxableAmount = money(normalizedBase - exemptionAmount);
  const penaltyAmount = daysLate > 0 ? money(taxableAmount * normalizedPenalty) : 0;
  return {
    baseAmount: money(normalizedBase),
    exemptionAmount,
    taxableAmount,
    penaltyAmount,
    totalAmount: money(taxableAmount + penaltyAmount),
  };
}
