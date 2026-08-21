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
        source: "/:path((?!api/|manus-storage/).*)",
        destination: "/index.html",
      },
    ]);
  });

  it("fournit une entrée Express sans écoute de port pour le runtime serverless", () => {
    const entrypoint = fs.readFileSync(path.join(projectRoot, "server.ts"), "utf8");
    expect(entrypoint).toContain("export default app");
    expect(entrypoint).not.toMatch(/^\s*app\.listen\s*\(/m);
  });
});
