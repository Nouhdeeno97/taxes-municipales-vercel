import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(resolve(process.cwd(), "server/routers/municipal.ts"), "utf8");
const mainSource = readFileSync(resolve(process.cwd(), "client/src/main.tsx"), "utf8");
const rolePageSource = readFileSync(resolve(process.cwd(), "client/src/pages/RolePermissionPage.tsx"), "utf8");
const auditPageSource = readFileSync(resolve(process.cwd(), "client/src/pages/AuditLogPage.tsx"), "utf8");

describe("résilience des écrans administratifs", () => {
  it("regroupe les référentiels de droits et borne la recherche des utilisateurs affectables", () => {
    expect(routerSource).toContain("overview: protectedProcedure.query");
    expect(routerSource).toContain("assignableUsers: protectedProcedure.input");
    expect(routerSource).toContain(".limit(50);");
    expect(rolePageSource).toContain("municipal.administration.overview.useQuery");
    expect(rolePageSource).toContain("municipal.administration.assignableUsers.useQuery");
  });

  it("isole les appels tRPC sans annuler les flux d’authentification", () => {
    expect(mainSource).toContain("maxItems: 1");
    expect(mainSource).not.toContain("timeoutController.abort()");
    expect(mainSource).not.toContain("AbortSignal.any");
  });

  it("stabilise l’entrée du journal et joint son auteur lors du comptage filtré", () => {
    expect(auditPageSource).toContain("const auditInput = useMemo");
    expect(auditPageSource).toContain("audit.refetch()");
    expect(routerSource).toContain("from(auditLogs).leftJoin(users, eq(auditLogs.actorId, users.id)).where(conditions)");
  });
});
