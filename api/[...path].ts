import { createMunicipalApp } from "../server/_core/app";

/**
 * Entrée Node.js reconnue nativement par Vercel.
 *
 * Le segment dynamique capture /api/health, /api/trpc et les autres routes
 * API sans que les réécritures de la SPA ne puissent les intercepter.
 */
const app = createMunicipalApp();

export default app;
