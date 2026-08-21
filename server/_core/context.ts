import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
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
  let user: User | null = await getLocalSessionUser(opts.req);
  if (!user) user = await getTesterSessionUser(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
