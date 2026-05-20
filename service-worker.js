// White Creek Crabbing Dashboard — Service Worker
// Strategy: cache the app shell (HTML/CSS/JS) for offline use,
// but always fetch live data from APIs over the network.

const CACHE_NAME = "crabbing-v1";

// Files to cache for offline shell
const SHELL_FILES = [
  "/",
  "/index.html",
  "/indian_river_bridge.png",
  "/crab-hero.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
  "https://cdn.jsdelivr.net/npm/chart.js"
];

// API domains — always fetch live, never serve from cache
const LIVE_DOMAINS = [
  "api.weather.gov",
  "api.tidesandcurrents.noaa.gov",
  "api.sunrise-sunset.org",
  "api.zippopotam.us"
];

// Install: pre-cache the app shell
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Use individual adds so one failure doesn't block everything
      return Promise.allSettled(SHELL_FILES.map(url => cache.add(url)));
    })
  );
  self.skipWaiting();
});

// Activate: clear old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API calls, cache-first for shell
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // Always go live for data APIs
  if (LIVE_DOMAINS.some(d => url.hostname.includes(d))) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: "Offline — no live data available." }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );
    return;
  }

  // Cache-first for everything else (app shell)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache successful GETs
        if (response.ok && event.request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
