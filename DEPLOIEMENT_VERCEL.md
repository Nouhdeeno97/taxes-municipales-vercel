# Déploiement autonome : Vercel + Supabase

Ce dépôt est conçu pour fonctionner sans service Manus. **Vercel** héberge la SPA React/Vite et la fonction Express/tRPC ; **Supabase** fournit PostgreSQL et, pour les logos municipaux, Supabase Storage. L’authentification applicative repose sur les comptes locaux et les sessions signées de la plateforme : Supabase Auth n’est pas requis.

> **Démonstration et production sont séparées.** Une base Supabase de démonstration peut être créée immédiatement. Avant une exploitation municipale réelle, la mairie doit disposer d’un projet Supabase, d’un domaine Vercel et d’une politique de sauvegarde administrés par elle.

## 1. Préparer Supabase

Créez un projet Supabase, puis récupérez sa **chaîne PostgreSQL de pooler de transactions** pour l’environnement applicatif serverless. Le client Drizzle utilise PostgreSQL via `postgres.js` avec des connexions préparées désactivées, ce qui convient à ce type de pooler.[1]

Créez ensuite dans **Storage** un compartiment nommé `municipal-assets`. La configuration actuelle génère des URL publiques pour les logos municipaux : le compartiment doit donc être public pour la démonstration. Ne téléversez pas de documents sensibles dans ce compartiment. Pour une production étendue à des fichiers confidentiels, faites évoluer le service vers des URL signées et un compartiment privé.[2]

| Ressource Supabase | Configuration attendue | Usage applicatif |
|---|---|---|
| PostgreSQL | Projet Supabase actif, accès pooler TLS | Données métier, sessions, fiscalité, reçus et audit. |
| `municipal-assets` | Compartiment public pour cette démonstration | Logos de mairie importés depuis l’administration. |
| Supabase Auth | Non configuré | Les comptes locaux permanents et sessions signées existantes sont conservés. |

## 2. Appliquer le schéma PostgreSQL

Le schéma Drizzle PostgreSQL et sa migration initiale se trouvent dans `drizzle/schema.ts` et `drizzle/supabase/`. Les anciennes migrations MySQL/TiDB sont archivées sous `drizzle/legacy-mysql/` et ne doivent jamais être exécutées sur Supabase.

Depuis un environnement d’administration sécurisé où `DATABASE_URL` est temporairement disponible, appliquez la migration avant le premier déploiement :

```bash
pnpm drizzle-kit migrate
```

N’exécutez pas les migrations pendant le build Vercel. Les changements de schéma doivent être vérifiés et appliqués séparément, puis la version applicative correspondante peut être déployée. Pour transférer les données historiques MySQL/TiDB, utilisez une procédure dédiée et vérifiée : export source, conversion des données, import PostgreSQL, contrôles de comptes, soldes, obligations, encaissements, reçus et audit. La migration Drizzle crée la structure ; elle ne convertit pas automatiquement les données historiques.

## 3. Variables à définir dans Vercel

Dans **Vercel → Settings → Environment Variables**, créez les variables suivantes pour **Production**. Créez des valeurs et une base distinctes pour **Preview** si les aperçus doivent être fonctionnels.

| Variable | Requise | Usage | Consigne |
|---|---:|---|---|
| `DATABASE_URL` | Oui | Chaîne de connexion PostgreSQL Supabase pour Drizzle. | Utiliser la chaîne pooler TLS fournie par Supabase ; ne jamais la commiter. |
| `JWT_SECRET` | Oui | Signature des sessions locales et temporaires. | Générer une valeur aléatoire longue, unique par environnement. |
| `SUPABASE_URL` | Oui pour les logos | URL de projet Supabase. | Valeur serveur, utilisée uniquement par le service de stockage. |
| `SUPABASE_SERVICE_ROLE_KEY` | Oui pour les logos | Autorisation serveur d’écriture dans Supabase Storage. | Secret strictement serveur : jamais préfixé par `VITE_`, jamais exposé au navigateur. |
| `SUPABASE_STORAGE_BUCKET` | Non | Nom du compartiment de logos. | Facultatif ; la valeur par défaut est `municipal-assets`. |
| `NODE_ENV` | Non | Mode d’exécution Node. | Fourni par Vercel ; ne pas le définir manuellement. |

> Aucune des variables `BUILT_IN_FORGE_*`, `VITE_FRONTEND_FORGE_*`, `VITE_APP_ID`, `OAUTH_SERVER_URL`, `VITE_OAUTH_PORTAL_URL`, `OWNER_OPEN_ID` ou `OWNER_NAME` n’est nécessaire à cette architecture autonome.

## 4. Importer et déployer sur Vercel

Importez le dépôt GitHub `Nouhdeeno97/taxes-municipales-vercel` dans Vercel, conservez `main` comme branche de production et laissez la configuration versionnée s’appliquer :

| Paramètre Vercel | Valeur versionnée |
|---|---|
| Commande de build | `pnpm run build:vercel` |
| Répertoire de sortie | `public` |
| API serverless | `server.ts` |
| Point de santé | `/api/health` |
| SPA et liens profonds | Réécriture vers `/index.html`, à l’exclusion de `/api/*` |

Après le premier déploiement, vérifiez `https://<domaine-vercel>/api/health`, puis testez une connexion locale, la création d’un redevable, l’émission d’un encaissement, l’aperçu d’un reçu, le téléversement d’un logo et un registre paginé.

## 5. Exploitation et limites de la démonstration

Vercel ne stocke pas les données de façon persistante dans le système de fichiers de la fonction. PostgreSQL et Supabase Storage sont les seules sources persistantes de cette architecture. Configurez les sauvegardes et les contrôles d’accès directement dans Supabase, et prévoyez un export PostgreSQL régulier avant la mise en production municipale.[3]

Les comptes municipaux sont indépendants de Supabase Auth et de Manus. Le premier administrateur local doit être créé dans la base de démonstration via le mécanisme de bootstrap contrôlé de l’application ou une procédure d’initialisation administrée. Ne créez jamais un mot de passe en clair dans un script versionné.

## Références

[1] [Drizzle ORM — Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase)

[2] [Supabase — Storage](https://supabase.com/docs/guides/storage)

[3] [Vercel — Express](https://vercel.com/docs/frameworks/backend/express)
