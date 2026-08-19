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

## Corrections de parcours et interface bleu et blanc

Le 19 août 2026, les écrans modifiés ont été contrôlés sur poste bureau ainsi qu’en largeur mobile. La navigation est désormais lisible sur fond blanc, avec un état actif bleu fortement contrasté. Les espaces Administration, Territoire et Fiscalité affichent un cheminement explicite et des formulaires qui respectent l’ordre métier.

| Écran | Contrôle réalisé | Résultat |
|---|---|---|
| Administration | Création de rôle, sélection des permissions et préautorisation OAuth. | La matrice est structurée par module et action ; l’écran explique que l’adresse préautorisée doit se connecter avec Manus OAuth pour recevoir ses rôles. |
| Territoire | Création des quatre niveaux administrables. | Les formulaires suivent Secteur → Zone → Marché → Emplacement, avec choix obligatoire du parent pour chaque niveau enfant. |
| Fiscalité | Paramétrage guidé. | Les étapes visibles permettent de créer les référentiels, une règle, son affectation à une activité et la génération d’obligations. |
| Obligations | Recherche, filtre et exports. | La recherche, le filtre d’état et les boutons CSV/PDF sont présents ; le tableau reste défilable horizontalement lorsqu’il dépasse la largeur disponible. |
| Encaissement et reçus | Cycle de collecte et consultation. | L’encaissement présente l’action de création ; le registre des reçus offre CSV/PDF et impose la consultation du reçu final avant la réimpression. |
| Versements | Prévention du double rapprochement. | Aucun encaissement déjà versé n’est réutilisable, et l’explication est affichée à l’agent. |

Le nouveau cache hors connexion conserve le shell déjà consulté et les réponses tRPC récentes dans le navigateur. Une coupure physique du réseau ne peut pas être simulée dans l’aperçu ; elle doit être retestée après consultation en ligne des écrans sur l’appareil cible.

## Vérification complémentaire du 19 août 2026

Un rafraîchissement systématique des données est déclenché au montage de l’application, à la reconnexion et au retour au premier plan. Les dernières données municipales consultées restent conservées localement pour permettre une lecture hors connexion ; lorsque le réseau revient, les informations d’administration sont reprises depuis le serveur plutôt que de rester bloquées sur un instantané obsolète.

Le tableau de contrôle fiscal distingue maintenant le **montant initial** d’une obligation de son **reste dû**. Ainsi, `FORM-LBV-OBL-001` affiche 1 000 XAF comme montant initial et 0 XAF comme reste dû après le règlement, sans donner l’impression qu’une obligation a été créée à montant nul.

La suite de validation technique a été rejouée avec succès : **21 tests sur 6 fichiers**, contrôle TypeScript sans erreur et build de production valide. Les preuves nécessitant une action extérieure restent ouvertes : connexion d’un deuxième compte Manus OAuth préautorisé, vérification de ses droits effectifs, contrôle des fichiers téléchargés et simulation de coupure réseau sur le poste cible.

## Recette des accès, de l’aide et de la collecte — 19 août 2026

La version de recette présente désormais une administration guidée des accès. Elle distingue les comptes Manus OAuth des testeurs pouvant utiliser un lien temporaire à usage unique. Le cycle d’invitation Manus est désormais consommable lors d’une session déjà ouverte, et les procédures métier s’appuient sur les permissions de rôle plutôt que sur un verrou administratif global redondant.

La page d’encaissement adopte une recherche serveur par identifiant national, identifiant fiscal, référence ou nom. Les reçus proposent une consultation de la pièce et une impression isolée du document, sans imprimer la page de travail. Le menu permanent « Aide et tutoriels » présente les tutoriels filtrés par les permissions actives renvoyées par le serveur.

| Contrôle | Résultat |
|---|---|
| Navigation bleu et blanc, contrastes et interactions | Validée visuellement sur les écrans Administration, Encaissement, Reçus et Aide. |
| Aide contextuelle | Validée visuellement avec le profil administrateur ; sa restriction à un rôle limité doit encore être testée avec un compte distinct. |
| Recherche et impression | Implémentées et compilées ; leurs actions nécessitent une vérification manuelle dans le navigateur par un agent. |
| Qualité technique | 23 tests automatisés réussis, TypeScript sans erreur et build de production réussi. |

Une correction supplémentaire garantit que la session d’un testeur est recherchée non seulement lorsqu’une authentification Manus échoue, mais aussi lorsque celle-ci retourne simplement une session absente. Cette priorité est couverte par trois tests : session temporaire reconnue après retour `null`, session temporaire reconnue après erreur Manus, et conservation prioritaire d’une session Manus valide. Après cette correction, la suite totalise **26 tests réussis**, avec TypeScript et build de production valides.
