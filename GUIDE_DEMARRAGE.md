# Livraison — plateforme de gestion des taxes municipales

**Mairie initialisée :** Libreville, Gabon (`LBV`)  
**Édition :** validation de développement du 17 août 2026  
**Accès de développement :** <https://3000-i9rxwdbft6rmejyut4shm-3b169659.us4.manus.computer>

## Objet et périmètre livré

La plateforme couvre le cycle municipal de collecte depuis le registre des redevables jusqu’à la clôture quotidienne. L’interface est en français et est structurée autour d’une mairie active, d’un périmètre territorial, de règles fiscales configurables et de contrôles d’accès par rôle et zone. Elle est conçue pour les opérations de marché, avec une file de synchronisation locale pour les opérations réalisées hors connexion.

| Module | Fonction livrée | Contrôle principal |
|---|---|---|
| Redevables | Création, recherche, détection de doublons et fusion tracée. | Conservation de la source fusionnée et journal d’audit. |
| Activités | Affectation multi-activité, emplacement et historique de propriété. | Contrôle du périmètre territorial. |
| Territoire | Secteurs, zones, marchés et emplacements. | Référentiel municipal hiérarchique. |
| Fiscalité | Types de taxes, périodicités, barèmes, règles et exonérations. | Montants calculés selon les règles actives. |
| Obligations | Génération, suivi, ajustement autorisé et recouvrement. | État et restant dû cohérents. |
| Encaissement | Paiement multi-obligations et multi-moyens. | Équilibre obligatoire entre affectations et obligations. |
| Reçus | Reçu final avec QR, empreinte et historique de réimpression. | Instantané définitif et non modifiable. |
| Versements | Déclaration, comptage, rapprochement et écart. | Un encaissement ne peut figurer que dans un seul versement. |
| Clôtures | Soumission et suivi de la clôture quotidienne. | Écart entre attendu et déposé conservé. |
| Administration et synchronisation | Rôles, permissions, audit append-only, opérations hors connexion et conflits. | Reprise idempotente par identifiant d’opération. |

## Démarrage de l’exploitation

L’accès s’effectue avec un compte Manus OAuth autorisé pour la mairie. Aucun mot de passe applicatif supplémentaire n’est géré par la plateforme. Un administrateur municipal peut ensuite consulter les référentiels, attribuer les rôles et organiser les périmètres d’intervention avant l’ouverture d’une session de collecte.

> La connexion ne doit être accordée qu’à des utilisateurs identifiés, actifs et rattachés à la mairie concernée. Les permissions et les affectations territoriales doivent être vérifiées avant l’encaissement en production.

Pour démarrer un cycle réel, l’opérateur crée ou sélectionne un redevable, enregistre son activité dans le marché et rattache la règle fiscale applicable. Il génère ensuite l’obligation, encaisse les montants dus avec le ou les moyens de paiement déclarés et obtient un reçu final. À la fin de la session, l’agent déclare les encaissements encore éligibles, le superviseur effectue le comptage, puis la clôture quotidienne documente le rapprochement et les éventuels écarts.

| Étape opérationnelle | Écran à utiliser | Résultat attendu |
|---|---|---|
| 1. Vérifier les référentiels | Territoire et Fiscalité | Marché, emplacement, type d’activité et barème disponibles. |
| 2. Enregistrer le redevable | Redevables | Référence municipale créée et doublons signalés. |
| 3. Créer l’activité | Activités | Activité, propriétaire et localisation tracés. |
| 4. Créer ou générer l’obligation | Obligations | Montant exigible et échéance affichés. |
| 5. Encaisser | Encaissement | Paiement validé et reçu final émis. |
| 6. Déclarer le versement | Versements | Seuls les paiements non encore rapprochés sont proposés. |
| 7. Compter et contrôler | Versements | Versement validé ou partiellement validé avec écart. |
| 8. Clôturer | Clôtures | État journalier soumis et montants conservés. |

## Paramétrage Libreville présent

La mairie de Libreville est initialisée avec la devise XAF, le fuseau `Africa/Libreville`, une hiérarchie territoriale de marché incluant Mont-Bouët et des référentiels d’activités non personnels. Les barèmes journaliers configurés sont de **1 000 XAF** pour les vivres au marché de Mont-Bouët et de **500 XAF** pour les autres marchés, conformément au périmètre de configuration demandé.

Un unique scénario de formation est présent pour faciliter la démonstration. Toutes ses références commencent par `FORM-LBV-` et tous ses libellés indiquent clairement « FORMATION — NON OPÉRATIONNEL ». Il comprend un redevable moral de formation, une activité, une obligation déjà réglée, un encaissement, un reçu final, un versement validé, un comptage et une clôture. Il ne contient aucune donnée personnelle réelle et ne doit pas être assimilé à une recette d’exploitation.

| Référence de formation | État observé |
|---|---|
| `FORM-LBV-RED-001` | Redevable actif de formation, unique dans le registre. |
| `FORM-LBV-OBL-001` | Obligation réglée, conservée dans l’échéancier. |
| `FORM-LBV-REC-001` | Reçu final de 1 000 F CFA, consultable sans modification. |
| `FORM-LBV-DEP-001` | Versement validé de 1 000 F CFA, écart nul. |

## Garanties et limites de la livraison

Les reçus finalisés sont protégés par un instantané et une empreinte d’intégrité. Les fusions de redevables sont auditées sans effacer l’historique. La file hors connexion repose sur un identifiant d’opération unique et la synchronisation distingue une reprise idempotente d’un conflit à résoudre. Enfin, le rapprochement des versements empêche une double affectation au moyen d’un filtrage d’interface, d’un contrôle applicatif et d’une contrainte d’unicité dans la base.

La livraison correspond à un environnement de développement validé, avec un scénario de formation explicitement étiqueté. Avant ouverture opérationnelle, la mairie doit faire valider ses référentiels, ses barèmes, sa délégation de rôles, ses règles de clôture et son dispositif de contrôle interne. Les opérateurs ne doivent pas réutiliser les références `FORM-LBV-*` dans les opérations réelles.

## Vérifications réalisées

La suite automatisée comprend 16 tests validés, couvrant les règles de montants, l’état des obligations, l’intégrité des reçus, les autorisations et les comportements de synchronisation. La compilation de production est également validée. La vérification authentifiée de l’interface confirme la visibilité du scénario dans le tableau de bord, les registres des redevables, obligations et reçus, ainsi que le rapprochement du versement.

Les constats détaillés et les valeurs observées sont conservés dans [`verification-visuelle.md`](./verification-visuelle.md). Le suivi exhaustif des travaux est consigné dans [`todo.md`](./todo.md).

Pour une prise en main guidée de l’interface, consultez également le [`GUIDE_TEST_UTILISATEUR.md`](./GUIDE_TEST_UTILISATEUR.md), qui détaille l’ordre de test, les résultats attendus et le format de remontée des écarts.
