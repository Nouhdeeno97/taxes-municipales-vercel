# Notes de préparation Vercel

Les adaptations du dépôt s’appuient sur la documentation officielle consultée le 21 août 2026.

| Sujet | Constat utile pour ce dépôt | Source |
|---|---|---|
| Express | Une application Express peut être déployée comme une fonction Vercel unique si le point d’entrée exporte l’application. Les fichiers statiques doivent être fournis depuis `public/**` : `express.static()` n’est pas servi par la plateforme. | [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) |
| Vite SPA | Vercel reconnaît Vite et les liens profonds d’une SPA nécessitent une réécriture vers `index.html`, en préservant les routes API. | [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite) |
| Runtime | Les points d’entrée Node.js en TypeScript sont pris en charge ; les dépendances racine sont installées à partir de `pnpm-lock.yaml`. | [Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js) |
| Variables | Les secrets sont configurés par environnement dans les réglages Vercel et ne doivent pas être inscrits dans le dépôt. Toute modification exige un nouveau déploiement. | [Environment Variables](https://vercel.com/docs/environment-variables) |
| Routage | Les motifs de réécriture peuvent utiliser une expression nommée, par exemple `/:path((?!api/).*)`, ce qui permet de réserver les routes API à Express et de réécrire les routes applicatives vers la SPA. | [Rewrites on Vercel](https://vercel.com/docs/routing/rewrites) |
| Entrée serveur | Un fichier `server.ts` à la racine qui exporte l’application Express est détecté automatiquement ; toutes les requêtes arrivent sur une fonction Vercel unique. | [Déployer Express sur Vercel](https://vercel.com/kb/guide/ship-a-express-app-on-vercel) |

Les secrets et services actuellement fournis par l’hébergement Manus, notamment la base gérée, OAuth Manus et le proxy de stockage, devront être remplacés ou configurés explicitement dans Vercel avant le premier déploiement de production.
