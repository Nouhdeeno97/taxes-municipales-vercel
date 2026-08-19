import { and, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { invitationRoles, InsertUser, roles, testerAccessTokens, userInvitations, userRoles, users } from "../drizzle/schema";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { ENV } from "./_core/env";

let database: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!database && process.env.DATABASE_URL) {
    database = drizzle(process.env.DATABASE_URL);
  }
  return database;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("La base de données est indisponible.");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("L’identifiant d’authentification est requis.");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn: user.lastSignedIn ?? new Date(),
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
  };

  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      lastSignedIn: values.lastSignedIn,
    },
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}

const LOCAL_ACCOUNT_LOCK_ATTEMPTS = 5;
const LOCAL_ACCOUNT_LOCK_MS = 15 * 60 * 1000;

export function normalizeLocalUsername(value: string) {
  const username = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(username)) {
    throw new Error("L’identifiant doit compter 3 à 64 caractères et utiliser uniquement des lettres, chiffres, points, tirets ou traits de soulignement.");
  }
  return username;
}

export function validateLocalPassword(password: string) {
  if (password.length < 10) throw new Error("Le mot de passe temporaire doit compter au moins 10 caractères.");
}

export function hashLocalPassword(password: string) {
  validateLocalPassword(password);
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

export function verifyLocalPasswordHash(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, encodedSalt, encodedDigest] = storedHash.split("$");
  if (algorithm !== "scrypt" || !encodedSalt || !encodedDigest) return false;
  try {
    const suppliedDigest = scryptSync(password, Buffer.from(encodedSalt, "base64url"), 64);
    const savedDigest = Buffer.from(encodedDigest, "base64url");
    return savedDigest.length === suppliedDigest.length && timingSafeEqual(savedDigest, suppliedDigest);
  } catch {
    return false;
  }
}

export async function createLocalUser(input: {
  municipalityId: string;
  displayName: string;
  localUsername: string;
  password: string;
  roleIds: string[];
  createdBy: number;
  isAdministrator?: boolean;
}) {
  const db = await requireDb();
  const displayName = input.displayName.trim();
  if (displayName.length < 2) throw new Error("Le nom complet est requis.");
  const localUsername = normalizeLocalUsername(input.localUsername);
  const passwordHash = hashLocalPassword(input.password);
  const userId = await db.transaction(async tx => {
    const inserted = await tx.insert(users).values({
      openId: `local:${randomUUID()}`,
      municipalityId: input.municipalityId,
      name: displayName,
      localUsername,
      passwordHash,
      loginMethod: "local-password",
      role: input.isAdministrator ? "admin" : "user",
      isActive: true,
      mustChangePassword: true,
      lastSignedIn: new Date(),
    });
    const id = Number(inserted[0].insertId);
    for (const roleId of input.roleIds) {
      await tx.insert(userRoles).values({ id: randomUUID(), userId: id, roleId, assignedBy: input.createdBy });
    }
    return id;
  });
  return { userId, localUsername };
}

export type LocalAuthenticationResult =
  | { status: "AUTHENTICATED"; user: Awaited<ReturnType<typeof getUserById>> }
  | { status: "INVALID" | "LOCKED" | "INACTIVE" };

export async function authenticateLocalUser(localUsernameInput: string, password: string): Promise<LocalAuthenticationResult> {
  const db = await requireDb();
  let localUsername: string;
  try {
    localUsername = normalizeLocalUsername(localUsernameInput);
  } catch {
    return { status: "INVALID" };
  }
  const user = (await db.select().from(users).where(eq(users.localUsername, localUsername)).limit(1))[0];
  if (!user || user.archivedAt || user.loginMethod !== "local-password") return { status: "INVALID" };
  if (!user.isActive) return { status: "INACTIVE" };
  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) return { status: "LOCKED" };
  if (!verifyLocalPasswordHash(password, user.passwordHash)) {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil = failedLoginAttempts >= LOCAL_ACCOUNT_LOCK_ATTEMPTS ? new Date(now.getTime() + LOCAL_ACCOUNT_LOCK_MS) : null;
    await db.update(users).set({ failedLoginAttempts: lockedUntil ? 0 : failedLoginAttempts, lockedUntil }).where(eq(users.id, user.id));
    return { status: "INVALID" };
  }
  await db.update(users).set({ failedLoginAttempts: 0, lockedUntil: null, lastSignedIn: now }).where(eq(users.id, user.id));
  return { status: "AUTHENTICATED", user: { ...user, failedLoginAttempts: 0, lockedUntil: null, lastSignedIn: now } };
}

export async function resetLocalPassword(userId: number, password: string) {
  const db = await requireDb();
  const user = await getUserById(userId);
  if (!user || user.loginMethod !== "local-password" || user.archivedAt) throw new Error("Ce compte local est introuvable ou archivé.");
  await db.update(users).set({ passwordHash: hashLocalPassword(password), mustChangePassword: true, failedLoginAttempts: 0, lockedUntil: null, credentialVersion: user.credentialVersion + 1 }).where(eq(users.id, userId));
}

export async function setLocalUserActive(userId: number, isActive: boolean) {
  const db = await requireDb();
  const user = await getUserById(userId);
  if (!user || user.loginMethod !== "local-password" || user.archivedAt) throw new Error("Ce compte local est introuvable ou archivé.");
  await db.update(users).set({ isActive, credentialVersion: isActive ? user.credentialVersion : user.credentialVersion + 1 }).where(eq(users.id, userId));
}

export async function archiveLocalUser(userId: number) {
  const db = await requireDb();
  const user = await getUserById(userId);
  if (!user || user.loginMethod !== "local-password") throw new Error("Seuls les comptes locaux peuvent être archivés depuis cette action.");
  await db.update(users).set({ isActive: false, archivedAt: new Date(), credentialVersion: user.credentialVersion + 1 }).where(eq(users.id, userId));
}

export function hashTesterAccessToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTesterAccess(input: {
  municipalityId: string;
  displayName: string;
  email?: string | null;
  roleIds: string[];
  createdBy: number;
  expiresAt: Date;
}) {
  const db = await requireDb();
  const rawToken = randomBytes(32).toString("base64url");
  const userOpenId = `tester:${randomUUID()}`;
  const userId = await db.transaction(async tx => {
    const inserted = await tx.insert(users).values({
      openId: userOpenId,
      municipalityId: input.municipalityId,
      name: input.displayName,
      email: input.email ? normalizeInvitationEmail(input.email) : null,
      loginMethod: "temporary-link",
      role: "user",
      isActive: true,
      lastSignedIn: new Date(),
    });
    const id = Number(inserted[0].insertId);
    for (const roleId of input.roleIds) {
      await tx.insert(userRoles).values({ id: randomUUID(), userId: id, roleId, assignedBy: input.createdBy });
    }
    await tx.insert(testerAccessTokens).values({
      id: randomUUID(), userId: id, tokenHash: hashTesterAccessToken(rawToken), expiresAt: input.expiresAt, createdBy: input.createdBy,
    });
    return id;
  });
  return { userId, rawToken };
}

/** Consomme une seule fois le lien et renvoie le compte de test encore actif. */
export async function consumeTesterAccessToken(rawToken: string) {
  const db = await requireDb();
  const now = new Date();
  const token = (await db.select().from(testerAccessTokens).where(and(
    eq(testerAccessTokens.tokenHash, hashTesterAccessToken(rawToken)),
    isNull(testerAccessTokens.redeemedAt), isNull(testerAccessTokens.revokedAt), gt(testerAccessTokens.expiresAt, now),
  )).limit(1))[0];
  if (!token) return undefined;
  const updated = await db.update(testerAccessTokens).set({ redeemedAt: now }).where(and(eq(testerAccessTokens.id, token.id), isNull(testerAccessTokens.redeemedAt)));
  if (!updated[0]?.affectedRows) return undefined;
  const user = await getUserById(token.userId);
  return user?.isActive ? user : undefined;
}

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Applique une préautorisation à un compte Manus lors de sa première connexion OAuth. */
export async function activateInvitationForUser(openId: string, email: string | null | undefined) {
  if (!email) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const user = await getUserByOpenId(openId);
  if (!user) return undefined;
  const invitation = (await db.select().from(userInvitations).where(and(
    eq(userInvitations.email, normalizeInvitationEmail(email)),
    eq(userInvitations.status, "PENDING"),
    or(isNull(userInvitations.expiresAt), gt(userInvitations.expiresAt, new Date())),
  )).limit(1))[0];
  if (!invitation || (user.municipalityId && user.municipalityId !== invitation.municipalityId)) return undefined;

  const assignedRoles = await db.select({ roleId: invitationRoles.roleId }).from(invitationRoles)
    .innerJoin(roles, eq(invitationRoles.roleId, roles.id))
    .where(and(eq(invitationRoles.invitationId, invitation.id), eq(roles.isActive, true)));

  await db.transaction(async tx => {
    await tx.update(users).set({ municipalityId: invitation.municipalityId, isActive: true, role: "user" }).where(eq(users.id, user.id));
    await tx.update(userInvitations).set({ status: "ACTIVATED", activatedUserId: user.id, updatedAt: new Date() }).where(eq(userInvitations.id, invitation.id));
    for (const item of assignedRoles) {
      await tx.insert(userRoles).values({ id: randomUUID(), userId: user.id, roleId: item.roleId, assignedBy: invitation.invitedBy }).onDuplicateKeyUpdate({ set: { expiresAt: null, assignedBy: invitation.invitedBy } });
    }
  });
  return { userId: user.id, municipalityId: invitation.municipalityId, invitationId: invitation.id };
}
