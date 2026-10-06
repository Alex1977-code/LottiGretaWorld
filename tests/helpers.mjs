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

/** Startet `vite preview` und liefert eine Stop-Funktion. */
export async function startServer(port) {
  const server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort'], { stdio: 'pipe', detached: true });
  const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* bereits beendet */ } };
  process.on('exit', stop);
  await new Promise((res) => setTimeout(res, 1500));
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
export async function loadGame(page, port, errors, stop, level = 'test') {
  await page.goto(`http://localhost:${port}/?level=${level}`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__game && window.__game.scene.isActive('Play') && window.__game.scene.isActive('UI'), null, { timeout: 15000 });
  } catch {
    console.log('Spiel startet nicht. Konsole:');
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(400);
}

/** Liest Pips Zustand aus. */
export function pipState(page) {
  return page.evaluate(() => {
    const p = window.__game.scene.getScene('Play').pip;
    return { x: p.x, y: p.y, vx: p.body.velocity.x, vy: p.body.velocity.y, state: p.moveState, swoop: p.swooping, ground: p.onGround };
  });
}

export function logState(label, s) {
  console.log(label.padEnd(22), `x=${s.x.toFixed(0)} y=${s.y.toFixed(0)} vx=${s.vx.toFixed(0)} vy=${s.vy.toFixed(0)} ${s.state}${s.swoop ? '+swoop' : ''} ground=${s.ground}`);
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
