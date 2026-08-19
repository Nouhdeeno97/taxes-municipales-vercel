import { and, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { invitationRoles, InsertUser, roles, testerAccessTokens, userInvitations, userRoles, users } from "../drizzle/schema";
import { createHash, randomBytes, randomUUID } from "crypto";
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
