import { describe, expect, it } from "vitest";
import { normalizeReceiptBranding } from "./receiptBranding";

describe("normalizeReceiptBranding", () => {
  it("conserve les paramètres municipaux actifs destinés au reçu", () => {
    expect(normalizeReceiptBranding({ name: "Mairie d’Owendo", platformName: "Taxes Owendo", logoUrl: "https://exemple.ga/logo.png" })).toEqual({ name: "Mairie d’Owendo", platformName: "Taxes Owendo", logoUrl: "https://exemple.ga/logo.png" });
  });

  it("utilise des libellés sûrs lorsque le paramétrage est incomplet", () => {
    expect(normalizeReceiptBranding({ name: "  ", platformName: null, logoUrl: " " })).toEqual({ name: "Mairie municipale", platformName: "Gestion des taxes municipales", logoUrl: "" });
  });
});
