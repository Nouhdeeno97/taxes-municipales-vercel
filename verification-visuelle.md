# Vérification visuelle

La page d’accès a été vérifiée sur écran bureau (1280 × 720) et mobile (375 × 812). La carte de connexion, le contraste du bouton principal, la hiérarchie typographique et les marges restent lisibles aux deux formats. Les routes protégées redirigent correctement vers la même page d’accès lorsqu’aucune session n’est active ; la vérification détaillée des écrans métier nécessite donc une session authentifiée disposant d’un périmètre municipal.

Les contrôles TypeScript et les tests unitaires ont été exécutés avec succès après les dernières modifications.

## Validation authentifiée

Le parcours OAuth a été validé avec une session active. Une migration additive a restauré les colonnes `users.municipalityId` et `users.isActive` manquantes dans la base de développement, ce qui a rétabli le callback OAuth. Le tableau de bord authentifié s’affiche désormais avec la navigation métier, l’indicateur « Service en ligne », les compteurs opérationnels et les garanties métier visibles.

L’écran protégé des obligations a également été validé avec la session active. Après la configuration des barèmes journaliers Libreville, il présente l’état vide attendu et explique le prérequis : affecter une règle fiscale à une activité, puis générer les obligations périodiques. Aucun redevable, aucune activité opérationnelle, aucune obligation ni aucun encaissement fictif n’a été créé pour forcer ce scénario.

L’écran protégé des reçus a été validé dans la même session Libreville. Le registre vide rappelle qu’un reçu définitif n’est créé qu’après validation d’un encaissement et présente les garanties d’immutabilité, d’empreinte de contrôle, de QR et d’historique de réimpression. Aucun encaissement artificiel n’a été créé.
