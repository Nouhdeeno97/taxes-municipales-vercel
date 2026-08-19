# Guide de prise en main et de test — Taxes municipales

**Mairie active :** Libreville (`LBV`)  
**Environnement :** développement  
**But de ce guide :** comprendre le fonctionnement de la plateforme avant de l’évaluer et noter précisément les éléments manquants.

## 1. Comprendre la logique générale

La plateforme suit le circuit réel d’une recette municipale de marché. On commence par identifier le redevable, puis son activité et son emplacement. Une règle fiscale permet de générer une obligation à payer. L’agent encaisse ensuite cette obligation et la plateforme émet un reçu définitif. Enfin, les encaissements sont déclarés en versement, contrôlés, puis intégrés à la clôture de la journée.

> **Règle importante :** un reçu final ne doit jamais être modifié ou supprimé. Si une correction devient nécessaire, elle doit être réalisée au moyen d’une opération tracée, sans altérer la pièce d’origine.

| Ordre | Question métier | Module à ouvrir |
|---|---|---|
| 1 | Combien avons-nous de redevables, de recettes et d’obligations à suivre ? | Pilotage |
| 2 | Qui exerce une activité taxable ? | Redevables, puis Activités |
| 3 | Où l’activité est-elle exercée ? | Territoire |
| 4 | Quelle taxe et quel montant sont applicables ? | Fiscalité |
| 5 | Qu’est-ce qui doit être payé ? | Obligations |
| 6 | Quel paiement a été encaissé ? | Encaissement |
| 7 | Quelle preuve définitive a été remise ? | Reçus |
| 8 | Quel montant l’agent a-t-il reversé ? | Versements |
| 9 | La journée est-elle équilibrée et clôturée ? | Clôtures |

## 2. Avant de commencer le test

Connectez-vous avec votre compte autorisé, puis vérifiez dans l’en-tête que l’identification indique **« MAIRIE DE LIBREVILLE · LBV »**. L’indicateur doit afficher **« Service en ligne »**. Si l’une de ces informations est absente, arrêtez le test et signalez-le : cela veut dire que le rattachement municipal ou la session n’est pas correctement chargé.

Le jeu présent est un jeu de démonstration autorisé. Toutes les références qui commencent par `FORM-LBV-` sont **des données de formation, non opérationnelles**. Elles permettent de lire l’ensemble du cycle sans créer de donnée personnelle réelle ni de recette réelle.

| Référence | Ce qu’elle représente | À quoi elle sert pendant le test |
|---|---|---|
| `FORM-LBV-RED-001` | Redevable de formation | Vérifier le registre des redevables. |
| `FORM-LBV-ACT-001` | Activité de formation | Vérifier le rattachement à une activité et un marché. |
| `FORM-LBV-OBL-001` | Obligation de formation, déjà réglée | Vérifier le cycle de recouvrement. |
| `FORM-LBV-REC-001` | Reçu final de 1 000 F CFA | Vérifier l’immuabilité du reçu. |
| `FORM-LBV-DEP-001` | Versement validé de 1 000 F CFA | Vérifier le rapprochement et la prévention du double versement. |

Pour le premier test, commencez par le parcours de consultation ci-dessous. Vous pouvez ensuite exécuter le parcours de création guidé ajouté dans la section suivante, uniquement avec des données de formation explicitement libellées comme telles. N’utilisez jamais de personne réelle, de société réelle ou de montant encaissé réellement pendant l’évaluation de développement.

## 2 bis. Parcours de recette après les corrections

Les écrans de création ont été rendus progressifs afin de lever les blocages rencontrés lors du premier test. Suivez cet ordre, sans sauter une étape : la fiscalité doit exister avant de créer une activité taxable, et une obligation doit exister avant de pouvoir encaisser.

| Étape | Écran | Action à réaliser | Résultat attendu |
|---|---|---|---|
| 1 | Administration | Créez ou choisissez un rôle, cochez les permissions, puis enregistrez-les. | Le compteur de permissions sélectionnées et la matrice du rôle correspondent à vos choix. |
| 2 | Administration | Créez un compte municipal permanent : nom, identifiant, mot de passe initial et rôles. Transmettez le mot de passe par un canal sûr. | Le compte apparaît comme `LOCAL` dans la liste, avec son état et ses rôles. Le mot de passe n’est jamais affiché. |
| 2 bis | Connexion locale | Ouvrez une fenêtre privée, allez sur `/connexion`, saisissez l’identifiant local et le mot de passe créés. | La plateforme s’ouvre ; seuls les menus et actions autorisés par les rôles apparaissent. |
| 2 ter | Aide puis Administration | Ouvrez **Aide et tutoriels**, puis revenez avec un administrateur dans **Administration → Journal d’audit**. | L’aide ne montre que les sujets permis au compte local ; l’événement `LOCAL_LOGIN` précise qui s’est connecté et quand. |
| 2 quater | Administration | Désactivez, réinitialisez le mot de passe ou archivez le compte local de formation selon le scénario choisi. | L’accès est bloqué dès la désactivation ou l’archivage. L’historique et les traces restent visibles dans le journal d’audit. |
| 2 quinquies | Administration | Pour les collègues disposant d’un compte Manus, préautorisez leur adresse e-mail et choisissez leurs rôles. | L’invitation apparaît « En attente ». À la première connexion du second compte, elle devient « Activée » et le compte apparaît dans la liste. |
| 3 | Territoire | Créez, dans cet ordre, un secteur, une zone rattachée, un marché rattaché, puis un emplacement rattaché. | Chaque formulaire ne propose que les parents valides ; l’arbre final montre la relation Mairie → Secteur → Zone → Marché → Emplacement. |
| 4 | Fiscalité | Créez les référentiels requis, puis une règle tarifaire. Utilisez la prévisualisation avant d’enregistrer. | Le montant base, une éventuelle exonération, pénalité et total attendu sont visibles avant sauvegarde. |
| 5 | Redevables puis Activités | Créez un redevable de formation, puis une activité rattachée au marché, au type d’activité et à la règle compatible. | L’activité indique la règle applicable et l’obligation journalière initiale est générée lorsqu’une règle valide est trouvée. |
| 6 | Obligations | Recherchez l’activité ou le redevable créé et contrôlez le montant et l’état. | L’obligation apparaît ; les filtres et exports ne montrent que les lignes demandées. |
| 7 | Encaissement | Sélectionnez l’obligation puis préparez le paiement. | Un aperçu de reçu non définitif est affiché avant validation. |
| 8 | Reçus | Validez seulement après avoir contrôlé l’aperçu, puis consultez le reçu final. | Le reçu final est visible, réimprimable après consultation, mais n’est ni modifiable ni supprimable. |
| 9 | Versements puis Clôtures | Déclarez le versement à partir de l’encaissement, puis contrôlez la clôture. | Une transaction déjà versée n’est plus proposée une seconde fois ; l’écart et la clôture restent tracés. |

### Test hors connexion

Sur **le même navigateur et le même appareil**, consultez d’abord les écrans en ligne afin d’enregistrer les dernières données dans le cache local. Coupez ensuite la connexion réseau, rechargez l’application et revenez sur les écrans déjà consultés : la dernière version affichée doit rester disponible au lieu d’un écran vide ou de compteurs remis à zéro. Enregistrez éventuellement une action admissible hors connexion, puis rétablissez le réseau : l’indicateur de synchronisation doit reprendre la file locale sans dupliquer l’opération.

> Un premier accès effectué entièrement hors connexion ne peut pas télécharger de données qui n’ont jamais été consultées. La conservation hors connexion est volontairement locale au navigateur, afin de ne pas exposer les données d’une mairie à un autre poste.

## 3. Parcours de test conseillé, écran par écran

### Étape 1 — Pilotage : vérifier la vue globale

Ouvrez **Pilotage** dans le menu de gauche. Cet écran n’est pas un écran de saisie : c’est le résumé de la situation de la mairie. Il doit vous permettre de savoir en quelques secondes combien de personnes sont actives, quel montant a été collecté aujourd’hui, ce qui reste à suivre et si des synchronisations doivent être traitées.

| À contrôler | Résultat attendu dans le jeu de formation | Pourquoi c’est important |
|---|---|---|
| Redevables actifs | `1` | Le redevable de formation est bien pris en compte. |
| Obligations à suivre | `0` | L’obligation de formation est déjà réglée. |
| Recettes du jour | `1 000 F CFA` | Le paiement de formation est bien comptabilisé. |
| Versements déclarés | `1 000 F CFA` | Le paiement a été reversé et rapproché. |
| Synchronisations à traiter | `0` | Aucune opération hors connexion n’attend de reprise. |

Si le tableau de bord affiche zéro partout, il faut le signaler comme un défaut de remontée des données ou de rattachement à la mairie.

### Étape 2 — Redevables : comprendre qui paie

Ouvrez **Redevables**. Un redevable est une personne physique ou une personne morale qui exerce une activité taxable. Le registre sert à rechercher la personne ou l’organisation avant toute nouvelle saisie ; cela évite de créer plusieurs fois le même redevable.

Dans la zone de recherche, saisissez `FORM-LBV-RED-001`. Vous devez retrouver une seule ligne avec le libellé **« FORMATION — SCÉNARIO LIBREVILLE (NON OPÉRATIONNEL) »**, le type **Personne morale** et le statut **ACTIVE**.

Les deux boutons en haut à droite ont les fonctions suivantes :

| Action | Utilité | À ne pas faire pendant la première prise en main |
|---|---|---|
| Nouveau redevable | Crée un redevable avec contrôle de doublon. | Ne pas créer de personne réelle ni de société réelle de test. |
| Fusionner | Rattache les activités et obligations d’un doublon à une fiche cible, en gardant une trace d’audit. | Ne jamais fusionner la fiche `FORM-LBV-RED-001`. |

### Étape 3 — Activités : comprendre ce qui est taxé

Ouvrez **Activités**. La plateforme ne taxe pas directement une personne : elle taxe l’activité qu’elle exerce dans un lieu déterminé. Une même personne peut posséder plusieurs activités, donc plusieurs obligations.

Recherchez ou observez l’activité de formation `FORM-LBV-ACT-001`. Vérifiez qu’elle est rattachée au redevable de formation, à une activité de vente de vivres et au périmètre de marché concerné. L’élément important à vérifier est la séparation entre le **redevable** et l’**activité** : la personne peut être connue, mais l’obligation dépend de l’activité, du marché et du barème applicables.

### Étape 4 — Territoire : comprendre où la taxe s’applique

Ouvrez **Territoire**. Cet écran présente la hiérarchie géographique et opérationnelle utilisée par la mairie : secteur, zone, marché, puis emplacement. La taxation peut varier selon cette localisation.

Vérifiez que vous voyez la structure Libreville et notamment le marché **Mont-Bouët**. L’objectif n’est pas de modifier la structure pendant ce premier test, mais de comprendre que les règles fiscales et les affectations d’agents sont rattachées à cette géographie.

### Étape 5 — Fiscalité : comprendre le calcul du montant

Ouvrez **Fiscalité**. C’est ici que la mairie définit les types de taxes, leur périodicité et leurs règles tarifaires. Les règles enregistrées pour la démonstration comprennent un droit de place journalier de **1 000 XAF** pour les vivres au marché Mont-Bouët et **500 XAF** dans les autres marchés.

Le point à contrôler est le lien entre la règle, l’activité et le marché. Une règle fiscale ne doit pas s’appliquer indistinctement à tous les redevables : elle doit correspondre à une activité et à un territoire précis. Si l’écran ne vous permet pas de comprendre facilement ce lien, notez-le dans les écarts à corriger.

### Étape 6 — Obligations : comprendre ce qui est dû

Ouvrez **Obligations**. Une obligation fiscale est une somme due à une date donnée. Elle est générée à partir d’une activité et d’une règle fiscale. Une obligation peut être à payer, partiellement payée, payée ou annulée selon les opérations autorisées.

Vous devez voir `FORM-LBV-OBL-001`. Elle est liée au redevable et à l’activité de formation. Son absence indiquerait que le lien entre l’activité, la fiscalité et le recouvrement n’est pas correctement affiché. Le compteur du tableau de bord reste à zéro parce que l’obligation de formation est déjà réglée ; c’est le comportement attendu.

### Étape 7 — Encaissement : comprendre l’acte de paiement

Ouvrez **Encaissement**. Cet écran sert à enregistrer un paiement contre une ou plusieurs obligations. L’agent sélectionne les obligations à régler, indique un ou plusieurs moyens de paiement, puis valide l’encaissement. La plateforme doit contrôler que le total déclaré correspond exactement aux montants affectés.

Pendant votre premier parcours, ne créez pas de paiement : l’encaissement de formation a déjà été validé. Observez plutôt les libellés, les montants et les contrôles qui vous semblent nécessaires. Notez notamment si vous attendez un champ, un filtre ou une étape de vérification supplémentaire avant validation.

> Après validation, le paiement crée une pièce de recouvrement. Il ne faut donc pas utiliser cet écran comme un simple bac à essai avec de vrais montants ou de vraies identités.

### Étape 8 — Reçus : vérifier la preuve remise au redevable

Ouvrez **Reçus**. Le reçu est la preuve définitive associée à un encaissement validé. Recherchez la ligne `FORM-LBV-REC-001`, d’un montant de **1 000 F CFA**, puis cliquez sur **Consulter**.

Le contrôle du reçu doit présenter les éléments d’intégrité, le QR de contrôle et l’historique de réimpression. L’objectif est de vérifier que vous pouvez consulter ou réimprimer une pièce, mais pas en modifier le montant, le redevable ou la date. Si vous voyez une possibilité de modification ou de suppression directe d’un reçu final, signalez-la immédiatement : ce serait une anomalie majeure.

### Étape 9 — Versements : vérifier le reversement de l’agent

Ouvrez **Versements**. Le versement ne correspond pas à un nouveau paiement du redevable. Il correspond à la remise, par un agent collecteur, des fonds qu’il a déjà encaissés. L’écran compare le montant attendu au montant physiquement déclaré, puis conserve l’écart.

Vous devez voir `FORM-LBV-DEP-001`, avec un montant attendu de **1 000 F CFA**, un montant déposé de **1 000 F CFA**, un écart de **0 F CFA** et l’état **VALIDATED**. La zone « Encaissements éligibles » doit être vide : le paiement de formation a déjà été versé et ne peut pas être déclaré une seconde fois.

| Ce que vous observez | Interprétation attendue |
|---|---|
| Le paiement déjà versé ne peut pas être coché à nouveau. | La protection contre le double versement fonctionne. |
| Écart nul | La déclaration correspond au montant encaissé. |
| Écart non nul | Le système doit conserver l’écart et demander une supervision, pas le masquer. |

### Étape 10 — Clôtures : vérifier la fin de journée

Ouvrez **Clôtures**. Cet écran sert à figer le contrôle quotidien : les montants encaissés, les versements et les écarts sont rapprochés pour une période donnée. Le but est de produire un état contrôlable, pas de supprimer ou de réécrire les événements de la journée.

Vérifiez que la clôture de formation est visible et qu’elle est reliée à la journée et au versement de formation. Lors du premier test, ne modifiez pas son état. Notez si les informations nécessaires à votre procédure de clôture municipale sont suffisamment lisibles : agent, période, total attendu, total déposé, écart, contrôleur, commentaire et état.

### Étape 11 — Rapports : vérifier l’information de pilotage

Ouvrez **Rapports**. Les rapports servent à répondre aux questions de supervision : combien a été encaissé, où, par quel agent, sur quelle taxe et pour quelle période. Utilisez les filtres sans modifier de données et vérifiez si les indicateurs et l’export CSV répondent à vos besoins de gestion.

Pour votre évaluation, notez les rapports qui vous manquent sous forme de question métier précise. Par exemple : « total des droits de place par marché et par journée », plutôt que « il manque un rapport ».

### Étape 12 — Administration et Synchronisation : vérifier le contrôle et le hors connexion

Ouvrez **Administration** pour consulter les utilisateurs, les rôles, les permissions, les affectations territoriales et les paramètres. Cet écran est essentiel car les rôles doivent déterminer qui peut encaisser, verser, superviser, clôturer ou seulement consulter.

Ouvrez ensuite **Synchronisation**. Cette page permet de suivre les opérations enregistrées hors connexion et les éventuels conflits. Une opération rejouée avec le même identifiant doit rester idempotente : elle ne doit pas créer deux paiements, deux reçus ou deux versements. Pour cette première lecture, vérifiez qu’aucune synchronisation n’est en attente et ne forcez pas de conflit.

## 4. Comment décider qu’une fonctionnalité manque

Un manque n’est pas seulement un bouton absent. Il peut s’agir d’une information non visible, d’un contrôle insuffisant, d’un parcours trop long ou d’une règle métier qui ne correspond pas à la pratique de la mairie. Lorsque vous trouvez un point à améliorer, décrivez-le à partir d’une situation concrète.

| Information à fournir | Exemple utile |
|---|---|
| Écran concerné | Versements |
| Ce que vous essayiez de faire | Vérifier l’agent ayant remis les fonds. |
| Ce que vous voyez actuellement | Montant et état, mais pas l’identité de l’agent. |
| Ce que vous attendez | Nom de l’agent, heure de déclaration et contrôleur. |
| Importance | Bloquant, important ou amélioration. |
| Règle métier associée | Un superviseur doit savoir qui est responsable de chaque remise. |

Vous pouvez m’envoyer les écarts simplement sous cette forme : **« Écran : … / action : … / attendu : … / actuel : … / importance : … »**. Je les transformerai ensuite en liste de corrections priorisées, sans ajouter de nouvelles fonctions sans votre validation.

## 5. Ordre de test recommandé pour aujourd’hui

Faites d’abord le parcours de consultation suivant : **Pilotage → Redevables → Activités → Territoire → Fiscalité → Obligations → Reçus → Versements → Clôtures → Rapports → Administration → Synchronisation**. Prenez une note dès qu’un intitulé, un calcul, une information affichée ou un enchaînement ne correspond pas à votre façon de travailler.

Après cette première passe, envoyez-moi les manques que vous avez repérés. Nous les classerons ensemble en trois catégories : blocants pour la collecte, nécessaires avant production et améliorations de confort. Aucune action financière réelle ni donnée personnelle réelle ne doit être saisie durant ce test de développement.
