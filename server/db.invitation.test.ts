import { describe, expect, it } from "vitest";
import { normalizeInvitationEmail } from "./db";

describe("préautorisation des comptes", () => {
  it("normalise l’adresse d’invitation avant le rapprochement OAuth", () => {
    expect(normalizeInvitationEmail("  Agent.Collecte@Mairie.ga ")).toBe("agent.collecte@mairie.ga");
  });

  it("conserve une adresse déjà normalisée", () => {
    expect(normalizeInvitationEmail("superviseur@mairie.ga")).toBe("superviseur@mairie.ga");
  });
});
