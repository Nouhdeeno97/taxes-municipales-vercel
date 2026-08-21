import type { IncomingMessage, ServerResponse } from "node:http";

type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;

let municipalAppPromise: Promise<NodeHandler> | undefined;

function requestPathname(request: IncomingMessage) {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
}

async function loadMunicipalApp(): Promise<NodeHandler> {
  // Lors du build Vercel, le backend est regroupé dans serverless/ au format
  // CommonJS. Express et plusieurs de ses dépendances utilisent require(), ce
  // qui évite l’échec « Dynamic require of path is not supported » d’un bundle
  // ESM sur le runtime Node.js serverless.
  if (process.env.VERCEL) {
    const modulePath = "../serverless/municipal-app.cjs";
    const bundledModule = (await import(modulePath)) as {
      default?: { createMunicipalApp?: () => NodeHandler };
      createMunicipalApp: () => NodeHandler;
    };
    const createMunicipalApp = bundledModule.createMunicipalApp ?? bundledModule.default?.createMunicipalApp;
    if (typeof createMunicipalApp !== "function") {
      throw new Error("Le bundle municipal Vercel n’exporte pas createMunicipalApp.");
    }
    return createMunicipalApp();
  }

  // Repli réservé aux tests et au développement local : Vercel n’exécute jamais
  // cette branche, car VERCEL=1 est injectée lors du build et de l’exécution.
  const { createMunicipalApp } = await import("../server/_core/app.ts");
  return createMunicipalApp();
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
