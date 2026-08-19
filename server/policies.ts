import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

export function requireMunicipality(user: User | null | undefined) {
  if (!user?.municipalityId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucune mairie n’est rattachée à ce compte." });
  }
  return user.municipalityId;
}

export function requireAdmin(user: User | null | undefined) {
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentification requise." });
  // Les procédures métier appellent aussi requireAccess(module, action), qui vérifie
  // les rôles municipaux et leurs permissions réelles. Cette garde conserve la
  // compatibilité du bootstrap sans empêcher un rôle municipal correctement attribué.
  return user;
}

/** Réservé aux opérations de plateforme, notamment la création de la première mairie. */
export function requirePlatformAdmin(user: User | null | undefined) {
  if (!user || user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Permission administrative de plateforme requise." });
  }
  return user;
}
