import { describe, expect, it } from "vitest";
import { normalizeInvitationEmail, prepareOAuthUpsertValues } from "./db";

describe("préautorisation des comptes", () => {
  it("normalise l’adresse d’invitation avant le rapprochement OAuth", () => {
    expect(normalizeInvitationEmail("  Agent.Collecte@Mairie.ga ")).toBe("agent.collecte@mairie.ga");
  });

  it("conserve une adresse déjà normalisée", () => {
    expect(normalizeInvitationEmail("superviseur@mairie.ga")).toBe("superviseur@mairie.ga");
  });

  it("ne rattache pas un premier compte OAuth à une mairie avant l’activation de son invitation", () => {
    const provisional = prepareOAuthUpsertValues({
      openId: "oauth:preautorisation-test",
      email: "agent.preautorise@mairie.ga",
      loginMethod: "manus",
    });

    expect(provisional.municipalityId).toBeNull();
    expect(provisional.role).toBe("user");
  });
});
