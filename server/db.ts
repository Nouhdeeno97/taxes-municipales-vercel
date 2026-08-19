import { and, eq, gt, isNull, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { invitationRoles, InsertUser, roles, userInvitations, userRoles, users } from "../drizzle/schema";
import { randomUUID } from "crypto";
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

export function normalizeInvitationEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Applique une préautorisation à un compte Manus lors de sa première connexion OAuth. */
export async function activateInvitationForUser(openId: string, email: string | null | undefined) {
  if (!email) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  const user = await getUserByOpenId(openId);
  if (!user || user.municipalityId) return undefined;
  const invitation = (await db.select().from(userInvitations).where(and(
    eq(userInvitations.email, normalizeInvitationEmail(email)),
    eq(userInvitations.status, "PENDING"),
    or(isNull(userInvitations.expiresAt), gt(userInvitations.expiresAt, new Date())),
  )).limit(1))[0];
  if (!invitation) return undefined;

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
