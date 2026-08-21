import type { IncomingMessage, ServerResponse } from "node:http";
import { forwardMunicipalApi } from "../server/vercelAdapter";

function requestPathname(request: IncomingMessage) {
  return new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname;
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
