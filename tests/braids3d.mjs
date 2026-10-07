// Lottis Zöpfe in 3D: Nahaufnahmen (Stand von der Seite, von vorn, von hinten; Lauf in mehreren Bildern,
// Sprung, Fall, Sturzflug, Reiten) und Spielentfernung als Screenshots tests/out/br_*.png, dazu Messungen
// an der Zopf-Physik: Zopfenden im Stand unter Ohrhöhe und nah am Kopf (hängen, stehen nicht ab), Pendeln
// beim Laufen (Richtung des obersten Glieds ändert sich, Zöpfe wehen nach hinten), Hochfliegen beim Fallen,
// Strömen zu den Füßen im Sturzflug (Figur steht Kopf), keine Konsolenfehler.
// Aufruf: npm run build && PORT_BASE=700 node tests/braids3d.mjs
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4191;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}br_${name}.png` });
const zoom = (d) => sc((d) => { window.__view3d.distance = d; }, d);
const focus = (mode) => sc((m) => { window.__view3d.__focusMode = m; }, mode);
const teleport = (x, y) => sc(([x, y]) => { const s = window.__game.scene.getScene('Play'); s.hero.body.reset(x, y); }, [x, y]);
const heroInfo = () => sc(() => { const h = window.__game.scene.getScene('Play').hero; return { x: Math.round(h.x), y: Math.round(h.y), state: h.moveState, vx: Math.round(h.body.velocity.x), vy: Math.round(h.body.velocity.y), mount: !!h.mount }; });
const until = async (label, src, timeout = 20000) => {
  try { await page.waitForFunction(`(() => { const s = window.__game.scene.getScene('Play'); const h = s.hero; return (${src}); })()`, null, { timeout, polling: 100 }); return true; }
  catch { console.log(`  (Zeitüberschreitung: ${label})`, JSON.stringify(await heroInfo())); return false; }
};
/** Blickrichtung des Avatars einfrieren: 'front' = Gesicht zur Kamera, 'back' = Rücken zur Kamera, null = frei. */
const face = (mode) => sc((mode) => {
  const av = window.__game.scene.getScene('Play').hero.__view3d; if (!av) return;
  if (!av.__upd) av.__upd = av.facingCtl.update;
  if (mode === 'front') av.facingCtl.update = () => -Math.PI / 2;
  else if (mode === 'back') av.facingCtl.update = () => Math.PI / 2;
  else { av.facingCtl.update = av.__upd; av.facingCtl.yaw = -Math.PI / 2; }
}, mode);
/** Zopfmessung: Weltlage von Ankern und Gliedenden, Richtung des obersten Glieds, Blickrichtung. */
const braids = () => sc(() => {
  const h = window.__game.scene.getScene('Play').hero;
  const av = window.__view3d.avatars.get(h);
  if (!av?.braids) return null;
  const v = new (av.root.position.constructor)();
  av.model.updateWorldMatrix(true, false);
  const local = (w) => { const l = av.model.worldToLocal(w.clone()); return [l.x, l.y, l.z]; }; // Modell-System: x vor, y hoch, z zur Kamera
  return {
    facing: h.flipX ? -1 : 1,
    sides: av.braids.map((b) => {
      b.anchor.getWorldPosition(v);
      const anchor = [v.x, v.y, v.z], anchorL = local(v);
      const tip = b.chain.pos[b.chain.n - 1];
      return { side: b.side, anchor, anchorL, tip: [tip.x, tip.y, tip.z], tipL: local(tip), dir0: [b.chain.dirs[0].x, b.chain.dirs[0].y, b.chain.dirs[0].z], links: b.links.length, resets: b.chain.resets ?? 0 };
    }),
  };
});
const fmt = (a) => a.map((x) => x.toFixed(2)).join(',');

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
const farDistance = await sc(() => window.__view3d.distance);
await sc(() => { const s = window.__game.scene.getScene('Play'); [...s.enemies.getChildren()].forEach((e) => e.destroy()); });
// Kamera-Fokus für Nahaufnahmen (wie tests/figures3d.mjs)
await sc(() => {
  const v = window.__view3d;
  const orig = v.updateCamera.bind(v);
  v.__focusMode = null;
  v.updateCamera = function () {
    if (!this.__focusMode) return orig();
    const s = window.__game.scene.getScene('Play');
    const o = s.hero;
    const cy = s.hero.mount ? o.y + 2 : o.moveState === 'dive' ? o.y + 26 : o.y - 4; // Sturzflug: Figur hängt unter dem Fußpunkt
    this.target.set(o.x / 16, -cy / 16, 0);
    const tilt = (12 * Math.PI) / 180, d = this.distance;
    this.camera.position.set(this.target.x, this.target.y + d * Math.sin(tilt), d * Math.cos(tilt));
    this.camera.lookAt(this.target);
  };
});

// ---------- Aufbau ----------
const counts = await sc(() => {
  const h = window.__game.scene.getScene('Play').hero;
  const av = window.__view3d.avatars.get(h);
  let n = 0; av.root.traverse((o) => { if (o.isMesh || o.isLine) n++; });
  let braidMeshes = 0; for (const b of av.braids ?? []) for (const l of b.links) braidMeshes += l.children.filter((o) => o.isMesh).length;
  return { meshes: n, braids: av.braids?.length ?? 0, braidMeshes, calls: window.__view3d.renderer.info.render.calls };
});
console.log('  Aufbau', JSON.stringify(counts));
check('Lotti hat zwei Zöpfe mit je drei Gliedern (≤ 3 Meshes je Zopf)', counts.braids === 2 && counts.braidMeshes === 6);
check('Heldin ≤ 30 Meshes', counts.meshes <= 30);
check('Zeichenaufrufe unter 120 (inkl. Schattenpass)', counts.calls < 120);

// ---------- Spielentfernung ----------
await teleport(70, 300); await until('gelandet', 'h.onGround && h.moveState === "ground"'); await wait(1500);
await shot('t0_far_idle');
await page.keyboard.down('ArrowRight'); await wait(2500); await shot('t1_far_run'); await page.keyboard.up('ArrowRight');
await until('steht', 'h.onGround && Math.abs(h.body.velocity.x) < 1');

// ---------- Stand: Seite (3/4), von vorn, von hinten ----------
// Die Spielzeit läuft im Headless-Browser ~10× langsamer als die Wanduhr (delta = 16,7 ms je Bild bei ~10 fps);
// die Zöpfe brauchen ~1,5 s Spielzeit zum Ausschwingen → lange warten.
await zoom(7); await focus('hero'); await wait(14000);
await shot('01_idle_side');
const idle = await braids();
console.log('  Stand (modell-lokal)', JSON.stringify(idle.sides.map((s) => ({ side: s.side, anchor: fmt(s.anchorL), tip: fmt(s.tipL), dir0: fmt(s.dir0) }))));
check('Zopfenden im Stand deutlich unter Ohrhöhe (≥ 0,27 unter dem Ansatz)', idle.sides.every((s) => s.anchor[1] - s.tip[1] >= 0.27));
check('Zöpfe hängen im Stand (waagerechter Abstand Ende–Ansatz < 0,2)', idle.sides.every((s) => Math.hypot(s.tip[0] - s.anchor[0], s.tip[2] - s.anchor[2]) < 0.2));
check('Zöpfe hängen seitlich außen (|z| des Endes ≥ |z| des Ansatzes − 0,04, modell-lokal)', idle.sides.every((s) => Math.abs(s.tipL[2]) >= Math.abs(s.anchorL[2]) - 0.04));
await face('front'); await wait(1500); await shot('02_idle_front');
await face('back'); await wait(1500); await shot('03_idle_back');
await face(null); await wait(800);

// ---------- Lauf: mehrere Bilder hintereinander (erst nach dem Umdrehen und Anlaufen messen) ----------
await page.keyboard.down('ArrowRight');
await wait(8000);
const runDirs = [];
for (let i = 0; i < 5; i++) {
  await wait(400);
  const b = await braids();
  runDirs.push(b.sides.map((s) => s.dir0));
  if (i < 4) await shot(`04_run_${i}`);
}
await shot('04_run_far_a');
await zoom(farDistance); await focus(null); await wait(300); await shot('t2_far_run_b'); await zoom(7); await focus('hero');
await page.keyboard.up('ArrowRight');
console.log('  Lauf dir0 nah ', runDirs.map((d) => fmt(d[0])).join(' | '));
console.log('  Lauf dir0 fern', runDirs.map((d) => fmt(d[1])).join(' | '));
const spread = (k) => { const xs = runDirs.map((d) => d[0][k]); return Math.max(...xs) - Math.min(...xs); };
check('Zöpfe pendeln beim Laufen (Richtung des obersten Glieds ändert sich)', spread(0) + spread(1) > 0.04);
const fpsNow = await page.evaluate(() => window.__game.loop.actualFps);
console.log('  Bildrate im Headless-Browser', fpsNow.toFixed(1), '(Physik-Prüfungen nur ab 20 fps aussagekräftig; deterministisch in tests/chain.mjs)');
const physik = (label, cond) => (fpsNow >= 20 ? check(label, cond) : console.log(`  ~ ${label}: übersprungen (${fpsNow.toFixed(0)} fps)`));
physik('Zöpfe wehen beim Laufen nach hinten (gegen die Laufrichtung)', runDirs.every((d) => d[0][0] < -0.15 && d[1][0] < -0.15));
await until('steht', 'Math.abs(h.body.velocity.x) < 1'); await wait(3000);
const settled = await braids();
console.log('  Ausgependelt', JSON.stringify(settled.sides.map((s) => fmt(s.dir0))));
physik('Zöpfe kommen im Stand zur Ruhe (oberes Glied fast senkrecht)', settled.sides.every((s) => s.dir0[1] < -0.9));

// ---------- Umdrehen (Trägheit) ----------
await page.keyboard.down('ArrowLeft'); await wait(350); await shot('05_turn'); await wait(1200); await shot('05_run_left'); await page.keyboard.up('ArrowLeft');
await until('steht', 'Math.abs(h.body.velocity.x) < 1');

// ---------- Sprung und Fall ----------
await page.keyboard.down('ArrowRight'); await wait(400);
await page.keyboard.down('Space'); await until('springt', 'h.body.velocity.y < -150'); await wait(400); await shot('06_jump');
await page.keyboard.up('Space'); // sonst öffnet sich beim Fallen der Schirm
await page.keyboard.up('ArrowRight'); await until('gelandet', 'h.onGround'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
// Langer freier Fall (ohne Schirm): hoch teleportieren, bei hoher Fallgeschwindigkeit messen
const hf = await heroInfo();
await teleport(hf.x, hf.y - 200);
check('Fällt schnell', await until('fällt schnell', 'h.body.velocity.y > 360 && !h.onGround'));
const fall = await braids(); console.log('  Fall', JSON.stringify(await heroInfo()), JSON.stringify(fall.sides.map((s) => fmt(s.dir0))));
await shot('07_fall');
physik('Zöpfe heben sich beim Fallen (oberes Glied über die Waagerechte)', fall.sides.every((s) => s.dir0[1] > -0.5));
await until('gelandet', 'h.onGround'); await wait(600); await shot('08_landed');

// ---------- Gleiten und Sturzflug ----------
const h0 = await heroInfo();
await teleport(h0.x, h0.y - 230); await until('fällt', 'h.body.velocity.y > 30'); await page.keyboard.down('Space');
check('Gleitet', await until('gleitet', 'h.moveState === "glide"'));
await wait(1200); await shot('09_glide');
await page.keyboard.down('ArrowDown');
check('Sturzflug', await until('Sturzflug', 'h.moveState === "dive"'));
check('Sturzflug schnell', await until('Sturzflug schnell', 'h.moveState === "dive" && h.body.velocity.y > 380'));
const dive = await braids(); console.log('  Sturzflug', JSON.stringify(await heroInfo()), JSON.stringify(dive.sides.map((s) => ({ dir0: fmt(s.dir0), anchorY: s.anchor[1].toFixed(2), tipY: s.tip[1].toFixed(2), resets: s.resets }))));
await shot('10_dive');
check('Sturzflug: Zöpfe strömen in Weltkoordinaten nach oben (zu den Füßen)', dive.sides.every((s) => s.dir0[1] > 0.3));
await page.keyboard.up('ArrowDown'); await page.keyboard.up('Space'); await until('gelandet', 'h.onGround', 30000);

// ---------- Reiten ----------
const m0 = await sc(() => { const m = window.__game.scene.getScene('Play').mounts.getChildren()[0]; return m ? { x: m.x, y: m.y } : null; });
if (m0) {
  await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 26); });
  check('Reitet', await until('aufgestiegen', '!!h.mount', 20000));
  await until('steht auf Pflaume', 'h.onGround'); await wait(1500); await shot('11_ride_idle');
  await page.keyboard.down('ArrowRight'); await wait(2000);
  const rideDirs = [];
  for (let i = 0; i < 4; i++) { await wait(200); const b = await braids(); rideDirs.push(b.sides.map((s) => s.dir0)); if (i < 2) await shot(`12_ride_run_${i}`); }
  await page.keyboard.up('ArrowRight');
  console.log('  Reiten dir0 (nah)', rideDirs.map((d) => fmt(d[0])).join(' | '));
  const rspread = (k) => { const xs = rideDirs.map((d) => d[0][k]); return Math.max(...xs) - Math.min(...xs); };
  check('Zöpfe hüpfen beim Reiten mit (Richtung ändert sich)', rspread(0) + rspread(1) > 0.03);
  await until('steht', 'Math.abs(h.body.velocity.x) < 1');
} else {
  console.log('  (kein Reittier im Level – Reiten übersprungen)');
}

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
