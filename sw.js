var CACHE = "calm-energy-shell-v10";
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

function isShellAsset(url) {
  var path = url.pathname;
  return (
    /\/app\.js$/i.test(path) ||
    /\/styles\.css$/i.test(path) ||
    path.endsWith("/index.html") ||
    path.endsWith("/") ||
    path.endsWith("/sw.js")
  );
}

function matchExact(request) {
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request);
  });
}

/* Offline-only: allow the precached bare path (no query). Online always
   network-first, so app.js?v=1.1.2 never silently becomes an old app.js. */
function matchExactOrBarePath(request) {
  return matchExact(request).then(function (cached) {
    if (cached) return cached;
    var bare = new URL(request.url);
    if (!bare.search) return null;
    bare.search = "";
    return caches.open(CACHE).then(function (cache) {
      return cache.match(bare.href);
    });
  });
}

function networkFirst(event, fallbackUrl) {
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response && response.status === 200) {
          var copy = response.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return matchExactOrBarePath(event.request).then(function (cached) {
          if (cached) return cached;
          if (fallbackUrl) {
            return caches.open(CACHE).then(function (cache) {
              return cache.match(fallbackUrl);
            });
          }
          return Promise.reject(new Error("offline"));
        });
      })
  );
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS.map(function (url) {
        return new Request(url, { cache: "reload" });
      }));
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
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  var accept = event.request.headers.get("accept") || "";
  var isDoc = event.request.mode === "navigate" || accept.indexOf("text/html") !== -1;
  if (isDoc || isShellAsset(url)) {
    networkFirst(event, isDoc ? "./index.html" : null);
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(event.request).then(function (cached) {
        var networked = fetch(event.request).then(function (response) {
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(function () {
          return cached || Promise.reject(new Error("offline"));
        });
        return cached || networked;
      });
    })
  );
});
