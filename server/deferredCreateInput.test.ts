import { describe, expect, it } from "vitest";
import { deferredCreateInput } from "./routers/municipal";

const envelope = {
  deviceId: "poste-recette-01",
  operationId: "92000000-0000-4000-8000-000000000091",
  entityId: "92000000-0000-4000-8000-000000000092",
  payloadHash: "a".repeat(64),
};

describe("contrat des créations différées", () => {
  it("accepte les créations fiscales mises en attente hors connexion", () => {
    expect(deferredCreateInput.parse({ ...envelope, command: "ACTIVITY_CATEGORY", payload: { code: "MOBILE", label: "Activité mobile" } }).command).toBe("ACTIVITY_CATEGORY");
    expect(deferredCreateInput.parse({ ...envelope, command: "ACTIVITY_TYPE", payload: { code: "MOBILE-SVC", label: "Service mobile" } }).command).toBe("ACTIVITY_TYPE");
    expect(deferredCreateInput.parse({ ...envelope, command: "ACTIVITY", payload: { taxpayerId: "92000000-0000-4000-8000-000000000093", activityTypeId: "92000000-0000-4000-8000-000000000094", label: "Service mobile de formation", startDate: "2026-08-20" } }).command).toBe("ACTIVITY");
    expect(deferredCreateInput.parse({ ...envelope, command: "SECTOR", payload: { code: "SEC-TEST", label: "Secteur de formation" } }).command).toBe("SECTOR");
    expect(deferredCreateInput.parse({ ...envelope, command: "ZONE", payload: { sectorId: "92000000-0000-4000-8000-000000000093", code: "ZON-TEST", label: "Zone de formation" } }).command).toBe("ZONE");
    expect(deferredCreateInput.parse({ ...envelope, command: "MARKET", payload: { zoneId: "92000000-0000-4000-8000-000000000093", code: "MKT-TEST", label: "Marché de formation" } }).command).toBe("MARKET");
    expect(deferredCreateInput.parse({ ...envelope, command: "MARKET_LOCATION", payload: { marketId: "92000000-0000-4000-8000-000000000093", code: "EMP-TEST", label: "Emplacement de formation" } }).command).toBe("MARKET_LOCATION");
    expect(deferredCreateInput.parse({ ...envelope, command: "TAX_CATEGORY", payload: { code: "DOMAINE", label: "Occupation du domaine public" } }).command).toBe("TAX_CATEGORY");
    expect(deferredCreateInput.parse({ ...envelope, command: "TAX_TYPE", payload: { code: "DOM-ANN", label: "Droit annuel" } }).command).toBe("TAX_TYPE");
    expect(deferredCreateInput.parse({ ...envelope, command: "PERIODICITY", payload: { code: "MENSUEL", label: "Chaque mois", calendarUnit: "MONTH", intervalCount: 1 } }).command).toBe("PERIODICITY");
    expect(deferredCreateInput.parse({ ...envelope, command: "TAX_RULE", payload: { taxTypeId: "92000000-0000-4000-8000-000000000093", periodicityId: "92000000-0000-4000-8000-000000000094", code: "DOM-MENS", label: "Règle mensuelle", baseAmount: 1000, graceDays: 0, penaltyRate: 0, validFrom: "2026-08-20" } }).command).toBe("TAX_RULE");
    expect(deferredCreateInput.parse({ ...envelope, command: "ASSIGN_RULE", payload: { activityId: "92000000-0000-4000-8000-000000000093", taxRuleId: "92000000-0000-4000-8000-000000000094", startDate: "2026-08-20" } }).command).toBe("ASSIGN_RULE");
    expect(deferredCreateInput.parse({ ...envelope, command: "GENERATE_OBLIGATIONS", payload: { activityId: "92000000-0000-4000-8000-000000000093", periodStart: "2026-08-20", periodEnd: "2026-08-20", dueDate: "2026-08-20" } }).command).toBe("GENERATE_OBLIGATIONS");
  });

  it("accepte seulement des brouillons financiers complets et structurés", () => {
    expect(deferredCreateInput.parse({ ...envelope, command: "DEPOSIT_DRAFT", payload: { paymentIds: ["92000000-0000-4000-8000-000000000093"], depositedAmount: 1200, observation: "Remise en attente" } }).command).toBe("DEPOSIT_DRAFT");
    expect(deferredCreateInput.parse({ ...envelope, command: "CLOSING_DRAFT", payload: { businessDate: "2026-08-20", expectedAmount: 1200, depositedAmount: 1200 } }).command).toBe("CLOSING_DRAFT");
  });

  it("refuse une commande inconnue avant toute synchronisation", () => {
    expect(() => deferredCreateInput.parse({ ...envelope, command: "UNKNOWN", payload: {} })).toThrow();
  });
});
