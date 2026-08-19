import { TRPCError } from "@trpc/server";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import { permissions, rolePermissions, roles, userRoles, userTerritoryAssignments, type User } from "../drizzle/schema";
import { requireDb } from "./db";
import { requireMunicipality } from "./policies";

export type PermissionGrant = { module: string; action: string };
export type TerritoryGrant = { territoryType: "SECTOR" | "ZONE" | "MARKET" | "MARKET_LOCATION"; territoryId: string };

export function hasPermission(grants: PermissionGrant[], module: string, action: string) {
  return grants.some(grant => (grant.module === module || grant.module === "*") && (grant.action === action || grant.action === "*"));
}

export function hasTerritoryGrant(grants: TerritoryGrant[], territoryType: TerritoryGrant["territoryType"], territoryId: string) {
  return grants.some(grant => grant.territoryType === territoryType && grant.territoryId === territoryId);
}

export async function requireAccess(user: User | null | undefined, module: string, action: string) {
  const municipalityId = requireMunicipality(user);
  if (user?.role === "admin") return municipalityId;

  const db = await requireDb();
  const grants = await db
    .select({ module: permissions.module, action: permissions.action })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(
      eq(userRoles.userId, user!.id),
      eq(roles.isActive, true),
      or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)),
      or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, new Date())),
    ));

  const allowed = hasPermission(grants, module, action);
  if (!allowed) throw new TRPCError({ code: "FORBIDDEN", message: `Droit requis : ${module}.${action}` });
  return municipalityId;
}

export async function getActivePermissionGrants(user: User | null | undefined): Promise<PermissionGrant[]> {
  const municipalityId = requireMunicipality(user);
  if (user?.role === "admin") return [{ module: "*", action: "*" }];
  const db = await requireDb();
  return db
    .select({ module: permissions.module, action: permissions.action })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(
      eq(userRoles.userId, user!.id),
      eq(roles.isActive, true),
      or(eq(roles.municipalityId, municipalityId), isNull(roles.municipalityId)),
      or(isNull(userRoles.expiresAt), gt(userRoles.expiresAt, new Date())),
    ));
}

export async function requireTerritoryAccess(user: User | null | undefined, territoryType: "SECTOR" | "ZONE" | "MARKET" | "MARKET_LOCATION", territoryId: string | undefined) {
  if (!territoryId || user?.role === "admin") return;
  const db = await requireDb();
  const assignments = await db.select({ territoryType: userTerritoryAssignments.territoryType, territoryId: userTerritoryAssignments.territoryId })
    .from(userTerritoryAssignments)
    .where(and(eq(userTerritoryAssignments.userId, user!.id), eq(userTerritoryAssignments.isActive, true), or(isNull(userTerritoryAssignments.endDate), gt(userTerritoryAssignments.endDate, new Date()))));
  if (!hasTerritoryGrant(assignments, territoryType, territoryId)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Ce périmètre territorial n’est pas affecté à cet utilisateur." });
  }
}
