import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { dehydrate, hydrate, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import { OFFLINE_QUERY_CACHE_KEY, shouldPersistOfflineQuery } from "@shared/offlineSupport";
import App from "./App";
import "./index.css";

function installOptionalAnalytics() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT?.replace(/\/$/, "");
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;

  if (!endpoint || !websiteId) return;

  const analyticsScript = document.createElement("script");
  analyticsScript.defer = true;
  analyticsScript.src = `${endpoint}/umami`;
  analyticsScript.dataset.websiteId = websiteId;
  document.head.appendChild(analyticsScript);
}

installOptionalAnalytics();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).then(registration => registration.update()).catch(() => undefined));
}

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15 * 60 * 1000, gcTime: 7 * 24 * 60 * 60 * 1000, retry: 1, refetchOnMount: false, refetchOnReconnect: true, refetchOnWindowFocus: true, networkMode: "offlineFirst" } } });

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
      const snapshot = dehydrate(queryClient, { shouldDehydrateQuery: query => query.state.status === "success" && shouldPersistOfflineQuery(query.queryKey) });
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

  if (window.location.pathname !== "/connexion") window.location.href = "/connexion";
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
