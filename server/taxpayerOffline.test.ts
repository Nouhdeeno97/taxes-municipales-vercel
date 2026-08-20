import { describe, expect, it } from "vitest";
import { offlineTaxpayerReplayDisposition } from "./routers/municipal";

const municipalityId = "20000000-0000-4000-8000-000000000001";
const clientTaxpayerId = "30000000-0000-4000-8000-000000000001";
const input = { type: "PERSON" as const, firstName: "Agent", lastName: "Formation", legalName: undefined, nationalId: "FORM-OFF-01", taxId: undefined };

describe("idempotence des redevables hors connexion", () => {
  it("réemploie l’identifiant local lors de la première synchronisation", () => {
    expect(offlineTaxpayerReplayDisposition(undefined, input, municipalityId, clientTaxpayerId)).toEqual({ kind: "CREATE", id: clientTaxpayerId });
  });

  it("reconnaît le replay identique et bloque un payload divergent", () => {
    const existing = { id: clientTaxpayerId, municipalityId, ...input };
    expect(offlineTaxpayerReplayDisposition(existing, input, municipalityId, clientTaxpayerId)).toEqual({ kind: "REPLAY", id: clientTaxpayerId });
    expect(offlineTaxpayerReplayDisposition(existing, { ...input, lastName: "Différent" }, municipalityId, clientTaxpayerId)).toEqual({ kind: "CONFLICT", id: clientTaxpayerId });
  });
});
