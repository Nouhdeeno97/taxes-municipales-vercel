export const OFFLINE_QUERY_CACHE_KEY = "taxes-municipales.query-cache.v3";

/** Ne conserve localement que les réponses métier consultables par la session déjà ouverte. */
export function shouldPersistOfflineQuery(queryKey: unknown): boolean {
  return Array.isArray(queryKey) && queryKey.some(part => part === "municipal");
}

/** Une identité précédemment authentifiée peut seulement être réutilisée lorsque le réseau est indisponible. */
export function canUseCachedOfflineIdentity(online: boolean, hasCachedIdentity: boolean): boolean {
  return !online && hasCachedIdentity;
}
