export type OfflineTaxpayerPayload = {
  type: "PERSON" | "COMPANY";
  firstName?: string;
  lastName?: string;
  legalName?: string;
  nationalId?: string;
  taxId?: string;
};

export type PendingTaxpayerRow = OfflineTaxpayerPayload & {
  id: string;
  reference: string;
  status: "PENDING_SYNC";
  createdAt: string;
};

export function isOfflineTaxpayerPayload(value: unknown): value is OfflineTaxpayerPayload {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (candidate.type === "PERSON" || candidate.type === "COMPANY")
    && (typeof candidate.firstName === "string" || typeof candidate.lastName === "string" || typeof candidate.legalName === "string");
}

export function pendingTaxpayerRow(operation: { operationId: string; entityId: string; payload: unknown; createdAt: string }): PendingTaxpayerRow | undefined {
  if (!isOfflineTaxpayerPayload(operation.payload)) return undefined;
  return {
    id: `offline:${operation.entityId}`,
    reference: `LOCAL-${operation.operationId.slice(0, 8).toUpperCase()}`,
    status: "PENDING_SYNC",
    createdAt: operation.createdAt,
    ...operation.payload,
  };
}
