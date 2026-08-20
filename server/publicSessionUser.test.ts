import { describe, expect, it } from "vitest";
import type { User } from "../drizzle/schema";
import { toPublicSessionUser } from "./routers";

describe("identité de session publique", () => {
  it("ne laisse jamais les secrets et compteurs d’authentification atteindre le client", () => {
    const publicUser = toPublicSessionUser({
      id: 7, openId: "oauth:test", municipalityId: "20000000-0000-4000-8000-000000000001", name: "Agent", email: "agent@mairie.ga", loginMethod: "local", localUsername: "agent", passwordHash: "secret-hash", credentialVersion: 3, mustChangePassword: true, failedLoginAttempts: 2, lockedUntil: new Date(), archivedAt: null, role: "user", isActive: true, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
    } as User);

    expect(publicUser).toEqual(expect.objectContaining({ id: 7, municipalityId: "20000000-0000-4000-8000-000000000001", role: "user" }));
    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser).not.toHaveProperty("credentialVersion");
    expect(publicUser).not.toHaveProperty("mustChangePassword");
    expect(publicUser).not.toHaveProperty("failedLoginAttempts");
    expect(publicUser).not.toHaveProperty("lockedUntil");
  });
});
