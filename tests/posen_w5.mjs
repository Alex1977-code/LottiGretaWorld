// Welt-5-Posen der Heldinnen im Kurs (Strandwerkstatt 0-17, CourseScene mit HeroRig und echtem Motor): 'trapeze' (hängt am
// Trapez, Hände an der Stange, Beine laufen dem Schwung nach) und 'cannon' (Flug aus der Röhrenkanone, gestreckt in
// Flugrichtung, am Ende Landepose). Vertrag: docs/KURS-ARCHITEKTUR.md „Präzisierung (Motor und Bausteine Welt 5): Avatar-Zustände“.
//
// Ablauf je Heldin (Lotti, Greta): deterministisch über window.__course.step und setInput unter das Trapez t1 springen
// (greift), aufschaukeln, Phasen Umkehrpunkt vorn/hinten und Durchschwung, Absprung (Überblendung in den Sprung); dann in
// die Röhrenkanone springen und den Flug in mehreren Phasen aufnehmen. Der Avatar (HeroRig.update) läuft dabei im Takt der
// Simulation (je Schritt 1/120 s), nicht im Echtzeit-Takt des Browsers – Bilder und Messungen sind wiederholbar.
// Bilder tests/out/posen_w5_<heldin>_<phase>_<seite|kurs>.png (Nahansicht seitlich, Kurs-Kamera), Übersichtsbögen
// tests/out/posen_w5_sheet_<heldin>.png.
// Prüfungen: Pose-Zustand (Blender) 'trapeze' / 'cannon', Hände an der Stange (Abstand der Fäuste zur Stangenachse des
// Modells), Beine laufen nach (Füße hinter der Körperachse im Durchschwung vorwärts), Knie am Umkehrpunkt angezogen,
// Absprung blendet weich über, Körperachse im Flug entlang der Geschwindigkeit, Landepose aufrecht, Zeichenaufrufe je
// Heldin ≤ Rückfall-Pose (idle an derselben Stelle) und ≤ 11 (Figur-Bündel greift), klein, Krallen-Anzug, Riesentrank
// (hält die Stange vor dem Bauch), keine Konsolenfehler. P5_DEBUG=1: Bündel-Zustand und Gretas Haar-Richtung ausgeben.
// Aufruf: npm run build && PORT_BASE=0 node tests/posen_w5.mjs   (Port 4360; P5_SHOTS=0 ohne Bilder, P5_HEROES=lotti,greta,
// P5_PARTS=trapeze,cannon,extra)
import { readFileSync } from 'node:fs';
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4360;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SHOTS = process.env.P5_SHOTS !== '0';
const HEROES = (process.env.P5_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const PARTS = (process.env.P5_PARTS ?? 'trapeze,cannon,extra').split(',').filter(Boolean);
const on = (p) => PARTS.includes(p);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

await page.goto(`http://localhost:${port}/?course=0-17&scale=2&adapt=0${process.env.P5_DEBUG ? "&p5debug=1" : ""}`, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
} catch {
  console.log('Strandwerkstatt startet nicht. Konsole:');
  for (const x of errors) console.log('  ', x);
  stop(); process.exit(1);
}
await page.waitForTimeout(400);

// ---------------------------------------------------------------- Prüfstand im Browser
await sc(() => {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
  const V3 = c.view.camera.position.constructor;
  const V = (x = 0, y = 0, z = 0) => new V3(x, y, z);
  const H = window.__p5 = { V, t: c.view.time, cam: null, drive: false, debug: new URLSearchParams(location.search).has('p5debug') };
  // Avatar im Takt der Simulation: die Echtzeit-Zeichenschleife ruft HeroRig.update weiter auf, das wirkt aber nur, wenn
  // der Prüfstand es freigibt (H.drive) – je Simulationsschritt genau ein Avatar-Bild mit dt = 1/120 s
  // (In der Strandwerkstatt ist c.rig ein RideRig – zu Fuß zeichnet dessen footRig, ein normaler HeroRig, die Heldin.)
  const rig = c.rig, upd = Object.getPrototypeOf(rig).update;
  rig.update = function (dt, t) { if (H.drive) upd.call(this, dt, t); };
  H.hr = () => rig.footRig ?? rig;
  H.tick = (n = 1) => {
    for (let i = 0; i < n; i++) {
      c.step(1);
      H.t += 1 / 120;
      H.drive = true; rig.update(1 / 120, H.t); H.drive = false;
    }
  };
  const P = () => c.player, L = () => c.level;
  H.place = (pos, o = {}) => {
    const p = P();
    c.setInput(null); c.setInput({});
    c.squad?.clear?.();
    p.dead = false; p.hidden = false;
    p.big = o.big ?? true;
    p.power = 'none'; p.powerTime = 0;
    p.reset(pos, o.yaw ?? Math.PI / 2);
    p.skidTurnTime = 0;
    if (o.power) p.setPower(o.power);
    p.invuln = 0;
    p.updateHalf();
    L().runtime.status = 'play';
    L().runtime.save.lives = 99;
    L().controlYaw = c.view.rig.controlYaw(p.pos);
    c.view.rig.snap(p);
    H.tick(o.settle ?? 30);
    return p.info();
  };
  H.play = (segs) => { for (const [inp, n] of segs) { c.setInput(inp); H.tick(n); } c.setInput({}); };
  /** Läuft, bis cond() gilt (höchstens max Schritte); → Zahl der Schritte bzw. −1. */
  H.until = (cond, max = 1200, inp = null) => { if (inp) c.setInput(inp); for (let i = 0; i < max; i++) { if (cond()) return i; H.tick(1); } return -1; };
  // Kamera: 'side' = seitlich zur Blickrichtung der Figur (rechte Seite), Ziel = Körpermitte; 'course' = Kameraschiene des Levels
  c.view.rig.custom = () => {
    const k = H.cam;
    if (!k || k.mode === 'course') return false;
    const cam = c.view.camera, p = P();
    let tg = H.center();
    if (k.rope) {
      // Trapez: Ziel auf der Seilachse zwischen Fußpunkt und Stange (Hülle geneigt)
      const hull = H.hr().hull; hull.updateWorldMatrix(true, false);
      const e = hull.matrixWorld.elements, up = V(e[4], e[5], e[6]).normalize();
      tg = hull.position.clone().addScaledVector(up, 0.75);
    }
    const az = H.hr().hull.rotation.y + Math.PI / 2 + (k.rel ?? -Math.PI / 2);
    const d = (k.dist ?? 3.2) * Math.max(1, H.hr().hull.scale.y * 1.5), el = k.el ?? 0.08;
    cam.position.set(tg.x + d * Math.cos(el) * Math.sin(az), tg.y + d * Math.sin(el), tg.z + d * Math.cos(el) * Math.cos(az));
    cam.lookAt(tg);
    const fov = k.fov ?? 34;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    c.view.rig.target.copy(tg);
    void p;
    return true;
  };
  /** Körpermitte der Figur (Welt): Becken des Avatars. */
  H.center = () => { const av = H.hr().avatar; av.root.updateWorldMatrix(true, true); const w = V(); av.pelvis.getWorldPosition(w); const h = V(); av.head.getWorldPosition(h); return w.lerp(h, 0.35); };
  H.screen = () => { const v = H.center(); v.project(c.view.camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; };
  H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
  // Zeichenaufrufe/Dreiecke der Heldin: Differenz zweier Bilder (Hülle sichtbar/unsichtbar, inkl. Schattenpass und Bündel)
  const grab = () => { c.renderFrame(); const r = c.view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
  H.cost = () => {
    const hull = H.hr().hull, cam0 = H.cam;
    H.cam = { mode: 'side', dist: 3.4, el: 0.06, fov: 34 };   // gleiche Kamera für Pose und Rückfall (ganze Figur im Bild)
    grab(); const a = grab();
    hull.visible = false; grab(); const b = grab();
    hull.visible = true; grab();
    H.cam = cam0;
    const r = { calls: a.calls - b.calls, tris: a.tris - b.tris };
    if (H.debug) {
      // Figur-Bündel der Heldin (view/ShadowProxy.js): Gruppen, gebündelte Teile, Maßstab der Hülle
      const bu = c.view.proxies.bundles.find((x) => x.root === hull);
      const sc = hull.scale;
      r.bundle = bu ? bu.groups.map((g) => `${g.parts.length}:${g.on.filter(Boolean).length}${g.any ? '' : '!'}`).join(' ') : 'keins';
      r.hullScale = [sc.x, sc.y, sc.z].map((v) => +(v * 1.5).toFixed(6));
    }
    return r;
  };
  /** Rückfall-Vergleich: dieselbe Stelle, Avatar für n Bilder im Zustand 'idle' (so sah die Figur vorher aus), dann zurück. */
  H.costIdle = (n = 40) => {
    const av = H.hr().avatar, keep = av.obj.course;
    const saved = { ...keep };
    for (let i = 0; i < n; i++) { av.obj.course = { ...saved, state: 'idle' }; av.animate(1 / 60, H.t + i / 60); if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004; }
    const r = H.cost();
    av.obj.course = keep;
    for (let i = 0; i < 30; i++) { av.animate(1 / 120, H.t); }   // Pose wieder einschwingen (Bild danach wie vorher)
    return r;
  };
  /** Trapez-Modell: Stangenmitte (Welt, mit Durchbiegung) und Stangenrichtung. */
  H.bar = (tr) => {
    // Modell-Lage aus der Simulation (Schwingwinkel) übernehmen: Bild-Funktion des Trapezes (view.add) aufrufen
    for (const f of c.view.frameFns) if (f.obj === tr.root) f.fn(0, c.view.time);
    const swing = tr.root.children[0];
    let m = null;
    swing.traverse((o) => { if (!m && o.isMesh) m = o; });
    m.updateWorldMatrix(true, false);
    const c0 = m.localToWorld(V(0, -tr.L, 0)), c1 = m.localToWorld(V(1, -tr.L, 0));
    return { c: c0, ax: c1.sub(c0).normalize() };
  };
  /** Fäuste ↔ Stangenachse (m): senkrechter Abstand und Lage entlang der Stange je Hand. */
  H.hands = (tr) => {
    const av = H.hr().avatar, b = H.bar(tr);
    av.root.updateWorldMatrix(true, true);
    return [av.armN, av.armF].map((sh) => {
      const w = V(); sh.carm.hand.getWorldPosition(w);
      const d = w.sub(b.c), along = d.dot(b.ax);
      const perp = d.addScaledVector(b.ax, -along).length();
      return { perp: +perp.toFixed(3), along: +along.toFixed(3) };
    });
  };
  /** Lage der Figur (Welt): Becken, Kopf, Fußknöchel, Körperachse (Becken → Kopf) und Blickrichtung der Hülle. */
  H.body = () => {
    const av = H.hr().avatar, r = H.hr();
    av.root.updateWorldMatrix(true, true);
    const pel = V(), head = V(), an = V(), af = V();
    av.pelvis.getWorldPosition(pel); av.head.getWorldPosition(head); av.legN.ankle.getWorldPosition(an); av.legF.ankle.getWorldPosition(af);
    const axis = head.clone().sub(pel).normalize();
    const e = r.hull.matrixWorld.elements, fwd = V(e[0], e[1], e[2]).normalize();
    const feet = an.clone().add(af).multiplyScalar(0.5);
    return { pel, head, feet, axis, fwd };
  };
  H.info = () => {
    const av = H.hr().avatar, cur = av.blender.cur, p = P(), k = H.hr().proxy.course;
    const r = (v) => +(+v).toFixed(3);
    return { state: p.state, mode: p.mode, course: k.state, label: av.blender.state, blendT: r(av.blender.t), phase: r(k.phase ?? 0), swing: r(k.swing ?? 0), swingVel: r(k.swingVel ?? 0),
      speed: r(k.speed ?? 0), vy: r(k.vy ?? 0), kneeN: r(cur.kneeN), kneeF: r(cur.kneeF), thighZn: r(cur.thighZn), pitch: r(cur.pitch), hidden: p.hidden, hero: av.variant,
      ...(H.debug && av.maneChain ? (() => { const q = av.torso.getWorldQuaternion(new av.torso.quaternion.constructor()).invert(); const d = av.maneChain.dirs[0].clone().applyQuaternion(q); return { mane: [r(d.x), r(d.y), r(d.z)], maneW: av.maneChain.dirs[0].toArray().map(r) }; })() : {}) };
  };
});

const shotList = [];
async function shots(hero, name, views = ['side', 'course']) {
  if (!SHOTS) return;
  for (const v of views) {
    if (v === 'side') await sc((rope) => { window.__p5.cam = { mode: 'side', rel: -Math.PI / 2 + 0.5, dist: rope ? 4.2 : 3.4, el: 0.06, fov: 34, rope }; }, name.match(/^([1-6]|x)_/) !== null);
    else if (v === 'front') await sc(() => { window.__p5.cam = { mode: 'side', rel: -0.5, dist: 3.0, el: 0.12, fov: 34 }; });
    else await sc(() => { window.__p5.cam = { mode: 'course' }; window.__course.view.rig.snap(window.__course.player); });
    await sc(() => window.__p5.frames(3));
    const p = await sc(() => window.__p5.screen());
    const w = v === 'course' ? 240 : 300, h = v === 'course' ? 180 : 340;
    const clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
    const tag = v === 'side' ? 'seite' : v === 'front' ? 'vorn' : 'kurs';
    const path = `${OUT}posen_w5_${hero}_${name}_${tag}.png`;
    try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name: `${hero} ${name} ${tag}`, path, group: hero }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
  }
  await sc(() => { window.__p5.cam = null; });
}
const S = (fn, arg) => sc(fn, arg);
const info = () => S(() => window.__p5.info());

// ---------------------------------------------------------------- Trapez
async function trapeze(hero) {
  const out = {};
  // unter die Stange von t1 springen → greift
  await S(() => {
    const H = window.__p5, c = window.__course, tr = c.level.named.get('t1');
    const b = tr.bar({});
    H.place([b.x, b.y - 1.21 - 0.15, b.z + 0.1], { settle: 0 });
    c.player.vel.y = 2;
    H.tick(3);
  });
  out.grab = await info();
  await S(() => window.__p5.tick(5));
  out.grabMid = await info();
  await shots(hero, '1_greifen');
  await S(() => window.__p5.tick(40));
  out.hang = await info();
  out.hangHands = await S(() => window.__p5.hands(window.__course.level.named.get('t1')));
  // Aufschaukeln (Stick nach vorn), dann Phasen: Umkehrpunkt vorn, Durchschwung vorwärts, Umkehrpunkt hinten
  await S(() => window.__p5.play([[{ y: 1 }, 240]]));
  const phase = async (name, cond) => {
    const n = await S((cs) => { const H = window.__p5, tr = window.__course.level.named.get('t1'); const f = new Function('tr', `return ${cs};`); return H.until(() => f(tr), 900); }, cond);
    const r = { n, ...(await info()), hands: await S(() => window.__p5.hands(window.__course.level.named.get('t1'))) };
    r.legs = await S(() => {
      const H = window.__p5, b = H.body();
      // Füße relativ zur Körperachse: + = vor der Achse (Blickrichtung), − = dahinter
      const rel = b.feet.clone().sub(b.pel), along = rel.dot(b.axis);
      const perp = rel.addScaledVector(b.axis, -along);
      return { feetFwd: +perp.dot(b.fwd).toFixed(3) };
    });
    await shots(hero, name);
    return r;
  };
  out.front = await phase('2_vorn', 'tr.omega <= 0 && tr.theta > 0.3');
  out.down = await phase('3_durchschwung', 'tr.omega < -1 && Math.abs(tr.theta) < 0.06');
  out.back = await phase('4_hinten', 'tr.omega >= 0 && tr.theta < -0.3');
  out.fwd = await phase('5_vorwaerts', 'tr.omega > 1 && Math.abs(tr.theta) < 0.06');
  // Kosten: Trapez-Pose gegen die Rückfall-Pose (idle) an derselben Stelle
  out.cost = await S(() => window.__p5.cost());
  out.costIdle = await S(() => window.__p5.costIdle());
  await S(() => window.__p5.tick(30));
  // Absprung auf dem Weg nach vorn (20–35°) → Überblendung in den Sprung
  await S(() => { const H = window.__p5, tr = window.__course.level.named.get('t1'); H.until(() => tr.omega > 0 && tr.theta > 0.35 && tr.theta < 0.6, 900, {}); window.__course.setInput({ jump: true }); });
  await S(() => window.__p5.tick(4));
  out.rel1 = await info();
  await shots(hero, '6_absprung');
  await S(() => window.__p5.tick(12));
  out.rel2 = await info();
  await shots(hero, '7_absprung2', ['side']);
  await S(() => { window.__p5.tick(24); window.__course.setInput({}); });
  out.rel3 = await info();
  await shots(hero, '8_absprung3', ['side']);
  await S(() => window.__p5.tick(240));
  return out;
}

// ---------------------------------------------------------------- Röhrenkanone
async function cannon(hero) {
  const out = { phases: [] };
  await S(() => window.__p5.place([0, 4.6, -122.5], { settle: 0 }));
  const n0 = await S(() => window.__p5.until(() => window.__course.player.state === 'cannon', 600));
  out.start = n0;
  for (const [name, ph] of [['1_start', 0.08], ['2_steigen', 0.3], ['3_scheitel', 0.5], ['4_sinken', 0.72], ['5_landen', 0.86], ['6_aufsetzen', 0.96]]) {
    await S((x) => window.__p5.until(() => (window.__course.player.phase ?? 0) >= x || window.__course.player.state !== 'cannon', 600), ph);
    const r = { name, ...(await info()) };
    r.align = await S(() => {
      const H = window.__p5, b = H.body(), p = window.__course.player;
      const v = H.V(p.vel.x, p.vel.y, p.vel.z).normalize();
      return { vel: +(Math.acos(Math.max(-1, Math.min(1, b.axis.dot(v)))) * 180 / Math.PI).toFixed(1), up: +(Math.acos(Math.max(-1, Math.min(1, b.axis.y))) * 180 / Math.PI).toFixed(1) };
    });
    out.phases.push(r);
    await shots(hero, `k${name}`);
    if (name === '3_scheitel') { out.cost = await S(() => window.__p5.cost()); out.costIdle = await S(() => window.__p5.costIdle()); }
  }
  await S(() => window.__p5.until(() => window.__course.player.mode === 'ground', 600));
  await S(() => window.__p5.tick(30));
  out.end = await info();
  return out;
}

// ---------------------------------------------------------------- Klein, Kostüm, Riesentrank (kurz: hängen, Umkehrpunkt vorn)
async function trapezeQuick(hero, tag, o) {
  await S(([o]) => {
    const H = window.__p5, c = window.__course, tr = c.level.named.get('t1');
    const b = tr.bar({});
    const reach = (o.big === false ? 0.65 : 0.95) + 0.26;
    H.place([b.x, b.y - reach - 0.15, b.z + 0.1], { settle: 0, big: o.big, power: o.power });
    c.player.vel.y = 2;
    H.tick(3);
    H.tick(60);
    H.play([[{ y: 1 }, 120]]);
    H.until(() => tr.omega <= 0 && tr.theta > 0.3, 900);
  }, [o]);
  const r = { ...(await info()), hands: await S(() => window.__p5.hands(window.__course.level.named.get('t1'))) };
  r.cost = await S(() => window.__p5.cost());
  await shots(hero, `x_${tag}`);
  await S(() => { const H = window.__p5; H.play([[{ crouch: true }, 2], [{}, 200]]); });
  return r;
}

// ---------------------------------------------------------------- Läufe
const results = {};
for (const hero of HEROES) {
  await S((h) => { const c = window.__course; c.setHero(h); window.__p5.tick(2); }, hero);
  console.log(`\n${hero}`);
  const r = results[hero] = {};
  if (on('trapeze')) {
    r.tr = await trapeze(hero);
    const t = r.tr;
    console.log(`  Greifen: ${JSON.stringify(t.grab)}`);
    console.log(`  Hängen: ${JSON.stringify(t.hang)}; Hände ${JSON.stringify(t.hangHands)}`);
    for (const k of ['front', 'down', 'back', 'fwd']) console.log(`  ${k.padEnd(6)} ${JSON.stringify(t[k])}`);
    console.log(`  Absprung: ${JSON.stringify(t.rel1)} → ${JSON.stringify(t.rel2)} → ${JSON.stringify(t.rel3)}`);
    console.log(`  Zeichenaufrufe Trapez ${t.cost.calls} (Rückfall idle ${t.costIdle.calls}), Dreiecke ${t.cost.tris} (${t.costIdle.tris}) ${t.cost.bundle ? JSON.stringify(t.cost) : ""}`);
  }
  if (on('cannon')) {
    r.kn = await cannon(hero);
    const k = r.kn;
    for (const ph of k.phases) console.log(`  Kanone ${ph.name.padEnd(12)} ${JSON.stringify(ph)}`);
    console.log(`  Kanone Ende: ${JSON.stringify(k.end)}; Zeichenaufrufe ${k.cost?.calls} (Rückfall idle ${k.costIdle?.calls}) ${k.cost?.bundle ? JSON.stringify(k.cost) : ""}`);
  }
  if (on('extra')) {
    r.small = await trapezeQuick(hero, 'klein', { big: false });
    r.krallen = await trapezeQuick(hero, 'krallen', { power: 'krallen' });
    if (hero === 'lotti') r.riese = await trapezeQuick(hero, 'riese', { power: 'riese' });
    for (const k of ['small', 'krallen', 'riese']) if (r[k]) console.log(`  ${k.padEnd(8)} ${JSON.stringify(r[k])}`);
  }
}

// ---------------------------------------------------------------- Prüfungen
const handsOk = (hs, tol = 0.05) => Array.isArray(hs) && hs.every((h) => h.perp <= tol && Math.abs(h.along) > 0.15 && Math.abs(h.along) < 0.58);
for (const [hero, r] of Object.entries(results)) {
  const H = hero === 'lotti' ? 'Lotti' : 'Greta';
  if (r.tr) {
    const t = r.tr, ph = [t.front, t.down, t.back, t.fwd];
    check(`${H} Trapez: Pose 'trapeze' beim Hängen und in allen Phasen`, t.hang.label === 'trapeze' && ph.every((q) => q.label === 'trapeze' && q.n >= 0));
    check(`${H} Trapez: Fäuste an der Stange (≤ 5 cm von der Stangenachse, zwischen den Seilen) – Hängen ${t.hangHands.map((h) => h.perp).join('/')} m, Phasen ${ph.map((q) => Math.max(...q.hands.map((h) => h.perp)).toFixed(3)).join(' ')} m`, handsOk(t.hangHands) && ph.every((q) => handsOk(q.hands)));
    check(`${H} Trapez: Beine laufen nach (vorwärts ${t.fwd.legs.feetFwd} m, rückwärts ${t.down.legs.feetFwd} m vor der Körperachse)`, t.fwd.legs.feetFwd < -0.04 && t.down.legs.feetFwd > 0.03);
    check(`${H} Trapez: Knie am Umkehrpunkt angezogen (vorn ${t.front.kneeN}, hinten ${t.back.kneeN}), im Durchschwung gestreckt (${t.down.kneeN}/${t.fwd.kneeN})`, t.front.kneeN > 1 && t.back.kneeN > 1 && t.down.kneeN < 0.45 && t.fwd.kneeN < 0.45);
    check(`${H} Trapez: Absprung blendet weich in den Sprung (nach 0,03 s ${t.rel1.label} ${t.rel1.blendT} s, nach 0,13 s noch in der Überblendung)`, t.rel1.label === 'jump' && t.rel2.label === 'jump' && t.rel2.blendT < 0.29 && t.rel3.blendT > 0.3);
    check(`${H} Trapez: Zeichenaufrufe ${t.cost.calls} ≤ Rückfall-Pose ${t.costIdle.calls} und ≤ 11`, t.cost.calls <= t.costIdle.calls && t.cost.calls <= 11);
  }
  if (r.kn) {
    const k = r.kn, fly = k.phases.filter((q) => ['1_start', '2_steigen', '3_scheitel', '4_sinken'].includes(q.name)), last = k.phases.find((q) => q.name === '6_aufsetzen');
    check(`${H} Kanone: Pose 'cannon' im ganzen Flug`, k.phases.every((q) => q.label === 'cannon' && q.state === 'cannon'));
    check(`${H} Kanone: Körperachse entlang der Flugrichtung (${fly.map((q) => q.align.vel).join('/')}°)`, fly.every((q) => q.align.vel < 12));
    check(`${H} Kanone: Landepose am Ende aufrecht (${last?.align.up}° zur Senkrechten), sicher gelandet`, !!last && last.align.up < 25 && k.end.mode === 'ground');
    check(`${H} Kanone: Zeichenaufrufe ${k.cost?.calls} ≤ Rückfall-Pose ${k.costIdle?.calls} und ≤ 11 (Figur-Bündel greift im Flug)`, !!k.cost && k.cost.calls <= k.costIdle.calls && k.cost.calls <= 11);
  }
  if (r.small) check(`${H} klein am Trapez: Fäuste an der Stange (${r.small.hands.map((h) => h.perp).join('/')} m)`, r.small.label === 'trapeze' && handsOk(r.small.hands));
  if (r.krallen) check(`${H} Krallen-Anzug am Trapez: Fäuste an der Stange (${r.krallen.hands.map((h) => h.perp).join('/')} m)`, r.krallen.label === 'trapeze' && handsOk(r.krallen.hands));
  if (r.riese) check(`${H} Riesentrank am Trapez: Pose trapeze, Fäuste an der Stange (${r.riese.hands.map((h) => h.perp).join('/')} m)`, r.riese.label === 'trapeze' && handsOk(r.riese.hands));
}

check('Keine Konsolenfehler', errors.length === 0);
const ok = summary(errors);

// Übersichtsbögen
try {
  await page.goto('about:blank');
  await page.setViewportSize({ width: 1700, height: 400 });
  const b64 = (p) => readFileSync(p).toString('base64');
  for (const g of [...new Set(shotList.map((s) => s.group))]) {
    const list = shotList.filter((s) => s.group === g);
    const imgs = list.map((s) => `<figure><img src="data:image/png;base64,${b64(s.path)}"><figcaption>${s.name}</figcaption></figure>`).join('');
    await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;height:300px}</style></body></html>`);
    await page.screenshot({ path: `${OUT}posen_w5_sheet_${g}.png`, fullPage: true });
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
stop();
process.exit(ok ? 0 : 1);
