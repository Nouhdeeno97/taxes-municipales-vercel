import type { IncomingMessage, ServerResponse } from "node:http";
import { createMunicipalApp } from "./_core/app";

type NodeHandler = (request: IncomingMessage, response: ServerResponse) => void;

let municipalApp: NodeHandler | undefined;

/**
 * Retourne l’application Express unique servie par les fonctions Vercel.
 *
 * L’import de l’application est volontairement statique : Vercel analyse et
 * livre ainsi le graphe de dépendances réel avec chaque fonction, au lieu de
 * charger un fichier généré hors Git dont la version pouvait diverger du
 * commit déployé.
 */
function getMunicipalApp(): NodeHandler {
  municipalApp ??= createMunicipalApp();
  return municipalApp;
}

/** Transmet la requête API à l’application Express municipale. */
export function forwardMunicipalApi(request: IncomingMessage, response: ServerResponse) {
  try {
    getMunicipalApp()(request, response);
  } catch (error) {
    console.error("[Vercel] Initialisation du backend municipal impossible", error);
    if (!response.headersSent) {
      response
        .writeHead(500, { "Content-Type": "application/json; charset=utf-8" })
        .end(JSON.stringify({ error: "Service API municipal indisponible" }));
    }
  }
}
