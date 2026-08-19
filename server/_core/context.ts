import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getLocalSessionUser } from "./localAccess";
import { getTesterSessionUser } from "./testerAccess";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    // L’absence de session Manus n’est pas une erreur pour un testeur temporaire.
  }

  // Selon le type de requête, l’authentification Manus peut retourner null au
  // lieu de lever une erreur ; la session testeur doit alors être vérifiée aussi.
  if (!user) user = await getLocalSessionUser(opts.req);
  if (!user) user = await getTesterSessionUser(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
