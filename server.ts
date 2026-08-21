import { createMunicipalApp } from "./server/_core/app";

// Point d’entrée réutilisable pour les outils locaux. Sur Vercel, l’entrée
// déployée est api/[...path].ts afin que la plateforme détecte explicitement
// la fonction serverless sous le préfixe /api.
const app = createMunicipalApp();

export default app;
