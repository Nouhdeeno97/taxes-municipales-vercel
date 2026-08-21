import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const catchAllSource = readFileSync(resolve(process.cwd(), "api/[...path].ts"), "utf8");
const trpcSource = readFileSync(resolve(process.cwd(), "api/trpc/[procedure].ts"), "utf8");
const adapterSource = readFileSync(resolve(process.cwd(), "server/vercelAdapter.ts"), "utf8");
const vercelConfig = readFileSync(resolve(process.cwd(), "vercel.json"), "utf8");

describe("adaptateur Vercel statique", () => {
  it("fait tracer les fonctions API vers la même application Express versionnée", () => {
    expect(catchAllSource).toContain('import { forwardMunicipalApi } from "../server/vercelAdapter";');
    expect(trpcSource).toContain('import { forwardMunicipalApi } from "../../server/vercelAdapter";');
    expect(adapterSource).toContain('import { createMunicipalApp } from "./_core/app";');
    expect(adapterSource).toContain("municipalApp ??= createMunicipalApp()");
  });

  it("n’utilise plus un artefact serveur généré hors Git", () => {
    for (const source of [catchAllSource, trpcSource, vercelConfig]) {
      expect(source).not.toContain("municipal-app.cjs");
      expect(source).not.toContain("includeFiles");
    }
  });
});
