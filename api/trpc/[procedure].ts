import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;

let municipalAppPromise: Promise<NodeHandler> | undefined;

async function loadMunicipalApp(): Promise<NodeHandler> {
  if (process.env.VERCEL) {
    const moduleUrl = pathToFileURL(join(process.cwd(), "serverless", "municipal-app.cjs")).href;
    const bundledModule = (await import(moduleUrl)) as {
      default?: { createMunicipalApp?: () => NodeHandler };
      createMunicipalApp: () => NodeHandler;
    };
    const createMunicipalApp = bundledModule.createMunicipalApp ?? bundledModule.default?.createMunicipalApp;
    if (typeof createMunicipalApp !== "function") {
      throw new Error("Le bundle municipal Vercel n’exporte pas createMunicipalApp.");
    }
    return createMunicipalApp();
  }

  const { createMunicipalApp } = await import("../../server/_core/app.ts");
  return createMunicipalApp();
}

/**
 * Vercel associe une fonction à chaque segment de fichier API. Le catch-all
 * `api/[...path].ts` prend `/api/trpc`, mais ne couvre pas de façon fiable un
 * second segment comme `/api/trpc/auth.localLogin`. Cette fonction autonome
 * reçoit les procédures tRPC (notation par points) et les délègue à Express.
 */
export default function handler(request: IncomingMessage, response: ServerResponse) {
  municipalAppPromise ??= loadMunicipalApp();
  municipalAppPromise.then(
    app => app(request, response),
    error => {
      console.error("[Vercel] Chargement du backend tRPC impossible", error);
      if (!response.headersSent) {
        response
          .writeHead(500, { "Content-Type": "application/json; charset=utf-8" })
          .end(JSON.stringify({ error: "Service API municipal indisponible" }));
      }
    }
  );
}
