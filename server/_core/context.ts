import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
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
  } catch (error) {
    // Les testeurs sans compte Manus utilisent une session temporaire séparée.
    user = await getTesterSessionUser(opts.req);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
