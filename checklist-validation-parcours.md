# Checklist de validation des parcours

Cette checklist distingue les validations réellement exécutées des opérations volontairement non lancées. L’environnement a été initialisé pour la **Mairie de Libreville (Gabon)** sans redevable, activité commerciale, obligation, encaissement ou reçu fictif.

| Parcours | État | Preuve ou résultat |
|---|---|---|
| Démarrage municipal | Validé | La mairie de Libreville, les rôles et le rattachement administrateur ont été contrôlés ; son identité est affichée dans l’interface authentifiée. |
| Organisation territoriale | Validé | La hiérarchie de Libreville et les marchés publics configurés sont visibles dans le module Territoire. |
| Paramétrage fiscal | Validé | Les deux barèmes journaliers autorisés sont présents avec leurs portées territoriales et une trace d’audit. |
| Redevable | Non exécuté | Aucun redevable réel n’a été fourni et aucun enregistrement fictif n’a été créé. |
| Activité | Non exécuté | Ce parcours dépend d’un redevable actif réel. |
| Génération d’obligation | Validé en état vide | L’écran est accessible et explique les prérequis. Aucune obligation n’est générée sans activité imposable réelle. |
| Encaissement et reçu | Validé en état vide | Les écrans et les invariants de paiement/reçu immuable sont disponibles ; aucun encaissement artificiel n’a été créé. |
| Versement et clôture | Non exécuté | Ces parcours dépendent d’encaissements validés réels. |
| Synchronisation hors connexion | Validé | Les décisions `SERVER`, `LOCAL` et `MANUAL` sont couvertes par tests d’intégration avec persistance simulée et écriture d’audit. |
| Responsivité | Validé | Les routes de pilotage, obligations, reçus et synchronisation ont été vérifiées sur les formats bureau, tablette et mobile disponibles. |

> Les parcours financiers restants devront être repris avec des redevables et opérations approuvés par la mairie. Aucune donnée fictive ne doit être utilisée pour déclencher des obligations, encaissements, versements ou clôtures.
