const cachePrefix = "pm-os-staging-";
const cacheName = cachePrefix + "bcf4639e1fddda1dcd9ad673";
const assets = [
  "./",
  "./index.html",
  "./src/app.js",
  "./src/projects.js",
  "./src/project-switcher.js",
  "./src/view-policy.js",
  "./src/domain.js",
  "./src/experience.js",
  "./src/insights.js",
  "./src/customers.js",
  "./src/demo-customers.js",
  "./src/backups.js",
  "./src/data.js",
  "./src/drive.js",
  "./src/organization.js",
  "./src/workflow.js",
  "./src/prioritization.js",
  "./src/planning-calendar.js",
  "./src/storage.js",
  "./src/tutorial.js",
  "./src/workspace-contract.js",
  "./src/workspace-document.js",
  "./src/linked-workspace-file.js",
  "./src/source-config.js",
  "./src/workspace-merge.js",
  "./src/supabase-client-loader.js",
  "./src/supabase-workspace-repository.js",
  "./src/supabase-team-client.js",
  "./src/service-worker-update.js",
  "./src/styles.css",
  "./vendor/supabase-2.110.0.js",
  "./manifest.webmanifest",
  "./icons/icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.addAll(assets))
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(cachePrefix) && key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const scopeUrl = new URL(self.registration.scope);
  if (requestUrl.origin !== scopeUrl.origin || !requestUrl.pathname.startsWith(scopeUrl.pathname)) return;
  if (requestUrl.origin === self.location.origin && requestUrl.pathname.endsWith("/runtime-config.js")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }).catch(() => new Response("", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/javascript; charset=utf-8"
      }
    })));
    return;
  }
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.open(cacheName).then((cache) => cache.match(new URL("./index.html", self.registration.scope).href))));
    return;
  }
  const refreshableAsset = requestUrl.origin === self.location.origin && ["script", "style", "worker"].includes(event.request.destination);
  if (refreshableAsset) {
    event.respondWith(
      caches.open(cacheName).then((cache) => fetch(event.request)
        .then((response) => response.ok
          ? cache.put(event.request, response.clone()).then(() => response, () => response)
          : response)
        .catch(() => cache.match(event.request, { ignoreSearch: true })))
    );
    return;
  }
  event.respondWith(caches.open(cacheName).then((cache) => cache.match(event.request, { ignoreSearch: true })).then((cached) => cached || fetch(event.request)));
});
