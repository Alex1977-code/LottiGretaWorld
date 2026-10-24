// Hilfsliste zum Spielzeug-Look: welche Meshes eines Levels tragen ein Spielzeug-Material (Material-Name, Objekt-/Modellname,
// Größe)? Für die Abstimmung, was Figur/Requisite (mit Look) und was Kulisse (schlicht) ist.
// Aufruf: PORT_BASE=3900 node tests/toylook_list.mjs 1-1 [4-1 …]   (Vite-Entwicklungsserver, Port 4490 + PORT_BASE)
import { createServer } from 'vite';
import { launchBrowser, OUT } from './helpers.mjs';

const PORT = 4490 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['1-1'];
const server = await createServer({ root: ROOT, cacheDir: `${OUT}.vite-toy`, logLevel: 'warn', clearScreen: false, server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false } });
await server.listen();
const { browser, page, errors } = await launchBrowser();
for (const id of IDS) {
  await page.goto(`http://127.0.0.1:${PORT}/?course=${encodeURIComponent(id)}&scale=2&adapt=0&still=1`, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 180000 });
  const rows = await page.evaluate(async () => {
    const lib = await import('/src/three/lib/toyLook.js');
    const v = window.__course.view;
    const out = new Map();
    v.three.traverse((o) => {
      const m = o.material;
      if (!m || Array.isArray(m) || !lib.hasToyLook(m)) return;
      let model = '';
      for (let p = o; p; p = p.parent) if (p.userData?.modelName || /^(modell|heldin|ritt|pflaume)/.test(p.name)) { model = p.userData?.modelName ?? p.name; break; }
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const r = o.geometry.boundingSphere?.radius ?? 0;
      const key = `${m.name || '(ohne Namen)'} | ${model || o.name || o.parent?.name || '?'}`;
      const e = out.get(key) ?? { n: 0, r: 0 };
      e.n += o.isInstancedMesh ? o.count : 1; e.r = Math.max(e.r, r * Math.max(o.scale.x, o.scale.y, o.scale.z));
      out.set(key, e);
    });
    return [...out].sort((a, b) => b[1].r - a[1].r).map(([k, e]) => `${k}  ×${e.n}  r≤${e.r.toFixed(2)} m`);
  });
  console.log(`\n${id}: ${rows.length} Gruppen`);
  for (const r of rows) console.log('  ', r);
}
if (errors.length) console.log('Konsole:', errors.slice(0, 5));
await browser.close();
await server.close();
