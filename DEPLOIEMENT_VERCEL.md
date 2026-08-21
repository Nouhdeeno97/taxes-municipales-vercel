# Déploiement sur Vercel

Ce dépôt peut être importé depuis GitHub dans Vercel. Il conserve une application React/Vite servie comme SPA et une application Express exportée depuis `server.ts` pour les routes métier, OAuth et tRPC.

> **Important :** la mise en ligne Vercel ne transfère pas la base de données, les secrets OAuth ni le stockage de l’hébergement Manus. Ces dépendances doivent être configurées dans un environnement administré par la mairie avant la production.

## Procédure d’import

1. Dans Vercel, sélectionnez **Add New → Project**, puis importez le dépôt `Nouhdeeno97/taxes-municipales-vercel`.
2. Conservez la branche `main` comme branche de production.
3. Vérifiez que Vercel utilise la commande `pnpm run build:vercel` et le répertoire de sortie `public`. Ces valeurs sont versionnées dans `vercel.json`.
4. Renseignez les variables de la section suivante dans **Settings → Environment Variables**, au minimum pour l’environnement **Production**. Répliquez des valeurs de test distinctes dans **Preview** si les déploiements de prévisualisation doivent fonctionner.
5. Déployez, puis ouvrez `/api/health`. La réponse attendue est `{ "status": "ok" }`.

## Variables à configurer dans Vercel

| Variable | Statut | Rôle | Consigne |
|---|---|---|---|
| `DATABASE_URL` | Obligatoire | Connexion MySQL compatible Drizzle | Utiliser une base administrée par la mairie, accessible depuis Vercel par TLS. |
| `JWT_SECRET` | Obligatoire | Signature des sessions locales | Générer une valeur aléatoire longue ; ne jamais la partager ni la commiter. |
| `VITE_APP_ID` | Obligatoire pour OAuth | Identifiant de l’application OAuth Manus | Configurer l’application OAuth avec le domaine Vercel final. |
| `OAUTH_SERVER_URL` | Obligatoire pour OAuth | Serveur OAuth | Renseigner l’URL autorisée par le fournisseur OAuth. |
| `VITE_OAUTH_PORTAL_URL` | Obligatoire pour OAuth | Portail de connexion OAuth | Renseigner l’URL autorisée par le fournisseur OAuth. |
| `OWNER_OPEN_ID` | Selon la gouvernance | Compte propriétaire initial | Définir uniquement avec un identifiant validé par la mairie. |
| `OWNER_NAME` | Selon la gouvernance | Nom du propriétaire initial | Définir avec la gouvernance municipale. |
| `VITE_ANALYTICS_ENDPOINT` | Optionnelle | Point d’entrée d’analytique | Sans valeur, aucun script d’analytique n’est injecté. |
| `VITE_ANALYTICS_WEBSITE_ID` | Optionnelle | Identifiant d’analytique | À définir seulement avec le point d’entrée correspondant. |

## Points de contrôle avant production

La redirection OAuth doit être déclarée chez le fournisseur sous la forme `https://<domaine-final>/api/oauth/callback`. Les déploiements de prévisualisation disposent de domaines distincts : utilisez-les uniquement si votre fournisseur OAuth les autorise explicitement.

L’entrée `server.ts` est sans écoute de port et est exécutée par Vercel comme fonction Node.js. Les appels tRPC restent relatifs à `/api/trpc`, ce qui préserve les cookies et évite toute configuration CORS entre deux domaines. Les routes applicatives sont réécrites vers `index.html`, tandis que `/api/*` et `/manus-storage/*` restent destinées à Express.

Le service worker est distribué avec une directive `must-revalidate` afin que les mises à jour de la plateforme soient récupérées correctement après chaque déploiement.

## Dépendances à migrer avant usage complet

Le code hérité comprend un proxy de stockage dépendant des variables internes `BUILT_IN_FORGE_API_URL` et `BUILT_IN_FORGE_API_KEY`. Ces valeurs appartiennent à l’hébergement Manus et ne doivent pas être copiées dans Vercel. Avant de permettre l’import d’un nouveau logo municipal en production, remplacez ce proxy par un stockage administré par la mairie, tel qu’un compartiment S3 privé avec URL signées ou une solution équivalente soumise à sa politique de sécurité.

Après import, déclenchez une recette ciblée : connexion d’un compte local, création d’un redevable, impression d’un reçu, consultation d’un registre paginé et vérification de la reprise après une coupure réseau. Les deux dernières recettes externes déjà reportées — second compte OAuth réel et appareil de coupure réseau — restent à effectuer sur l’environnement final.

## Sources

Les décisions de configuration sont fondées sur la documentation officielle : [Express on Vercel](https://vercel.com/docs/frameworks/backend/express), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite), [Rewrites](https://vercel.com/docs/routing/rewrites) et [variables d’environnement](https://vercel.com/docs/environment-variables).
