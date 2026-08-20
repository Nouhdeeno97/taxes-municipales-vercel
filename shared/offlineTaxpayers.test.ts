import { describe, expect, it } from "vitest";
import { isOfflineTaxpayerPayload, pendingTaxpayerRow } from "./offlineTaxpayers";

describe("redevables hors connexion", () => {
  it("construit une ligne locale lisible pour une création mise en attente", () => {
    expect(pendingTaxpayerRow({ operationId: "abcd1234-0000-4000-8000-000000000001", entityId: "eeeeeeee-0000-4000-8000-000000000001", createdAt: "2026-08-20T10:00:00.000Z", payload: { type: "PERSON", lastName: "Formation", firstName: "Agent" } })).toMatchObject({
      id: "offline:eeeeeeee-0000-4000-8000-000000000001",
      reference: "LOCAL-ABCD1234",
      status: "PENDING_SYNC",
      lastName: "Formation",
    });
  });

  it("refuse les opérations locales qui ne contiennent pas un redevable valide", () => {
    expect(isOfflineTaxpayerPayload({ type: "PERSON" })).toBe(false);
    expect(pendingTaxpayerRow({ operationId: "operation", entityId: "entity", createdAt: "2026-08-20T10:00:00.000Z", payload: { invalid: true } })).toBeUndefined();
  });
});
