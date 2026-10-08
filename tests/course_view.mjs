// Kurs-Modus, Sichtprüfung: Screenshots tests/out/c_*.png (Start, Lauf, Sprung, Kletterwand, Wasser,
// Röhre/Bonusraum, Ziel, Pause, HUD mit Touch) bei scale=2 und Kennzahlen (Zeichenaufrufe/Dreiecke,
// Budget laut Vertrag: < 120 Zeichenaufrufe inkl. Schattenpass, < 300 k Dreiecke).
// Die Simulation wird über __course.step(n) gesetzt; gewartet wird nur, damit Bilder gezeichnet werden.
// Aufruf: PORT_BASE=1000 node tests/course_view.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4193;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);

await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0&touch=1`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
} catch {
  console.log('Kurs-Level startet nicht. Konsole:');
  for (const x of errors) console.log('  ', x);
  stop(); process.exit(1);
}
await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; });

/** Bild zeichnen lassen (Headless: wenige Bilder/s) und speichern; liefert Kennzahlen des letzten Bildes. */
const stats = [];
async function shot(name, wait = 900) {
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}c_${name}.png` });
  return s;
}
/** Figur setzen, Eingaben abspielen, Kamera nachführen. */
const run = (pos, segs = [], o = {}) => sc(([p, sg, opt]) => {
  const c = window.__course, pl = c.player;
  c.setInput(null);
  pl.setHero(opt.hero ?? 'lotti');
  pl.big = true; pl.power = opt.power ?? 'none'; pl.dead = false; pl.updateHalf();
  if (p) { pl.reset(p, opt.yaw ?? Math.PI / 2); c.step(opt.settle ?? 30); }
  for (const [inp, n] of sg) { c.setInput(inp); c.step(n); }
  c.snapCamera();
  if (opt.release !== false) c.setInput(null);
  return c.state();
}, [pos, segs, o]);
const marks = await sc(() => window.__course.level.data.marks);
const touch = (v) => sc((on) => window.__game.scene.getScene('CourseUI').touchCtl.setVisible(on), v);

// HUD mit Touch-Knöpfen (Start)
await run(null, [[{}, 10]]);
const s0 = await shot('hud_touch', 1500);
console.log('  Start', JSON.stringify(s0));
await touch(false);
await shot('start', 600);
// Lauf: Rennen nach vorn (Pose läuft im Bild weiter, Simulation steht)
await run([-3, 1, 2], [[{ y: 1, run: true }, 70]], { release: false });
await shot('lauf');
// Sprung (in der Luft, Kamera bleibt an der Standhöhe verankert)
await run([-3, 1, 2], [[{ y: 1, run: true }, 60], [{ y: 1, run: true, jump: true }, 26]], { release: false });
await shot('sprung');
// Wandsprung-Schacht
await run(marks.wall, [[{ x: -1, jump: true }, 40]], { release: false });
await shot('wand');
// Kletterwand mit Krallen-Anzug
await run(marks.climb, [[{ y: 1 }, 10], [{ y: 1, jump: true }, 1], [{ y: 1 }, 50]], { power: 'krallen', release: false });
await shot('kletterwand');
// Wasserbecken
await run(marks.water, [[{}, 120], [{ y: 0.5 }, 20]], { settle: 0, release: false });
await shot('wasser');
// Bewegliche Plattform
const mv = await sc(() => { const s = [...window.__course.world.shapes.values()].find((x) => x.tag === 'mover'); return [(s.x0 + s.x1) / 2, s.top + 0.05, (s.z0 + s.z1) / 2]; });
await run(mv, [[{}, 30]]);
await shot('plattform');
// Röhre → Bonusraum
await run(marks.pipe, [[{ crouch: true }, 2], [{}, 180]]);
await shot('bonusraum');
// Ziel: Mast greifen, Siegespose
await run([marks.goal[0] - 1.6, marks.goal[1], marks.goal[2] - 3], [[{ x: 1, jump: true }, 30], [{ x: 1 }, 120]], { release: false });
const goalShot = await shot('ziel', 1200);
const goalReached = await sc(() => window.__course.level.runtime.status === 'goal' || window.__course.finished);
await sc(() => { const c = window.__course; let i = 0; while (!c.finished && i++ < 600) c.step(1); });
await page.waitForTimeout(500);
await shot('ergebnis', 700);
check('Ergebnis-Szene', await sc(() => window.__game.scene.isActive('CourseResult')));
await sc(() => window.__course.setInput(null));
// Pause (neues Level-Laden nicht nötig: Ergebnis-Szene schließen, Neustart, dann Pause)
await page.waitForTimeout(300);
await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 30000 });
await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; c.step(20); window.__game.scene.getScene('CourseUI').touchCtl.setVisible(false); c.pauseGame(); });
await page.waitForTimeout(400);
await shot('pause', 600);
check('Pause-Menü offen', await sc(() => window.__game.scene.isActive('CoursePause')));
await sc(() => window.__course.resumeGame());

// Thema Höhle (vorbereitet): dunkel, Licht an der Figur
await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0&theme=cave`, { waitUntil: 'load' });
await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
await sc(() => { const c = window.__course; c.setManual(true); c.level.muted = true; c.step(30); });
await shot('hoehle', 1200);
check('Thema Höhle lädt', await sc(() => window.__course.view.theme.label === 'Höhle'));

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(12)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
check('Ziel erreicht im Bild', goalShot.calls > 0 && goalReached);
check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
