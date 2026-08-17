const CACHE = "taxe-marche-shell-v1";
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL))));
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    if (event.request.mode === "navigate") caches.open(CACHE).then(cache => cache.put("/", response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then(found => found || caches.match("/"))));
});
