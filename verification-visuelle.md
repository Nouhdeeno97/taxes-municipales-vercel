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

## Preuves visuelles nominatives des contrôles d’accès et de collecte — 20 août 2026

Quatre captures authentifiées ont été réalisées sur l’aperçu de développement en résolution bureau **1 280 × 900**. Elles documentent les écrans correspondants sans exécuter d’action destructive ni modifier d’écriture métier.

| Contrôle demandé | Écran capturé | Éléments explicitement visibles | Conclusion |
|---|---|---|---|
| Activation des accès | `/administration` — **Administration des accès** | La matrice de rôles et permissions, la création de comptes municipaux permanents, la préautorisation Manus, les liens temporaires, le registre « Liste et cycle de vie des utilisateurs », les états « Actif / Inactif » et l’action « Désactiver ». | Le cycle de vie et l’activation des accès sont accessibles et clairement présentés à l’administrateur. |
| Recherche d’encaissement | `/encaissement` — **Encaissement & reçus** | Le point d’entrée « Nouvel encaissement », l’historique de collecte, les références de paiement et l’action « Voir / réimprimer » sont visibles. Le parcours ouvert depuis ce point d’entrée contient la recherche serveur du redevable par identifiant national, identifiant fiscal, référence ou nom, couverte par le test dédié. | L’accès au parcours de recherche est visible ; ses quatre critères sont validés par test automatisé. |
| Impression et réimpression de reçu | `/recus` — **Reçus immuables** | Les références de reçus, le bouton « Consulter », la zone « Aperçu du reçu final » et l’explication selon laquelle chaque réimpression est tracée avant ouverture du dialogue d’impression. | La consultation préalable et l’impression isolée de la pièce sont distinguées de la page de travail ; l’intégrité du reçu est préservée. |
| Aide contextuelle | `/aide` — **Comprendre avant d’agir** | Le compteur de fonctions accessibles, les permissions actives, la position dans le cycle, les neuf étapes opérationnelles et les tutoriels détaillés par fonction. | L’aide est contextualisée, séquencée et limitée aux fonctions accessibles, avec un test de filtrage de permissions complémentaire. |

Les écrans ont été capturés sans réaliser de désactivation, de création de compte, d’encaissement ou de réimpression supplémentaire. Ils constituent une preuve d’interface ; les effets métier associés restent couverts par les tests automatisés et les recettes contrôlées précédentes.

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

## Validation des exports filtrés — 20 août 2026

Les quatre registres exportables ont été vérifiés visuellement avec leurs boutons **CSV** et **PDF** : Redevables, Obligations fiscales, Reçus immuables et Rapports de collecte. Les contrôles automatisés déclenchent réellement les deux téléchargements pour chaque registre ; ils vérifient le nom de fichier, les intitulés de colonnes, la ligne retenue par le filtre et l’absence d’une ligne explicitement exclue. Les mêmes contrats de colonnes sont maintenant réutilisés par les boutons de l’interface et par les tests.

| Registre | Colonnes et sous-ensemble contrôlés | Formats vérifiés |
|---|---|---|
| Redevables | Référence, redevable, type, statut et date de création ; résultat de recherche retenu. | CSV et PDF |
| Obligations | Référence, redevable, activité, échéance, montants et état ; liste visible filtrée. | CSV et PDF |
| Reçus | Référence, redevable, montant, date d’émission et état ; lignes du registre. | CSV et PDF |
| Rapports | Dimension, libellé et montant ; synthèse correspondant à la période appliquée. | CSV et PDF |

La suite complète compte désormais **42 tests réussis sur 14 fichiers** et la compilation de production est valide. Les captures authentifiées confirment la présence des actions CSV/PDF sur les quatre écrans.

## Recette complète d’une taxe municipale configurable — 20 août 2026

Une recette de formation explicitement identifiée `FORM-RECETTE-20260820` a démontré le cycle complet d’une **nouvelle taxe municipale générique**, sans limiter celle-ci à un marché. Le contrôle a mis en évidence puis corrigé un défaut de normalisation : lorsqu’un périmètre territorial n’était pas renseigné, certaines valeurs pouvaient restreindre involontairement la règle. Les critères facultatifs sont désormais enregistrés explicitement à `null`, ce qui laisse la règle applicable à toutes les activités correspondant au seul type choisi.

| Étape du cycle | Preuve obtenue |
|---|---|
| Paramétrage | Catégorie, type de taxe et règle journalière `FORM-RECETTE-20260820-*` créés pour 1 200 XAF. |
| Obligation automatique | Création de l’activité de formation : `automaticObligations: 1` et obligation `OBL-2026-4171CE29`. |
| Encaissement et reçu | Paiement `PAY-2026-2030ED0E`, reçu final `REC-2026-F394E9BD`, puis réimpression de la même pièce immuable. |
| Versement | Versement déclaré et validé avec 1 200 XAF et état `VALIDATED`. |
| Clôture | Clôture de journée avec écart de 0 XAF. |
| Régression évitée | Test de routeur dédié : les limites sectorielles, de zone, de marché et d’emplacement d’une règle générique sont `null`. |

Le scénario porte uniquement des données de formation, sans redevable réel. Il confirme que la mairie peut introduire une taxe future, l’associer à une activité et faire produire les obligations sans changement de code.

## Validation contrôlée du rattachement OAuth préautorisé — 20 août 2026

La recette de première connexion OAuth a révélé un cas empêchant une invitation préautorisée de s’activer : une valeur par défaut historique pouvait associer le compte provisoire à une mairie avant la consommation de l’invitation. La protection de cohérence rejetait alors l’activation, car le compte semblait déjà rattaché à une mairie. Le premier enregistrement OAuth fixe désormais explicitement une mairie absente tant que l’invitation n’a pas été consommée.

| Contrôle serveur | Résultat |
|---|---|
| Compte OAuth provisoire | Créé avec `municipalityId = null` lorsque l’identité ne porte pas encore de mairie validée. |
| Consommation de l’invitation | État passé de `PENDING` à `ACTIVATED` après normalisation de l’e-mail. |
| Rattachement | Mairie de l’invitation affectée au compte uniquement durant l’activation. |
| Rôle | Rôle municipal actif de l’invitation affecté sans doublon. |
| Régression | Test d’intégration à persistance simulée : compte provisoire sans mairie, invitation `PENDING`, transition `ACTIVATED`, écriture effective de la mairie et de chaque rôle invité. |
| Nettoyage | Comptes et invitations de recette retirés après contrôle. |

### Limites de validation externe

Le mécanisme côté serveur est validé par le test d’intégration et par les recettes contrôlées décrites ci-dessus. Deux contrôles ne peuvent toutefois pas être automatisés dans l’environnement de développement, car ils dépendent de l’équipement et d’une identité distincte de l’administrateur connecté.

| Contrôle externe à réaliser | Prérequis | Résultat attendu | Statut |
|---|---|---|---|
| Première connexion Manus OAuth d’un compte préautorisé | Un second compte Manus réel, dont l’adresse a été préautorisée dans Administration. | Retour du callback OAuth, invitation passée à `ACTIVATED`, mairie et rôles visibles dans l’interface de ce compte. | À exécuter par l’utilisateur ou un agent habilité. |
| Coupure et reconnexion réseau réelles | L’appareil cible, après consultation en ligne des écrans et sans effacement du navigateur. | Conservation de l’interface et des données déjà consultées, file locale idempotente, puis synchronisation sans doublon après reconnexion. | À exécuter sur l’appareil cible. |

Ces limites sont de nature **externe** et ne remettent pas en cause les contrôles automatisés déjà réussis. Aucun compte supplémentaire n’a été créé et aucun identifiant personnel n’a été demandé ou stocké pour les contourner.

La recette utilise le même helper appelé par le callback OAuth, mais elle ne remplace pas un essai avec un **second compte Manus réel**. Ce dernier reste explicitement requis pour vérifier la redirection OAuth, l’émission de session et l’affichage réel des droits dans le navigateur.

## Validation de la recherche d’encaissement — 20 août 2026

Une recette contrôlée a créé un redevable de formation temporaire, appelé la procédure effectivement utilisée par le formulaire d’encaissement, puis recherché ce même redevable selon les quatre clés prévues. Le redevable a été retiré une fois la vérification achevée ; aucune identité réelle n’a été utilisée ni conservée.

| Critère saisi | Résultat |
|---|---|
| Référence redevable | Le résultat de recherche contient le redevable de formation. |
| Identifiant national | Le résultat de recherche contient le même redevable. |
| Identifiant fiscal | Le résultat de recherche contient le même redevable. |
| Nom complet | Le résultat de recherche contient le même redevable. |

Le contrôle exerce la recherche `searchForPayment` avec le contexte administrateur municipal et vérifie qu’un résultat est rendu pour chacun des quatre critères, sans chargement d’une liste massive.

## Validation de l’aide contextuelle limitée — 20 août 2026

Un test de routeur introduit un compte municipal local limité disposant exclusivement des droits `dashboard.read` et `payments.create`. L’appel de `municipal.help.permissions` restitue exactement ces deux droits actifs et n’ajoute pas de permission administrative. L’interface d’aide s’appuie sur cette réponse pour n’afficher que les tutoriels dont le droit est présent ; l’administrateur conserve, lui, le parcours complet grâce au joker `*.*`.

| Compte testé | Permissions présentées à l’aide | Permissions exclues |
|---|---|---|
| Agent municipal limité | `dashboard.read`, `payments.create` | `administration.manage` et tous les tutoriels associés |
| Administrateur | `*.*` | Aucune limitation fonctionnelle |

## Réorganisation de la gouvernance et activités — 20 août 2026

La navigation authentifiée a été contrôlée après la réorganisation en quatre écrans : **Administration**, **Utilisateurs**, **Journal d’audit** et **Activités**. L’Administration est volontairement réduite à la configuration municipale et oriente l’administrateur vers les deux espaces de contrôle dédiés. Aucun compte, rôle, permission, activité ou type supplémentaire n’a été créé durant cette vérification visuelle.

| Écran contrôlé | Éléments visibles | Résultat |
|---|---|---|
| Administration | Cartes distinctes « Utilisateurs, rôles et permissions », « Journal d’audit », « Référentiels fiscaux et activités » et « Identité de la plateforme ». | Le menu est allégé sans perdre les accès aux opérations de gouvernance. |
| Utilisateurs | Recherche, filtre par état, actions CSV/PDF, registre des comptes, cycle de vie, création de comptes, matrice de permissions et affectation de rôles. | Les comptes locaux, OAuth ou temporaires peuvent être administrés depuis un espace unique, avec des actions conservées côté serveur. |
| Journal d’audit | Recherche, filtres opérationnels, colonnes de date, acteur, action, module et entité, actions CSV/PDF. | La traçabilité est lisible et exportable séparément de la configuration de plateforme. |
| Activités | Bouton « Nouvelle activité », liste déroulante de types réutilisables et bouton « Ajouter un type ». | Le formulaire propose d’abord les types existants ; un administrateur peut ensuite ajouter une catégorie et/ou un type réutilisable sans quitter l’activité. |

L’aide contextualisée a été mise à jour pour présenter ces trois parcours : gestion des utilisateurs, consultation du journal d’audit et ajout d’un type d’activité. La validation technique finale compte **49 tests réussis sur 18 fichiers**, TypeScript sans erreur et une compilation de production réussie.

## Dernière simplification : comptes séparés des droits — 20 août 2026

La dernière vérification visuelle confirme que la page **Utilisateurs** est désormais organisée selon l’ordre de travail attendu : un bouton **« Ajouter un utilisateur »** est visible dans l’en-tête, le bloc de création des trois modes d’accès est présenté avant la liste, puis viennent la recherche, les filtres, les exports et les actions de cycle de vie. La configuration des droits n’est plus affichée sur cette page.

| Écran contrôlé | Éléments visibles | Résultat |
|---|---|---|
| Utilisateurs | Bouton d’ajout en tête, cartes Compte local permanent / Compte Manus OAuth / Lien temporaire, puis liste, recherche, filtre d’état, CSV, PDF, activation, désactivation, réinitialisation et archivage. | Le parcours de gestion des comptes est prioritaire et allégé. |
| Rôles et permissions | Création de rôle, liste des rôles, matrice de cases à cocher par module, sauvegarde et affectation de rôle à un utilisateur. | La configuration des droits est clairement isolée dans son propre menu et reste contrôlée côté serveur. |
| Administration | Cartes distinctes « Utilisateurs », « Rôles et permissions », « Journal d’audit », fiscalité et paramètres. | L’Administration joue le rôle de point d’entrée sans réintroduire les formulaires détaillés. |

Le guide d’aide reprend également l’ordre recommandé : définir le rôle et ses permissions, affecter ou sélectionner ce rôle, puis créer et gérer le compte. La suite de validation confirme **49 tests réussis sur 18 fichiers** et une compilation de production réussie.

## Correction de la continuité hors connexion — 20 août 2026

Le diagnostic a identifié deux causes concrètes au retour à vide signalé après une coupure réseau : le service worker n’était pas utilisé comme composant complet de continuité du shell applicatif et le cache de session ne fournissait aucun repli contrôlé lorsque la requête d’identité échouait hors ligne.

| Élément renforcé | Correction appliquée | Contrôle effectué |
|---|---|---|
| Shell applicatif | Service worker versionné, préchargement de la page d’entrée, cache des ressources déjà visitées, repli des navigations vers `index.html` et nettoyage des caches historiques. | `sw.js` et `index.html` sont servis avec un statut HTTP 200 ; les écrans Pilotage et Synchronisation se chargent normalement après inscription du service worker. |
| Données consultées | Les réponses tRPC municipales réussies sont persistées pendant sept jours et restaurées avant les nouvelles requêtes, avec une stratégie réseau `offlineFirst`. | Politique de persistance couverte par tests automatisés. |
| Session déjà ouverte | Une identité locale minimale, sans hachage de mot de passe, compteur ni attribut de sécurité, évite la redirection vers Connexion lors d’une coupure. | Test dédié garantissant que les champs sensibles ne quittent pas le serveur. |
| File d’opérations | La file durable existante conserve ses identifiants d’opération et se déclenche à la reconnexion ; les opérations rejouées restent idempotentes côté serveur. | Tests de résolution de synchronisation existants conservés. |
| Lisibilité | Une bannière « Mode hors connexion » explique que les données déjà consultées et la file locale restent disponibles jusqu’au retour du réseau. | Contrôle visuel du shell et de la page Synchronisation réalisé. |

La validation automatisée compte désormais **52 tests réussis sur 20 fichiers**, TypeScript sans erreur et un build de production valide. La seule recette non automatisable est de revisiter l’application en ligne sur l’appareil cible, couper réellement le réseau, actualiser ou changer de page déjà visitée, puis créer une opération éligible et vérifier la reprise après reconnexion. Elle devra être exécutée après publication, car le navigateur de l’appareil doit installer le nouveau service worker.

## Création différée de redevables — 20 août 2026

Le retour de recette a confirmé que la lecture hors connexion était fonctionnelle, mais que l’ajout de données restait bloqué. Le parcours **Redevables** a donc été étendu pour traiter l’ajout local comme une opération métier différée, plutôt que comme une simple réponse mise en cache.

| Étape | Comportement ajouté | Garantie |
|---|---|---|
| Saisie sans réseau | Le formulaire crée un redevable local avec une référence `LOCAL-…`, une date et l’état **En attente de synchronisation**. | L’entrée reste visible dans le registre de l’appareil après fermeture du formulaire. |
| Conservation | Le contenu et l’identifiant d’opération sont stockés dans la file locale durable avec l’identifiant stable du futur redevable. | Une nouvelle tentative d’ajout de la même opération ne crée pas de second élément local. |
| Reconnexion | La file rejoue automatiquement la création avec le même identifiant de redevable, le même identifiant d’opération et l’identifiant de l’appareil. | Le serveur accepte une seule création et reconnaît le replay identique. |
| Divergence | Si le même identifiant local est rejoué avec un contenu différent, la synchronisation est conservée et signalée comme conflit plutôt que de créer un doublon. | L’agent conserve la donnée locale pour traitement, sans écrasement silencieux. |
| Traçabilité | La création synchronisée est journalisée avec l’action `CREATE_OFFLINE` et inscrite dans le registre de synchronisation. | L’origine différée de l’enregistrement reste vérifiable. |

Le contrôle visuel confirme que le registre Redevables et l’écran Synchronisation sont accessibles avec les repères nécessaires. La suite automatisée compte **56 tests réussis sur 22 fichiers**, TypeScript sans erreur et build de production valide. Une recette terrain reste nécessaire : créer un redevable de formation sans réseau, vérifier son badge local, rétablir la connexion et confirmer qu’il apparaît une seule fois avec une référence `RED-…`.

## Extension de la saisie différée aux formulaires métier — 20 août 2026

La file durable ne se limite plus aux redevables. Elle accepte désormais les commandes de création et les brouillons de terrain nécessaires au cycle municipal, chacun avec un identifiant d’opération stable, un hachage de contenu, un journal de synchronisation et une protection contre les replays divergents.

| Famille de formulaires | Traitement sans connexion | Résultat après reconnexion |
|---|---|---|
| Redevables | Création locale visible dans le registre avec état en attente. | Création unique, référence serveur finale et audit `CREATE_OFFLINE`. |
| Activités et territoires | Catégories, types, activités, secteurs, zones, marchés et emplacements mis en file locale. | Création hiérarchique rejouée une seule fois selon l’ordre des dépendances. |
| Fiscalité et obligations | Catégories, taxes, périodicités, règles, affectations et génération d’obligations conservées comme commandes différées. | Réexécution côté serveur avec les validations fiscales habituelles. |
| Encaissements | File locale déjà existante conservée pour la collecte, avec identifiant de paiement stable. | Finalisation du paiement et du reçu immuable après validation serveur. |
| Versements et clôtures | Brouillons locaux de remise et de clôture, sans validation locale de caisse. | Le serveur contrôle le rapprochement, l’écart et l’autorisation avant de créer l’état officiel. |
| Administration sensible | Consultation des données déjà visitées possible grâce au cache. Création de comptes, modifications de rôles/permissions, archivage, impression et validation comptable restent soumises à une connexion et aux contrôles d’accès. | Aucune écriture de sécurité ou décision comptable ne peut être finalisée localement. |

Les contrôles techniques confirment **59 tests réussis sur 23 fichiers**, TypeScript sans erreur et build de production valide. Les captures de Fiscalité, Activités, Encaissement, Versements, Clôtures et Synchronisation ont été revues après le branchement des files différées. Une vérification terrain distincte reste requise pour chaque famille de formulaires, afin de confirmer le comportement du navigateur et de l’appareil réellement utilisé.

### Contrôles en ligne explicités

Une bannière contextuelle apparaît désormais en mode hors connexion pour chaque espace où une écriture doit rester sous contrôle serveur. Elle remplace les échecs opaques par une explication opérationnelle.

| Écran | Message de continuité hors connexion |
|---|---|
| Utilisateurs | Les comptes déjà chargés restent consultables ; création, activation, désactivation et archivage exigent une connexion. |
| Rôles et permissions | La consultation reste disponible ; toute modification de droits exige une connexion sécurisée. |
| Administration et paramètres | Les données déjà chargées restent visibles ; toute modification de plateforme exige une connexion. |
| Journal d’audit | Les événements déjà consultés peuvent rester visibles ; aucune écriture ne peut être modifiée localement. |
| Reçus | Les pièces déjà consultées restent accessibles ; impression et réimpression attendent le contrôle serveur. |

Le test de cette politique de routage contextuel s’ajoute à la suite, qui compte désormais **61 tests réussis sur 24 fichiers**, avec TypeScript sans erreur et une compilation de production valide.

## Recherche à grande échelle et fiscalité par groupes — 20 août 2026

Les listes exhaustives qui limitaient les parcours **Activités** et **Fiscalité** ont été remplacées par des recherches serveur et des critères persistants. Cette conception évite de charger tous les redevables ou toutes les activités dans le navigateur lorsque le volume augmente.

| Parcours | Fonctionnement livré | Effet métier |
|---|---|---|
| Déclaration d’activité | Recherche paginée du redevable par référence, nom, identifiant national ou identifiant fiscal. | L’agent sélectionne le bon redevable avant de créer l’activité, sans faire défiler une liste complète. |
| Ciblage fiscal | Recherche paginée des activités et critères de groupe : libellé, type d’activité, catégories, territoire, statut et identifiants national/fiscal du redevable associé. | Une règle peut viser une activité unique ou un groupe durable d’activités. |
| Règle pérenne | Les critères sont enregistrés dans la portée fiscale ; l’activation/désactivation est conservée dans l’état de la règle. | Les nouvelles activités qui correspondent à une règle active la reçoivent automatiquement ; une règle désactivée ne produit plus de nouvelle obligation. |
| Obligations | Génération par lots à partir d’une règle de groupe active, avec préservation de l’idempotence. | Les obligations existantes pour une activité et une période ne sont pas recréées. |

La migration additive `0007` étend les portées fiscales sans modifier les données existantes. La validation finale compte **62 tests réussis sur 24 fichiers**, TypeScript sans erreur et compilation de production valide. L’aide contextuelle explique désormais la recherche de redevables, les critères de groupe, la désactivation d’une règle et la génération par lots.

Les contrôles visuels authentifiés en résolution bureau **1 280 × 900** confirment les trois parcours : la page Activités annonce la recherche préalable par référence, nom et identifiants ; la page Fiscalité présente les champs de groupe, la recherche ciblée, les actions d’affectation et de génération de premier lot ; la page Aide expose le tutoriel « Configurer une taxe et générer des obligations » dans le cycle opérationnel filtré par permissions.

## Correction du parcours fiscal par lots — 20 août 2026

Le parcours Fiscalité a été rectifié afin de distinguer sans ambiguïté **la création de la règle tarifaire**, **son affectation aux activités** et **la génération des obligations**. Les champs de groupe qui avaient été introduits dans le formulaire de création de règle ont été supprimés : ce formulaire ne conserve désormais que le type de taxe, la périodicité, le code, le libellé, le montant positif, la date d’effet, le délai de grâce et la pénalité éventuelle.

| Étape | Contrôle visuel et fonctionnel | Garantie apportée |
|---|---|---|
| 3 — Choisir les activités | Une case permet de sélectionner toutes les activités actives. Des cases dynamiques regroupent aussi les activités par type et par libellé ; une recherche cible une ou plusieurs activités par identifiant national/fiscal, référence, nom ou libellé. | L’agent peut choisir un ou plusieurs lots, ou compléter avec des activités précises, sans modifier le tarif. |
| 4 — Affecter la règle | La règle tarifaire active est choisie après la sélection. L’affectation est traitée par paquets de 200, avec contrôle des doublons. | Une même règle ne reçoit pas d’affectation active en double sur une activité. |
| 5 — Générer les obligations | La même sélection et une règle affectée sont utilisées pour une période donnée. | La génération conserve le montant de base dans `expectedAmount`, applique séparément l’exonération dans `discountAmount`, calcule le reste dû et évite les doublons de période. |

La compilation de production est valide et la suite automatisée compte désormais **63 tests réussis sur 24 fichiers**. La vérification visuelle en résolution bureau confirme le nouvel ordre des étapes, les cases de sélection par lot et le tableau des obligations qui distingue le montant initial du reste dû.

## Ajustement final des lots par localisation — 20 août 2026

L’étape 3 de Fiscalité a été simplifiée pour rester utilisable lorsque le nombre d’activités devient très important. Les lots par libellé d’activité sont retirés ; ils sont remplacés par des **lots dynamiques par type de localisation**. La sélection conserve les types d’activité, la case « Toutes les activités actives » et la recherche ciblée d’activités précises.

| Élément vérifié | Résultat |
|---|---|
| Lots par type d’activité | Cases dynamiques conservées avec le nombre d’activités actives dans chaque type. |
| Lots par type de localisation | Cases dynamiques pour Zone, Marché, Emplacement, Activité mobile et Adresse personnalisée, avec décompte des activités correspondantes. |
| Recherche précise | Recherche par référence ou libellé d’activité, ainsi que par nom, identifiant national ou identifiant fiscal du redevable ; plusieurs résultats peuvent être cochés. |
| Affectation et génération | Les deux étapes utilisent exactement la même sélection, sans modifier le montant de la règle tarifaire. |
| En-tête municipal | Le nom affiché est désormais « Mairie d’Owendo » sans le suffixe de code « LBV ». |
| Aide et tutoriel | Le tutoriel fiscal explique la séparation tarif/affectation, les lots par type d’activité et de localisation, puis la génération idempotente. |

La capture en résolution bureau **1 280 × 900** confirme l’affichage des lots par type de localisation et de l’intitulé municipal sans code. Les tests de contrat vérifient que les types de localisation sont acceptés et que l’ancien critère par libellé est refusé. La suite compte **65 tests réussis sur 24 fichiers**, TypeScript sans erreur et build de production valide.

## Volumétrie, supervision des versements et maintenance — 21 août 2026

Les registres de la plateforme ont été adaptés pour éviter le chargement exhaustif des données. Les recherches et les paginations s’exécutent côté serveur : l’interface ne reçoit que la page demandée, avec le total correspondant aux filtres appliqués.

| Parcours | Amélioration validée | Présentation à l’agent |
|---|---|---|
| Redevables, Activités, Encaissements, Reçus, Utilisateurs et Audit | Pagination serveur et recherche ; le contrat limite les tailles de page entre 5 et 100 lignes. | Navigation réutilisable avec total, page courante et boutons précédent/suivant. |
| Activités | Recherche par référence, nom, identifiant national ou identifiant fiscal du redevable. | Toutes les activités rattachées à un même redevable peuvent être retrouvées sans liste complète. |
| Fiscalité | Lots par type d’activité et type de localisation limités à deux colonnes et quatre lignes visibles ; le contenu reste accessible par défilement interne. Les catalogues Taxes et Règles affichent cinq lignes défilables. | La page reste compacte quel que soit le nombre de types, localisations, taxes ou règles. |
| Obligations | Recherche et pagination de dix lignes. | Le montant initial et le reste dû restent visibles sur chaque obligation. |
| Reçus | L’action « Consulter » ouvre une fenêtre dédiée contenant la pièce, son aperçu et son historique d’impression. | Le registre reste stable même avec un nombre élevé de reçus. |
| Versements | Les encaissements éligibles sont regroupés par agent avec nombre et montant total non versé ; le registre de supervision est recherché, filtrable par date et paginé. | L’agent sélectionne son groupe, puis le superviseur contrôle référence, agent, attendu, déposé, écart, état, date et supervision. |

L’espace **Base de données** est visible pour le droit `database.maintenance`, réservé aux responsables techniques. Il ouvre la sauvegarde complète gérée par la plateforme et documente la restauration à partir d’un instantané. Les commandes SQL brutes, l’import direct et la purge restent volontairement indisponibles : ils peuvent compromettre les contraintes, migrations, sessions et l’intégrité comptable. Toute future purge exige la définition du périmètre métier et un circuit de double validation ; le journal d’audit est explicitement exclu.

Les contrôles interactifs ont confirmé les écrans Activités, Fiscalité, Reçus, Versements et Base de données. La suite finale compte **68 tests réussis sur 25 fichiers**, TypeScript sans erreur et build de production valide.
