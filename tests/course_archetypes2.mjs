// Kurs-Modus: Archetypen Autoscroller (Testlevel 0-4 „Rollband“) und Prüfungs-Haus (0-5 „Prüfstube“)
// deterministisch prüfen (Präzisierung Autoscroller/Haus).
//   Autoscroller: Fenster fährt mit speed (und speeds), Kamera folgt dem Fenster (nicht der Figur), Figur vorne
//   gebremst, hinten mitgeschoben, Einklemmen = Tod, Wagen tragen Figur/Kanone/Checkpoint (attach), Sprünge zwischen
//   fahrenden Wagen (geerbtes Tempo), Neustart am Checkpoint mit Fensterlage von damals, Ende stoppt Fenster und
//   Wagen, danach freie Bewegung, Kamera zurück zur Figur, Röhre → Zielmast → Ergebnis.
//   Haus: Countdown, Raum-Timer im HUD, Stern je Raum (defeatAll/collect/reach), Raumwechsel mit Überblendung,
//   Ticks in den letzten 3 s, Zeitablauf beendet mit Teilergebnis (gespeichert), Tod setzt den Raum zurück,
//   fail 'retry', alle Räume → 3/3.
// Vorab in Node: Bildfenster-Mathematik (ScrollWindow: Achsen-Form, speeds, Abbremsen genau bis end, Auslöser,
// snapshot/restore, Kurven-Richtung).
// Simulation nur über window.__course.step(n) / setInput; Teleport erlaubt. Danach Screenshots tests/out/ca2_*.png.
// Aufruf: PORT_BASE=3600 node tests/course_archetypes2.mjs
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';
import { ScrollWindow, ScrollPath } from '../src/course/archetypes/ScrollWindow.js';

const { check, summary } = makeChecker();
const near = (a, b, eps) => Math.abs(a - b) <= eps;

// ====================================================================== Bildfenster (Node)
console.log('\nBildfenster (ScrollWindow, Node)');
{
  const DT = 1 / 120;
  const w = new ScrollWindow({ axis: '-z', start: 0, end: -60, line: [2, 1], speed: 5, speeds: [{ from: -20, speed: 2 }], delay: 0.5, accel: 6 }, [0, 0, 0]);
  check('Achsen-Form: Mitte am Anfang (x 2, y 1, z 0), Richtung −Z, rechts +X', near(w.center.x, 2, 1e-9) && near(w.center.y, 1, 1e-9) && near(w.center.z, 0, 1e-9) && near(w.dir.z, -1, 1e-9) && near(w.side.x, 1, 1e-9));
  let n = 0;
  while (w.state === 'wait') { w.step(DT); n++; }
  check(`delay 0,5 s (${n} Schritte)`, n === 60);
  let v5 = 0, v2 = 0, steps = 0, ended = 0;
  while (w.state !== 'done' && steps < 120 * 60) { if (w.step(DT)) ended++; steps++; if (w.center.z < -10 && w.center.z > -15) v5 = Math.max(v5, w.speed); if (w.center.z < -30 && w.center.z > -50) v2 = Math.max(v2, w.speed); }
  check(`speeds in Achsen-Koordinaten: 5 m/s bis z −20, dann 2 m/s (${v5} / ${v2})`, near(v5, 5, 1e-9) && near(v2, 2, 1e-9));
  check(`hält genau bei end (z ${w.center.z.toFixed(6)}), Tempo 0, Ende genau einmal gemeldet`, near(w.center.z, -60, 1e-9) && w.speed === 0 && ended === 1);
  const clock = w.clock; w.step(DT);
  check('Fahrt-Uhr läuft nach dem Ende weiter (Fahrzeuge mit eigenem Tempo)', w.clock > clock && w.state === 'done');
  const L = w.local({ x: 3, y: 1, z: -64 });
  check(`local(): along/across relativ zum Fenster (${L.along}, ${L.across})`, near(L.along, 4, 1e-9) && near(L.across, 1, 1e-9));
  // snapshot/restore
  const w2 = new ScrollWindow({ path: [[0, 0, 0], [0, 0, -40], [30, 0, -40]], speed: 4, delay: 0 });
  for (let i = 0; i < 120 * 3; i++) w2.step(DT);
  const snap = w2.snapshot(), s3 = w2.s;
  for (let i = 0; i < 120 * 4; i++) w2.step(DT);
  w2.restore(snap);
  check(`snapshot/restore (s ${w2.s.toFixed(3)} = ${s3.toFixed(3)})`, near(w2.s, s3, 1e-9) && w2.state === 'run');
  w2.restore(null);
  check('restore(null) = Anfang (wait)', w2.state === 'wait' && w2.s === 0);
  // Kurve: Richtung an der Ecke weich gemittelt, Kamera-Gier folgt
  const P = new ScrollPath([[0, 0, 0], [0, 0, -40], [30, 0, -40]]);
  const d0 = P.dirAt(20), dC = P.dirAt(40), d1 = P.dirAt(60);
  check(`Kurve: Richtung −Z → Ecke gemittelt → +X (Gier ${P.headingYaw(20).toFixed(2)} → ${P.headingYaw(60).toFixed(2)})`, near(d0.z, -1, 1e-9) && near(dC.x, Math.SQRT1_2, 1e-6) && near(d1.x, 1, 1e-9) && near(P.headingYaw(20), 0, 1e-9) && near(P.headingYaw(60), -Math.PI / 2, 1e-9));
  // Auslöser
  const w3 = new ScrollWindow({ axis: '-z', start: 0, end: -20, delay: 0, trigger: { min: [-1, 0, -3], max: [1, 3, -1] } });
  for (let i = 0; i < 120; i++) w3.step(DT, { pos: { x: 0, y: 1, z: 2 } });
  const waiting = w3.state === 'wait';
  w3.step(DT, { pos: { x: 0, y: 1, z: -2 } }); w3.step(DT, { pos: { x: 0, y: 1, z: -2 } });
  check('trigger: Fahrt beginnt erst, wenn die Figur den Quader betritt', waiting && w3.state === 'run');
}

const PORT = 4209;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];

async function load(id, { hero = 'lotti', fresh = false } = {}) {
  if (fresh) {
    await page.goto(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`, { waitUntil: 'load' });
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load' });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 60000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc((h) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    c.setHero(h);
    const P = () => c.player;
    const L = c.level;
    L.runtime.save.lives = 9;              // genug Leben für die Todesfälle der Prüfungen (kein Spielende)
    // Effekte mitschreiben (stumm)
    window.__sfx = [];
    L.sfx = (n) => { window.__sfx.push([n, +L.time.toFixed(3)]); };
    window.__t = {
      ent: (id) => L.named.get(id),
      arch: () => c.state().archetype,
      info: () => P().info(),
      /** Figur setzen (groß, ohne Power-up) und kurz landen lassen. */
      place(pos, o = {}) {
        const p = P();
        c.setInput(null); c.setInput({});
        p.dead = false; p.holding = null;
        p.big = o.big ?? true;
        if (p.power !== 'none') p.setPower('none');
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.invuln = o.invuln ?? 0;
        if (L.runtime.status === 'dying') L.runtime.status = 'play';
        c.view.rig.snap(p);
        if (o.settle) c.step(o.settle);
        return p.info();
      },
      run(input, n) { c.setInput(input); c.step(n); c.setInput({}); },
      /** Kamera und Darstellung wie in einem Bild nachführen (rig.update ruft die Archetyp-Kamera). */
      cam(n = 1, dt = 0.05) {
        for (let i = 0; i < n; i++) { c.rig.update(dt, c.view.time + dt); c.view.rig.update(dt, c.player, c.world); }
        return c.view.rig.info();
      },
      sfxCount: (name) => window.__sfx.filter(([n]) => n === name).length,
      save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    };
  }, hero);
}

/** Aufbau (setup im Browser), Darstellung nachführen, auf neue Bilder warten, Screenshot, Kennzahlen. */
async function SHOT(name, setup, arg) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    c.player.invuln = 0;                    // kein Blinken auf dem Bild
    for (let i = 0; i < 12; i++) { c.rig.update(0.05, c.view.time + i * 0.05); c.level.render(0.05, c.view.time + i * 0.05); c.view.rig.update(0.05, c.player, c.world); }
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 2, { timeout: 30000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}ca2_${name}.png` });
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
}

// ====================================================================== Autoscroller 0-4
console.log('\nAutoscroller 0-4 „Rollband“');
await load('0-4', { fresh: true });

let r = await sc(() => {
  const c = window.__course, a = __t.arch();
  const w = c.level.scroll;
  return { a, hasScroll: !!w, vehicles: c.level.entities.filter((e) => e.kind === 'vehicle').map((e) => e.info()), cannon: __t.ent('kanone').pos.toArray(), cp: c.level.entities.find((e) => e.kind === 'checkpoint')?.pos.toArray() };
});
check('Fenster wartet am Anfang (state wait, Mitte z = −1)', r.hasScroll && r.a.state === 'wait' && near(r.a.center[2], -1, 1e-6));
check('drei Wagen am Pfad (Mitte s 18,8 / 30,8 / 43,3)', r.vehicles.length === 3 && near(r.vehicles[0].z, 10 - 18.8, 1e-3) && near(r.vehicles[2].z, 10 - 43.3, 1e-3));
check('Unterobjekte am Wagen 2 angemeldet (Kanone, Checkpoint, Münzen)', r.vehicles[1].attached >= 5);

// --- Vorne gebremst (Fenster steht noch: Vorderkante s 20 = z −10 über Wagen 1)
r = await sc(() => {
  const c = window.__course, p = c.player;
  __t.place([0, 1.25, 0], { settle: 10 });
  let maxAlong = -1e9;
  c.setInput({ y: 1, run: true });
  for (let i = 0; i < 160; i++) { c.step(1); const a = __t.arch(); maxAlong = Math.max(maxAlong, a.player.along); }
  const a = __t.arch();
  c.setInput({});
  return { maxAlong, along: a.player.along, state: a.state, vz: p.vel.z, gs: p.gs, mode: p.mode, z: p.pos.z, dead: p.dead };
});
check(`vorne gebremst: Figur bleibt an der Vordergrenze (max along ${r.maxAlong.toFixed(2)} ≤ 8,05)`, r.maxAlong <= 8.05 && r.maxAlong > 7.5 && !r.dead);
check(`sanft gebremst: kurz vor der Grenze nur noch Schritttempo (gs ${r.gs.toFixed(2)} bei along ${r.along.toFixed(2)})`, r.state === 'wait' && r.gs < 2 && r.gs <= (8 - r.along) * 4 + 0.35);

// --- Fenster fährt mit speed, Kamera folgt dem Fenster
r = await sc(() => {
  const c = window.__course, w = c.level.scroll;
  __t.place([0, 1.25, -8], { settle: 4, invuln: 999 });          // auf Wagen 1
  let n = 0;
  while (w.state === 'wait' && n < 400) { c.step(1); n++; }
  const t0 = c.level.time;
  c.step(120);                                                   // anfahren
  const s1 = w.s; c.step(120); const s2 = w.s;                  // 1 s volle Fahrt
  const cam = __t.cam(2);
  return { started: n, t0, v: s2 - s1, speed: w.speed, cam, center: [w.center.x, w.center.y, w.center.z], p: c.player.info() };
});
check(`Fenster fährt nach delay 2 s los (Levelzeit ${r.t0.toFixed(3)} s)`, near(r.t0, 2, 0.01));
check(`Fenster fährt mit speed 4 m/s (${r.v.toFixed(3)} m in 1 s)`, near(r.v, 4, 0.01) && near(r.speed, 4, 1e-6));
check(`Kamera-Blickziel auf der Fenstermitte (z ${r.cam.target[2]} vs ${r.center[2].toFixed(2)})`, near(r.cam.target[2], r.center[2], 0.02));
r = await sc(() => {
  const c = window.__course, w = c.level.scroll;
  const before = __t.cam(1).target[2] - w.center.z;
  // Figur läuft 1 s nach vorn: Kamera bleibt beim Fenster
  c.setInput({ y: 1 }); c.step(60); c.setInput({});
  const cam = __t.cam(1);
  return { before, after: cam.target[2] - w.center.z, along: __t.arch().player.along, pitch: cam.pitch, dist: cam.dist };
});
check(`Kamera folgt dem Fenster, nicht der Figur (Versatz ${r.before.toFixed(3)} → ${r.after.toFixed(3)}, Figur along ${r.along.toFixed(2)})`, near(r.before, 0, 0.02) && near(r.after, 0, 0.02));
check(`Kamera-Schiene aus LEVEL.camera an der Fenstermitte (pitch ${r.pitch}, dist ${r.dist})`, near(r.pitch, 41, 0.01) && near(r.dist, 15, 0.05));

// --- Wagen tragen Figur und Kanone
r = await sc(() => {
  const c = window.__course, p = c.player;
  const w1 = __t.ent('wagen1'), w2 = __t.ent('wagen2'), k = __t.ent('kanone');
  // Figur vorn auf Wagen 1 (genug Abstand zur hinteren Grenze)
  __t.place([-1, 1.25, w1.pos.z - 3.5], { settle: 6, invuln: 999 });
  const shape = c.world.get(k.shapes[0]);
  const w3 = __t.ent('wagen3'), pilz = __t.ent('pilz');
  const a0 = { p: p.pos.z, w1: w1.pos.z, w2: w2.pos.z, k: k.pos.z, ks: shape.z, kx: k.pos.x - w2.pos.x, pz: pilz.pos.z, w3: w3.pos.z };
  c.step(120);
  return {
    dp: p.pos.z - a0.p, dw1: w1.pos.z - a0.w1, dw2: w2.pos.z - a0.w2, dk: k.pos.z - a0.k, dks: shape.z - a0.ks, kx: k.pos.x - w2.pos.x, kx0: a0.kx,
    ground: p.ground?.mover?.vehicle?.spec?.id ?? null, mode: p.mode, mover: shape.mover === w2.mover, w1speed: w1.speedNow,
    pilz: { rel: pilz.pos.z - w3.pos.z, y: pilz.pos.y, dz: pilz.pos.z - a0.pz, dw: w3.pos.z - a0.w3, alive: pilz.alive },
  };
});
check(`Wagen fährt mit eigenem Tempo 2,5 m/s (${(-r.dw1).toFixed(3)} m in 1 s)`, near(-r.dw1, 2.5, 0.01) && near(r.w1speed, 2.5, 0.01));
check(`Wagen trägt die Figur (Figur ${r.dp.toFixed(3)} m, Wagen ${r.dw1.toFixed(3)} m, steht auf ${r.ground})`, near(r.dp, r.dw1, 0.02) && r.ground === 'wagen1' && r.mode === 'ground');
check(`Kanone fährt auf Wagen 2 mit (Kanone ${r.dk.toFixed(3)}, Form ${r.dks.toFixed(3)}, Wagen ${r.dw2.toFixed(3)})`, near(r.dk, r.dw2, 1e-6) && near(r.dks, r.dw2, 1e-6) && near(r.kx, r.kx0, 1e-6) && r.mover);
check(`Pilzling fährt auf Wagen 3 mit (Δz ${r.pilz.dz.toFixed(2)} bei Wagen ${r.pilz.dw.toFixed(2)}, auf dem Deck y ${r.pilz.y.toFixed(2)})`, r.pilz.alive && Math.abs(r.pilz.rel) < 4.6 && near(r.pilz.y, 1.2, 0.05) && near(r.pilz.dz, r.pilz.dw, 2.5));

// --- Sprung auf der Stelle: landet wieder an derselben Stelle des Wagens (geerbtes Tempo in der Luft)
r = await sc(() => {
  const c = window.__course, p = c.player, w1 = __t.ent('wagen1');
  __t.place([-1, 1.25, w1.pos.z - 3], { settle: 6, invuln: 999 });
  const rel0 = p.pos.z - w1.pos.z;
  c.setInput({ jump: true }); c.step(30); c.setInput({});
  let air = 0, inh = null;
  for (let i = 0; i < 200; i++) { c.step(1); if (p.mode === 'air') { air++; inh ??= __t.arch().inherit; } if (p.mode === 'ground' && air > 5) break; }
  return { drift: p.pos.z - w1.pos.z - rel0, air, inh, ground: p.ground?.mover?.vehicle?.spec?.id ?? null };
});
check(`Sprung auf dem fahrenden Wagen landet an derselben Stelle (Abdrift ${r.drift.toFixed(3)} m, geerbt ${r.inh})`, Math.abs(r.drift) < 0.15 && r.ground === 'wagen1' && r.air > 30 && near(r.inh?.[1] ?? 0, -2.5, 0.01));

// --- Sprung über die Lücke von Wagen 1 auf Wagen 2
r = await sc(() => {
  const c = window.__course, p = c.player, w1 = __t.ent('wagen1'), w2 = __t.ent('wagen2');
  __t.place([-1, 1.25, w1.pos.z - 2.6], { settle: 6, invuln: 999 });
  c.setInput({ y: 1 }); c.step(16);
  c.setInput({ y: 1, jump: true }); c.step(28);
  let air = 0;
  for (let i = 0; i < 200; i++) { c.setInput(p.pos.z < w2.pos.z + 3 ? {} : { y: 1 }); c.step(1); if (p.mode === 'air') air++; if (p.mode === 'ground' && air > 5) break; }
  c.setInput({});
  return { ground: p.ground?.mover?.vehicle?.spec?.id ?? null, mode: p.mode, dead: p.dead, rel: p.pos.z - w2.pos.z };
});
check(`Sprung über die Lücke: landet auf Wagen 2 (auf ${r.ground}, relativ ${r.rel.toFixed(2)})`, r.ground === 'wagen2' && !r.dead);

// --- Hinten mitgeschoben: still stehen auf dem langsameren Wagen → Grenze schiebt nach vorn (frisch geladen)
await load('0-4');
r = await sc(() => {
  const c = window.__course, p = c.player, w1 = __t.ent('wagen1');
  // hinten auf Wagen 1 (die Grenze holt den Wagen mit 1,5 m/s ein)
  __t.place([0.6, 1.25, w1.pos.z + 3.6], { settle: 4, invuln: 999 });
  let n = 0;
  const pushes0 = __t.arch().pushes;
  while (__t.arch().pushes === pushes0 && n < 120 * 20) { c.step(1); n++; }
  const a0 = __t.arch();
  let minAlong = 1e9;
  const z0 = p.pos.z, wz0 = w1.pos.z;
  for (let i = 0; i < 240; i++) { c.step(1); minAlong = Math.min(minAlong, __t.arch().player.along); }
  const a = __t.arch();
  return { wait: n / 120, minAlong, pushes: a.pushes - a0.pushes, dz: p.pos.z - z0, dw: w1.pos.z - wz0, dead: p.dead, along: a.player.along, mode: p.mode, ground: p.ground?.mover?.vehicle?.spec?.id ?? null };
});
check(`hinten mitgeschoben: Figur bleibt an der hinteren Grenze (min along ${r.minAlong.toFixed(3)} ≥ −5,05, ${r.pushes} Schübe in 2 s)`, r.minAlong >= -5.05 && r.pushes > 200 && !r.dead && r.ground === 'wagen1');
check(`geschobene Figur ist schneller als ihr Wagen (Figur ${r.dz.toFixed(2)} m, Wagen ${r.dw.toFixed(2)} m)`, r.dz < r.dw - 1);

// --- Einklemmen = Tod: hinter der Kanone auf Wagen 2, die hintere Grenze kommt
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player, k2 = __t.ent('kanone');
  // direkt hinter der Kanone (Zylinder r 0,85) stehen, sobald die hintere Grenze 1,5 m dahinter ist
  // (vorher läge der Platz außerhalb des Fensters – die Vordergrenze würde die Figur zurückholen)
  const spot = () => k2.pos.z + 0.85 + 0.32;
  let k = 0;
  p.mode = 'script'; p.script = { type: 'test', t: 0 };    // währenddessen „geparkt“
  while (w.center.z + 5 - spot() > 1.5 && k < 120 * 40) { c.step(1); k++; }
  __t.place([k2.pos.x, 1.25, spot()], { settle: 4, invuln: 1e9 });
  const c0 = __t.arch().crushed;
  let n = 0;
  while (!p.dead && n < 120 * 10) { c.step(1); n++; }
  return { dead: p.dead, cause: p.deathCause, crushed: __t.arch().crushed - c0, secs: n / 120, rel: p.pos.z - k2.pos.z, state: w.state, wait: k / 120 };
});
check(`Einklemmen zwischen Kanone und hinterer Grenze = Tod (${r.cause} nach ${r.secs.toFixed(2)} s, Abstand zur Kanone ${r.rel.toFixed(2)} m)`, r.dead && r.cause === 'crush' && r.crushed === 1 && r.secs < 3 && r.state === 'run');

// Neustart nach dem Tod: am Levelstart, Fenster von vorn
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player;
  let n = 0;
  while (p.dead && n < 600) { c.step(1); n++; }
  c.step(2);
  return { state: w.state, s: w.s, p: p.info(), w1: __t.ent('wagen1').pos.z, lives: c.level.runtime.lives };
});
check(`Neustart ohne Checkpoint: Fenster von vorn (state ${r.state}, s ${r.s.toFixed(2)}), Wagen zurück (z ${r.w1.toFixed(2)})`, r.state === 'wait' && near(r.s, 11, 1e-6) && near(r.w1, 10 - 18.8, 1e-3) && near(r.p.z, 4, 0.3));

// --- Spiegelfrucht-Klon: wird ebenfalls geschoben; eingeklemmt verschwindet nur der Klon (kein Leben weg)
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player, L = c.level, w1 = __t.ent('wagen1'), k2 = __t.ent('kanone');
  __t.place([0.6, 1.25, w1.pos.z + 3.6], { settle: 4, invuln: 1e9 });
  const clone = c.addClone();
  if (!clone) return { clone: false };
  clone.invuln = 1e9;
  c.step(10);
  const pushes0 = __t.arch().pushes;
  let n = 0;
  while (__t.arch().pushes === pushes0 && n < 120 * 20) { c.step(1); n++; }
  let minAlong = 1e9;
  for (let i = 0; i < 120; i++) { c.step(1); for (const f of L.players) minAlong = Math.min(minAlong, w.local(f.pos).along); }
  const both = L.players.length;
  // Klon direkt hinter die Kanone, die Heldin sicher vor die Kanone (beide „geparkt“, bis die Grenze naht)
  for (const f of L.players) { f.mode = 'script'; f.script = { type: 'test', t: 0 }; }
  const spot = () => k2.pos.z + 0.85 + 0.32;
  let k = 0;
  while (w.center.z + 5 - spot() > 1.5 && k < 120 * 40) { c.step(1); k++; }
  clone.reset([k2.pos.x, 1.25, spot()], Math.PI / 2);
  p.reset([-1.2, 1.25, k2.pos.z - 2.5], Math.PI / 2);
  const lives0 = L.runtime.lives;
  let m = 0;
  while (!clone.removedFigure && m < 120 * 6) { c.step(1); m++; }
  return { clone: true, both, minAlong, removed: clone.removedFigure ?? null, figs: L.players.length, mainAlive: !p.dead, lives: L.runtime.lives - lives0, crushed: __t.arch().crushed, secs: m / 120 };
});
check(`Klon wird mitgeschoben (2 Figuren, min along ${r.minAlong?.toFixed(3)} ≥ −5,05)`, r.clone && r.both === 2 && r.minAlong >= -5.05);
check(`eingeklemmter Klon verschwindet (${r.removed} nach ${r.secs?.toFixed(2)} s), Heldin bleibt, kein Leben weg`, r.removed === 'crush' && r.figs === 1 && r.mainAlive && r.lives === 0);

// --- Checkpoint auf Wagen 2 (attach): Neustart mit der Fensterlage von damals
await load('0-4');
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player, w2 = __t.ent('wagen2');
  const cp = c.level.entities.find((e) => e.kind === 'checkpoint');
  __t.place([0, 1.25, -9], { settle: 4, invuln: 999 });
  p.mode = 'script'; p.script = { type: 'test', t: 0 };
  // warten, bis die Fahne gut im Fenster liegt (along < 6), dann auf die Fahne stellen
  let k = 0;
  while ((w.state === 'wait' || w.local(cp.pos).along > 6) && k < 120 * 30) { c.step(1); k++; }
  __t.place([cp.pos.x, 1.3, cp.pos.z], { settle: 0, invuln: 999 });
  c.step(2);
  const snap = { s: w.s, w2: w2.pos.z, cp: c.level.runtime.checkpoint?.pos.slice(), cpz: cp.pos.z };
  c.step(120 * 3);
  p.die('hit');
  let n = 0;
  while (p.dead && n < 600) { c.step(1); n++; }
  const after = { s: w.s, p: p.info() };
  c.step(1);
  return { snap, after, w2: w2.pos.z, state: w.state };
});
check(`Checkpoint auf dem fahrenden Wagen gesetzt (Fahne z ${r.snap.cpz.toFixed(2)})`, Array.isArray(r.snap.cp) && near(r.snap.cp[2], r.snap.cpz + 0.6, 0.05));
check(`Neustart am Wagen-Checkpoint: Fenster wie damals (s ${r.after.s.toFixed(2)} = ${r.snap.s.toFixed(2)}), Wagen 2 wieder dort (${r.w2.toFixed(2)} = ${r.snap.w2.toFixed(2)}), Figur an der Fahne (z ${r.after.p.z} ≈ ${r.snap.cp[2].toFixed(2)})`,
  near(r.after.s, r.snap.s, 0.1) && near(r.w2, r.snap.w2, 0.1) && near(r.after.p.z, r.snap.cp[2], 0.3) && r.state !== 'wait');

// --- Tempowechsel (speeds) und Ende: Fenster und Wagen halten, Figur läuft frei weiter
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player;
  // Figur „parken“ (Skript), Fahrt bis zum Ende
  p.mode = 'script'; p.script = { type: 'test', t: 0 };
  let v40 = null, n = 0;
  while (w.state !== 'done' && n < 120 * 60) { c.step(1); n++; if (v40 === null && w.s > 45) v40 = w.speed; }
  const vs = c.level.entities.filter((e) => e.kind === 'vehicle');
  const z0 = vs.map((e) => e.pos.z);
  c.step(120 * 3);
  return { v40, state: w.state, s: w.s, speed: w.speed, ended: __t.arch().ended, vstop: vs.map((e) => e.s), moved: vs.map((e, i) => e.pos.z - z0[i]), vspeed: vs.map((e) => e.speedNow) };
});
check(`speeds: ab s = 40 fährt das Fenster 3,4 m/s (${r.v40})`, near(r.v40, 3.4, 1e-6));
check(`Ende: Fenster hält genau bei end = 121 (s ${r.s.toFixed(3)}, Tempo ${r.speed})`, r.state === 'done' && near(r.s, 121, 1e-6) && r.speed === 0 && r.ended);
check(`Ende: Wagen stehen an ihrem Halt (${r.vstop.map((v) => v.toFixed(2)).join(' / ')})`, near(r.vstop[0], 90.8, 0.01) && near(r.vstop[2], 115.3, 0.01) && r.moved.every((m) => Math.abs(m) < 1e-6) && r.vspeed.every((v) => v === 0));
r = await sc(() => {
  const c = window.__course, p = c.player, w3 = __t.ent('wagen3');
  __t.place([1.4, 1.25, w3.pos.z - 3], { settle: 6, invuln: 999 });
  c.setInput({ x: -1, y: 1 }); c.step(90); c.setInput({ y: 1 }); c.step(220); c.setInput({});
  const a = __t.arch();
  c.step(140);
  const cam = __t.cam(30, 0.05);
  return { along: a.player.along, p: p.info(), camK: __t.arch().camK, cam };
});
check(`nach dem Ende frei: Figur läuft über die frühere Vordergrenze (along ${r.along.toFixed(2)} > 9)`, r.along > 9.5 && !r.p.dead);
check(`Kamera gleitet zurück zur Figur (camK ${r.camK}, Ziel z ${r.cam.target[2]} bei Figur z ${r.p.z})`, r.camK === 0 && Math.abs(r.cam.target[2] - (r.p.z - 2)) < 1.5);
await SHOT('scroll_end', () => { const p = window.__course.player; p.yaw = Math.PI / 2; });

// --- Röhre → Zielinsel → Zielmast → Ergebnis
r = await sc(() => {
  const c = window.__course, p = c.player;
  __t.place([0, 2.7, -121], { settle: 30, invuln: 999 });
  c.setInput({ crouch: true }); c.step(2); c.setInput({});
  c.step(160);
  const after = p.info();
  // zum Zielmast laufen
  c.setInput({ y: 1 });
  let n = 0;
  while (p.mode !== 'script' && n < 600) { c.step(1); n++; }
  c.setInput({});
  let m = 0;
  while (!c.finished && m < 1200) { c.step(1); m++; }
  return { after, finished: c.finished, result: c.lastResult ? { stars: c.lastResult.stars, pole: c.lastResult.pole } : null };
});
check(`Röhre am Ende führt zur Zielinsel (Figur x ${r.after.x})`, r.after.x > 20);
check('Zielmast erreicht → Ergebnis', r.finished && !!r.result);
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}ca2_scroll_result.png` });

// --- Bilder Autoscroller (frisch geladen)
await load('0-4');
await SHOT('scroll_start', () => { __t.place([0, 1.25, 1], { settle: 20 }); });
await SHOT('scroll_ride', () => {
  const c = window.__course, w = c.level.scroll;
  __t.place([-1, 1.25, -9], { settle: 4, invuln: 999 });
  while (w.state === 'wait') c.step(1);
  c.step(120 * 5);
  const w2 = __t.ent('wagen2');
  __t.place([-1.2, 1.25, w2.pos.z + 2], { settle: 30, invuln: 999 });
  c.player.yaw = Math.PI / 2;
});
await SHOT('scroll_jump', () => {
  // Lücke Wagen 1 → 2 in der Fenstermitte, Sprung von der Vorderkante von Wagen 1
  const c = window.__course, p = c.player, w = c.level.scroll, w1 = __t.ent('wagen1');
  p.mode = 'script'; p.script = { type: 'test', t: 0 };
  let k = 0;
  while (w.local({ x: 0, y: 0, z: w1.pos.z - 4.5 }).along > 0.5 && k < 120 * 30) { c.step(1); k++; }
  __t.place([-1, 1.25, w1.pos.z - 2.6], { settle: 6, invuln: 999 });
  c.setInput({ y: 1 }); c.step(16);
  c.setInput({ y: 1, jump: true }); c.step(26); c.setInput({ y: 1 });
});

// --- Panzer (Stil tank, Modell panzer_fahrzeug aus Welt 2) auf eigenem Pfad neben dem Gleis, fährt mit dem Fenster
r = await sc(() => {
  const c = window.__course, w = c.level.scroll, p = c.player;
  const t = c.level.spawn('vehicle', { id: 'panzer', style: 'tank', path: [[6.2, 0, 10], [6.2, 0, -200]], at: 10 - w.center.z - (w.s - w.s0), speed: 'scroll' });   // at gilt beim Fahrtbeginn
  c.step(1);
  const deck = c.world.raycastDown(t.pos.x, 6, t.pos.z, 10);
  const z0 = t.pos.z, wz0 = w.center.z;
  c.step(120);
  __t.place([t.pos.x, 2.1, t.pos.z + 1.5], { settle: 30, invuln: 999 });
  p.yaw = Math.PI / 2;
  return {
    model: t.ext ? (t.ext.placeholder ? 'platzhalter' : t.ext.root.name || 'panzer_fahrzeug') : null, deck: deck?.y ?? null,
    dz: t.pos.z - z0, dw: w.center.z - wz0, ground: p.ground?.mover?.vehicle?.spec?.id ?? null, py: p.pos.y,
  };
});
check(`Panzer: Modell panzer_fahrzeug (${r.model}), Deck begehbar bei y ${r.deck}`, !!r.model && r.model !== 'platzhalter' && near(r.deck, 2, 1e-6));
check(`Panzer mit speed 'scroll' fährt genau mit dem Fenster (${r.dz.toFixed(3)} = ${r.dw.toFixed(3)}), trägt die Figur (${r.ground})`, near(r.dz, r.dw, 1e-6) && r.ground === 'panzer' && near(r.py, 2, 0.02));
await SHOT('scroll_tank', () => { window.__course.step(30); });

// ====================================================================== Prüfungs-Haus 0-5
console.log('\nPrüfungs-Haus 0-5 „Prüfstube“');
await load('0-5', { fresh: true });
r = await sc(() => {
  const c = window.__course, a0 = __t.arch(), p = c.player;
  const frozen = p.mode === 'script';
  let n = 0;
  while (__t.arch().phase !== 'play' && n < 200) { c.step(1); n++; }
  const t0 = __t.arch().time;
  c.step(120);
  const a = __t.arch();
  const ui = window.__game.scene.getScene('CourseUI');
  ui.refresh(false);
  return { a0, frozen, fadeSteps: n, t0, a, hudTime: ui.houseTime?.text, hudRoom: ui.houseRoom?.text, clockHidden: !ui.timeText.visible, nStars: ui.nStars, fadeAlpha: ui.houseFade?.alpha, stars: c.level.runtime.stars.length, p: p.info() };
});
check('Haus startet im ersten Raum (Raum 1/3, Ziel defeatAll, 2 Gegner)', r.a0.room === 0 && r.a0.rooms === 3 && r.a0.goal === 'defeatAll' && r.a0.left === 2);
check(`Überblendung herein, Figur so lange eingefroren (${r.fadeSteps} Schritte)`, r.frozen && r.fadeSteps > 10 && r.fadeSteps < 60 && r.fadeAlpha === 0);
check(`Countdown: 10 s → nach 1 s ${r.a.time.toFixed(3)}`, near(r.t0, 10, 1e-6) && near(r.a.time, 9, 0.01));
check(`HUD: großer Raum-Timer „${r.hudTime}“, „${r.hudRoom}“, Level-Uhr aus, 3 Stern-Plätze`, r.hudTime === '9' && r.hudRoom === 'Raum 1/3' && r.clockHidden && r.nStars === 3 && r.stars === 3);
check('Gesamtzeit-Limit ruht (Laufzeit-Uhr 9999)', await sc(() => window.__course.level.runtime.timeLeft > 9000));

await SHOT('house_r1', null);

// Raum 1: beide Pilzlinge besiegen (draufspringen)
r = await sc(() => {
  const c = window.__course, p = c.player;
  const stomp = (e) => {
    const top = e.pos.y + e.half.y * 2;
    __t.place([e.pos.x, top + 1.0, e.pos.z], { invuln: 999 });
    for (let i = 0; i < 120; i++) { c.setInput({}); c.step(1); if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; } if (e.defeated) break; }
    return e.defeated;
  };
  const ok1 = stomp(__t.ent('p1'));
  const mid = __t.arch();
  const ok2 = stomp(__t.ent('p2'));
  const a = __t.arch();
  return { ok1, ok2, mid, a };
});
check(`Raum 1: Gegner besiegt (level.onEnemyDefeated: noch ${r.mid.left} → ${r.a.left})`, r.ok1 && r.ok2 && r.mid.left === 1);
check(`Ziel erfüllt → Phase clear, Timer steht (${r.a.time.toFixed(2)} s übrig)`, r.a.phase === 'clear' && r.a.time > 0);
r = await sc(() => {
  const c = window.__course;
  const t = __t.arch().time;
  c.step(30);
  const mid = __t.arch();
  c.step(90);
  return { t, mid, a: __t.arch(), clear: __t.sfxCount('room_clear'), stars: c.level.runtime.stars.slice(), p: c.player.info() };
});
check(`Stern erscheint und fliegt zur Figur, zählt danach (Sterne ${r.stars.map(Number).join('')})`, r.mid.flying && r.stars[0] && !r.stars[1] && near(r.a.time, r.t, 1e-6));
check(`sfx('room_clear') gespielt (${r.clear}×), Siegespose`, r.clear === 1 && r.p.state === 'victory');
await SHOT('house_clear', null);

// Wechsel in Raum 2 (Überblendung)
r = await sc(() => {
  const c = window.__course, p = c.player;
  const ui = window.__game.scene.getScene('CourseUI');
  let maxFade = 0, n = 0, sawFadeout = false;
  while (!(__t.arch().room === 1 && __t.arch().phase === 'play') && n < 1000) {
    c.step(1); n++;
    const a = __t.arch();
    if (a.phase === 'fadeout') sawFadeout = true;
    maxFade = Math.max(maxFade, a.fade);
  }
  ui.refresh(false);
  const cam = __t.cam(20, 0.05);
  return { n, maxFade, sawFadeout, a: __t.arch(), p: p.info(), cam, hudRoom: ui.houseRoom.text, hudTime: ui.houseTime.text };
});
check(`Raumwechsel mit Überblendung (fade bis ${r.maxFade}, ${(r.n / 120).toFixed(2)} s)`, r.sawFadeout && r.maxFade === 1 && r.a.room === 1 && r.a.fade === 0);
check(`Figur im Raum 2 am Start, volle Zeit (${r.a.time}), HUD „${r.hudRoom}“ „${r.hudTime}“`, near(r.p.x, 40, 0.3) && near(r.a.time, 10, 1e-6) && r.hudRoom === 'Raum 2/3' && r.hudTime === '10');
check(`Kamera je Raum (area): Blick auf Raum 2 (Ziel x ${r.cam.target[0]}, pitch ${r.cam.pitch})`, near(r.cam.target[0], 40, 1.5) && near(r.cam.pitch, 52, 0.01));

// Raum 2: alle Münzen (roomId) einsammeln
r = await sc(() => {
  const c = window.__course;
  const coins = c.level.entities.filter((e) => e.kind === 'coin' && e.spec.roomId === 'r2' && !e.removed);
  const n0 = coins.length, left0 = __t.arch().left;
  for (const e of coins) { __t.place([e.pos.x, e.pos.y - 0.3, e.pos.z], { invuln: 999 }); c.step(2); }
  const a = __t.arch();
  c.step(140);
  return { n0, left0, a, stars: c.level.runtime.stars.slice() };
});
check(`Raum 2: Sammelziel über Münzen mit roomId (${r.n0} Münzen, noch ${r.left0} → ${r.a.left})`, r.n0 === 8 && r.left0 === 8 && r.a.left === 0 && r.a.phase === 'clear');
check('Stern 2 gezählt', r.stars[0] && r.stars[1] && !r.stars[2]);

// Raum 3: Zeit läuft ab → Haus verlassen mit 2 von 3 Sternen
r = await sc(() => {
  const c = window.__course;
  let n = 0;
  while (!(__t.arch().room === 2 && __t.arch().phase === 'play') && n < 1000) { c.step(1); n++; }
  window.__sfx.length = 0;
  const ticksAt = [];
  let m = 0;
  while (__t.arch().phase === 'play' && m < 1400) { const k = __t.sfxCount('house_tick'); c.step(1); m++; if (__t.sfxCount('house_tick') > k) ticksAt.push(+__t.arch().time.toFixed(3)); }
  const a = __t.arch();
  let q = 0;
  while (!c.finished && q < 600) { c.step(1); q++; }
  return { ticksAt, a, timeup: __t.sfxCount('timewarn'), finished: c.finished, result: c.lastResult, after: __t.arch(), save: __t.save().levels?.['0-5'] ?? null };
});
check(`letzte 3 s: sfx('house_tick') bei ${r.ticksAt.join(' / ')} s`, r.ticksAt.length === 3 && near(r.ticksAt[0], 3, 0.01) && near(r.ticksAt[2], 1, 0.01));
check(`Zeit abgelaufen → Phase timeout (${r.a.phase}, sfx timewarn ${r.timeup}×), danach Haus verlassen`, r.a.phase === 'timeout' && r.finished && r.after.exited && r.after.timeouts === 1 && r.timeup === 1);
check(`Teilergebnis: 2 von 3 Sternen (${(r.result?.stars ?? []).map(Number).join('')})`, r.result && r.result.stars.filter(Boolean).length === 2 && r.result.stars.length === 3);
check(`Ergebnis gespeichert (Sterne ${(r.save?.stars ?? []).map(Number).join('')})`, !!r.save && r.save.stars[0] && r.save.stars[1] && !r.save.stars[2]);
await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
r = await sc(() => {
  const res = window.__game.scene.getScene('CourseResult');
  return { active: window.__game.scene.isActive('CourseResult'), texts: res.children.list.filter((o) => o.type === 'Text' || o.text !== undefined).map((o) => o.text).filter(Boolean) };
});
check(`Ergebnis-Szene „Prüfungs-Haus: 2 von 3 Sternen“ (${r.texts.filter((t) => /Haus|Stern/.test(t)).join(' | ')})`, r.active && r.texts.includes('Prüfungs-Haus: 2 von 3 Sternen') && r.texts.includes('Haus verlassen'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}ca2_house_result_partial.png` });

// --- Zweiter Durchgang: Tod setzt den Raum zurück, fail 'retry', alle drei Räume → 3 von 3
await load('0-5', { hero: 'greta' });
r = await sc(() => {
  const c = window.__course, p = c.player;
  while (__t.arch().phase !== 'play') c.step(1);
  c.step(120 * 2);
  // einen Pilzling besiegen, dann sterben
  const e = __t.ent('p1');
  __t.place([e.pos.x, e.pos.y + 2, e.pos.z], { invuln: 999 });
  for (let i = 0; i < 120 && !e.defeated; i++) { c.step(1); if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; } }
  const before = __t.arch();
  p.invuln = 0;
  p.die('hit');
  let n = 0;
  while (p.dead && n < 600) { c.step(1); n++; }
  const a = __t.arch();
  return { before, a, p: p.info(), alive: c.level.entities.filter((x) => x.kind === 'pilzling' && !x.removed && !x.defeated).length, lives: c.level.runtime.lives };
});
check(`Tod im Raum: Raum von vorn (Gegner wieder ${r.alive}, noch ${r.a.left}, Zeit ${r.a.time}, resets ${r.a.resets})`, r.before.left === 1 && r.a.left === 2 && r.alive === 2 && near(r.a.time, 10, 1e-6) && r.a.resets === 1 && near(r.p.x, 0, 0.3) && near(r.p.z, 4.5, 0.3));
r = await sc(() => {
  const c = window.__course, p = c.player;
  c.arch.cfg.fail = 'retry';
  const until = (f, max) => { let n = 0; while (!f() && n < max) { c.step(1); n++; } return n; };
  until(() => __t.arch().phase === 'play', 300);
  p.invuln = 1e9;                                     // Pilzlinge sollen hier nicht stören
  until(() => __t.arch().phase === 'timeout', 2000);
  until(() => __t.arch().phase === 'fadeout', 400);
  until(() => __t.arch().phase === 'play', 400);
  p.invuln = 0;
  return { a: __t.arch(), finished: c.finished };
});
check(`fail 'retry': Zeit um → derselbe Raum von vorn (Raum ${r.a.room + 1}, resets ${r.a.resets}, Zeit ${r.a.time})`, r.a.room === 0 && r.a.resets === 2 && r.a.timeouts === 1 && !r.finished && near(r.a.time, 10, 1e-6));
r = await sc(() => {
  const c = window.__course, p = c.player;
  c.arch.cfg.fail = 'exit';
  const stomp = (e) => {
    __t.place([e.pos.x, e.pos.y + 2, e.pos.z], { invuln: 999 });
    for (let i = 0; i < 120 && !e.defeated; i++) { c.step(1); if (p.mode === 'air' && p.vel.y <= 0) { p.pos.x = e.pos.x; p.pos.z = e.pos.z; } }
  };
  for (const e of c.level.entities.filter((x) => x.kind === 'pilzling' && !x.removed && !x.defeated)) stomp(e);
  const wait = (room) => { let n = 0; while (!(__t.arch().room === room && __t.arch().phase === 'play') && n < 1200) { c.step(1); n++; } };
  wait(1);
  for (const e of c.level.entities.filter((x) => x.kind === 'coin' && x.spec.roomId === 'r2' && !x.removed)) { __t.place([e.pos.x, e.pos.y - 0.3, e.pos.z], { invuln: 999 }); c.step(2); }
  wait(2);
  // Raum 3: zwei Stufen hinauf zum Stern auf dem Podest (Stufe 1: z 0 … 2,4, Oberkante 2,2; Podest: z −3,7 … −0,7,
  // Oberkante 3,4; Stern bei z −2,2, y 4,3) – laufen und an den Kanten springen
  const p0 = p.info();
  let hold = 0, jumps = 0, k = 0;
  while (__t.arch().phase === 'play' && k < 900) {
    const ground = p.mode === 'ground';
    if (hold > 0) hold--;
    else if (ground && ((p.pos.y < 1.5 && p.pos.z < 3.4) || (p.pos.y > 2 && p.pos.y < 2.6 && p.pos.z < 0.6))) { hold = 24; jumps++; }
    const fwd = p.pos.z > -2.0 ? 1 : 0;
    c.setInput({ y: fwd, jump: hold > 0 });
    c.step(1); k++;
  }
  c.setInput({});
  const a3 = __t.arch(), p3 = p.info();
  let q = 0;
  while (!c.finished && q < 1200) { c.step(1); q++; }
  return { p0, a3, p3, jumps, p: p.info(), finished: c.finished, result: c.lastResult, save: __t.save().levels?.['0-5'] ?? null, a: __t.arch() };
});
check(`Raum 3 (reach): Stern auf dem Podest erreicht (Phase ${r.a3.phase}, Figur y ${r.p3.y}, ${r.jumps} Sprünge)`, r.a3.phase === 'clear' && r.p3.y > 2.6 && r.p3.z < -0.4);
check(`alle Räume → Ergebnis 3 von 3 (${(r.result?.stars ?? []).map(Number).join('')}), gespeichert`, r.finished && r.result?.stars.filter(Boolean).length === 3 && r.save?.stars?.filter(Boolean).length === 3 && !r.a.exited);
await page.waitForFunction(() => window.__game.scene.isActive('CourseResult'), null, { timeout: 10000 }).catch(() => {});
r = await sc(() => window.__game.scene.getScene('CourseResult').children.list.map((o) => o.text).filter(Boolean));
check(`Ergebnis-Szene: „Geschafft!“ und „3 von 3 Sternen“`, r.includes('Geschafft!') && r.includes('Prüfungs-Haus: 3 von 3 Sternen'));
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}ca2_house_result_full.png` });

// Tod während des Jubels (Raum schon geschafft): Stern zählt, weiter im nächsten Raum, kein doppeltes Zählen
await load('0-5');
r = await sc(() => {
  const c = window.__course, p = c.player;
  while (__t.arch().phase !== 'play') c.step(1);
  c.arch.clear(c.arch.room);
  c.step(10);
  p.mode = 'air'; p.script = null;
  p.die('fall');
  let n = 0;
  while (p.dead && n < 600) { c.step(1); n++; }
  c.step(2);
  return { a: __t.arch(), stars: c.level.runtime.stars.slice(), lives: c.level.runtime.lives };
});
check(`Tod im Jubel: Stern gezählt, weiter in Raum ${r.a.room + 1} (geschafft ${r.a.cleared}, resets ${r.a.resets})`, r.stars[0] && r.a.room === 1 && r.a.cleared === 1 && r.a.resets === 0);

// Spiegelfrucht-Klon reist mit in den nächsten Raum (eingefroren während der Überblendung, danach frei)
await load('0-5');
r = await sc(() => {
  const c = window.__course, L = c.level;
  while (__t.arch().phase !== 'play') c.step(1);
  const clone = c.addClone();
  if (!clone) return { clone: false };
  c.step(20);
  c.arch.clear(c.arch.room);
  let n = 0;
  while (!(__t.arch().room === 1 && __t.arch().phase === 'fadein') && n < 900) { c.step(1); n++; }
  const inFade = { figs: L.players.length, frozen: L.players.every((f) => f.mode === 'script'), dist: Math.hypot(clone.pos.x - c.player.pos.x, clone.pos.z - c.player.pos.z), cx: clone.pos.x };
  let m = 0;
  while (__t.arch().phase !== 'play' && m < 300) { c.step(1); m++; }
  c.step(30);
  return { clone: true, inFade, free: L.players.every((f) => f.mode !== 'script'), figs: L.players.length };
});
check(`Klon reist mit in Raum 2 (${r.inFade?.figs} Figuren, Abstand ${r.inFade?.dist?.toFixed(2)} m, x ${r.inFade?.cx?.toFixed(1)}), eingefroren, danach frei`,
  r.clone && r.inFade.figs === 2 && r.inFade.frozen && r.inFade.dist < 1.5 && near(r.inFade.cx, 40, 1.5) && r.free && r.figs === 2);

// Bilder Haus: Raum 2 und 3, Überblendung
await load('0-5');
await SHOT('house_fade', () => {
  const c = window.__course;
  while (__t.arch().phase !== 'play') c.step(1);
  c.arch.clear(c.arch.room);
  let n = 0;
  while (__t.arch().phase !== 'fadeout' && n < 600) { c.step(1); n++; }
  c.step(24);
});
await SHOT('house_r2', () => {
  const c = window.__course;
  let n = 0;
  while (!(__t.arch().room === 1 && __t.arch().phase === 'play') && n < 600) { c.step(1); n++; }
  c.step(60);
});
await SHOT('house_r3', () => {
  const c = window.__course;
  c.arch.clear(c.arch.room);
  let n = 0;
  while (!(__t.arch().room === 2 && __t.arch().phase === 'play') && n < 900) { c.step(1); n++; }
  c.step(120 * 7.5);
});

console.log('\nKennzahlen (Zeichenaufrufe / Dreiecke):');
for (const [n, calls, tris] of stats) console.log(`  ${n.padEnd(18)} ${String(calls).padStart(4)} / ${(tris / 1000).toFixed(0)} k`);
check('Budget: < 120 Zeichenaufrufe, < 300 k Dreiecke', stats.every(([, calls, tris]) => calls < 120 && tris < 300000));

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
