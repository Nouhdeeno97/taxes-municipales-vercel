import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import "./index.css";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
}

const OFFLINE_QUERY_CACHE_KEY = "taxe-marche.query-cache.v2";
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 0, gcTime: 24 * 60 * 60 * 1000, retry: 1, refetchOnMount: "always", refetchOnReconnect: true, refetchOnWindowFocus: true, networkMode: "offlineFirst" } } });

try {
  const cachedState = localStorage.getItem(OFFLINE_QUERY_CACHE_KEY);
  if (cachedState) hydrate(queryClient, JSON.parse(cachedState));
} catch {
  localStorage.removeItem(OFFLINE_QUERY_CACHE_KEY);
}

let persistenceTimer: number | undefined;
queryClient.getQueryCache().subscribe(() => {
  window.clearTimeout(persistenceTimer);
  persistenceTimer = window.setTimeout(() => {
    try {
      const snapshot = dehydrate(queryClient, { shouldDehydrateQuery: query => query.state.status === "success" && JSON.stringify(query.queryKey).includes("municipal") });
      localStorage.setItem(OFFLINE_QUERY_CACHE_KEY, JSON.stringify(snapshot));
    } catch {
      // Le stockage local peut être indisponible ou saturé : l’application reste utilisable en ligne.
    }
  }, 300);
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
