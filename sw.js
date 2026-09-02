/* ===========================================================
   OnShift — sw.js (Service Worker)
   =========================================================== */

"use strict";

var CACHE_VERSION = "v3";
var CACHE_NAME = "onshift-" + CACHE_VERSION;

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
          return key !== CACHE_NAME;
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
          return cachedResponse;
        });

        return cachedResponse || networkFetch;
      });
    })
  );
});
