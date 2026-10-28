// Wurfsichel-Kostüm und Wurf-Pose der Heldinnen (Vertrag docs/KURS-ARCHITEKTUR.md „Präzisierung (Figuren Welt 7): Wurfsichel-
// Kostüm und Wurf-Pose“; Motor: „Präzisierung (Motor und Bausteine Welt 7): Power-up Wurfsichel“). Lavawerkstatt 0-26 (dort gibt
// es das Item), Vite-Entwicklungsserver wie tests/outfit_hw.mjs (Avatar-Klassen lassen sich laden: Pflaume für den Ritt).
//
// Teile (KW7_PARTS, Standard alle; Heldinnen KW7_HEROES=lotti,greta):
//   mech     echter Motor (HeroRig im Takt der Simulation, je Schritt 1/120 s): Item aufnehmen → Kostüm (Mütze, Kamm, Umhang,
//            Sichel in der Hand); Wurf: Ausholen mit Sichel in der Hand, Arm schnellt vor, Sichel verschwindet beim Abwurf, fliegt
//            (Hand leer), kommt zurück, Fang (sichelCatch) → Fang-Geste (Hand schnappt nach vorn, Augen „◡“) und Sichel wieder in
//            der Hand; Zeichenaufrufe mit Kostüm ≤ ohne + 1 (gleiche Stelle, Stand) und im Wurf; Klone (lite) mit Kostüm ohne
//            Schattenwurf, werfen je eine eigene Sichel
//   close    Nahansichten vorn/seitlich/hinten/oben, Gesicht, Kurs-Kamera; Posen (Lauf, Sprung, Fallen, Jubel, Hocke, Klettern,
//            Wurf-Phasen, Fang), klein, Halloween (Kürbis-Bommel bzw. Katzenohren an der Mütze), Trage-Helm (Mütze ruht)
//   ride     Pflaume-Ritt mit Kostüm (Umhang über Pflaumes Rücken, Sichel steckt weg, Angel in der Hand)
// Bilder tests/out/kostuem_w7_*.png, Übersichtsbögen tests/out/kostuem_w7_sheet_<gruppe>.png. Keine Konsolenfehler.
// Aufruf: PORT_BASE=0 node tests/kostuem_w7.mjs   (Port 4375 + PORT_BASE; KW7_SHOTS=0 ohne Bilder, KW7_DEBUG=1)
import { createServer } from 'vite';
import { readFileSync } from 'node:fs';
import { launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4375 + Number(process.env.PORT_BASE ?? 0);
const ROOT = new URL('..', import.meta.url).pathname;
const PARTS = (process.env.KW7_PARTS ?? 'mech,close,ride').split(',').filter(Boolean);
const HEROES = (process.env.KW7_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const SHOTS = process.env.KW7_SHOTS !== '0';
const DEBUG = !!process.env.KW7_DEBUG;
const on = (p) => PARTS.includes(p);
const f3 = (v) => (typeof v === 'number' ? v.toFixed(3) : String(v));

const server = await createServer({
  root: ROOT, cacheDir: `${OUT}.vite-kw7`, logLevel: 'warn', clearScreen: false,
  server: { port: PORT, strictPort: true, host: '127.0.0.1', hmr: false },
});
await server.listen();
const stop = async () => { try { await server.close(); } catch { /* schon zu */ } };
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const sc = (fn, arg) => page.evaluate(fn, arg);
const shotList = [];

await page.goto(`http://127.0.0.1:${PORT}/?course=0-26&scale=2&adapt=0`, { waitUntil: 'load' });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 240000 });
} catch {
  console.log('Lavawerkstatt startet nicht. Konsole:'); for (const x of errors) console.log('  ', x);
  await browser.close(); await stop(); process.exit(1);
}
await page.waitForTimeout(400);
check('Lavawerkstatt 0-26 lädt ohne Konsolenfehler', errors.length === 0);

// ---------------------------------------------------------------- Prüfstand im Browser
await sc(async () => {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  try { window.__game.scene.getScene('CourseUI').cameras.main.setVisible(false); } catch (_) { /* egal */ }
  const heroMod = await import('/src/three/avatars/hero.js');
  const THREE = await import('three');
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const H = window.__kw = { THREE, V, heroMod, t: c.view.time, cam: null, drive: false };
  const rig = c.rig, upd = Object.getPrototypeOf(rig).update;
  rig.update = function (dt, t) { if (H.drive) upd.call(this, dt, t); };
  H.rig = rig;
  H.av = () => rig.avatar;
  const P = () => c.player, L = () => c.level;
  H.marks = L().data.marks;
  /** Simulation n Schritte, je Schritt ein Avatar-Bild mit dt = 1/120 s (wie tests/posen_w6.mjs). */
  H.tick = (n = 1, each = null) => {
    for (let i = 0; i < n; i++) {
      c.step(1);
      H.t += 1 / 120;
      H.drive = true; rig.update(1 / 120, H.t); H.drive = false;
      each?.(i);
    }
  };
  H.place = (pos, o = {}) => {
    const p = P();
    c.setInput(null); c.setInput({});
    c.squad?.clear?.();
    p.dead = false; p.hidden = false;
    p.big = o.big ?? true;
    p.power = 'none'; p.powerTime = 0;
    if (p.helmet) { p.helmet = null; p.helmetFx = null; }
    p.holding = null;
    p.reset(pos, o.yaw ?? Math.PI / 2);
    p.skidTurnTime = 0;
    if (o.power) p.setPower(o.power);
    p.invuln = 0; p.fireCooldown = 0;
    p.updateHalf();
    L().runtime.status = 'play';
    L().runtime.save.lives = 99;
    L().controlYaw = c.view.rig.controlYaw(p.pos);
    c.view.rig.snap(p);
    for (const e of L().entities) if (e.kind === 'wurfsichel' && !e.removed) e.kill?.();
    H.tick(o.settle ?? 30);
    return p.info();
  };
  H.action = () => { c.setInput({ action: true }); H.tick(1); c.setInput({}); };
  H.sickles = () => L().entities.filter((e) => e.kind === 'wurfsichel' && !e.removed);
  /** Kostüm-Zustand des Avatars (Teile, Sichtbarkeit, Schatten). */
  H.parts = (av = H.av()) => {
    const S = av.sk;
    const attached = (o) => !!o && !!o.parent;
    return {
      costume: av.costume, cap: attached(S?.cap), crest: attached(S?.crest), cape: attached(S?.cape), hand: attached(S?.hand) && !!S?.hand.visible,
      capShadow: S?.cap?.castShadow ?? null, capeShadow: S?.cape?.castShadow ?? null, handShadow: S?.handMesh?.castShadow ?? null,
      hat: !!av.hw?.hat?.parent, tail: !!av.hw?.tail?.anchor.parent, label: av.blender.state, eyesClosed: av.eyesClosed.visible,
      armZn: +av.blender.cur.armZn.toFixed(3), capeA: +(S?.capeA ?? 0).toFixed(3), handScale: +(S?.hand?.scale.x ?? 0).toFixed(3),
    };
  };
  // Kamera: 'close' = um die Hülle (rel zur Blickrichtung, el, dist, fov, h = Zielhöhe in Figurhöhen), 'course' = Kameraschiene
  c.view.rig.custom = () => {
    const k = H.cam;
    if (!k || k.mode === 'course') return false;
    const cam = c.view.camera, hull = (k.hull ?? rig.hull);
    const s = hull.scale.y * 1.5;
    const tg = V(hull.position.x, hull.position.y + (k.h ?? 0.55) * s, hull.position.z);
    if (k.target) tg.set(...k.target);
    const az = hull.rotation.y + Math.PI / 2 + (k.rel ?? -0.5);
    const d = (k.dist ?? 2.6) * (0.4 + 0.6 * s), el = k.el ?? 0.12;
    cam.position.set(tg.x + d * Math.cos(el) * Math.sin(az), tg.y + d * Math.sin(el), tg.z + d * Math.cos(el) * Math.cos(az));
    cam.lookAt(tg);
    const fov = k.fov ?? 30;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    c.view.rig.target.copy(tg);
    return true;
  };
  H.screen = (up = 0.5, hull = rig.hull) => {
    const v = V(hull.position.x, hull.position.y + up * hull.scale.y * 1.5, hull.position.z);
    v.project(c.view.camera);
    return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight };
  };
  H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
  const grab = () => { c.renderFrame(); const r = c.view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
  /** Zeichenaufrufe/Dreiecke der Figur (inkl. Schattenpass, Figur-Bündel): Median aus fünf Paaren sichtbar/unsichtbar. */
  H.cost = (hulls = [rig.hull]) => {
    const av0 = H.av(), cam0 = H.cam;
    av0.blinker.phase = 0; av0.blinker.timer = 99; av0.applyEyes(av0.blender.cur.eyes);
    H.cam = { mode: 'close', rel: -0.5, el: 0.1, dist: 5, fov: 36 };
    const still = c.still; c.still = true;
    const dc = [], dt = [];
    grab();
    for (let k = 0; k < 5; k++) {
      for (const h of hulls) h.visible = true; grab(); const a = grab();
      for (const h of hulls) h.visible = false; grab(); const b = grab();
      dc.push(a.calls - b.calls); dt.push(a.tris - b.tris);
    }
    for (const h of hulls) h.visible = true; grab();
    c.still = still;
    H.cam = cam0;
    av0.blinker.timer = 2;
    const med = (l) => l.slice().sort((p, q) => p - q)[2];
    return { calls: med(dc), tris: med(dt), pairs: dc.join('/') };
  };
  /** Bank-Pose: Avatar n Bilder mit eigenem course-Objekt (HeroRig steht), danach zurück zum Stellvertreter. */
  H.base = { state: 'idle', speed: 0, vy: 0, grounded: true, phase: 0, power: 'sichel', big: true, holding: false, climbing: false, fenceMove: { x: 0, y: 0 }, fencePunch: 0, skates: false, sichelFlying: 0, sichelReady: true, sichelCatch: 0 };
  H.pose = (cc = {}, n = 30, dt = 1 / 60) => {
    const av = H.av(), keep = rig.proxy.course;
    for (let i = 0; i < n; i++) {
      H.t += dt;
      av.obj.course = { ...H.base, ...cc };
      av.animate(dt, H.t);
      if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004;
    }
    av.obj.course = keep;
    return H.parts();
  };
});

const S = (fn, arg) => sc(fn, arg);
const VIEWS = {
  front: { mode: 'close', rel: -0.5, el: 0.12, dist: 2.6, fov: 30, h: 0.55 },
  front0: { mode: 'close', rel: 0, el: 0.1, dist: 2.6, fov: 30, h: 0.55 },
  face: { mode: 'close', rel: -0.4, el: 0.08, dist: 1.25, fov: 30, h: 0.8 },
  side: { mode: 'close', rel: -Math.PI / 2, el: 0.08, dist: 2.6, fov: 30, h: 0.55 },
  side2: { mode: 'close', rel: Math.PI / 2, el: 0.08, dist: 2.6, fov: 30, h: 0.55 },
  back: { mode: 'close', rel: Math.PI - 0.4, el: 0.25, dist: 2.6, fov: 30, h: 0.55 },
  back0: { mode: 'close', rel: Math.PI, el: 0.2, dist: 2.6, fov: 30, h: 0.55 },
  top: { mode: 'close', rel: Math.PI - 0.7, el: 0.75, dist: 2.6, fov: 30, h: 0.55 },
  course: { mode: 'course' },
};
async function shot(name, view, group, o = {}) {
  if (!SHOTS) return;
  await S(([v, e]) => { window.__kw.cam = { ...v, ...e }; if (v.mode === 'course') window.__course.snapCamera(); }, [VIEWS[view], o.cam ?? {}]);
  await S((n) => window.__kw.frames(n), view === 'course' ? 6 : 3);
  let clip = { x: 290, y: 50, width: 380, height: 440 };
  if (view === 'course') {
    const p = await S(() => window.__kw.screen(0.5));
    const w = o.w ?? 340, h = o.h ?? 250;
    clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
  }
  if (o.clip) clip = o.clip;
  const path = `${OUT}kostuem_w7_${name}.png`;
  try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name, path, group }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
  await S(() => { window.__kw.cam = null; });
}
const setHero = (k) => S((k) => { window.__course.setHero(k); window.__kw.tick(2); }, k);

// ---------------------------------------------------------------- Motor: Item, Wurf, Fang
async function mechPart(hero) {
  const G = `${hero}_wurf`, r = {};
  await setHero(hero);
  // Item einsammeln (wie tests/course_w7_blocks.mjs): Kostüm an
  r.item = await S(() => {
    const H = window.__kw, c = window.__course, p = c.player;
    H.place([3, 0, -0.5], { settle: 2 });
    const before = H.parts();
    c.setInput({ y: 1 });
    let n = -1;
    for (let i = 0; i < 240; i++) { if (p.power === 'sichel') { n = i; break; } H.tick(1); }
    c.setInput({});
    H.tick(60);
    return { n, power: p.power, before, after: H.parts() };
  });
  // Stand ohne/mit Kostüm an derselben Stelle (Zeichenaufrufe)
  r.costNone = await S(() => { const H = window.__kw; H.place(H.marks.sichel, { settle: 90 }); return { cost: H.cost(), parts: H.parts() }; });
  r.costIdle = await S(() => { const H = window.__kw; H.place(H.marks.sichel, { settle: 90, power: 'sichel' }); return { cost: H.cost(), parts: H.parts() }; });
  await shot(`${hero}_motor_stand`, 'front', G);
  await shot(`${hero}_motor_stand_kurs`, 'course', G);
  // Wurf: Phasen (1/120 s je Schritt, Wurf 0,25 s = 30 Schritte)
  r.throw = await S(() => {
    const H = window.__kw, c = window.__course, p = c.player, av = H.av();
    const catch0 = p.sichelCatch ?? 0;
    c.setInput({ action: true }); H.tick(1); c.setInput({});
    const smp = [];
    H.tick(2);
    smp.push({ n: 3, ...H.parts(), flying: p.sichelFlying, phase: +H.rig.proxy.course.phase.toFixed(3), course: H.rig.proxy.course.state, n_ents: H.sickles().length });
    return { catch0, smp };
  });
  await shot(`${hero}_wurf1_ausholen`, 'side', G);
  await shot(`${hero}_wurf1_ausholen_kurs`, 'course', G);
  r.throw2 = await S(() => { const H = window.__kw, p = window.__course.player; H.tick(7); return { ...H.parts(), flying: p.sichelFlying, phase: +H.rig.proxy.course.phase.toFixed(3) }; });
  await shot(`${hero}_wurf2_abwurf`, 'side', G);
  await shot(`${hero}_wurf2_abwurf_kurs`, 'course', G);
  r.throw3 = await S(() => { const H = window.__kw, p = window.__course.player; H.tick(12); return { ...H.parts(), flying: p.sichelFlying, phase: +H.rig.proxy.course.phase.toFixed(3) }; });
  await shot(`${hero}_wurf3_ausschwingen`, 'side', G);
  r.flight = await S(() => {
    const H = window.__kw, p = window.__course.player;
    H.tick(20);
    const a = { ...H.parts(), flying: p.sichelFlying, cost: H.cost() };
    return a;
  });
  await shot(`${hero}_wurf4_flug_kurs`, 'course', G, { w: 420, h: 300 });
  // zurück und Fang
  r.catch = await S(() => {
    const H = window.__kw, p = window.__course.player;
    const c0 = p.sichelCatch ?? 0;
    let n = -1;
    for (let i = 0; i < 600; i++) { if ((p.sichelCatch ?? 0) !== c0) { n = i; break; } H.tick(1); }
    const at = H.parts();
    H.tick(5);
    return { n, at, mid: H.parts(), count: p.sichelCatch, flying: p.sichelFlying };
  });
  await shot(`${hero}_wurf5_fang`, 'front', G);
  await shot(`${hero}_wurf5_fang_kurs`, 'course', G);
  r.after = await S(() => { const H = window.__kw; H.tick(90); return H.parts(); });
  await shot(`${hero}_wurf6_danach`, 'front', G);
  // Wurf im Lauf (Umhang weht, Sichel fliegt) – Kurs-Kamera
  r.run = await S(() => {
    const H = window.__kw, c = window.__course, p = c.player;
    H.place(H.marks.sichel, { settle: 20, power: 'sichel' });
    c.setInput({ y: 1 }); H.tick(70);
    const run = H.parts();
    c.setInput({ y: 1, action: true }); H.tick(1); c.setInput({ y: 1 }); H.tick(3);
    return { run, thr: H.parts(), flying: p.sichelFlying, speed: +Math.hypot(p.vel.x, p.vel.z).toFixed(2) };
  });
  await shot(`${hero}_lauf_wurf_kurs`, 'course', G, { w: 420, h: 300 });
  await shot(`${hero}_lauf_wurf_seite`, 'side', G);
  await S(() => { const H = window.__kw, c = window.__course; c.setInput({}); H.tick(200); });
  // Klone (Spiegelfrucht): Kostüm ohne Schattenwurf, jede wirft eine eigene Sichel
  r.clones = await S(() => {
    const H = window.__kw, c = window.__course, p = c.player;
    H.place(H.marks.sichel, { settle: 20, power: 'sichel' });
    const figs = [c.level.addClone(p), c.level.addClone(p)].filter(Boolean);
    H.tick(30);
    const rigs = figs.map((f) => c.squad.rigs.get(f));
    for (const rg of rigs) rg.update(1 / 60, H.t);
    const parts = rigs.map((rg) => H.parts(rg.avatar));
    const cost = H.cost([H.rig.hull, ...rigs.map((rg) => rg.hull)]);
    const costMain = H.cost();
    c.setInput({ action: true }); H.tick(1); c.setInput({});
    H.tick(4);
    for (const rg of rigs) rg.update(1 / 60, H.t);
    const n = H.sickles().length, owners = new Set(H.sickles().map((s) => s.owner)).size;
    const handsAfter = rigs.map((rg) => rg.avatar.sk?.hand?.visible ?? null);
    return { k: figs.length, parts, n, owners, handsAfter, cost, costMain, powers: figs.map((f) => f.power) };
  });
  await shot(`${hero}_klone_kurs`, 'course', G, { w: 460, h: 300 });
  await S(() => { const H = window.__kw, c = window.__course; H.tick(300); c.squad?.clear?.(); H.tick(2); });
  return r;
}

// ---------------------------------------------------------------- Nahansichten und Posen (Bank)
async function closePart(hero) {
  const G = `${hero}_nah`, GP = `${hero}_posen`, r = {};
  await setHero(hero);
  await S(() => { const H = window.__kw; H.place(H.marks.sichel, { settle: 30, power: 'sichel' }); });
  r.idle = await S(() => window.__kw.pose({ state: 'idle' }, 90));
  for (const v of ['front', 'side', 'side2', 'back', 'back0', 'top', 'face', 'front0']) await shot(`${hero}_${v}`, v, G);
  await shot(`${hero}_kurs`, 'course', G);
  // ohne Kostüm zum Vergleich
  await S(() => window.__kw.pose({ state: 'idle', power: 'none' }, 30));
  await shot(`${hero}_ohne_front`, 'front', G);
  await shot(`${hero}_ohne_back`, 'back', G);
  const list = [
    ['lauf', { state: 'run', speed: 8 }, 50, 'side'],
    ['lauf_hinten', { state: 'run', speed: 8 }, 7, 'back'],
    ['gehen', { state: 'walk', speed: 3 }, 50, 'front'],
    ['sprung', { state: 'jump', vy: 5, grounded: false }, 14, 'side'],
    ['fallen', { state: 'fall', vy: -9, grounded: false }, 40, 'side'],
    ['fallen_vorn', { state: 'fall', vy: -9, grounded: false }, 4, 'front'],
    ['salto', { state: 'jump3', phase: 0.35, grounded: false, vy: 3 }, 6, 'side'],
    ['hocke', { state: 'crouch' }, 20, 'front'],
    ['jubel', { state: 'victory' }, 60, 'front'],
    ['klettern', { state: 'climb', vy: 2, grounded: false }, 40, 'back'],
    ['wandrutschen', { state: 'wallslide', vy: -2, grounded: false }, 30, 'side'],
    ['schwimmen', { state: 'swim', speed: 3 }, 40, 'side'],
    ['kanone', { state: 'cannon', phase: 0.4, speed: 10, vy: 2, grounded: false }, 30, 'side'],
    ['tragen', { state: 'idle', holding: 'over' }, 30, 'front'],
    ['verletzt', { state: 'hurt' }, 10, 'side'],
  ];
  r.poses = {};
  for (const [name, cc, n, view] of list) {
    r.poses[name] = await S(([cc, n]) => window.__kw.pose(cc, n), [cc, n]);
    await shot(`${hero}_${name}`, view, GP);
  }
  // Wurf-Phasen mit fester Phase (Sichel in der Luft ab dem Abwurf)
  for (const [tag, ph] of [['a', 0.08], ['b', 0.2], ['c', 0.34], ['d', 0.5], ['e', 0.8]]) {
    r.poses[`wurf_${tag}`] = await S((ph) => {
      const H = window.__kw;
      H.pose({ state: 'idle' }, 20);
      // Wurfbeginn: Sichel fliegt los (Motor erzeugt sie mit der Aktion)
      H.pose({ state: 'throw', phase: 0.01, sichelFlying: 1 }, 1);
      const n = Math.max(1, Math.round(ph / 0.0333));
      for (let i = 1; i <= n; i++) H.pose({ state: 'throw', phase: Math.min(ph, 0.01 + (i / n) * (ph - 0.01)), sichelFlying: 1 }, 1, 1 / 120);
      return H.parts();
    }, ph);
    await shot(`${hero}_wurf_${tag}_seite`, 'side', GP);
    if (tag === 'b' || tag === 'c') await shot(`${hero}_wurf_${tag}_vorn`, 'front', GP);
  }
  // Fang-Geste: Sichel kommt zurück (sichelCatch wechselt)
  r.poses.fang = await S(() => {
    const H = window.__kw;
    H.pose({ state: 'idle', sichelFlying: 1, sichelCatch: 0 }, 30);
    H.base.sichelCatch = 1;
    const a = H.pose({ state: 'idle', sichelFlying: 0 }, 4);
    return a;
  });
  await shot(`${hero}_fang_seite`, 'side', GP);
  await shot(`${hero}_fang_vorn`, 'front', GP);
  r.poses.fang2 = await S(() => window.__kw.pose({ state: 'idle' }, 6));
  await shot(`${hero}_fang2_vorn`, 'front', GP);
  r.poses.fangEnde = await S(() => { const H = window.__kw; const a = H.pose({ state: 'idle' }, 60); H.base.sichelCatch = 0; H.pose({ state: 'idle' }, 2); return a; });
  // Halloween: Mütze mit Halloween-Motiv
  r.hw = await S(() => { const H = window.__kw; H.av().setOutfit('halloween'); return H.pose({ state: 'idle' }, 40); });
  for (const v of ['front', 'back', 'side']) await shot(`${hero}_hw_${v}`, v, G);
  await shot(`${hero}_hw_kurs`, 'course', G);
  r.hwRun = await S(() => window.__kw.pose({ state: 'run', speed: 8 }, 50));
  await shot(`${hero}_hw_lauf`, 'back', G);
  r.hwOff = await S(() => { const H = window.__kw; H.av().setOutfit('auto'); return H.pose({ state: 'idle' }, 10); });
  // Trage-Helm: Mütze ruht
  r.helm = await S(() => { const H = window.__kw; H.rig.setHelmet('propeller'); return H.pose({ state: 'idle' }, 20); });
  await shot(`${hero}_helm`, 'front', G);
  r.helmOff = await S(() => { const H = window.__kw; H.rig.setHelmet(null); return H.pose({ state: 'idle' }, 20); });
  // klein
  r.small = await S(() => { const H = window.__kw; H.rig.hull.scale.setScalar(0.7 / 1.5); return H.pose({ state: 'idle', big: false }, 40); });
  await shot(`${hero}_klein`, 'front', G);
  await shot(`${hero}_klein_kurs`, 'course', G);
  await S(() => { const H = window.__kw; H.pose({ state: 'run', speed: 6, big: false }, 40); });
  await shot(`${hero}_klein_lauf_kurs`, 'course', G);
  await S(() => { const H = window.__kw; H.rig.hull.scale.setScalar(1 / 1.5); H.pose({ state: 'idle', power: 'none' }, 20); });
  return r;
}

// ---------------------------------------------------------------- Pflaume-Ritt
async function ridePart(hero) {
  const G = `${hero}_ritt`;
  await setHero(hero);
  await S(() => { const H = window.__kw; H.place(H.marks.sichel, { settle: 20, power: 'sichel' }); });
  const r = await S(() => {
    const H = window.__kw, c = window.__course, THREE = H.THREE;
    const hull = H.rig.hull;
    if (!H.pfl) {
      const pHull = new THREE.Group(); pHull.name = 'pflaume'; c.view.three.add(pHull);
      const proxy = { texture: { key: 'pflaume' }, key: 'pflaume', x: 0, y: 0, width: 0, height: 0, angle: 0, scaleX: 1, scaleY: 1, alpha: 1, visible: true, flipX: false,
        body: { velocity: { x: 0, y: 0 }, blocked: { down: true }, touching: { down: true } }, power: 'none',
        course: { state: 'idle', speed: 0, vy: 0, grounded: true, power: 'none', gear: null, rider: null } };
      const av = new H.heroMod.PflaumeAvatar(c.view, proxy);
      av.setCourseMode(true);
      pHull.add(av.root);
      H.pfl = { hull: pHull, av };
    }
    const P = H.pfl;
    P.hull.visible = true;
    P.hull.position.copy(hull.position);
    P.hull.rotation.set(0, hull.rotation.y, 0);
    P.hull.scale.setScalar(1 / 1.5);
    hull.position.y += 0.5;
    const rideN = (n, speed) => {
      const av = H.av();
      for (let i = 0; i < n; i++) {
        H.pose({ state: 'ride', speed }, 1);
        P.av.obj.course = { state: 'ride', speed, vy: 0, grounded: true, power: 'none', gear: null, rider: av };
        P.av.animate(1 / 60, H.t);
      }
    };
    rideN(60, 0);
    const still = H.parts();
    H.rideN = rideN;
    return { still };
  });
  await shot(`${hero}_ritt_seite`, 'side', G, { cam: { dist: 3.4, h: 0.3 } });
  await shot(`${hero}_ritt_hinten`, 'back', G, { cam: { dist: 3.4, h: 0.3 } });
  await shot(`${hero}_ritt_vorn`, 'front', G, { cam: { dist: 3.4, h: 0.3 } });
  r.run = await S(() => { const H = window.__kw; H.rideN(40, 4); return H.parts(); });
  await shot(`${hero}_ritt_hoppeln`, 'side', G, { cam: { dist: 3.4, h: 0.3 } });
  await shot(`${hero}_ritt_kurs`, 'course', G);
  await S(() => { const H = window.__kw; H.pfl.hull.visible = false; H.tick(4); H.pose({ state: 'idle', power: 'none' }, 10); });
  return r;
}

// ---------------------------------------------------------------- Läufe
const results = {};
for (const hero of HEROES) {
  console.log(`\n${hero}`);
  const R = results[hero] = {};
  if (on('mech')) {
    const m = R.mech = await mechPart(hero);
    console.log(`  Item nach ${m.item.n} Schritten → ${m.item.power}: ${JSON.stringify(m.item.after)}`);
    console.log(`  Stand ohne Kostüm: Aufrufe ${m.costNone.cost.calls}, Dreiecke ${m.costNone.cost.tris} (${m.costNone.cost.pairs}); mit: ${m.costIdle.cost.calls}, ${m.costIdle.cost.tris} (${m.costIdle.cost.pairs})`);
    console.log(`  Wurf: ausholen ${JSON.stringify(m.throw.smp[0])}`);
    console.log(`        abwurf ${JSON.stringify(m.throw2)}`);
    console.log(`        ausschwingen ${JSON.stringify(m.throw3)}`);
    console.log(`        Flug ${JSON.stringify(m.flight)}`);
    console.log(`  Fang nach ${m.catch.n} Schritten: ${JSON.stringify(m.catch.at)} → ${JSON.stringify(m.catch.mid)}; danach ${JSON.stringify(m.after)}`);
    console.log(`  Lauf ${JSON.stringify(m.run)}`);
    console.log(`  Klone ${JSON.stringify({ ...m.clones, parts: undefined })} ${DEBUG ? JSON.stringify(m.clones.parts) : ''}`);
  }
  if (on('close')) {
    const c = R.close = await closePart(hero);
    if (DEBUG) for (const [k, v] of Object.entries(c.poses)) console.log(`   ${k}: ${JSON.stringify(v)}`);
    console.log(`  Halloween ${JSON.stringify(c.hw)}; Helm ${JSON.stringify(c.helm)} → ${JSON.stringify(c.helmOff)}`);
  }
  if (on('ride')) {
    R.ride = await ridePart(hero);
    console.log(`  Ritt ${JSON.stringify(R.ride)}`);
  }
}

// ---------------------------------------------------------------- Prüfungen
for (const [hero, R] of Object.entries(results)) {
  const N = hero === 'lotti' ? 'Lotti' : 'Greta';
  const m = R.mech;
  if (m) {
    const a = m.item.after;
    check(`${N}: Item aufnehmen → power 'sichel', Kostüm an (Mütze, Kamm, Umhang, Sichel in der Hand; vorher nichts davon)`,
      m.item.power === 'sichel' && a.costume === 'sichel' && a.cap && a.crest && a.cape && a.hand && !m.item.before.cap && !m.item.before.hand);
    check(`${N}: Zeichenaufrufe Stand mit Kostüm ${m.costIdle.cost.calls} ≤ ohne ${m.costNone.cost.calls} + 1 (Dreiecke ${m.costIdle.cost.tris} / ${m.costNone.cost.tris} = ${(m.costIdle.cost.tris / m.costNone.cost.tris).toFixed(2)}×)`,
      m.costIdle.cost.calls <= m.costNone.cost.calls + 1);
    check(`${N}: Dreiecke mit Kostüm ≤ 1,35 × ohne`, m.costIdle.cost.tris <= 1.35 * m.costNone.cost.tris);
    const s0 = m.throw.smp[0];
    check(`${N}: Ausholen – Zustand 'throw', Sichel fliegt schon (Motor), in der Hand noch sichtbar, Arm hinter dem Kopf (armZn ${s0.armZn})`,
      s0.course === 'throw' && s0.flying === 1 && s0.hand && s0.armZn > 1.6);
    check(`${N}: Abwurf – Arm schnellt vor (armZn ${m.throw2.armZn}), Hand leer (Sichel fliegt)`, !m.throw2.hand && m.throw2.flying === 1 && m.throw2.armZn < s0.armZn && m.throw2.armZn > 0.9);
    check(`${N}: Ausschwingen/Flug – Hand bleibt leer, solange die Sichel fliegt`, !m.throw3.hand && !m.flight.hand && m.flight.flying === 1);
    check(`${N}: Zeichenaufrufe im Flug (Hand leer) ${m.flight.cost.calls} ≤ Stand mit Kostüm ${m.costIdle.cost.calls}`, m.flight.cost.calls <= m.costIdle.cost.calls);
    check(`${N}: Fang (sichelCatch +1 nach ${m.catch.n} Schritten) – Sichel sofort wieder in der Hand, Fang-Geste (Arm vor ${m.catch.mid.armZn}, Augen „◡“ ${m.catch.mid.eyesClosed})`,
      m.catch.n >= 0 && m.catch.at.hand && m.catch.mid.hand && m.catch.mid.armZn > 0.6 && m.catch.mid.eyesClosed && m.catch.flying === 0);
    check(`${N}: nach der Fang-Geste wieder Stand mit Sichel (Augen offen, Sichel in voller Größe ${m.after.handScale})`, m.after.hand && !m.after.eyesClosed && m.after.handScale === 1 && m.after.label === 'idle');
    check(`${N}: Wurf im Lauf – Umhang weht (Winkel ${m.run.run.capeA} rad), Sichel fliegt`, m.run.run.capeA > 0.35 && m.run.flying === 1);
    const cl = m.clones;
    check(`${N}: Klone (lite) tragen das Kostüm ohne Schattenwurf (${cl.k} Klone)`, cl.k === 2 && cl.parts.every((p) => p.costume === 'sichel' && p.cap && p.cape && p.hand && !p.capShadow && !p.capeShadow && !p.handShadow));
    check(`${N}: jede Figur wirft eine eigene Sichel (${cl.n} Sicheln, ${cl.owners} Werferinnen), Klon-Hände danach leer`, cl.n === 3 && cl.owners === 3 && cl.handsAfter.every((h) => h === false));
  }
  const c = R.close;
  if (c) {
    const p = c.poses;
    check(`${N}: Stand mit Kostüm – Mütze, Kamm, Umhang, Sichel; Haltung mit Sichel`, c.idle.cap && c.idle.cape && c.idle.hand && c.idle.label === 'idle');
    check(`${N}: Lauf – Umhang weht nach hinten (${p.lauf.capeA} rad), Sichel in der Hand`, p.lauf.capeA > 0.35 && p.lauf.hand);
    check(`${N}: Fallen – Umhang hebt sich (${p.fallen.capeA} rad)`, p.fallen.capeA > 0.3);
    check(`${N}: Hände belegt (Klettern, Wand, Schwimmen, Kanone, Tragen) – Sichel steckt weg`, ['klettern', 'wandrutschen', 'schwimmen', 'kanone', 'tragen'].every((k) => !p[k].hand));
    check(`${N}: Wurf-Phasen – Sichel bis zum Abwurf in der Hand (a ${p.wurf_a.hand}, b ${p.wurf_b.hand}), danach nicht (c ${p.wurf_c.hand}, d ${p.wurf_d.hand}); Arm ${p.wurf_a.armZn} → ${p.wurf_b.armZn} → ${p.wurf_c.armZn} → ${p.wurf_e.armZn}`,
      p.wurf_a.hand && p.wurf_b.hand && !p.wurf_c.hand && !p.wurf_d.hand && !p.wurf_e.hand && p.wurf_b.armZn > 2 && p.wurf_c.armZn < p.wurf_b.armZn && p.wurf_e.armZn < 1.4);
    check(`${N}: Fang-Geste (Augen ◡ ${p.fang.eyesClosed}, Arm ${p.fang.armZn}) → Ende (Augen offen, Arm ${p.fangEnde.armZn})`, p.fang.hand && p.fang.eyesClosed && p.fang.armZn > 0.6 && !p.fangEnde.eyesClosed && p.fangEnde.armZn < 0.6);
    const hwOk = hero === 'lotti' ? !c.hw.hat && c.hw.cap : c.hw.cap && c.hw.tail;
    check(`${N}: Halloween – Mütze ersetzt ${hero === 'lotti' ? 'den Hexenhut (Kürbis-Bommel)' : 'die Katzenohren (sitzen an der Mütze), Katzenschwanz bleibt'}`, hwOk && c.hwOff.cap && !c.hwOff.tail);
    check(`${N}: Trage-Helm – Mütze und Kamm ruhen, danach wieder da`, !c.helm.cap && !c.helm.crest && c.helm.cape && c.helmOff.cap && c.helmOff.crest);
    check(`${N}: klein – Kostüm vollständig`, c.small.cap && c.small.cape && c.small.hand);
  }
  if (R.ride) check(`${N}: Pflaume-Ritt mit Kostüm – Pose 'ride', Mütze/Umhang an, Sichel steckt weg (Angel in der Hand)`, R.ride.still.label === 'ride' && R.ride.still.cap && R.ride.still.cape && !R.ride.still.hand);
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
    await page.setContent(`<html><body style="margin:0;background:#222;color:#eee;font:11px sans-serif"><div style="display:flex;flex-wrap:wrap;width:1700px">${imgs}</div><style>figure{margin:2px}img{display:block;max-height:300px}</style></body></html>`);
    await page.screenshot({ path: `${OUT}kostuem_w7_sheet_${g}.png`, fullPage: true });
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
await stop();
process.exit(ok ? 0 : 1);
