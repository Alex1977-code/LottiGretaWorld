// Gemeinsame Hilfsfunktionen für die Headless-Tests.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

export const OUT = new URL('./out/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/** Startet `vite preview` und liefert eine Stop-Funktion. PORT_BASE (Umgebungsvariable) verschiebt alle Ports (parallele Läufe). */
export async function startServer(port) {
  port += Number(process.env.PORT_BASE ?? 0);
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'pipe', detached: true });
  const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* bereits beendet */ } };
  process.on('exit', stop);
  // Warten, bis der Server antwortet (unter Last kann das dauern)
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://localhost:${port}/`); if (r.ok) break; } catch { /* noch nicht da */ }
    await new Promise((res) => setTimeout(res, 250));
  }
  return stop;
}

/** Startet Chromium (mit Software-WebGL) und sammelt Konsolenfehler. */
export async function launchBrowser(contextOpts = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'],
  });
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, ...contextOpts });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  return { browser, page, errors };
}

/** Lädt das Spiel und wartet, bis die Play-Szene läuft. */
export async function loadGame(page, port, errors, stop, level = 'test', scale = process.env.RENDER_SCALE ?? '1') {
  port += Number(process.env.PORT_BASE ?? 0);
  // Logik-Tests laufen mit Render-Skalierung 1 (der Software-Renderer im Headless-Browser ist sonst zu langsam)
  await page.goto(`http://localhost:${port}/?level=${level}&scale=${scale}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Play') && window.__game.scene.isActive('UI'), null, { timeout: 40000 });
  } catch {
    console.log('Spiel startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(400);
}

/** Liest Heros Zustand aus. */
export function heroState(page) {
  return page.evaluate(() => {
    const p = window.__game.scene.getScene('Play').hero;
    return { x: p.x, y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y, state: p.moveState, swoop: p.swooping, ground: p.onGround };
  });
}

export function logState(label, s) {
  console.log(label.padEnd(22), `x=${s.x.toFixed(0)} y=${s.y.toFixed(0)} vx=${s.vx.toFixed(0)} vy=${s.vy.toFixed(0)} ${s.state}${s.swoop ? '+swoop' : ''} ground=${s.ground}`);
}

/** Zeichnet das aktuelle Level als Übersicht (8 px/Tile) in zwei Hälften nach tests/out/. */
export async function renderOverview(page, name) {
  const { writeFileSync } = await import('node:fs');
  const halves = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Play');
    const map = s.map, layer = s.groundLayer;
    const first = layer.tileset[0].firstgid;
    const z = 8, out = [];
    const halfW = Math.ceil(map.width / 2);
    for (let half = 0; half < 2; half++) {
      const x0 = half * halfW, x1 = Math.min(map.width, x0 + halfW);
      const c = document.createElement('canvas');
      c.width = (x1 - x0) * z; c.height = map.height * z;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#2a2a4a'; ctx.fillRect(0, 0, c.width, c.height);
      for (let ty = 0; ty < map.height; ty++) for (let tx = x0; tx < x1; tx++) {
        const t = layer.getTileAt(tx, ty);
        if (!t) continue;
        const i = t.index - first;
        ctx.fillStyle = i < 16 ? (i & 1 ? '#6a9a30' : '#8d5a2b') : i === 16 ? '#c9955c' : '#9a9aa8';
        ctx.fillRect((tx - x0) * z, ty * z, z, z);
      }
      const colors = { player: '#ffffff', enemy: '#ff4040', checkpoint: '#40ff80', mount: '#c060ff', berry: '#ff80ff', coin: '#ffd040', key: '#ffff80', gate: '#80c0ff', flag: '#ff8040', thorns: '#000000' };
      for (const o of map.getObjectLayer('objects').objects) {
        const tx = o.x / 16, ty = o.y / 16 - 1;
        if (tx < x0 || tx >= x1) continue;
        ctx.fillStyle = colors[o.type] ?? '#fff';
        ctx.fillRect((tx - x0) * z + 1, ty * z + 1, z - 2, z - 2);
        if (o.type === 'coin') { ctx.fillStyle = '#000'; ctx.fillRect((tx - x0) * z + 3, ty * z + 3, 2, 2); }
      }
      ctx.fillStyle = '#ffffff'; ctx.font = '8px monospace';
      for (let tx = Math.ceil(x0 / 10) * 10; tx < x1; tx += 10) ctx.fillText(String(tx), (tx - x0) * z, 8);
      out.push(c.toDataURL('image/png'));
    }
    return out;
  });
  halves.forEach((d, i) => writeFileSync(`${OUT}${name}_overview_${i + 1}.png`, Buffer.from(d.split(',')[1], 'base64')));
}

export function makeChecker() {
  const results = [];
  const check = (name, ok) => { results.push([name, ok]); console.log(ok ? '  ✓' : '  ✗', name); };
  const summary = (errors) => {
    console.log('\nKonsole:', errors.length ? '' : 'keine Fehler/Warnungen');
    for (const e of errors) console.log('  ', e);
    const failed = results.filter(([, ok]) => !ok);
    console.log(`\n${results.length - failed.length}/${results.length} Prüfungen bestanden`);
    return failed.length === 0 && errors.length === 0;
  };
  return { check, summary };
}
