import { describe, expect, it } from "vitest";
import { hashLocalPassword, normalizeLocalUsername, verifyLocalPasswordHash } from "./db";

describe("identifiants municipaux locaux", () => {
  it("normalise un identifiant sans conserver les espaces ou la casse", () => {
    expect(normalizeLocalUsername("  Agent.MBouet ")).toBe("agent.mbouet");
  });

  it("refuse les identifiants qui ne respectent pas le format municipal", () => {
    expect(() => normalizeLocalUsername("agent collecte")).toThrow("3 à 64 caractères");
    expect(() => normalizeLocalUsername("ab")).toThrow("3 à 64 caractères");
  });

  it("hache un mot de passe sans le conserver en clair et vérifie uniquement la bonne valeur", async () => {
    const password = "UnePhraseDePasseSolide2026";
    const hash = await hashLocalPassword(password);

    expect(hash).not.toContain(password);
    expect(await verifyLocalPasswordHash(password, hash)).toBe(true);
    expect(await verifyLocalPasswordHash("UneAutreValeur2026", hash)).toBe(false);
  });
});
