import { createHash } from "crypto";

export type MonetaryLine = { amount: number };

export function amountsMatch(left: number, right: number) {
  return Math.abs(left - right) < 0.005;
}

export function sumsMatch(left: MonetaryLine[], right: MonetaryLine[]) {
  return amountsMatch(left.reduce((sum, line) => sum + line.amount, 0), right.reduce((sum, line) => sum + line.amount, 0));
}

export function nextObligationState(remainingAmount: number, settledAmount: number) {
  const remaining = Math.max(0, remainingAmount - settledAmount);
  return { remaining, status: remaining === 0 ? "PAID" as const : "PARTIALLY_PAID" as const };
}

/** Empreinte déterministe d’un reçu : toute altération de la pièce devient détectable. */
export function receiptIntegrityHash(snapshot: unknown) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

export function receiptIntegrityMatches(snapshot: unknown, integrityHash: string) {
  return receiptIntegrityHash(snapshot) === integrityHash;
}

/** Deux tentatives ayant la même identité d’opération doivent produire le même résultat ou un conflit explicite. */
export function syncReplayDisposition(existingPayloadHash: string, incomingPayloadHash: string) {
  return existingPayloadHash === incomingPayloadHash ? "IDEMPOTENT" as const : "CONFLICT" as const;
}

export function syncConflictResolutionPlan(resolution: "SERVER" | "LOCAL" | "MANUAL") {
  if (resolution === "MANUAL") return { operationStatus: "FAILED" as const, localQueueAction: "RETAIN" as const };
  return { operationStatus: "SYNCED" as const, localQueueAction: "ACKNOWLEDGE" as const };
}
