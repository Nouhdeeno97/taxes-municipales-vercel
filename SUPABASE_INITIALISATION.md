# Initialisation Supabase de démonstration

## État de la migration

La migration PostgreSQL préparée dans `drizzle/supabase/0000_lean_dakota_north.sql` a été régénérée depuis le schéma Drizzle. Les énumérations PostgreSQL sont créées en tête de fichier, avant toutes les tables qui les utilisent ; les clés étrangères sont ajoutées après les tables.

Les premières tentatives d’exécution depuis l’éditeur SQL Supabase n’ont créé aucun objet : l’interface a retourné une erreur interne indiquant que la requête était vide, malgré la présence du texte dans l’éditeur. Après exécution manuelle du fichier corrigé par l’administrateur du projet, l’éditeur de tables Supabase affiche les tables métier créées, notamment `activities`, `activity_categories`, `activity_ownerships`, `activity_tax_assignments`, `activity_types`, `audit_logs`, `cash_counts`, `daily_closings`, `deposits`, `markets` et `municipalities`. Le décompte exhaustif des tables et contraintes reste à effectuer avant le chargement des données fictives.

## Règle de sécurité

La chaîne `DATABASE_URL`, les mots de passe et les clés Supabase ne sont pas inscrits dans ce document, dans Git ou dans les scripts de démonstration.
