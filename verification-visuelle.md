# Vérification visuelle

La page d’accès a été vérifiée sur écran bureau (1280 × 720) et mobile (375 × 812). La carte de connexion, le contraste du bouton principal, la hiérarchie typographique et les marges restent lisibles aux deux formats. Les routes protégées redirigent correctement vers la même page d’accès lorsqu’aucune session n’est active ; la vérification détaillée des écrans métier nécessite donc une session authentifiée disposant d’un périmètre municipal.

Les contrôles TypeScript et les tests unitaires ont été exécutés avec succès après les dernières modifications.

## Validation authentifiée

Le parcours OAuth a été validé avec une session active. Une migration additive a restauré les colonnes `users.municipalityId` et `users.isActive` manquantes dans la base de développement, ce qui a rétabli le callback OAuth. Le tableau de bord authentifié s’affiche désormais avec la navigation métier, l’indicateur « Service en ligne », les compteurs opérationnels et les garanties métier visibles.

L’écran protégé des obligations a également été validé avec la session active. Après la configuration des barèmes journaliers Libreville, il présente l’état vide attendu et explique le prérequis : affecter une règle fiscale à une activité, puis générer les obligations périodiques. Aucun redevable, aucune activité opérationnelle, aucune obligation ni aucun encaissement fictif n’a été créé pour forcer ce scénario.

L’écran protégé des reçus a été validé dans la même session Libreville. Le registre vide rappelle qu’un reçu définitif n’est créé qu’après validation d’un encaissement et présente les garanties d’immutabilité, d’empreinte de contrôle, de QR et d’historique de réimpression. Aucun encaissement artificiel n’a été créé.

## Scénario de formation explicitement autorisé

Le 17 août 2026, un scénario de formation non opérationnel, préfixé `FORM-LBV-*`, a été créé après autorisation explicite. Le premier essai a révélé une divergence entre les codes de référentiel supposés et les codes Libreville effectivement présents ; seul le redevable de formation avait alors été créé, ce qui expliquait les listes et compteurs vides. La transaction corrective ciblée utilise les identifiants et référentiels réels de Libreville, crée l’activité, l’obligation, l’encaissement, le reçu immuable, le versement, le comptage, la clôture et l’audit associés.

Une tentative de contrôle visuel après correction a été interrompue par un délai de réponse de l’extension du navigateur. La vérification des écrans protégés doit être reprise dès que la session de navigateur répond à nouveau ; aucune opération métier supplémentaire ne sera exécutée pendant ce contrôle.

## Rapprochement des versements

Le 17 août 2026, l’écran authentifié « Versements & supervision » a été vérifié après correction. Le versement de formation `FORM-LBV-DEP-001`, validé pour 1 000 F CFA, reste visible avec un écart nul. L’encaissement déjà rattaché n’apparaît plus dans la sélection des encaissements éligibles ; les champs et le bouton de déclaration sont désactivés tant qu’aucun encaissement non rapproché n’est disponible. Cette protection est appliquée à trois niveaux : filtrage de l’interface, contrôle serveur et contrainte d’unicité en base de données sur la transaction d’encaissement.

La suite de tests a été exécutée avec succès (16 tests) et la compilation de production est valide après cette correction.

## Validation complète de la visibilité du scénario

La cause racine était une insertion initiale de formation incomplète et non reliée de manière cohérente aux référentiels Libreville. La correction a consisté à reconstruire le cycle `FORM-LBV-*` sur les clés territoriales et fiscales effectivement présentes, puis à supprimer les doublons non référencés en conservant la seule chaîne rattachée aux pièces comptables. Aucun enregistrement personnel réel n’a été introduit.

| Écran contrôlé | Résultat observé | Preuve fonctionnelle |
|---|---|---|
| Tableau de bord | 1 redevable actif, 0 obligation à suivre, 1 000 F CFA de recettes du jour, 1 000 F CFA de versements déclarés et 0 synchronisation à traiter. | Les compteurs concordent avec le scénario déjà réglé et rapproché. |
| Redevables | Une seule ligne `FORM-LBV-RED-001` est visible, libellée « FORMATION — SCÉNARIO LIBREVILLE (NON OPÉRATIONNEL) ». | L’unicité post-nettoyage est visible dans le registre. |
| Obligations | `FORM-LBV-OBL-001` est visible, rattachée à l’activité de formation et au redevable de formation. | L’obligation réglée reste consultable dans l’échéancier, sans être comptée comme exigible. |
| Reçus | `FORM-LBV-REC-001` est visible pour 1 000 F CFA. | Le registre confirme que la pièce finale est consultable et non modifiable. |
| Versements | `FORM-LBV-DEP-001` est visible, validé, pour 1 000 F CFA et sans écart. | L’encaissement associé est exclu des encaissements éligibles. |

Ces validations ont été effectuées sur l’aperçu authentifié de développement, en résolution bureau 1 280 × 720, le 17 août 2026.

## Confirmation de périmètre de livraison

Le 17 août 2026, le responsable du projet a confirmé que la validation avec le scénario `FORM-LBV-*` explicitement autorisé est suffisante pour clôturer la livraison de développement. Par conséquent, aucune donnée opérationnelle réelle n’a été créée ni utilisée pour les tests ; la qualification préalable à une ouverture de production reste une étape d’exploitation distincte.
