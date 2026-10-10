var CACHE = "calm-energy-shell-v3";
var ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.filter(function (key) { return key !== CACHE; }).map(function (key) {
          return caches.delete(key);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      var url = new URL(event.request.url);
      var freshFirst = event.request.mode === "navigate" || /\.(html|js|css)$/.test(url.pathname);
      var networked = fetch(event.request).then(function (response) {
        if (response && response.ok && url.origin === self.location.origin) {
          cache.put(event.request, response.clone());
        }
        return response;
      });
      if (freshFirst) {
        return networked.catch(function () {
          return cache.match(event.request, { ignoreSearch: true }).then(function (cached) {
            return cached || (event.request.mode === "navigate" ? cache.match("./index.html") : Promise.reject(new Error("offline")));
          });
        });
      }
      return cache.match(event.request, { ignoreSearch: true }).then(function (cached) {
        if (cached) return cached;
        return networked.catch(function () {
          return Promise.reject(new Error("offline"));
        });
      });
    })
  );
});
