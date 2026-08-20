import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { auditLogs } from "../drizzle/schema";
import type { User } from "../drizzle/schema";
import { authenticateLocalUser, requireDb } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { LOCAL_COOKIE, LOCAL_SESSION_MAX_AGE_SECONDS, signLocalSession } from "./_core/localAccess";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { municipalRouter } from "./routers/municipal";

/** Les secrets et compteurs d’authentification ne doivent jamais quitter le serveur. */
export function toPublicSessionUser(user: User | null) {
  if (!user) return null;
  const { passwordHash: _passwordHash, credentialVersion: _credentialVersion, mustChangePassword: _mustChangePassword, failedLoginAttempts: _failedLoginAttempts, lockedUntil: _lockedUntil, ...publicUser } = user;
  return publicUser;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => toPublicSessionUser(opts.ctx.user)),
    localLogin: publicProcedure.input(z.object({ localUsername: z.string().min(1).max(64), password: z.string().min(1).max(512) })).mutation(async ({ ctx, input }) => {
      const result = await authenticateLocalUser(input.localUsername, input.password);
      if (result.status === "LOCKED") throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Le compte est temporairement verrouillé après plusieurs essais. Réessayez dans quelques minutes ou contactez un administrateur." });
      if (result.status === "INACTIVE") throw new TRPCError({ code: "UNAUTHORIZED", message: "Ce compte est désactivé ou archivé. Contactez un administrateur municipal." });
      if (result.status !== "AUTHENTICATED" || !result.user || !result.user.municipalityId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Identifiant ou mot de passe incorrect." });
      const session = await signLocalSession(result.user.id, result.user.credentialVersion);
      ctx.res.cookie(LOCAL_COOKIE, session, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_SECONDS * 1000 });
      const db = await requireDb();
      await db.insert(auditLogs).values({
        id: randomUUID(), municipalityId: result.user.municipalityId, actorId: result.user.id,
        action: "LOCAL_LOGIN", module: "administration", entityType: "user", entityId: String(result.user.id),
        afterValue: { accessMode: "LOCAL", localUsername: result.user.localUsername },
        ipAddress: ctx.req.socket.remoteAddress ?? null,
      });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie(LOCAL_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      ctx.res.clearCookie("tm_tester_session", { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  municipal: municipalRouter,
});

export type AppRouter = typeof appRouter;
