import { trpc } from "@/lib/trpc";
import { canUseCachedOfflineIdentity } from "@shared/offlineSupport";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type CachedOfflineUser = {
  id: number;
  municipalityId: string | null;
  name: string | null;
  role: "admin" | "user";
};

const RUNTIME_USER_CACHE_KEY = "taxes-municipales.runtime-user.v1";

function readCachedRuntimeUser(): CachedOfflineUser | null {
  try {
    const cached = JSON.parse(localStorage.getItem(RUNTIME_USER_CACHE_KEY) || "null") as Partial<CachedOfflineUser> | null;
    if (!cached || typeof cached.id !== "number" || (cached.role !== "admin" && cached.role !== "user")) return null;
    return { id: cached.id, municipalityId: typeof cached.municipalityId === "string" ? cached.municipalityId : null, name: typeof cached.name === "string" ? cached.name : null, role: cached.role };
  } catch {
    return null;
  }
}

function persistRuntimeUser(user: { id: number; municipalityId: string | null; name: string | null; role: "admin" | "user" }) {
  try { localStorage.setItem(RUNTIME_USER_CACHE_KEY, JSON.stringify({ id: user.id, municipalityId: user.municipalityId, name: user.name, role: user.role })); } catch {}
}

export function useAuth(options?: UseAuthOptions) {
  // Login is started via startLogin() in the effect below, only when we actually
  // navigate — never during render. startLogin() mints a one-time nonce + writes
  // the state cookie, so calling it per render would overwrite the cookie and
  // desync it from an in-flight login's `state`.
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const utils = trpc.useUtils();
  const [online, setOnline] = useState(() => navigator.onLine);

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      try {
        localStorage.removeItem(RUNTIME_USER_CACHE_KEY);
      } catch {}
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);

  useEffect(() => {
    const refreshOnlineState = () => setOnline(navigator.onLine);
    window.addEventListener("online", refreshOnlineState);
    window.addEventListener("offline", refreshOnlineState);
    return () => { window.removeEventListener("online", refreshOnlineState); window.removeEventListener("offline", refreshOnlineState); };
  }, []);

  const state = useMemo(() => {
    if (meQuery.data) persistRuntimeUser(meQuery.data);
    const cachedUser = readCachedRuntimeUser();
    const user = meQuery.data ?? (canUseCachedOfflineIdentity(online, Boolean(cachedUser)) ? cachedUser : null);
    return {
      user,
      loading: (meQuery.isLoading && !user) || logoutMutation.isPending,
      error: user ? logoutMutation.error ?? null : meQuery.error ?? logoutMutation.error ?? null,
      isAuthenticated: Boolean(user),
    };
  }, [
    meQuery.data,
    meQuery.error,
    meQuery.isLoading,
    online,
    logoutMutation.error,
    logoutMutation.isPending,
  ]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (meQuery.isLoading || logoutMutation.isPending) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    window.location.href = redirectPath ?? "/connexion";
  }, [
    redirectOnUnauthenticated,
    redirectPath,
    logoutMutation.isPending,
    meQuery.isLoading,
    state.user,
  ]);

  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
