import "dotenv/config";
import { createMunicipalApp } from "./server/_core/app";

// Vercel détecte ce fichier racine et exécute l’application comme fonction Node.js.
// Ne pas appeler app.listen() ici : Vercel gère le cycle de vie du serveur.
const app = createMunicipalApp();

export default app;
