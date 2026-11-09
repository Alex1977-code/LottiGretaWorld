// Controller (src/systems/gamepad.js): ein nachgebildeter Standard-Controller (navigator.getGamepads) bedient Level,
// Pause-Menü und Weltkarte ohne Tastatur und Touch – Stick stufenlos (halb gekippt = gehen, ganz = rennen), A springt,
// Start pausiert, im Menü wählt das Steuerkreuz einen Knopf (Rahmen) und A drückt ihn, B schließt; auf der Karte läuft die
// Figur mit dem Stick, X wechselt die Heldin. Ohne Controller bleibt alles wie bisher.
import { startServer, launchBrowser, makeChecker } from './helpers.mjs';

const PORT = 5075;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);

await page.addInitScript(() => {
  const pad = { id: 'Test-Controller (STANDARD GAMEPAD)', index: 0, connected: true, mapping: 'standard', timestamp: 0, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
  window.__fake = { on: false, pad };
  window.__padSet = (o = {}) => {
    pad.axes = (o.axes ?? [0, 0, 0, 0]).slice();
    pad.buttons.forEach((b, i) => { const p = (o.buttons ?? []).includes(i); b.pressed = p; b.touched = p; b.value = p ? 1 : 0; });
    pad.timestamp = performance.now();
  };
  navigator.getGamepads = () => (window.__fake.on ? [pad, null, null, null] : [null, null, null, null]);
});
const pad = (o) => sc((q) => window.__padSet(q), o ?? {});
const info = () => sc(() => window.__pad.info());
const until = (fn, arg, ms = 15000) => page.waitForFunction(fn, arg, { timeout: ms }).then(() => true, () => false);
const frames = (n = 4) => sc((k) => new Promise((res) => { let i = 0; const f = () => (++i >= k ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

// ------------------------------------------------------------------ Level
await page.goto(`http://localhost:${port}/?course=1-1&scale=1&adapt=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
await page.waitForTimeout(500);
check('ohne Controller: nicht verbunden, keine Tasten gehalten', await sc(() => { const i = window.__pad.info(); return !i.connected && i.held.length === 0; }));
await sc(() => { window.__fake.on = true; });
check('Controller erkannt, Zusammenhang „play“ (Kurs-Level)', await until(() => window.__pad.info().connected && window.__pad.info().ctx === 'play'));

const home = () => sc(() => { const c = window.__course, p = c.player; p.reset([0, 1, 5], Math.PI / 2); p.invuln = 99; });
const speed = async (axes, ms) => {
  await home();
  await pad({ axes });
  // Spitzentempo über die Zeit (der Test-Browser zeichnet langsam, die Figur beschleunigt entsprechend später)
  const r = await sc((t) => new Promise((res) => {
    const p = window.__course.player, t0 = performance.now(), best = { v: 0, vx: 0, vz: 0 };
    const f = () => { const v = Math.hypot(p.vel.x, p.vel.z); if (v > best.v) { best.v = v; best.vx = p.vel.x; best.vz = p.vel.z; } if (performance.now() - t0 < t) requestAnimationFrame(f); else res(best); };
    f();
  }), ms);
  await pad({});
  await until(() => Math.hypot(window.__course.player.vel.x, window.__course.player.vel.z) < 0.3);
  return r;
};
const half = await speed([0.6, 0, 0, 0], 2500);
const full = await speed([1, 0, 0, 0], 2500);
const fwd = await speed([0, -1, 0, 0], 2000);
console.log(`  Stick: halb ${half.v.toFixed(2)} m/s, voll ${full.v.toFixed(2)} m/s (vx ${full.vx.toFixed(2)}), nach vorn vz ${fwd.vz.toFixed(2)}`);
check(`Stick nach rechts bewegt die Figur nach rechts, stufenlos: halb gekippt ${half.v.toFixed(1)} m/s < ganz gekippt ${full.v.toFixed(1)} m/s (rennen)`, half.v > 1 && full.v > half.v * 1.25 && full.vx > 2);
check(`Stick nach vorn läuft ins Bild (vz ${fwd.vz.toFixed(1)} < 0)`, fwd.vz < -2);

await home();
await until(() => window.__course.player.mode === 'ground');
const y0 = await sc(() => window.__course.player.pos.y);
await pad({ buttons: [0] });
const jumped = await until((y) => window.__course.player.pos.y > y + 0.8, y0, 8000);
await pad({});
check('A springt (Leertaste)', jumped);
await until(() => window.__course.player.mode === 'ground');
check('nach dem Loslassen ist keine Taste mehr gehalten', (await info()).held.length === 0);

// Steuerkreuz als Pfeiltasten
await home();
await pad({ buttons: [14] });
const dleft = await until(() => window.__course.player.vel.x < -2, null, 8000);
await pad({});
check('Steuerkreuz links läuft nach links (Pfeiltaste)', dleft);

// ------------------------------------------------------------------ Pause-Menü
// ein Tipp aufs Steuerkreuz: ein Bild halten, loslassen (kürzer als die Wiederholung von 0,34 s)
const tipp = async (b) => { await pad({ buttons: [b] }); await frames(2); await pad({}); await frames(2); };
await pad({ buttons: [9] });
const paused = await until(() => window.__game.scene.isActive('CoursePause'));
await pad({});
check('Start pausiert (Esc)', paused);
check('im Menü: Zusammenhang „menu“, Auswahl auf „Weiter“', await until(() => { const i = window.__pad.info(); return i.ctx === 'menu' && i.focus === 'Weiter'; }));
await tipp(13);
const f1 = (await info()).focus;
await tipp(13);
const f2 = (await info()).focus;
await tipp(12);
const f3 = (await info()).focus;
check(`Steuerkreuz wandert durch die Knöpfe (runter „${f1}“, runter „${f2}“, hoch „${f3}“)`, f1 === 'Neustart' && f2 === 'Zur Weltkarte' && f3 === 'Neustart');
// Ton-Knopf mit A: Beschriftung wechselt
await tipp(13);
await tipp(13);
const ton0 = (await info()).focus;
await tipp(0);
const ton1 = (await info()).focus;
check(`A drückt den gewählten Knopf (Ton: „${ton0}“ → „${ton1}“)`, /^Ton: /.test(ton0 ?? '') && /^Ton: /.test(ton1 ?? '') && ton0 !== ton1);
await tipp(0);   // Ton zurück
// B schließt die Pause; A (noch vom Menü) löst danach keinen Sprung aus
await pad({ buttons: [1] });
const resumed = await until(() => !window.__game.scene.isActive('CoursePause'));
await pad({});
check('B schließt die Pause (Esc), danach wieder „play“', resumed && await until(() => window.__pad.info().ctx === 'play'));
check('nach dem Menü ist keine Taste gehalten', (await info()).held.length === 0);

// ------------------------------------------------------------------ Weltkarte
await sc(() => { window.__fake.on = false; });
await page.goto(`http://localhost:${port}/?map=1&scale=1&adapt=0`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__courseMap && window.__game.scene.isActive('CourseMap'), null, { timeout: 90000 });
await sc(() => { window.__fake.on = true; });
await until(() => window.__pad.info().ctx === 'map');
// ein Knopf überspringt den Anflug
await pad({ buttons: [0] }); await frames(4); await pad({});
const onMap = await until(() => window.__pad.info().ctx === 'map' && !window.__courseMap.inputLocked && !window.__courseMap.intro, null, 20000);
check('Weltkarte: Zusammenhang „map“, ein Knopf überspringt den Anflug', onMap);
const m0 = await sc(() => { const p = window.__courseMap.player; return { x: p.pos.x, z: p.pos.z }; });
await pad({ axes: [1, 0, 0, 0] });
const walked = await until((q) => { const p = window.__courseMap.player; return Math.hypot(p.pos.x - q.x, p.pos.z - q.z) > 1.0; }, m0, 8000);
await pad({});
check('Karte: der Stick bewegt die Figur', walked);
const hero0 = await sc(() => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').hero ?? 'lotti');
await pad({ buttons: [2] }); await frames(6); await pad({});
const switched = await until((h) => (JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').hero ?? 'lotti') !== h, hero0, 6000);
check(`Karte: X wechselt die Heldin (vorher ${hero0})`, switched);
if (switched) { await frames(20); await pad({ buttons: [2] }); await frames(6); await pad({}); await frames(20); }   // zurück

await browser.close();
stop();
process.exit(summary(errors.filter((e) => !/GPU stall|Automatic fallback to software WebGL/.test(e))) ? 0 : 1);
