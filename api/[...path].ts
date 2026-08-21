import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-expect-error Le bundle CommonJS est produit par build:vercel:api avant la vérification et le déploiement.
import { createMunicipalApp as createMunicipalAppFromBundle } from "../serverless/municipal-app.cjs";

type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;

let municipalAppPromise: Promise<NodeHandler> | undefined;

function requestPathname(request: IncomingMessage) {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
}

async function loadMunicipalApp(): Promise<NodeHandler> {
  // L’import statique donne à l’analyseur de dépendances Vercel un lien
  // explicite vers l’artefact généré pendant build:vercel. Une importation par
  // URL construite à l’exécution pouvait charger un artefact inclus obsolète.
  if (typeof createMunicipalAppFromBundle !== "function") {
    throw new Error("Le bundle municipal Vercel n’exporte pas createMunicipalApp.");
  }
  return createMunicipalAppFromBundle();
}

function sendHealth(response: ServerResponse) {
  response
    .writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    })
    .end(JSON.stringify({ status: "ok" }));
}

/**
 * Entrée Node.js reconnue nativement par Vercel.
 *
 * Le segment dynamique capture /api/health, /api/trpc et les autres routes API
 * sans que les réécritures de la SPA ne puissent les intercepter. Le contrôle de
 * santé est traité avant le chargement du backend : il ne requiert donc ni
 * Drizzle, ni PostgreSQL, ni les variables métier.
 */
export default function handler(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "GET" && requestPathname(request) === "/api/health") {
    sendHealth(response);
    return;
  }

  forwardMunicipalApi(request, response);
}

/**
 * Transmet une requête API à Express après que Vercel a choisi la fonction
 * correspondant à son chemin. Cette exportation est aussi utilisée par
 * `api/trpc/[procedure].ts` pour les POST `/api/trpc/<procedure>`.
 */
export function forwardMunicipalApi(request: IncomingMessage, response: ServerResponse) {
  municipalAppPromise ??= loadMunicipalApp();
  municipalAppPromise.then(
    app => app(request, response),
    error => {
      console.error("[Vercel] Chargement du backend municipal impossible", error);
      if (!response.headersSent) {
        response
          .writeHead(500, { "Content-Type": "application/json; charset=utf-8" })
          .end(JSON.stringify({ error: "Service API municipal indisponible" }));
      }
    }
  );
}
