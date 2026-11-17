const CACHE_NAME = "visiontv-gestor-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  ]));
});

// Não armazenamos páginas autenticadas nem dados privados em cache.
self.addEventListener("fetch", () => {});
