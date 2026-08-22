import { existsSync } from "node:fs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const bundlePath = resolve("serverless/municipal-app.cjs");

if (!existsSync(bundlePath)) {
  throw new Error("Bundle Vercel introuvable : exécutez d’abord build:vercel:api.");
}

const bundledModule = await import(pathToFileURL(bundlePath).href);
const createMunicipalApp = bundledModule.createMunicipalApp ?? bundledModule.default?.createMunicipalApp;
const buildId = bundledModule.MUNICIPAL_API_BUILD_ID ?? bundledModule.default?.MUNICIPAL_API_BUILD_ID;

if (typeof createMunicipalApp !== "function") {
  throw new Error("Le bundle Vercel n’exporte pas createMunicipalApp.");
}

if (buildId !== "mobile-territory-v9") {
  throw new Error(`Le bundle Vercel ne correspond pas à la révision MOBILE attendue (empreinte reçue : ${String(buildId)}).`);
}

const bundleContent = readFileSync(bundlePath, "utf8");
const mobileTerritoryGuard = 'input.locationType === "MOBILE" || input.locationType === "CUSTOM"';

if (!bundleContent.includes(mobileTerritoryGuard) || !bundleContent.includes("zoneId, marketId: null, marketLocationId: null") || !bundleContent.includes("marketId, marketLocationId: null") || !bundleContent.includes("territoryKeys: Object.keys(territory)") || !bundleContent.includes("failedWrite") || !bundleContent.includes("databaseReference")) {
  throw new Error("Le bundle Vercel ne contient pas la normalisation MOBILE/CUSTOM et son diagnostic d’insertion attendus.");
}

console.info(`Bundle CommonJS Vercel chargé : createMunicipalApp, normalisation MOBILE/CUSTOM et diagnostic d’insertion disponibles (${buildId}).`);
