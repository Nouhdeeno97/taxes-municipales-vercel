import { describe, expect, it } from "vitest";
import { amountsMatch, isPaymentEligibleForDeposit, nextObligationState, receiptIntegrityHash, receiptIntegrityMatches, sumsMatch, syncConflictResolutionPlan, syncReplayDisposition } from "./domainRules";

describe("règles d’encaissement", () => {
  it("tolère uniquement l’écart d’arrondi prévu entre allocations et obligations", () => {
    expect(amountsMatch(1250, 1250.004)).toBe(true);
    expect(amountsMatch(1250, 1250.01)).toBe(false);
    expect(sumsMatch([{ amount: 400 }, { amount: 600 }], [{ amount: 1000 }])).toBe(true);
  });

  it("fait évoluer une obligation sans montant négatif", () => {
    expect(nextObligationState(1000, 400)).toEqual({ remaining: 600, status: "PARTIALLY_PAID" });
    expect(nextObligationState(1000, 1500)).toEqual({ remaining: 0, status: "PAID" });
  });

  it("n’autorise un versement que pour un encaissement validé, détenu par l’agent et non déjà rapproché", () => {
    expect(isPaymentEligibleForDeposit({ status: "VALIDATED", collectedBy: 7, actorId: 7, alreadyAssigned: false })).toBe(true);
    expect(isPaymentEligibleForDeposit({ status: "VALIDATED", collectedBy: 7, actorId: 7, alreadyAssigned: true })).toBe(false);
    expect(isPaymentEligibleForDeposit({ status: "VALIDATED", collectedBy: 8, actorId: 7, alreadyAssigned: false })).toBe(false);
    expect(isPaymentEligibleForDeposit({ status: "CANCELLED", collectedBy: 7, actorId: 7, alreadyAssigned: false })).toBe(false);
  });

  it("détecte toute altération d’un reçu définitif", () => {
    const snapshot = { reference: "REC-2026-0001", amount: "1500.00", items: [{ obligationId: "obl-1", amount: 1500 }] };
    const integrityHash = receiptIntegrityHash(snapshot);
    expect(receiptIntegrityMatches(snapshot, integrityHash)).toBe(true);
    expect(receiptIntegrityMatches({ ...snapshot, amount: "1200.00" }, integrityHash)).toBe(false);
  });

  it("distingue une reprise idempotente d’un conflit de synchronisation", () => {
    expect(syncReplayDisposition("hash-a", "hash-a")).toBe("IDEMPOTENT");
    expect(syncReplayDisposition("hash-a", "hash-b")).toBe("CONFLICT");
  });

  it("définit une reprise contrôlée pour chaque décision de conflit", () => {
    expect(syncConflictResolutionPlan("SERVER")).toEqual({ operationStatus: "SYNCED", localQueueAction: "ACKNOWLEDGE" });
    expect(syncConflictResolutionPlan("LOCAL")).toEqual({ operationStatus: "SYNCED", localQueueAction: "ACKNOWLEDGE" });
    expect(syncConflictResolutionPlan("MANUAL")).toEqual({ operationStatus: "FAILED", localQueueAction: "RETAIN" });
  });
});
