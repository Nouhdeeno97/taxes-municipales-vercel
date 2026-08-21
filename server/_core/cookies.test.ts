import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

function requestFor(protocol: string, forwardedProto?: string) {
  return {
    protocol,
    headers: forwardedProto ? { "x-forwarded-proto": forwardedProto } : {},
  } as Request;
}

describe("getSessionCookieOptions", () => {
  it("utilise un cookie intersite sécurisé derrière le proxy HTTPS de Vercel", () => {
    expect(getSessionCookieOptions(requestFor("http", "https"))).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
    });
  });

  it("conserve un cookie local fonctionnel hors HTTPS", () => {
    expect(getSessionCookieOptions(requestFor("http"))).toEqual({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: false,
    });
  });
});
