export type ReceiptBranding = { name?: string | null; platformName?: string | null; logoUrl?: string | null };

export function normalizeReceiptBranding(input?: ReceiptBranding): Required<ReceiptBranding> {
  return {
    name: input?.name?.trim() || "Mairie municipale",
    platformName: input?.platformName?.trim() || "Gestion des taxes municipales",
    logoUrl: input?.logoUrl?.trim() || "",
  };
}
