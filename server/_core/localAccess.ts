import type { Request } from "express";
import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
import { getUserById } from "../db";
import { ENV } from "./env";

export const LOCAL_COOKIE = "tm_local_session";
export const LOCAL_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;
const encoder = new TextEncoder();

function sessionKey() {
  if (!ENV.cookieSecret) throw new Error("La clé de session est indisponible.");
  return encoder.encode(ENV.cookieSecret);
}

export async function signLocalSession(userId: number, credentialVersion: number) {
  return new SignJWT({ kind: "local", credentialVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("taxes-municipales")
    .setAudience("local-session")
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${LOCAL_SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionKey());
}

export async function getLocalSessionUser(req: Request) {
  const raw = parse(req.headers.cookie ?? "")[LOCAL_COOKIE];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, sessionKey(), { issuer: "taxes-municipales", audience: "local-session" });
    if (payload.kind !== "local" || !payload.sub || !/^\d+$/.test(payload.sub) || typeof payload.credentialVersion !== "number") return null;
    const user = await getUserById(Number(payload.sub));
    return user && user.loginMethod === "local-password" && user.isActive && !user.archivedAt && user.credentialVersion === payload.credentialVersion ? user : null;
  } catch {
    return null;
  }
}
