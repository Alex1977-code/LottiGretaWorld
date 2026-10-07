// Nahaufnahmen der 3D-Figuren (Lotti, Greta, Pflaume, Blätterschirm, Angel): erzwingt Posen und legt
// Screenshots unter tests/out/f3d_*.png ab. Sichtprüfung, dazu Mesh-Zahlen und Konsolenfehler.
// Der Software-Renderer im Headless-Browser läuft nur mit wenigen Bildern pro Sekunde (Spielzeit ≈ 1/10
// der Wanduhr), deshalb wird auf Spielzustände gewartet statt auf feste Zeiten.
// Aufruf: npm run build && PORT_BASE=300 node tests/figures3d.mjs
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4189;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}f3d_${name}.png` });
const zoom = (d) => sc((d) => { window.__view3d.distance = d; }, d);
const focus = (mode) => sc((m) => { window.__view3d.__focusMode = m; }, mode);
const teleport = (x, y) => sc(([x, y]) => { const s = window.__game.scene.getScene('Play'); s.hero.body.reset(x, y); }, [x, y]);
const heroInfo = () => sc(() => { const h = window.__game.scene.getScene('Play').hero; return { x: Math.round(h.x), y: Math.round(h.y), state: h.moveState, vy: Math.round(h.body.velocity.y), mount: !!h.mount, leaf: h.leaf.visible, swoop: h.swooping, key: h.key }; });
/** Wartet auf einen Spielzustand (fn läuft im Browser, bekommt die Play-Szene). */
const until = async (label, src, timeout = 20000) => {
  try { await page.waitForFunction(`(() => { const s = window.__game.scene.getScene('Play'); const h = s.hero; return (${src}); })()`, null, { timeout, polling: 100 }); return true; }
  catch { console.log(`  (Zeitüberschreitung: ${label})`, JSON.stringify(await heroInfo())); return false; }
};
/** Blickrichtung des Heldinnen-Avatars einfrieren (Gesicht zur Kamera) bzw. freigeben. */
const faceCamera = (on) => sc((on) => { const h = window.__game.scene.getScene('Play').hero; const av = h.__view3d; if (!av) return; if (on) { av.__upd = av.facingCtl.update; av.facingCtl.update = () => -Math.PI / 2; } else if (av.__upd) { av.facingCtl.update = av.__upd; av.facingCtl.yaw = -Math.PI / 2; } }, on);

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
const farDistance = await sc(() => window.__view3d.distance);
// Gegner stören die Posen (Treffer, Rückstoß) – weg damit
await sc(() => { const s = window.__game.scene.getScene('Play'); [...s.enemies.getChildren()].forEach((e) => e.destroy()); });
// Kamera-Fokus für Nahaufnahmen: 'hero' | 'mount' | null (normal)
await sc(() => {
  const v = window.__view3d;
  const orig = v.updateCamera.bind(v);
  v.__focusMode = null;
  v.updateCamera = function () {
    if (!this.__focusMode) return orig();
    const s = window.__game.scene.getScene('Play');
    const m = s.mounts.getChildren()[0];
    const o = this.__focusMode === 'mount' && m ? m : s.hero;
    const cy = this.__focusMode === 'mount' ? o.y - 4 : (s.hero.mount ? o.y + 2 : o.y - 2);
    this.target.set(o.x / 16, -cy / 16, 0);
    const tilt = (12 * Math.PI) / 180, d = this.distance;
    this.camera.position.set(this.target.x, this.target.y + d * Math.sin(tilt), d * Math.cos(tilt));
    this.camera.lookAt(this.target);
  };
});

// Mesh-Zahlen und Zeichenaufrufe
const counts = await sc(() => {
  const out = {};
  for (const [obj, av] of window.__view3d.avatars) {
    let n = 0; av.root.traverse((o) => { if (o.isMesh || o.isLine) n++; });
    const k = obj.texture.key; if (!out[k] || n > out[k]) out[k] = n;
  }
  out.calls = window.__view3d.renderer.info.render.calls; out.tris = window.__view3d.renderer.info.render.triangles;
  return out;
});
console.log('  Meshes je Avatar / Szene', JSON.stringify(counts));
check('Heldin ≤ 30 Meshes (inkl. Schirm und Angel)', counts.lotti <= 30);
check('Pflaume ≤ 20 Meshes', counts.pflaume <= 20);
check('Zeichenaufrufe unter 60', counts.calls < 60);

// ---------- Spielentfernung ----------
await wait(500); await shot('30_far_idle');
await page.keyboard.down('ArrowRight'); await wait(2500); await shot('31_far_run'); await page.keyboard.up('ArrowRight');
await until('steht', 'h.onGround && Math.abs(h.body.velocity.x) < 1');
const m0 = await sc(() => { const m = window.__game.scene.getScene('Play').mounts.getChildren()[0]; return { x: m.x, y: m.y }; });
await teleport(m0.x - 52, m0.y - 4); await until('steht neben Pflaume', 'h.onGround'); await wait(600); await shot('32_far_rabbit');

// ---------- Pflaume frei (Nahaufnahme, Kamera auf dem Kaninchen) ----------
await zoom(8); await focus('mount'); await wait(600); await shot('10_rabbit_free_a');
await until('Pflaume hoppelt', 's.mounts.getChildren()[0]?.walking', 15000); await wait(900); await shot('10_rabbit_free_b');

// ---------- Reiten ----------
await focus('hero');
await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; s.hero.body.reset(m.x, m.y - 26); });
check('Reitet', await until('aufgestiegen', '!!h.mount', 20000));
await until('steht auf Pflaume', 'h.onGround'); await wait(1500);
await shot('11_ride_idle');
await page.keyboard.down('ArrowRight'); await wait(2500); await shot('12_ride_run_a'); await wait(300); await shot('12_ride_run_b');
await zoom(farDistance); await focus(null); await wait(400); await shot('33_far_ride_run'); await zoom(8); await focus('hero');
await page.keyboard.up('ArrowRight'); await until('steht', 'Math.abs(h.body.velocity.x) < 1'); await wait(800);
await sc(() => window.__game.scene.getScene('Play').hero.mount.eat('red')); await wait(800); await shot('13_ride_red');
await sc(() => window.__game.scene.getScene('Play').hero.mount.eat('blue')); await wait(300);
await page.keyboard.down('Space');
check('Schwebt', await until('schwebt', 'h.mount && h.mount.hovering', 20000));
await wait(1200); await shot('14_hover'); await page.keyboard.up('Space');
await until('gelandet', 'h.onGround', 20000); await wait(600);
await sc(() => window.__game.scene.getScene('Play').hero.mount.eat('yellow')); await wait(800); await shot('15_ride_yellow');
// Stampfsprung (gelb): springen, in der Luft Aktionstaste
await page.keyboard.down('Space'); await until('in der Luft', '!h.onGround && h.body.velocity.y < -100'); await page.keyboard.up('Space');
await page.keyboard.press('KeyX');
check('Stampft', await until('stampft', 'h.mount && h.mount.stomping', 10000));
await wait(300); await shot('15_stomp'); await until('gelandet', 'h.onGround', 20000); await wait(800);
await faceCamera(true); await wait(500); await shot('16_ride_front'); await faceCamera(false);
await page.keyboard.down('ArrowLeft'); await wait(1500); await shot('16_ride_left'); await page.keyboard.up('ArrowLeft'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
// Panik: Reiterin fliegt, Kaninchen flieht
await focus('mount');
await sc(() => { const s = window.__game.scene.getScene('Play'); s.hero.mount.panic(s.hero.x + 10); });
await wait(900); await shot('17_panic_a'); await wait(1500); await shot('17_panic_b');
await until('Pflaume weg', 's.mounts.getChildren().length === 0', 60000);

// ---------- Heldin: Posen (auf der Wiese am Start) ----------
await focus('hero');
await teleport(70, 300); await until('gelandet', 'h.onGround && h.moveState === "ground"'); await wait(1500);
await shot('01_idle'); await wait(1500); await shot('01_idle_b');
// Tod (nur Darstellung erzwingen)
await sc(() => { window.__game.scene.getScene('Play').hero.dead = true; }); await wait(1200); await shot('01_dead');
await sc(() => { window.__game.scene.getScene('Play').hero.dead = false; }); await wait(1200);
await page.keyboard.down('ArrowRight'); await wait(2000); await shot('02_run_a'); await wait(300); await shot('02_run_b');
await page.keyboard.down('Space'); await until('springt', 'h.body.velocity.y < -150'); await wait(900); await shot('03_jump');
await until('fällt', 'h.body.velocity.y > 60 && !h.onGround'); await wait(500); await shot('04_fall');
await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight'); await until('gelandet', 'h.onGround'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
await faceCamera(true); await wait(500); await shot('05_turn_front'); await faceCamera(false);
await page.keyboard.down('ArrowLeft'); await wait(1500); await shot('06_face_left'); await page.keyboard.up('ArrowLeft'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
await page.keyboard.down('ArrowRight'); await wait(600); await page.keyboard.up('ArrowRight'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
// Gleiten, Sturzflug, Aufschwung: hoch teleportieren, beim Fallen Sprungtaste halten
const h0 = await heroInfo();
await teleport(h0.x, h0.y - 190); await until('fällt', 'h.body.velocity.y > 30'); await page.keyboard.down('Space');
check('Gleitet', await until('gleitet', 'h.moveState === "glide"'));
await wait(1500); console.log('  glide', JSON.stringify(await heroInfo())); await shot('07_glide');
await page.keyboard.down('ArrowDown');
check('Sturzflug', await until('Sturzflug', 'h.moveState === "dive"'));
await wait(900); console.log('  dive', JSON.stringify(await heroInfo())); await shot('08_dive');
await page.keyboard.up('ArrowDown');
check('Aufschwung', await until('Aufschwung', 'h.swooping'));
await wait(600); console.log('  swoop', JSON.stringify(await heroInfo())); await shot('09_swoop');
await page.keyboard.up('Space'); await until('gelandet', 'h.onGround', 30000);

// ---------- Greta ----------
await sc(() => window.__game.scene.getScene('Play').hero.setHeroKey('greta'));
await wait(1500); await shot('20_greta_idle');
await page.keyboard.down('ArrowRight'); await wait(2000); await shot('21_greta_run');
await page.keyboard.down('Space'); await until('springt', 'h.body.velocity.y < -150'); await wait(900); await shot('22_greta_jump');
await until('fällt', 'h.body.velocity.y > 60 && !h.onGround'); await wait(500); await shot('23_greta_fall');
await page.keyboard.up('Space'); await page.keyboard.up('ArrowRight'); await until('gelandet', 'h.onGround'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
await faceCamera(true); await wait(500); await shot('24_greta_front'); await faceCamera(false);
await page.keyboard.down('ArrowLeft'); await wait(1500); await shot('25_greta_left'); await page.keyboard.up('ArrowLeft'); await until('steht', 'Math.abs(h.body.velocity.x) < 1');
const h1 = await heroInfo();
await teleport(h1.x, h1.y - 190); await until('fällt', 'h.body.velocity.y > 30'); await page.keyboard.down('Space');
await until('gleitet', 'h.moveState === "glide"'); await wait(1500); await shot('26_greta_glide'); await page.keyboard.up('Space'); await until('gelandet', 'h.onGround', 30000);

// ---------- Nacktes Sprite (Weltkarte): Avatar darf nicht werfen ----------
const bareOk = await sc(() => {
  const s = window.__game.scene.getScene('Play');
  const a = s.add.sprite(s.hero.x - 40, s.hero.y, 'lotti', 'idle0');
  const b = s.add.sprite(s.hero.x + 40, s.hero.y, 'lotti', 'idle0'); b.play('lotti-run');
  const c = s.add.sprite(s.hero.x, s.hero.y - 40, 'greta', 'idle0');
  window.__bare = [a, b, c];
  return true;
});
await wait(1500);
const bareAv = await sc(() => window.__bare.every((o) => o.__view3d && o.__view3d.root && o.__view3d.root.visible));
check('Nacktes Sprite bekommt Avatar ohne Fehler', bareOk && bareAv);
await shot('27_bare_sprites');
await sc(() => window.__bare.forEach((o) => o.destroy()));
await wait(500);

check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
