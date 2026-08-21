import type { IncomingMessage, ServerResponse } from "node:http";
// @ts-expect-error Le bundle CommonJS est produit par build:vercel:api avant la vérification et le déploiement.
import { MUNICIPAL_API_BUILD_ID, createMunicipalApp as createMunicipalAppFromBundle } from "../../serverless/municipal-app.cjs";

type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;
const municipalApiBuildId = MUNICIPAL_API_BUILD_ID ?? "legacy-bundle";

let municipalAppPromise: Promise<NodeHandler> | undefined;

async function loadMunicipalApp(): Promise<NodeHandler> {
  // La référence est statique afin que Vercel trace et embarque le bundle
  // construit dans ce même déploiement pour la fonction tRPC dédiée.
  if (typeof createMunicipalAppFromBundle !== "function") {
    throw new Error("Le bundle municipal Vercel n’exporte pas createMunicipalApp.");
  }
  console.info(`[Vercel] Backend municipal tRPC chargé : ${municipalApiBuildId}`);
  return createMunicipalAppFromBundle();
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
