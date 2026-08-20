export function getOfflineCapabilityMessage(path: string): string | undefined {
  const onlineOnlyMessages: Record<string, string> = {
    "/utilisateurs": "La consultation des comptes déjà chargés reste disponible. La création, l’activation, la désactivation et l’archivage de comptes exigent une connexion afin de protéger les accès.",
    "/roles-permissions": "La consultation reste disponible. Toute modification de rôle ou de permission exige une connexion afin que les droits prennent effet de manière sécurisée.",
    "/administration": "Les paramètres d’administration sont consultables s’ils ont déjà été chargés. Toute modification de plateforme exige une connexion.",
    "/parametres": "Les paramètres déjà consultés restent visibles. Les modifications d’identité, de logo ou de thème exigent une connexion.",
    "/audit": "Le journal déjà consulté peut rester visible. Aucune écriture d’audit ne peut être modifiée hors connexion.",
    "/recus": "Les reçus déjà consultés restent accessibles. Une impression ou réimpression est autorisée uniquement après contrôle serveur.",
  };
  return onlineOnlyMessages[path];
}
