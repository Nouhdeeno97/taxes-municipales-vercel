# Références de migration vers Supabase

Les choix d’implémentation du dépôt autonome s’appuient sur les ressources officielles suivantes, consultées le 21 août 2026.

| Sujet | Décision appliquée | Source |
|---|---|---|
| Moteur de données | Supabase fournit une base PostgreSQL complète. Drizzle se connecte via le driver `postgres` et `drizzle-orm/postgres-js`. | [Drizzle avec Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) |
| Déploiement serverless | Les fonctions Vercel doivent employer l’URL transaction pooler Supavisor (`:6543`) pour des connexions temporaires. Les prepared statements doivent être désactivés avec ce mode. | [Connexion PostgreSQL Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) |
| Migrations | La configuration Drizzle utilise le dialecte `postgresql`, produit des migrations SQL révisables et les applique avec `drizzle-kit migrate`. | [Drizzle avec Supabase](https://orm.drizzle.team/docs/tutorials/drizzle-with-supabase) |
| Fichiers | Supabase Storage fournit des buckets, des politiques fines et une API de stockage adaptée aux logos et pièces municipales. | [Supabase Storage](https://supabase.com/docs/guides/storage) |

> La chaîne directe PostgreSQL est réservée aux migrations, sauvegardes et usages persistants. L’application déployée sur Vercel doit utiliser la chaîne du transaction pooler avec SSL, fournie dans le tableau de bord Supabase.

