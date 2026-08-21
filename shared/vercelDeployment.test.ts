import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("préparation Vercel", () => {
  it("déclare une sortie publique, un bundle backend et un repli SPA qui préserve strictement les API", () => {
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));

    expect(config.buildCommand).toBe("pnpm run build:vercel");
    expect(config.outputDirectory).toBe("public");
    expect(config.functions).toEqual({
      "api/[...path].ts": {
        includeFiles: "serverless/municipal-app.cjs",
      },
      "api/trpc/[procedure].ts": {
        includeFiles: "serverless/municipal-app.cjs",
      },
    });
    expect(config.rewrites).toEqual([
      {
        source: "/:path((?!api(?:/|$)).*)",
        destination: "/index.html",
      },
    ]);
  });

  it("fournit une fonction Vercel dynamique avec une santé isolée et un backend regroupé", () => {
    const entrypoint = fs.readFileSync(path.join(projectRoot, "server.ts"), "utf8");
    const vercelFunction = fs.readFileSync(path.join(projectRoot, "api", "[...path].ts"), "utf8");
    const trpcProcedureFunction = fs.readFileSync(path.join(projectRoot, "api", "trpc", "[procedure].ts"), "utf8");
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

    expect(entrypoint).toContain("export default app");
    expect(entrypoint).not.toMatch(/^\s*app\.listen\s*\(/m);
    expect(vercelFunction).toContain('join(process.cwd(), "serverless", "municipal-app.cjs")');
    expect(vercelFunction).toContain("pathToFileURL");
    expect(vercelFunction).toContain("await import(moduleUrl)");
    expect(vercelFunction).toContain('requestPathname(request) === "/api/health"');
    expect(vercelFunction).toContain("sendHealth(response)");
    expect(vercelFunction).toContain("export function forwardMunicipalApi");
    expect(vercelFunction).not.toContain('import { createMunicipalApp } from "../server/_core/app"');
    expect(vercelFunction).not.toMatch(/^\s*app\.listen\s*\(/m);
    expect(trpcProcedureFunction).toContain('import { forwardMunicipalApi } from "../[...path]"');
    expect(trpcProcedureFunction).toContain("forwardMunicipalApi(request, response)");

    expect(packageJson.scripts["build:vercel:api"]).toContain("--bundle");
    expect(packageJson.scripts["build:vercel:api"]).toContain("--format=cjs");
    expect(packageJson.scripts["build:vercel:api"]).toContain("serverless/municipal-app.cjs");
    expect(packageJson.scripts["verify:vercel-bundle"]).toContain("scripts/verify-vercel-bundle.mjs");
  });

  it("déclare une cible PostgreSQL Supabase sans dépendance Manus obligatoire", () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
    const environment = fs.readFileSync(path.join(projectRoot, "server", "_core", "env.ts"), "utf8");
    const storage = fs.readFileSync(path.join(projectRoot, "server", "storage.ts"), "utf8");
    const viteConfig = fs.readFileSync(path.join(projectRoot, "vite.config.ts"), "utf8");

    expect(packageJson.dependencies.postgres).toBeDefined();
    expect(packageJson.dependencies["@supabase/supabase-js"]).toBeDefined();
    expect(packageJson.dependencies.mysql2).toBeUndefined();
    expect(packageJson.devDependencies["vite-plugin-manus-runtime"]).toBeUndefined();
    expect(environment).toContain("process.env.DATABASE_URL");
    expect(environment).toContain("process.env.SUPABASE_URL");
    expect(environment).toContain("process.env.SUPABASE_SERVICE_ROLE_KEY");
    expect(environment).not.toContain("BUILT_IN_FORGE");
    expect(storage).toContain("@supabase/supabase-js");
    expect(viteConfig).not.toContain("vite-plugin-manus-runtime");
  });
});
