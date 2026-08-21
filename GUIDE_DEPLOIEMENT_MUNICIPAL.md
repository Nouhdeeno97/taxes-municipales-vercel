# Préparation au déploiement sur l’infrastructure de la mairie

## Objectif

La plateforme reste actuellement exploitée dans son environnement géré. Ce document prépare sa migration ultérieure vers un **serveur applicatif** et une **base de données administrés par la mairie**. Après cette migration, les sauvegardes SQL, restaurations et procédures de purge pourront être exécutées dans l’infrastructure municipale, sous le contrôle exclusif des responsables habilités.

> Ce guide ne déclenche aucune migration et ne remplace pas la recette technique. Les opérations de transfert ne doivent commencer qu’après validation de l’équipe informatique de la mairie.

## Découpage des responsabilités

| Élément | Situation actuelle | Cible après migration |
|---|---|---|
| Application | Hébergement géré actuel. | Serveur administré par la mairie. |
| Base de données | Base rattachée à l’environnement géré. | Base relationnelle administrée par la mairie. |
| Sauvegarde | Instantané complet de l’environnement actuel. | Export SQL et politique de sauvegarde pilotés par la mairie. |
| Restauration | Procédure de restauration de l’environnement actuel. | Import SQL contrôlé dans la base municipale, après validation. |
| Purge | Désactivée. | Désactivée jusqu’à l’approbation du périmètre et de deux validateurs. |

## Prérequis techniques municipaux

La mairie doit désigner un responsable de l’infrastructure et fournir un serveur pour l’application ainsi qu’un serveur de base de données. La base doit disposer d’un compte applicatif limité aux besoins courants et d’un compte de maintenance séparé, utilisé uniquement pour les sauvegardes, restaurations et migrations validées.

| Préparation | Attendu avant la migration |
|---|---|
| Serveur applicatif | Système maintenu, accès administrateur contrôlé et chiffrement HTTPS opérationnel. |
| Base relationnelle | Base vide dédiée, accès réseau restreint au serveur applicatif, stratégie de sauvegarde locale définie. |
| Secrets | Nouvelles valeurs de connexion, de session et d’authentification conservées hors du dépôt de code. |
| Stockage de sauvegarde | Emplacement municipal chiffré, soumis à une rétention et à des contrôles d’accès. |
| Responsables | Un administrateur technique et un second valideur désignés par la mairie. |

## Déroulement de migration proposé

La migration doit être préparée sur une copie de test avant toute bascule. L’équipe suspend temporairement les saisies, consigne l’heure de bascule et conserve une sauvegarde vérifiée de l’état source. Elle applique ensuite le schéma de la plateforme sur la base municipale, importe les données validées et contrôle les données sensibles : redevables, activités, obligations, encaissements, reçus, versements, clôtures, comptes et journal d’audit.

Une fois la vérification achevée, la mairie teste un parcours complet de collecte et la réimpression d’un reçu. La bascule en exploitation ne doit intervenir qu’après accord explicite des responsables désignés.

## Sauvegarde et restauration SQL après migration

Après migration, le module de maintenance pourra s’appuyer sur le compte de maintenance local pour produire un fichier SQL chiffré, stocké dans l’emplacement municipal de sauvegarde. Chaque sauvegarde devra porter une date, une version du schéma et une empreinte de contrôle. Une restauration devra toujours être précédée d’une nouvelle sauvegarde et d’une validation par deux responsables.

| Action | Contrôles obligatoires |
|---|---|
| Sauvegarder | Vérifier l’espace disponible, produire le fichier SQL, calculer son empreinte et journaliser l’opération. |
| Télécharger | Réserver l’accès à l’administrateur technique et journaliser l’identité, la date et l’empreinte du fichier. |
| Importer | Vérifier le fichier, arrêter les écritures, créer une sauvegarde préalable et obtenir deux validations. |
| Restaurer | Contrôler la version du schéma, restaurer dans la fenêtre de maintenance, puis vérifier les registres et l’audit. |
| Purger | Conserver le journal d’audit ; exiger un périmètre signé et deux validations. |

## Éléments à confirmer par la mairie

La mairie doit encore communiquer l’environnement cible, le responsable technique, le second valideur de restauration et le périmètre de données autorisé pour une éventuelle purge. Tant que ces éléments ne sont pas confirmés, l’application conserve son mode de maintenance protecteur actuel.
