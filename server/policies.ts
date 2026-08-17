import { TRPCError } from "@trpc/server";
import type { User } from "../drizzle/schema";

export function requireMunicipality(user: User | null | undefined) {
  if (!user?.municipalityId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Aucune mairie n’est rattachée à ce compte." });
  }
  return user.municipalityId;
}

export function requireAdmin(user: User | null | undefined) {
  if (!user || user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Permission administrative requise." });
  }
  return user;
}
