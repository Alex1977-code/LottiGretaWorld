// Service Worker: macht das Spiel offline spielbar.
// Strategie:
//  - Seiten (index.html) und sw-nahe Dateien: Netz zuerst, Cache nur offline. So zeigt die Seite nach
//    einem Deployment immer die zu ihr gehörenden (gehashten) Dateien – eine gecachte alte Seite würde
//    auf Dateien zeigen, die es auf dem Server nicht mehr gibt.
//  - Gehashte Build-Dateien (assets/…): Cache zuerst, sie ändern sich nie.
//  - Alles Übrige (Manifest, Icons): Cache zuerst, im Hintergrund auffrischen.
// Der Cache-Name enthält die Build-Kennung, so dass nach einem Deployment alte Caches aufgeräumt werden.
const CACHE = 'lotti-greta-__BUILD__';
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isPage = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
const isAsset = (url) => url.pathname.includes('/assets/');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isPage(req, url)) {
        // Netz zuerst; offline die zuletzt gespeicherte Seite
        try {
          const res = await fetch(req, { cache: 'no-cache' });
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        } catch (_) {
          return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./index.html'));
        }
      }
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached && isAsset(url)) return cached; // unveränderliche Build-Datei
      const network = fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    }),
  );
});
