import type { Express, Request, Response } from "express";
import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import { consumeTesterAccessToken, getUserById } from "../db";
import { ENV } from "./env";
import { getSessionCookieOptions } from "./cookies";

export const TESTER_SESSION_COOKIE = "tm_tester_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function sessionKey() {
  if (!ENV.cookieSecret) throw new Error("La clé de session est indisponible.");
  return encoder.encode(ENV.cookieSecret);
}

async function signTesterSession(userId: number) {
  return new SignJWT({ kind: "tester" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("taxes-municipales")
    .setAudience("tester-session")
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionKey());
}

export async function getTesterSessionUser(req: Request) {
  const raw = parse(req.headers.cookie ?? "")[TESTER_SESSION_COOKIE];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, sessionKey(), { issuer: "taxes-municipales", audience: "tester-session" });
    if (payload.kind !== "tester" || !payload.sub || !/^\d+$/.test(payload.sub)) return null;
    const user = await getUserById(Number(payload.sub));
    return user?.isActive && user.openId.startsWith("tester:") ? user : null;
  } catch {
    return null;
  }
}

export function registerTesterAccessRoutes(app: Express) {
  app.get("/acces-test/:token", async (req: Request, res: Response) => {
    const user = await consumeTesterAccessToken(req.params.token);
    if (!user) {
      res.status(410).type("html").send("<main><h1>Lien indisponible</h1><p>Ce lien a expiré, a déjà été utilisé ou a été révoqué. Demandez un nouveau lien à l’administrateur municipal.</p></main>");
      return;
    }
    const session = await signTesterSession(user.id);
    res.cookie(TESTER_SESSION_COOKIE, session, { ...getSessionCookieOptions(req), maxAge: SESSION_MAX_AGE_SECONDS * 1000 });
    res.redirect("/");
  });

  app.post("/acces-test/deconnexion", (req: Request, res: Response) => {
    res.clearCookie(TESTER_SESSION_COOKIE, getSessionCookieOptions(req));
    res.status(204).end();
  });
}
