// Sichtprüfung der 3D-Gegner und -Objekte: Nahaufnahmen (Kamera näher), erzwungene Zustände
// (platt, weggeschleudert, Checkpoint an, Tor offen, Münze eingesammelt, Feuerball), Mesh-Zahlen,
// Zeichenaufrufe an dichten Stellen.
// Aufruf: npm run build && node tests/items3d.mjs  →  tests/out/i3d_*.png
import { startServer, launchBrowser, loadGame, makeChecker, OUT } from './helpers.mjs';

const PORT = 4190;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const shot = (name) => page.screenshot({ path: `${OUT}i3d_${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
/** Heldin an eine Stelle setzen und einfrieren; Kamera (ohne Folgen) auf (cx, cy) zentrieren. */
const freeze = (x, y, cx = x, cy = y) => sc(([x, y, cx, cy]) => {
  const s = window.__game.scene.getScene('Play'); const h = s.hero;
  h.body.moves = true; h.body.reset(x, y); h.body.setVelocity(0, 0); h.body.moves = false; h.invincibleTimer = 1e9;
  s.cameras.main.stopFollow(); s.cameras.main.removeBounds(); s.cameras.main.centerOn(cx, cy);
}, [x, y, cx, cy]);
/** Zeichenaufrufe je Avatar-Typ (sichtbare Meshes, Schattenwerfer doppelt). */
const breakdown = () => sc(() => {
  const v = window.__view3d; const cam = v.camera; cam.updateMatrixWorld();
  // Frustum über Projektionsmatrix (Three intern nicht exportiert → über camera.projectionMatrix nachbauen)
  const m = cam.projectionMatrix.clone().multiply(cam.matrixWorldInverse);
  const planes = [];
  const e = m.elements;
  const mk = (a, b, c, d) => { const l = Math.hypot(a, b, c); return [a / l, b / l, c / l, d / l]; };
  planes.push(mk(e[3] - e[0], e[7] - e[4], e[11] - e[8], e[15] - e[12]));
  planes.push(mk(e[3] + e[0], e[7] + e[4], e[11] + e[8], e[15] + e[12]));
  planes.push(mk(e[3] + e[1], e[7] + e[5], e[11] + e[9], e[15] + e[13]));
  planes.push(mk(e[3] - e[1], e[7] - e[5], e[11] - e[9], e[15] - e[13]));
  planes.push(mk(e[3] - e[2], e[7] - e[6], e[11] - e[10], e[15] - e[14]));
  planes.push(mk(e[3] + e[2], e[7] + e[6], e[11] + e[10], e[15] + e[14]));
  const out = {};
  for (const av of v.avatars.values()) {
    if (!av.root.visible) continue;
    av.root.traverse((o) => {
      if (!o.isMesh || !o.visible) return;
      let sph = o.boundingSphere ?? null;
      if (!sph) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); sph = o.geometry.boundingSphere; }
      const c = sph.center.clone().applyMatrix4(o.matrixWorld);
      const sc = o.matrixWorld.getMaxScaleOnAxis(); const r = sph.radius * sc;
      const inside = planes.every(([a, b, cc, d]) => a * c.x + b * c.y + cc * c.z + d >= -r);
      if (!inside) return;
      out[av.textureKey] = (out[av.textureKey] ?? 0) + 1 + (o.castShadow ? 1 : 0);
    });
  }
  return out;
});
const dist = (d) => sc((d) => { window.__view3d.distance = d; }, d);
const calls = () => sc(() => window.__view3d.renderer.info.render.calls);
const FAR = ((270 / 16) / 2) / Math.tan((30 * Math.PI / 180) / 2);

await loadGame(page, PORT, errors, stop, 'level1', '2', '1');
check('3D-Ansicht aktiv', await sc(() => !!window.__view3d));
console.log('  FPS (headless):', await sc(() => Math.round(window.__game.loop.actualFps)));

// Mesh-Zahlen je Avatar-Klasse
const meshes = await sc(() => {
  const v = window.__view3d; const out = {};
  for (const av of v.avatars.values()) {
    let n = 0; av.root.traverse((o) => { if (o.isMesh) n++; });
    const k = av.textureKey; out[k] = Math.max(out[k] ?? 0, n);
  }
  return out;
});
console.log('  Meshes je Avatar:', JSON.stringify(meshes));
// Heldinnen und Pflaume haben ein eigenes Budget (tests/figures3d.mjs, Zöpfe, Kurs-Arme) – hier nur Gegner und Objekte
const FIGURES = new Set(['lotti', 'greta', 'pflaume']);
check('Jeder Gegner-/Objekt-Avatar ≤ 20 Meshes', Object.entries(meshes).every(([k, n]) => FIGURES.has(k) || n <= 20));

const T = 16, FLOOR = 22;
const pos = await sc(() => {
  const s = window.__game.scene.getScene('Play');
  const e = s.enemies.getChildren();
  return {
    walker: e.filter((x) => x.texture.key === 'walker').map((x) => [x.x, x.y]),
    hopper: e.filter((x) => x.texture.key === 'hopper').map((x) => [x.x, x.y]),
    coin: s.coins.getChildren().map((c) => [c.x, c.y]),
    berry: s.berries.getChildren().map((b) => [b.x, b.y]),
    cp: s.checkpoints.getChildren().map((c) => [c.x, c.y]),
    gate: s.gates.getChildren().map((g) => [g.x, g.y]),
    flag: s.flags.getChildren().map((f) => [f.x, f.y]),
    key: s.keys.getChildren().map((k) => [k.x, k.y]),
    thorns: s.thorns.getChildren().map((t) => [t.x, t.y]),
    mount: s.mounts.getChildren().map((m) => [m.x, m.y]),
  };
});
const coin1 = pos.coin.find((c) => c[0] < 500);
const hopper1 = pos.hopper.find((h) => h[0] > 900 && h[0] < 1100);
const berryRed = pos.berry[0];

// --- Spielentfernung: Startbereich (Käfer, Münze 1, Dornen) ---
await freeze(24 * T, FLOOR * T - 40);
await wait(600);
await shot('00_start_far');
const callsStart = await calls();

// --- Nahaufnahmen ---
await dist(11);
// Münze 1 (Tile 27, Reihe 16)
await freeze(coin1[0] - 60, coin1[1] + 30, coin1[0], coin1[1]);
await wait(500); await shot('01_coin');
await wait(300); await shot('01_coin_b');

// Käfer: Lauf, platt, weggeschleudert
const aliveWalker = () => sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'walker' && x.alive && x.x < 600); return e ? [e.x, e.y] : null; });
let w = await aliveWalker();
await freeze(w[0], w[1] - 60, w[0], w[1] - 6);
await wait(400); await shot('02_walker');
await wait(250); await shot('02_walker_b');
await sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'walker' && x.alive && x.x < 600); e.squash(); });
await wait(150); await shot('03_walker_squashed');
await wait(400); await shot('03_walker_squashed_b');
await wait(400);
// zweiten Käfer heranholen (Tile 65) und wegschleudern
await sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'walker' && x.alive && x.x > 1000 && x.x < 1100); e.body.reset(300, 344); });
await wait(300);
w = await aliveWalker();
await freeze(w[0], w[1] - 60, w[0] + 24, w[1] - 36);
await wait(300);
await sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'walker' && x.alive && x.x < 600); e.knockOut(1); });
await wait(200); await shot('04_walker_knockout');
await wait(250); await shot('04_walker_knockout_b');

// Dornen (Tile 31/32)
await freeze(pos.thorns[0][0] + 8, pos.thorns[0][1] - 60, pos.thorns[0][0] + 8, pos.thorns[0][1] - 4);
await wait(400); await shot('05_thorns');

// Beere (rot, Tile 56)
await freeze(berryRed[0] - 50, berryRed[1] - 14, berryRed[0], berryRed[1] - 2);
await wait(400); await shot('06_berry');

// Pilz (Tile 60): idle, dann Hocke/Sprung abwarten
await freeze(hopper1[0] + 220, hopper1[1] - 26, hopper1[0], hopper1[1] - 8);
await wait(400); await shot('07_hopper_idle');
// Wartezeit überspringen (Spielzeit läuft im Software-Renderer bei Nahaufnahmen langsam)
await sc(() => { const e = window.__game.scene.getScene('Play').enemies.getChildren().find((x) => x.texture.key === 'hopper' && x.x > 800 && x.x < 1300); e.timer = 0; });
const got = { squat: false, jump: false };
for (let i = 0; i < 120 && !(got.squat && got.jump); i++) {
  await wait(40);
  const ph = await sc(() => window.__game.scene.getScene('Play').enemies.getChildren().find((x) => x.texture.key === 'hopper' && x.x > 800 && x.x < 1300)?.phase);
  if (ph === 'squat' && !got.squat) { await shot('07_hopper_squat'); got.squat = true; }
  if (ph === 'air' && !got.jump) { await wait(120); await shot('07_hopper_jump'); got.jump = true; }
}
check('Pilz-Posen gesehen (Hocke + Sprung)', got.squat && got.jump);
await sc(() => { const s = window.__game.scene.getScene('Play'); const e = s.enemies.getChildren().find((x) => x.texture.key === 'hopper' && x.alive && x.x > 800 && x.x < 1300); if (e) { e.body.reset(1000, 344); e.squash(); } });
await freeze(1070, 344 - 26, 1000, 336);
await wait(150); await shot('07_hopper_squashed');

// Checkpoint (Tile 129): aus → an
await freeze(pos.cp[0][0] + 60, pos.cp[0][1] - 16, pos.cp[0][0] + 4, pos.cp[0][1] - 4);
await wait(400); await shot('08_checkpoint_off');
await sc(() => window.__game.scene.getScene('Play').checkpoints.getChildren()[0].activate());
await wait(250); await shot('08_checkpoint_on');
await wait(600); await shot('08_checkpoint_on_b');

// Höhle: Schlüssel, Dornen in der Höhle
await freeze(pos.key[0][0] + 60, pos.key[0][1] - 8, pos.key[0][0] + 10, pos.key[0][1] - 6);
await wait(500); await shot('09_cave_key');

// Tor (Tile 285): zu → auf
await freeze(pos.gate[0][0] - 60, pos.gate[0][1] - 6, pos.gate[0][0], pos.gate[0][1] - 2);
await wait(400); await shot('10_gate_closed');
await sc(() => window.__game.scene.getScene('Play').gates.getChildren()[0].open());
await wait(150); await shot('10_gate_opening');
await wait(700); await shot('10_gate_open');

// Fahne (Tile 295)
await freeze(pos.flag[0][0] - 60, pos.flag[0][1] - 6, pos.flag[0][0], pos.flag[0][1] - 4);
await wait(400); await shot('11_flag');
await wait(250); await shot('11_flag_b');

// Gespeicherte Münze (halbtransparent, alpha 0,45) – Münze 2 auf der hohen Plattform
const coin2 = pos.coin.find((c) => c[0] > 1100 && c[0] < 1200);
await sc(() => window.__game.scene.getScene('Play').coins.getChildren().find((c) => c.x > 1100 && c.x < 1200).setAlpha(0.45));
await freeze(coin2[0] - 60, coin2[1] + 30, coin2[0], coin2[1] - 6);
await wait(400); await shot('12_coin_ghost');

// Münze einsammeln (Tween: hoch, verblassen, größer)
await freeze(coin1[0] - 60, coin1[1] + 30, coin1[0], coin1[1] - 6);
await wait(300);
await sc(() => window.__game.scene.getScene('Play').coins.getChildren().find((c) => c.x < 500).collect());
await wait(250); await shot('12_coin_collect');
await wait(400); await shot('12_coin_collect_b');

// Feuerball: auf Pflaume, rote Kraft, Aktion
await dist(14);
await sc(() => { const s = window.__game.scene.getScene('Play'); const m = s.mounts.getChildren()[0]; const h = s.hero; h.invincibleTimer = 0; h.body.moves = true; h.body.reset(m.x, m.y - 6); s.cameras.main.centerOn(m.x, m.y); });
await wait(1500);
const riding = await sc(() => !!window.__game.scene.getScene('Play').hero.mount);
check('Reitet Pflaume', riding);
await sc(() => { const s = window.__game.scene.getScene('Play'); s.hero.mount.eat('red'); s.hero.mount.useAction(s.hero); s.cameras.main.stopFollow(); s.cameras.main.centerOn(s.hero.x + 40, s.hero.y + 4); });
await wait(100); await shot('13_fireball');
await wait(150); await shot('13_fireball_b');
const fb = await sc(() => window.__game.scene.getScene('Play').fireballs.getLength());
check('Feuerball existiert', fb >= 1);

// --- Spielentfernung: Checkpoint-Bereich, Baumkronen (viele Dornen), Höhle, Tor ---
await dist(FAR);
await freeze(pos.cp[0][0] + 30, pos.cp[0][1] - 10);
await wait(500); await shot('14_checkpoint_far');
const callsCp = await calls();
await freeze(163 * T, (FLOOR - 9) * T);
await wait(500); await shot('15_treetops_far');
const callsTree = await calls();
console.log('  Aufschlüsselung Baumkronen:', JSON.stringify(await breakdown()));
await freeze(pos.key[0][0] + 60, pos.key[0][1] - 10);
await wait(500); await shot('16_cave_far');
const callsCave = await calls();
await freeze(pos.gate[0][0] - 60, pos.gate[0][1] - 10);
await wait(500); await shot('17_gate_far');
const callsGate = await calls();
console.log('  Aufschlüsselung Tor:', JSON.stringify(await breakdown()));

const info = await sc(() => { const v = window.__view3d; return { tris: v.renderer.info.render.triangles, avatars: v.avatars.size }; });
console.log('  Zeichenaufrufe: Start', callsStart, 'Checkpoint', callsCp, 'Baumkronen', callsTree, 'Höhle', callsCave, 'Tor', callsGate, '| Dreiecke', info.tris, 'Avatare', info.avatars);
check('Zeichenaufrufe überall unter 120 (inkl. Schattenpass)', Math.max(callsStart, callsCp, callsTree, callsCave, callsGate) < 120);
check('Keine Konsolenfehler', errors.length === 0);
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
