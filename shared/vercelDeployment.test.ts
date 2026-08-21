import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(import.meta.dirname, "..");

describe("préparation Vercel", () => {
  it("déclare une sortie publique, un build Vite dédié et un repli SPA qui préserve les API", () => {
    const config = JSON.parse(fs.readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));

    expect(config.buildCommand).toBe("pnpm run build:vercel");
    expect(config.outputDirectory).toBe("public");
    expect(config.rewrites).toEqual([
      {
        source: "/:path((?!api/).*)",
        destination: "/index.html",
      },
    ]);
  });

  it("fournit une entrée Express sans écoute de port pour le runtime serverless", () => {
    const entrypoint = fs.readFileSync(path.join(projectRoot, "server.ts"), "utf8");
    expect(entrypoint).toContain("export default app");
    expect(entrypoint).not.toMatch(/^\s*app\.listen\s*\(/m);
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
