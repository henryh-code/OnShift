/* ===========================================================
   Diensten Dashboard — sw.js (Service Worker)
   Strategie: Stale-While-Revalidate.
   - Bij install: het app-shell (index.html, style.css, app.js,
     manifest.json) direct in de cache zetten, zodat de app
     zonder internetverbinding volledig blijft werken.
   - Bij elk verzoek: eerst de gecachte versie teruggeven (snel,
     werkt altijd offline), en tegelijk op de achtergrond een
     nieuwe versie ophalen om de cache bij te werken voor de
     volgende keer.
   =========================================================== */

"use strict";

var CACHE_VERSION = "v2";
var CACHE_NAME = "diensten-dashboard-" + CACHE_VERSION;

// Kernbestanden die de app offline draaiend houden.
var APP_SHELL = [
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon.png"
];

// ---------- Install: app-shell precachen ----------
self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL);
    }).then(function(){
      return self.skipWaiting();
    })
  );
});

// ---------- Activate: oude cacheversies opruimen ----------
self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(
        keys.filter(function(key){
          return key.indexOf("diensten-dashboard-") === 0 && key !== CACHE_NAME;
        }).map(function(key){
          return caches.delete(key);
        })
      );
    }).then(function(){
      return self.clients.claim();
    })
  );
});

// ---------- Fetch: Stale-While-Revalidate ----------
self.addEventListener("fetch", function(event){
  var request = event.request;

  // Alleen eigen GET-verzoeken cachen; externe requests en
  // niet-GET verzoeken (bv. POST) gewoon normaal laten verlopen.
  if(request.method !== "GET" || new URL(request.url).origin !== self.location.origin){
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.match(request).then(function(cachedResponse){
        var networkFetch = fetch(request).then(function(networkResponse){
          if(networkResponse && networkResponse.status === 200){
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(function(){
          // Geen netwerk beschikbaar: val terug op wat er in de cache zit
          // (of niets, als deze resource nog nooit is opgehaald).
          return cachedResponse;
        });

        // Geef direct de gecachte versie terug als die er is (offline-first,
        // snel), en werk de cache ondertussen op de achtergrond bij.
        return cachedResponse || networkFetch;
      });
    })
  );
});
