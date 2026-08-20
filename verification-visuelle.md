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

## Recette réelle des comptes municipaux locaux — 19 août 2026

Un compte de recette municipal, clairement libellé `RECETTE COMPTE LOCAL — À ARCHIVER`, a été créé à partir du rôle municipal actif **AGNT**, avec un identifiant local temporaire. La connexion a été validée avec le mot de passe créé, puis une session locale signée a été reconnue au moyen du cookie `tm_local_session`. Le compte a obtenu **33 permissions visibles** par son rôle ; la procédure d’aide a donc bien renvoyé un ensemble de fonctions dépendant de ses droits effectifs, et non une liste globale statique.

L’archivage administrateur a ensuite désactivé le compte de recette et invalidé immédiatement sa session encore présente. Aucun compte de recette actif n’a été laissé dans l’environnement. Le journal d’audit de la mairie conserve trois événements sur le même identifiant utilisateur : création par l’administrateur, `LOCAL_LOGIN` par le compte local, puis archivage par l’administrateur.

| Contrôle local authentifié | Résultat observé |
|---|---|
| Création avec identifiant et mot de passe haché | Réussie ; le compte local a été créé avec un rôle municipal actif. |
| Connexion et session locale | Réussies ; le cookie signé de session locale a été émis puis reconnu. |
| Aide filtrée par permissions | Réussie ; 33 permissions actives ont été retournées pour le compte de recette. |
| Traçabilité | Réussie ; les événements `CREATE`, `LOCAL_LOGIN` et `ARCHIVE` sont présents sur le même utilisateur. |
| Révocation | Réussie ; la session a été refusée après l’archivage du compte. |

La validation automatisée actualisée couvre **34 tests sur 10 fichiers**. La compilation de production est valide. La capture de `/connexion` a redirigé vers le tableau de bord car une session administrateur était déjà active ; le formulaire public reste accessible dès qu’aucune session valide n’est présente.

### Action autorisée exécutée par le compte local

Une seconde recette éphémère a confirmé qu’un compte local connecté ne se limite pas à consulter ses droits. Après connexion, le compte disposant du rôle **AGNT** a exécuté la synchronisation autorisée `synchronization.register` sur un objet de recette local. L’opération a été acceptée avec l’état `SYNCED` et l’absence de doublon. Le journal d’audit porte ensuite, pour ce même compte, les entrées `administration.LOCAL_LOGIN` et `synchronization.SYNC`. Le compte a enfin été archivé ; sa session locale a été refusée immédiatement après révocation.

| Élément vérifié | Résultat |
|---|---|
| Rôle de recette | **AGNT**, avec 33 permissions visibles dans l’aide dynamique. |
| Action exécutée après connexion | `synchronization.register` sur une opération de recette contrôlée. |
| Effet métier | Opération enregistrée avec le statut `SYNCED` et `idempotent: false` lors du premier envoi. |
| Preuve d’audit | `LOCAL_LOGIN` puis `SYNC` associés au compte local ayant effectué l’action. |
| Nettoyage | Compte de recette archivé et session invalidée ; aucun accès de test actif conservé. |

### Contrôle effectif de la matrice des permissions

Un rôle local temporaire, explicitement nommé `RECETTE-LIMITEE-*`, a été créé avec une seule permission : **Consulter le tableau de bord**. Un compte local non administrateur a reçu exclusivement ce rôle puis s’est connecté avec son identifiant municipal. La lecture du tableau de bord a été acceptée par le serveur et a retourné cinq indicateurs. La consultation des obligations fiscales, absente de la matrice du rôle, a été refusée par le serveur avec le code `FORBIDDEN` avant toute lecture de données.

Le compte de recette a été archivé à la fin de la vérification ; sa session a été révoquée. Le rôle temporaire a également été retiré de l’usage actif. Cette recette démontre que la matrice n’est pas décorative : une permission cochée autorise l’opération correspondante et une permission absente est bloquée côté serveur.

| Permission contrôlée | Résultat |
|---|---|
| `dashboard.read` attribuée | Lecture du tableau de bord acceptée ; cinq indicateurs retournés. |
| `obligations.read` absente | Accès refusé avec `FORBIDDEN`, sans exposition des obligations. |
| Révocation du compte | Archivage et invalidation de session confirmés. |
| Nettoyage du rôle | Rôle de recette temporaire désactivé après validation. |

## Validation de la version multi-taxes et paramétrable

La plateforme a été vérifiée comme un outil de **fiscalité municipale générale**, et non comme un outil réservé aux marchés. L’espace Fiscalité présente désormais la création séquencée d’une catégorie, d’un type de taxe, d’une périodicité et d’une règle tarifaire. Il expose également l’activation et la désactivation de ces éléments, de sorte qu’une nouvelle taxe — stationnement, occupation du domaine public, publicité, licence, droit de place ou toute taxe municipale future — puisse être paramétrée sans évolution du logiciel.

Le parcours de collecte affiche maintenant le reçu final dès qu’un encaissement est validé. L’agent peut contrôler la pièce, l’imprimer isolément et la remettre au redevable. Depuis l’historique, l’action **Voir / réimprimer** ouvre le même reçu immuable ; la réimpression est enregistrée avant son ouverture à l’impression. L’aide présente un cycle opérationnel numéroté, les prérequis de chaque étape et ce que chaque intervention permet ensuite.

| Écran contrôlé | Résultat observé |
|---|---|
| Fiscalité | En-tête « Toutes les taxes de la mairie, aujourd’hui et demain », assistant de création et catalogue activable/désactivable. |
| Encaissement | Historique explicite, reçu final après validation et action de consultation/réimpression conservée dans le tableau. |
| Paramètres | Nom de mairie, nom de plateforme, logo stocké de manière sécurisée, couleur principale et modes clair, sombre ou système. |
| Aide | Parcours numéroté « Où vous situez-vous dans le cycle ? » filtré selon les permissions du compte. |
| Validation technique | 36 tests automatisés réussis sur 11 fichiers et compilation de production réussie. |
