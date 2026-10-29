const CACHE_NAME = "dekal-ping-shell-v1";
const SHELL = ["./", "./index.html", "./style.css", "./app.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))));
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.hostname === "raw.githubusercontent.com" || event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request)));
});