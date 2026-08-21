import type { IncomingMessage, ServerResponse } from "node:http";
import { forwardMunicipalApi } from "../[...path]";

/**
 * Vercel associe une fonction à chaque segment de fichier API. Le catch-all
 * `api/[...path].ts` prend `/api/trpc`, mais ne couvre pas de façon fiable un
 * second segment comme `/api/trpc/auth.localLogin`. Cette fonction explicite
 * reçoit les procédures tRPC (notation par points) et les délègue à Express.
 */
export default function handler(request: IncomingMessage, response: ServerResponse) {
  forwardMunicipalApi(request, response);
}
