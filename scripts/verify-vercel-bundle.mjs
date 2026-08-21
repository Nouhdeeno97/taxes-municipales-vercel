import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const bundlePath = resolve("serverless/municipal-app.cjs");

if (!existsSync(bundlePath)) {
  throw new Error("Bundle Vercel introuvable : exécutez d’abord build:vercel:api.");
}

const bundledModule = await import(pathToFileURL(bundlePath).href);
const createMunicipalApp = bundledModule.createMunicipalApp ?? bundledModule.default?.createMunicipalApp;

if (typeof createMunicipalApp !== "function") {
  throw new Error("Le bundle Vercel n’exporte pas createMunicipalApp.");
}

console.info("Bundle CommonJS Vercel chargé : createMunicipalApp disponible.");
