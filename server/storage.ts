import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

let storageClient: SupabaseClient | null = null;

function getStorageClient() {
  if (storageClient) return storageClient;
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error("Le stockage Supabase n’est pas configuré.");
  }
  storageClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return storageClient;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "").replace(/\.\./g, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  return lastDot === -1 ? `${relKey}_${hash}` : `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * Téléverse un fichier dans un compartiment Supabase Storage public.
 * Le secret service-role reste exclusivement côté serveur ; les clients passent
 * par les procédures tRPC protégées avant toute écriture.
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getStorageClient();
  const key = appendHashSuffix(normalizeKey(relKey));
  const { error } = await client.storage.from(ENV.supabaseStorageBucket).upload(key, data, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(`Échec du téléversement Supabase : ${error.message}`);
  const { data: publicUrl } = client.storage.from(ENV.supabaseStorageBucket).getPublicUrl(key);
  return { key, url: publicUrl.publicUrl };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const client = getStorageClient();
  const key = normalizeKey(relKey);
  const { data } = client.storage.from(ENV.supabaseStorageBucket).getPublicUrl(key);
  return { key, url: data.publicUrl };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getStorageClient();
  const { data, error } = await client.storage.from(ENV.supabaseStorageBucket).createSignedUrl(normalizeKey(relKey), 60 * 15);
  if (error || !data?.signedUrl) throw new Error(`URL signée Supabase indisponible : ${error?.message ?? "réponse vide"}`);
  return data.signedUrl;
}
