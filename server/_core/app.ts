import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { registerTesterAccessRoutes } from "./testerAccess";

/**
 * Marqueur de révision du backend embarqué dans les fonctions Vercel.
 * Il ne contient aucune donnée métier ni aucun secret ; il permet de vérifier
 * qu’une fonction sert bien la révision incluant la normalisation MOBILE.
 */
export const MUNICIPAL_API_BUILD_ID = "mobile-territory-v5";

/**
 * Construit l’application HTTP sans ouvrir de port.
 *
 * Le serveur local et la fonction Vercel réutilisent la même application afin
 * de conserver les routes, l’authentification et les contrôles métier.
 */
export function createMunicipalApp() {
  const app = express();

  // Vercel termine HTTPS avant de transmettre la requête à la fonction.
  // Cette confiance limitée rend req.protocol et les cookies sécurisés fiables.
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.get("/api/health", (_req, res) => {
    res.set("Cache-Control", "no-store").status(200).json({ status: "ok" });
  });

  registerTesterAccessRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Les erreurs non gérées doivent terminer la réponse pour laisser Vercel
  // recycler proprement l’invocation et servir les requêtes suivantes.
  app.use(
    (error: unknown, _req: Request, res: Response, next: NextFunction) => {
      console.error("[HTTP] Erreur non gérée", error);
      if (res.headersSent) {
        next(error);
        return;
      }
      res.status(500).json({ error: "Erreur interne du service municipal" });
    }
  );

  return app;
}
