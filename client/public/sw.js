const CACHE = "taxe-marche-shell-v2";
const APP_SHELL = ["/", "/index.html"];
const isCacheable = request => request.method === "GET" && new URL(request.url).origin === self.location.origin && !new URL(request.url).pathname.startsWith("/api/");

self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("taxe-marche-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (!isCacheable(event.request)) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => caches.open(CACHE).then(cache => { cache.put(event.request, response.clone()); cache.put("/", response.clone()); return response; })).catch(() => caches.match(event.request).then(found => found || caches.match("/") || caches.match("/index.html"))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => {
    const network = fetch(event.request).then(response => { if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone())); return response; });
    return cached || network;
  }));
});
