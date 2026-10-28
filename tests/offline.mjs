// Offline-Start der PWA (Flugzeugmodus) – auch direkt nach einem neuen Deployment.
// Ablauf: Build A ausliefern und einmal online öffnen → Server auf Build B umstellen (neue Datei-Hashes, neuer
// Service-Worker-Stempel) und die Seite einmal online öffnen (wie ein Spieler nach einem Update) → warten, bis der
// neue Service Worker aktiv ist → offline schalten und neu laden: das Spiel muss starten (Phaser läuft, Leinwand da,
// keine Ladefehler). Zusätzlich: offline mit Suchparameter (?course=1-1) und offline ohne vorherigen Update-Besuch.
// Voraussetzung: `npm run build` (dist/). Port 4985 (+ PORT_BASE).
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync, cpSync, readdirSync, writeFileSync, renameSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const PORT = 4985 + Number(process.env.PORT_BASE ?? 0);
const DIST = resolve('dist');
const TMP = resolve('tests/out/offline_tmp');
if (!existsSync(join(DIST, 'sw.js'))) { console.error('dist fehlt – erst npm run build'); process.exit(1); }

// Build A = dist, Build B = dist mit umbenannten Bundles und neuem Stempel (simuliertes Deployment)
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
const A = join(TMP, 'A'), B = join(TMP, 'B');
cpSync(DIST, A, { recursive: true });
cpSync(DIST, B, { recursive: true });
const renames = [];
for (const f of readdirSync(join(B, 'assets'))) {
  const m = f.match(/^(.*)-([A-Za-z0-9_-]{6,})\.(js|css)$/);
  if (!m) continue;
  const nf = `${m[1]}-${m[2]}x9.${m[3]}`;
  renameSync(join(B, 'assets', f), join(B, 'assets', nf));
  renames.push([f, nf]);
}
for (const file of ['index.html', 'sw.js', ...readdirSync(join(B, 'assets')).map((f) => `assets/${f}`)]) {
  const p = join(B, file);
  let s = readFileSync(p, 'utf8');
  for (const [o, n] of renames) s = s.split(o).join(n);
  if (file === 'sw.js') s = s.replace(/(lotti-greta-|\$\{PREFIX\})([A-Za-z0-9]+)/, '$1$2b');
  writeFileSync(p, s);
}

// Optional: Build A mit einem anderen (z. B. älteren) Service Worker – prüft den Übergang alt → neu.
if (process.env.OFF_A_SW) writeFileSync(join(A, 'sw.js'), readFileSync(process.env.OFF_A_SW, 'utf8').replace('__BUILD__', 'altA'));
let ROOT = A;
let OFFLINE = false; // „Flugzeugmodus“: der Server antwortet nicht mehr (Verbindung bricht ab)
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.css': 'text/css', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  if (OFFLINE) { req.socket.destroy(); return; }
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const f = join(ROOT, p);
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(PORT, r));
const BASE = `http://localhost:${PORT}/`;

const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok }); console.log(`${ok ? '✓' : '✗'} ${name}${info ? ' – ' + info : ''}`); };

const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function boots(page, url) {
  const errors = [];
  const onErr = (e) => errors.push(String(e.message ?? e));
  const onFail = (r) => errors.push(`Ladefehler ${r.url()}`);
  page.on('pageerror', onErr);
  page.on('requestfailed', onFail);
  let ok = false;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => window.__game && window.__game.isBooted && document.querySelector('canvas'), null, { timeout: 30000 });
    ok = true;
  } catch (e) { errors.push(String(e.message ?? e).split('\n')[0]); }
  page.off('pageerror', onErr);
  page.off('requestfailed', onFail);
  return { ok, errors };
}

async function swReady(page) {
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!(reg && reg.active && reg.active.state === 'activated' && !reg.installing && !reg.waiting && navigator.serviceWorker.controller);
  }, null, { timeout: 60000, polling: 250 });
}
const activeCache = (page) => page.evaluate(async () => (await caches.keys()).join(','));

// 1) Update-Fall: A online → B online (Update-Besuch) → offline neu laden
{
  ROOT = A;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r1 = await boots(page, BASE);
  check('A startet online', r1.ok, r1.errors.join(' | '));
  await swReady(page);
  const cacheA = await activeCache(page);
  ROOT = B; // neues Deployment
  const r2 = await boots(page, BASE);
  check('B startet online (Update-Besuch)', r2.ok, r2.errors.join(' | '));
  await page.evaluate(async () => { const reg = await navigator.serviceWorker.getRegistration(); await reg?.update(); });
  await page.waitForFunction(async (old) => {
    const reg = await navigator.serviceWorker.getRegistration();
    const keys = await caches.keys();
    return reg?.active?.state === 'activated' && !reg.installing && !reg.waiting && keys.length === 1 && !keys.includes(old);
  }, cacheA, { timeout: 90000, polling: 250 });
  check('neuer Service Worker aktiv', true, `${cacheA} → ${await activeCache(page)}`);
  await page.waitForTimeout(Number(process.env.OFF_WAIT ?? 2000));
  OFFLINE = true; await ctx.setOffline(true);
  const r3 = await boots(page, BASE);
  check('offline nach Update: Spiel startet', r3.ok, r3.errors.slice(0, 3).join(' | '));
  const r4 = await boots(page, BASE + '?course=1-1');
  check('offline mit Suchparameter: Spiel startet', r4.ok, r4.errors.slice(0, 3).join(' | '));
  const r5 = await boots(page, BASE + 'index.html');
  check('offline über index.html: Spiel startet', r5.ok, r5.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

// 2) Erstbesuch: einmal online öffnen, sofort offline (alle Dateien müssen schon vorab gespeichert sein)
{
  ROOT = B; OFFLINE = false;
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const r1 = await boots(page, BASE);
  check('Erstbesuch online', r1.ok, r1.errors.join(' | '));
  await swReady(page);
  // Direkt nach der Aktivierung (claim) leitet Chromium die allererste Navigation manchmal noch am Service Worker
  // vorbei – im echten Leben liegen Sekunden dazwischen. Kurz warten, wie ein Spieler.
  await page.waitForTimeout(Number(process.env.OFF_WAIT ?? 2000));
  if (process.env.OFF_DEBUG) console.log(await page.evaluate(async () => { const out = []; for (const k of await caches.keys()) { const c = await caches.open(k); out.push(k + ': ' + (await c.keys()).map((r) => r.url.replace(location.origin, '')).join(' ')); } return out.join('\n'); }));
  OFFLINE = true; await ctx.setOffline(true);
  const r2 = await boots(page, BASE);
  check('Erstbesuch → offline: Spiel startet', r2.ok, r2.errors.slice(0, 3).join(' | '));
  await ctx.close();
}

await browser.close();
server.close();
rmSync(TMP, { recursive: true, force: true });
const bad = results.filter((r) => !r.ok);
console.log(`\nOffline: ${results.length - bad.length}/${results.length} bestanden`);
process.exit(bad.length ? 1 : 0);
