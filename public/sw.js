// Service Worker: macht das Spiel offline spielbar (auch im Flugzeugmodus direkt nach einem neuen Deployment).
// Strategie:
//  - Installation: ALLE Dateien des Builds vorab speichern (Liste trägt der Build ein, siehe vite.config.js). Erst
//    wenn alles da ist, übernimmt der neue Service Worker und räumt den alten Cache weg – vorher fehlten nach einem
//    Update die neuen Spieldateien offline (nur die Seite war gespeichert, die alten Dateien schon gelöscht).
//    Unveränderte gehashte Dateien (assets/…) werden aus dem alten Cache übernommen statt neu geladen.
//  - Seiten (index.html): Netz zuerst; offline die beim Installieren gespeicherte Seite DIESES Builds, die genau
//    zu den gespeicherten Dateien passt (keine neuere Seite mit Verweisen auf fehlende Dateien).
//  - Gehashte Build-Dateien (assets/…): Cache zuerst, sie ändern sich nie.
//  - Alles Übrige (Manifest, Icons): Cache zuerst, im Hintergrund auffrischen.
// Der Cache-Name enthält die Build-Kennung, so dass nach einem Deployment alte Caches aufgeräumt werden.
const PREFIX = 'lotti-greta-';
const CACHE = `${PREFIX}__BUILD__`;
const FILES = [/*__PRECACHE__*/];
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png']
  .concat(FILES.map((f) => `./${f}`))
  .filter((u, i, a) => a.indexOf(u) === i);

const isAssetPath = (u) => u.includes('/assets/') || u.startsWith('./assets/');

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(PRECACHE.map(async (u) => {
      if (isAssetPath(u)) {
        const old = await caches.match(u);
        if (old) { await cache.put(u, old); return; }
      }
      const res = await fetch(new Request(u, { cache: 'reload' }));
      if (!res.ok) throw new Error(`Vorab-Speichern fehlgeschlagen: ${u} (${res.status})`);
      await cache.put(u, res);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isPage = (req, url) => req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
const offline = () => new Response('Offline – bitte einmal mit Internet öffnen.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

async function handle(req, url) {
  const cache = await caches.open(CACHE);
  if (isPage(req, url)) {
    // Netz zuerst; offline die Seite dieses Builds
    try {
      return await fetch(req, { cache: 'no-cache' });
    } catch (_) {
      return (await cache.match('./index.html')) || (await cache.match('./')) || (await caches.match(req, { ignoreSearch: true })) || offline();
    }
  }
  const cached = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
  if (cached && isAssetPath(url.pathname)) return cached; // unveränderliche Build-Datei
  const network = fetch(req).then((res) => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached || Response.error());
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(handle(req, url));
});
