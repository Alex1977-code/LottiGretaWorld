// Welt-6-Pose der Heldinnen im Kurs (Wolkenwerkstatt 0-23, CourseScene mit HeroRig und echtem Motor): 'hang' (hängt an
// beiden Händen unter dem Deckengitter und hangelt Hand über Hand). Vertrag: docs/KURS-ARCHITEKTUR.md „Präzisierung (Motor
// und Bausteine Welt 6)“ (HeroRig: neuer Zustand 'hang', Ersatz 'trapeze', solange avatar.courseStates 'hang' nicht kennt).
//
// Ablauf je Heldin (Lotti, Greta): deterministisch über window.__course.step und setInput unter das Deckengitter 'decke'
// springen (greift), hängen (Stillstand, sachtes Schaukeln), hangeln (Stick), anhalten, gegen den Gitterrand drücken,
// loslassen (Ducken). Der Avatar (HeroRig.update) läuft dabei im Takt der Simulation (je Schritt 1/120 s) – Bilder und
// Messungen sind wiederholbar. Dazu kurz: klein, Krallen-Anzug, Funkenblüte, Riesentrank (Lotti), Halloween-Verkleidung.
// Bilder tests/out/posen_w6_<heldin>_<phase>_<seite|kurs>.png (Nahansicht seitlich, Kurs-Kamera), Übersichtsbögen
// tests/out/posen_w6_sheet_<heldin>.png.
// Prüfungen: eigene Pose (HeroRig gibt 'hang' weiter, kein Ersatz 'trapeze'; Blender-Zustand 'hang'), Hände am Gitter
// (Abstand der Fäuste zur Gitterebene des Bausteins, Stillstand beide ≤ 5 cm, beim Hangeln immer eine Hand ≤ 5 cm, die
// haltende Hand liegt fest im Gitter, die andere greift im Wechsel nach), Hand-über-Hand im Takt des Tempos, Beine pendeln
// nach (Anfahren: Füße hinter, Bremsen: Füße vor den Griffen), Knie leicht angezogen, Schaukeln im Stillstand,
// Loslassen blendet weich in den Fall, Zeichenaufrufe ≤ Stand-Pose (idle an derselben Stelle), keine Konsolenfehler.
// Aufruf: npm run build && PORT_BASE=0 node tests/posen_w6.mjs   (Port 4365; P6_SHOTS=0 ohne Bilder, P6_HEROES=lotti,greta,
// P6_PARTS=hang,extra, P6_DEBUG=1)
import { readFileSync } from 'node:fs';
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4365;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SHOTS = process.env.P6_SHOTS !== '0';
const DEBUG = !!process.env.P6_DEBUG;
const HEROES = (process.env.P6_HEROES ?? 'lotti,greta').split(',').filter(Boolean);
const PARTS = (process.env.P6_PARTS ?? 'hang,extra').split(',').filter(Boolean);
const on = (p) => PARTS.includes(p);
const f3 = (v) => (typeof v === 'number' ? v.toFixed(3) : String(v));

await page.goto(`http://localhost:${port}/?course=0-23&scale=2&adapt=0${DEBUG ? '&p6debug=1' : ''}`, { waitUntil: 'load', timeout: 120000 });
try {
  await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
} catch {
  console.log('Wolkenwerkstatt startet nicht. Konsole:');
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
  const H = window.__p6 = { V, t: c.view.time, cam: null, drive: false, outfit: null };
  // Avatar im Takt der Simulation (wie tests/posen_w5.mjs): je Simulationsschritt genau ein Avatar-Bild mit dt = 1/120 s
  const rig = c.rig, upd = Object.getPrototypeOf(rig).update;
  rig.update = function (dt, t) { if (H.drive) upd.call(this, dt, t); };
  H.hr = () => rig.footRig ?? rig;
  H.av = () => H.hr().avatar;
  H.tick = (n = 1, each = null) => {
    for (let i = 0; i < n; i++) {
      c.step(1);
      H.t += 1 / 120;
      H.drive = true; rig.update(1 / 120, H.t); H.drive = false;
      each?.(i);
    }
  };
  const P = () => c.player, L = () => c.level;
  H.grid = () => L().named.get('decke').grid;
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
  H.until = (cond, max = 1200, inp = null) => { if (inp) c.setInput(inp); for (let i = 0; i < max; i++) { if (cond()) return i; H.tick(1); } return -1; };
  /** Unter das Gitter stellen und hineinspringen, bis die Figur hängt (→ Schritte bis zum Griff bzw. −1). */
  H.grab = (pos, o = {}) => {
    H.place(pos, { settle: 6, ...o });
    if (H.outfit !== null) H.av().setOutfit(H.outfit);
    H.tick(2);
    const n = H.until(() => P().state === 'hang', 120, { jump: true });
    c.setInput({});
    return n;
  };
  // Kamera: 'side' = seitlich zur Blickrichtung der Figur (rechte Seite), Ziel = Körpermitte; 'course' = Kameraschiene
  c.view.rig.custom = () => {
    const k = H.cam;
    if (!k || k.mode === 'course') return false;
    const cam = c.view.camera, hull = H.hr().hull;
    // fixed: Ziel an der Hülle statt an der Pose – Kostenvergleich Pose/Stand mit genau gleichem Bildausschnitt (sonst kann
    // z. B. der Blob-Schatten am Boden in der einen Messung im Bild liegen, in der anderen nicht: ±1 Aufruf)
    const tg = k.fixed ? V(hull.position.x, hull.position.y + 0.55 * hull.scale.y * 1.5, hull.position.z) : H.center();
    const az = H.hr().hull.rotation.y + Math.PI / 2 + (k.rel ?? -Math.PI / 2);
    const d = (k.dist ?? 3.2) * Math.max(1, H.hr().hull.scale.y * 1.5), el = k.el ?? 0.08;
    cam.position.set(tg.x + d * Math.cos(el) * Math.sin(az), tg.y + d * Math.sin(el), tg.z + d * Math.cos(el) * Math.cos(az));
    // Augenhöhe knapp unter der Gitterebene: das Gitter erscheint als schmales Band, die Fäuste liegen sichtbar daran
    if (k.gridEye !== undefined) cam.position.y = H.grid().y + k.gridEye;
    cam.lookAt(tg);
    const fov = k.fov ?? 34;
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    c.view.rig.target.copy(tg);
    return true;
  };
  /** Bildmitte der Figur (Welt): zwischen Füßen und Händen (Griffe am Gitter im Bild). */
  H.center = () => {
    const av = H.av(); av.root.updateWorldMatrix(true, true);
    const w = V(); av.pelvis.getWorldPosition(w);
    const h = V(); av.armN.carm.hand.getWorldPosition(h);
    const f = V(); av.armF.carm.hand.getWorldPosition(f);
    return w.lerp(h.lerp(f, 0.5), 0.42);
  };
  H.screen = () => { const v = H.center(); v.project(c.view.camera); return { x: (v.x + 1) / 2 * window.innerWidth, y: (1 - v.y) / 2 * window.innerHeight }; };
  H.frames = (n) => { for (let i = 0; i < n; i++) c.renderFrame(); };
  const grab = () => { c.renderFrame(); const r = c.view.renderer.info.render; return { calls: r.calls, tris: r.triangles }; };
  H.cost = () => {
    const hull = H.hr().hull, cam0 = H.cam, av0 = H.av();
    // gleiche Augen in beiden Messungen (Blinzeln tauscht kurz das Augen-Mesh, ±1 Aufruf)
    av0.blinker.phase = 0; av0.blinker.timer = 99; av0.applyEyes(av0.blender.cur.eyes);
    H.cam = { mode: 'side', dist: 3.4, el: 0.06, fov: 40, fixed: true };
    grab(); const a = grab();
    hull.visible = false; grab(); const b = grab();
    hull.visible = true; grab();
    H.cam = cam0;
    const r = { calls: a.calls - b.calls, tris: a.tris - b.tris };
    av0.blinker.timer = 2;
    if (H.debug) {
      // Figur-Bündel (view/ShadowProxy.js): Gruppen „Teile:gebündelt“, Augen/Mund
      const bu = c.view.proxies.bundles.find((x) => x.root === hull), av = H.av();
      r.bundle = bu ? bu.groups.map((g) => `${g.parts.length}:${g.on.filter(Boolean).length}${g.any ? '' : '!'}`).join(' ') : 'keins';
      r.eyes = `${av.eyes.visible ? 'auf' : 'zu'}${av.eyesClosed.visible ? '+lid' : ''}${av.mouthO.visible ? '+mund' : ''}`;
      // einzeln gezeichnete sichtbare Teile (nicht im Bündel): Dreiecke, im Bild?
      const fr = c.view.culling.camFrustum, solo = [];
      hull.traverse((m) => {
        if (!m.isMesh) return;
        for (let q = m; q && q !== hull; q = q.parent) if (!q.visible) return;
        if (m.__merged === c.view.frame) return;
        const g = m.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3;
        solo.push(`${m.name || m.type}${m.isSkinnedMesh ? '(skin)' : ''}:${n}${m.frustumCulled && !fr.intersectsObject(m) ? '-aus' : ''}`);
      });
      r.solo = solo.join(' ');
    }
    return r;
  };
  H.debug = new URLSearchParams(location.search).has('p6debug');
  /** Vergleich: dieselbe Stelle, Avatar für n Bilder im Zustand 'idle' (Stand-Pose), dann zurück. */
  H.costIdle = (n = 40) => {
    const av = H.av(), keep = av.obj.course;
    const saved = { ...keep };
    for (let i = 0; i < n; i++) { av.obj.course = { ...saved, state: 'idle' }; av.animate(1 / 60, H.t + i / 60); if (av.mouthO) av.mouthO.visible = av.mouthO.scale.x > 0.004; }
    const r = H.cost();
    av.obj.course = keep;
    for (let i = 0; i < 30; i++) av.animate(1 / 120, H.t);
    return r;
  };
  /** Fäuste ↔ Gitter: Höhe über der Gitterebene (m, − = darunter), Lage in Welt und ob innerhalb des Gitters. */
  H.hands = () => {
    const av = H.av(), g = H.grid();
    av.root.updateWorldMatrix(true, true);
    return [av.armN, av.armF].map((sh) => {
      const w = V(); sh.carm.hand.getWorldPosition(w);
      const inside = w.x > g.x0 - 0.05 && w.x < g.x1 + 0.05 && w.z > g.z0 - 0.05 && w.z < g.z1 + 0.05;
      return { dy: +(w.y - g.y).toFixed(3), x: +w.x.toFixed(3), z: +w.z.toFixed(3), inside };
    });
  };
  /** Lage: Füße relativ zu den Griffen entlang der Blickrichtung (+ = vor den Händen), Knie, Neigung. */
  H.body = () => {
    const av = H.av(), r = H.hr();
    av.root.updateWorldMatrix(true, true);
    const an = V(), af = V(), hn = V(), hf = V(), pel = V(), head = V();
    av.legN.ankle.getWorldPosition(an); av.legF.ankle.getWorldPosition(af);
    av.armN.carm.hand.getWorldPosition(hn); av.armF.carm.hand.getWorldPosition(hf);
    av.pelvis.getWorldPosition(pel); av.head.getWorldPosition(head);
    const e = r.hull.matrixWorld.elements, fwd = V(e[0], 0, e[2]).normalize();
    const feet = an.clone().add(af).multiplyScalar(0.5), hands = hn.clone().add(hf).multiplyScalar(0.5);
    return { feetFwd: +feet.clone().sub(hands).dot(fwd).toFixed(3), feetY: +feet.y.toFixed(3), headY: +head.y.toFixed(3), pelY: +pel.y.toFixed(3) };
  };
  H.info = () => {
    const av = H.av(), cur = av.blender.cur, p = P(), k = H.hr().proxy.course, hg = av.hang ?? {};
    const r = (v) => +(+v).toFixed(3);
    return { state: p.state, mode: p.mode, course: k.state, label: av.blender.state, blendT: r(av.blender.t), speed: r(k.speed ?? 0),
      move: [r(k.hangMove?.x ?? 0), r(k.hangMove?.y ?? 0)], u: r(hg.u ?? 0), m: r(hg.m ?? 0), v: r(hg.v ?? 0), th: r(hg.th ?? 0),
      pitch: r(cur.pitch), roll: r(cur.roll), kneeN: r(cur.kneeN), kneeF: r(cur.kneeF), thighZn: r(cur.thighZn), hero: av.variant,
      x: r(p.pos.x), z: r(p.pos.z), y: r(p.pos.y) };
  };
});

const shotList = [];
async function shots(hero, name, views = ['side', 'course']) {
  if (!SHOTS) return;
  for (const v of views) {
    // seitlich als Teleaufnahme (fast ohne Perspektive), Auge 0,6 m unter der Gitterebene: Die Figur hängt nahe dem fernen
    // Gitterrand, der Bambusrahmen am nahen Rand liegt dann im Bild über den Griffen statt davor; vorn: von schräg unten
    if (v === 'side') await sc(() => { window.__p6.cam = { mode: 'side', rel: -Math.PI / 2 + 0.45, dist: 12, el: 0, fov: 10.5, gridEye: -0.6 }; });
    else if (v === 'front') await sc(() => { window.__p6.cam = { mode: 'side', rel: -0.35, dist: 3.4, el: -0.1, fov: 36 }; });
    else if (v === 'below') await sc(() => { window.__p6.cam = { mode: 'side', rel: -Math.PI / 2 + 0.6, dist: 3.4, el: -0.25, fov: 38 }; });
    else await sc(() => { window.__p6.cam = { mode: 'course' }; window.__course.view.rig.snap(window.__course.player); });
    // Kurs-Kamera: einige Bilder mehr, damit die Decke über dem Gitter (view.xray) fertig durchscheinend wird
    await sc((n) => window.__p6.frames(n), v === 'course' ? 14 : 3);
    const p = await sc(() => window.__p6.screen());
    const w = v === 'course' ? 260 : 300, h = v === 'course' ? 200 : 360;
    const clip = { x: Math.round(Math.max(0, Math.min(960 - w, p.x - w / 2))), y: Math.round(Math.max(0, Math.min(540 - h, p.y - h / 2))), width: w, height: h };
    const tag = v === 'side' ? 'seite' : v === 'front' ? 'vorn' : v === 'below' ? 'unten' : 'kurs';
    const path = `${OUT}posen_w6_${hero}_${name}_${tag}.png`;
    try { await page.screenshot({ path, clip, timeout: 120000 }); shotList.push({ name: `${hero} ${name} ${tag}`, path, group: hero }); } catch (err) { console.log(`  (Bild ${name} übersprungen: ${err.message.split('\n')[0]})`); }
  }
  await sc(() => { window.__p6.cam = null; });
}
const S = (fn, arg) => sc(fn, arg);
const info = () => S(() => window.__p6.info());

// ---------------------------------------------------------------- Hängen und Hangeln
async function hang(hero) {
  const out = {};
  // unter das Gitter (Westrand, damit Platz zum Hangeln nach +X bleibt; nahe dem kamerafernen Rand, s. shots) und hineinspringen
  // (Blick schon nach +X: beim Hangeln dreht die Figur nicht erst – so lässt sich prüfen, dass die haltende Hand liegen bleibt)
  out.grabN = await S(() => { const H = window.__p6, g = H.grid(); return H.grab([g.x0 + 0.5, 0, g.z0 + 0.75], { yaw: 0 }); });
  out.grab = await info();
  await S(() => window.__p6.tick(4));
  out.grabMid = await info();
  await shots(hero, '1_greifen', ['side']);
  // Stillstand: hängen, sachtes Schaukeln (Neigung über 2 s), beide Hände am Gitter
  await S(() => window.__p6.tick(60));
  out.still = await S(() => {
    const H = window.__p6, av = H.av(), pit = [], hands = [];
    H.tick(240, (i) => { pit.push(av.blender.cur.pitch); if (i % 20 === 0) hands.push(H.hands()); });
    return { pmin: Math.min(...pit), pmax: Math.max(...pit), hands, info: H.info(), body: H.body() };
  });
  out.cost = await S(() => window.__p6.cost());
  out.costIdle = await S(() => window.__p6.costIdle());
  await shots(hero, '2_haengen', ['side', 'front', 'course']);
  // Hangeln nach +X (Stick rechts): je Schritt Hände messen; haltende Hand fest im Gitter, die andere greift nach
  out.move = await S(() => {
    const H = window.__p6, c = window.__course, av = H.av(), p = c.player;
    const smp = [];
    c.setInput({ x: 1 });
    const x0 = p.pos.x;
    H.tick(96, () => { smp.push({ u: av.hang?.u ?? 0, m: av.hang?.m ?? 0, h: H.hands(), b: H.body(), label: av.blender.state, x: p.pos.x }); });
    return { smp, dx: p.pos.x - x0, info: H.info() };
  });
  out.moveShot = await info();
  await shots(hero, '3_hangeln', ['side', 'below', 'course']);
  await S(() => window.__p6.tick(9));
  await shots(hero, '4_hangeln2', ['side', 'course']);
  // Anhalten (Stick los): Füße schwingen vor; danach wieder beide Hände am Gitter
  out.stop = await S(() => {
    const H = window.__p6, c = window.__course;
    c.setInput({});
    const ff = [], f0 = H.body().feetFwd;
    H.tick(60, () => ff.push(H.body().feetFwd));
    const brake = Math.max(...ff) - f0;   // Füße schwingen gegenüber dem Hangeln nach vorn
    H.tick(120);
    return { brake, hands: H.hands(), info: H.info() };
  });
  // Gegen den Gitterrand drücken: Figur steht, Hände bleiben beide am Gitter (kein Hangeln in der Luft)
  out.edge = await S(() => {
    const H = window.__p6, c = window.__course;
    c.setInput({ x: 1 });
    H.tick(150);
    const r = { hands: H.hands(), info: H.info() };
    c.setInput({});
    H.tick(30);
    return r;
  });
  // Loslassen (Ducken): weich in den Fall
  await S(() => { const H = window.__p6; H.play([[{ crouch: true }, 2]]); H.tick(4); });
  out.rel1 = await info();
  await shots(hero, '5_loslassen', ['side']);
  await S(() => window.__p6.tick(120));
  out.after = await info();
  // Seitlicher Gitterrand: am Rand entlang hangeln (der Motor hält die Figur 0,2 m vom Rand) – die äußere Faust bleibt am
  // Gitter bzw. greift den Randstab (höchstens 8 cm außerhalb der Gitterfläche), die haltende Hand bleibt am Gitter
  out.side = await S(() => {
    const H = window.__p6, c = window.__course, g = H.grid();
    H.grab([g.x0 + 0.5, 0, g.z0 + 0.1], { yaw: 0 });
    H.tick(30);
    c.setInput({ x: 1 });
    let out = 0, planted = 0;
    H.tick(90, (i) => {
      if (i < 20) return;
      for (const q of H.hands()) out = Math.max(out, g.z0 - q.z, q.z - g.z1, g.x0 - q.x, q.x - g.x1);
      const h = H.hands(); planted = Math.max(planted, Math.min(Math.abs(h[0].dy), Math.abs(h[1].dy)));
    });
    c.setInput({});
    H.tick(60);
    const r = { out: +out.toFixed(3), planted: +planted.toFixed(3), z: +c.player.pos.z.toFixed(3), state: c.player.state, hands: H.hands() };
    H.play([[{ crouch: true }, 2], [{}, 150]]);
    return r;
  });
  return out;
}

/** Kurz: greifen, ein Stück hangeln, stehen bleiben – Hände messen, Bild. */
async function hangQuick(hero, tag, o) {
  const r = await S(([o]) => {
    const H = window.__p6, c = window.__course, g = H.grid();
    H.outfit = o.outfit ?? null;
    const n = H.grab([g.x0 + 0.8, 0, g.z0 + 0.75], { big: o.big, power: o.power, yaw: 0 });
    H.tick(40);
    c.setInput({ x: 1 });
    let minPlanted = 9;
    H.tick(40, () => { const h = H.hands(); minPlanted = Math.min(minPlanted, Math.max(Math.min(Math.abs(h[0].dy), Math.abs(h[1].dy)), 0)); });
    let worst = 0;
    H.tick(30, () => { const h = H.hands(); worst = Math.max(worst, Math.min(Math.abs(h[0].dy), Math.abs(h[1].dy))); });
    const moving = H.info();
    c.setInput({});
    H.tick(140);
    return { n, worstMoving: +worst.toFixed(3), moving, hands: H.hands(), info: H.info(), cost: H.cost() };
  }, [o]);
  r.costIdle = await S(() => window.__p6.costIdle());
  await shots(hero, `x_${tag}`, ['side', 'course']);
  await S(() => { const H = window.__p6; H.play([[{ crouch: true }, 2], [{}, 150]]); H.outfit = null; H.av().setOutfit('auto'); });
  return r;
}

// ---------------------------------------------------------------- Läufe
const results = {};
const fallback = await S(() => ({ has: !!window.__p6.av().courseStates?.has?.('hang') }));
for (const hero of HEROES) {
  await S((h) => { const c = window.__course; c.setHero(h); window.__p6.tick(2); }, hero);
  console.log(`\n${hero}`);
  const r = results[hero] = {};
  if (on('hang')) {
    r.h = await hang(hero);
    const h = r.h;
    console.log(`  Greifen nach ${h.grabN} Schritten: ${JSON.stringify(h.grab)} → ${JSON.stringify(h.grabMid)}`);
    console.log(`  Stillstand: Neigung ${f3(h.still.pmin)} … ${f3(h.still.pmax)}, Hände ${JSON.stringify(h.still.hands[h.still.hands.length - 1])}, ${JSON.stringify(h.still.info)}`);
    console.log(`  Hangeln: ${f3(h.move.dx)} m, ${JSON.stringify(h.move.info)}`);
    if (DEBUG) for (const s of h.move.smp.filter((_, i) => i % 5 === 0)) console.log(`    u ${f3(s.u)} m ${f3(s.m)} Hände ${s.h.map((q) => f3(q.dy)).join('/')} x ${s.h.map((q) => f3(q.x)).join('/')} Füße ${f3(s.b.feetFwd)}`);
    console.log(`  Anhalten: Füße vor bis ${f3(h.stop.brake)} m, Hände ${JSON.stringify(h.stop.hands)}; Rand: ${JSON.stringify(h.edge.hands)} ${JSON.stringify(h.edge.info)}`);
    console.log(`  Loslassen: ${JSON.stringify(h.rel1)} → ${JSON.stringify(h.after)}`);
    console.log(`  seitlicher Rand: ${JSON.stringify(h.side)}`);
    console.log(`  Zeichenaufrufe hängen ${h.cost.calls} (Stand-Pose ${h.costIdle.calls}), Dreiecke ${h.cost.tris} (${h.costIdle.tris})${DEBUG ? ` ${JSON.stringify(h.cost)} ${JSON.stringify(h.costIdle)}` : ''}`);
  }
  if (on('extra')) {
    r.small = await hangQuick(hero, 'klein', { big: false });
    r.krallen = await hangQuick(hero, 'krallen', { power: 'krallen' });
    r.funken = await hangQuick(hero, 'funken', { power: 'funken' });
    r.halloween = await hangQuick(hero, 'halloween', { outfit: 'halloween' });
    if (hero === 'lotti') r.riese = await hangQuick(hero, 'riese', { power: 'riese' });
    for (const k of ['small', 'krallen', 'funken', 'halloween', 'riese']) if (r[k]) console.log(`  ${k.padEnd(9)} greift nach ${r[k].n}, Hände ${r[k].hands.map((q) => q.dy).join('/')} (beim Hangeln schlechteste haltende ${r[k].worstMoving}), ${r[k].info.label}, Aufrufe ${r[k].cost.calls} (Stand ${r[k].costIdle.calls})${DEBUG ? ` ${JSON.stringify(r[k].hands)} ${JSON.stringify(r[k].cost)} ${JSON.stringify(r[k].costIdle)}` : ''}`);
  }
}

// ---------------------------------------------------------------- Prüfungen
const TOL = 0.05;
const atGrid = (hs, tol = TOL) => Array.isArray(hs) && hs.every((q) => Math.abs(q.dy) <= tol && q.inside);
check(`Avatar bietet die Pose 'hang' an (courseStates) – HeroRig zeigt keinen Ersatz mehr`, fallback.has);
for (const [hero, r] of Object.entries(results)) {
  const N = hero === 'lotti' ? 'Lotti' : 'Greta';
  if (r.h) {
    const h = r.h, mv = h.move.smp;
    check(`${N}: greift das Deckengitter im Sprung, Pose 'hang' (Motor ${h.grabMid.state}, HeroRig ${h.grabMid.course}, Blender ${h.still.info.label})`,
      h.grabN >= 0 && h.grabMid.course === 'hang' && h.still.info.label === 'hang' && h.still.info.course === 'hang');
    const stillWorst = Math.max(...h.still.hands.flat().map((q) => Math.abs(q.dy)));
    check(`${N}: im Stillstand beide Fäuste am Gitter (schlechteste ${f3(stillWorst)} m ≤ ${TOL})`, h.still.hands.every((hs) => atGrid(hs)));
    check(`${N}: sachtes Schaukeln im Stillstand (Neigung ${f3(h.still.pmin)} … ${f3(h.still.pmax)} rad)`, h.still.pmax - h.still.pmin > 0.04 && h.still.pmax - h.still.pmin < 0.4);
    // Hangeln: ab dem eingeschwungenen Takt immer eine Hand am Gitter, die andere zeitweise darunter (greift nach)
    const run = mv.filter((s) => s.m > 0.9);
    const planted = run.map((s) => Math.min(Math.abs(s.h[0].dy), Math.abs(s.h[1].dy)));
    const lifted = run.map((s) => Math.max(Math.abs(s.h[0].dy), Math.abs(s.h[1].dy)));
    check(`${N}: beim Hangeln immer eine Faust am Gitter (schlechteste ${f3(Math.max(...planted))} m), die andere greift nach (bis ${f3(Math.max(...lifted))} m darunter)`,
      run.length > 20 && Math.max(...planted) <= TOL && Math.max(...lifted) > 0.06 && Math.max(...lifted) < 0.3);
    // haltende Hand liegt fest: je Haltephase (u bzw. u+0,5 in 0,05…0,45) verschiebt sie sich in der Welt kaum – auch beim Anfahren
    const drift = [0, 1].map((k) => {
      let worst = 0, ref = null;
      for (const s of mv) {
        const ph = ((s.u + 0.5 * k) % 1 + 1) % 1;
        if (ph > 0.05 && ph < 0.45) { const q = s.h[k]; if (!ref) ref = q; worst = Math.max(worst, Math.hypot(q.x - ref.x, q.z - ref.z)); } else ref = null;
      }
      return worst;
    });
    check(`${N}: haltende Hand liegt fest im Gitter (Verschiebung je Haltephase ${drift.map(f3).join('/')} m ≤ 0,04)`, drift.every((d) => d <= 0.04));
    // Hand über Hand: beide Hände wechseln sich ab (Zahl der Nachgreif-Schwünge je Hand)
    const swings = [0, 1].map((k) => { let n = 0, prev = false; for (const s of run) { const a = Math.abs(s.h[k].dy) > 0.06; if (a && !prev) n++; prev = a; } return n; });
    const cyc = h.move.dx / 1.0;   // HANG_POSE.stride
    check(`${N}: Hand über Hand im Takt (Schwünge nah/fern ${swings.join('/')} bei ${f3(h.move.dx)} m ≈ ${f3(cyc)} Doppelgriffe)`, swings.every((n) => n >= 1) && Math.abs(swings[0] - swings[1]) <= 1 && h.move.dx > 1.2);
    const startFeet = Math.min(...mv.slice(0, 40).map((s) => s.b.feetFwd));
    check(`${N}: Beine pendeln nach – Anfahren Füße hinter den Händen (${f3(startFeet)} m), Bremsen schwingen sie ${f3(h.stop.brake)} m vor`, startFeet < -0.05 && h.stop.brake > 0.05);
    check(`${N}: Knie leicht angezogen (Stillstand ${h.still.info.kneeN}/${h.still.info.kneeF}, hangelnd ${h.move.info.kneeN}/${h.move.info.kneeF})`,
      [h.still.info.kneeN, h.still.info.kneeF, h.move.info.kneeN, h.move.info.kneeF].every((k) => k > 0.2 && k < 1.4));
    check(`${N}: nach dem Anhalten und am Gitterrand beide Fäuste am Gitter (${h.stop.hands.map((q) => q.dy).join('/')}, Rand ${h.edge.hands.map((q) => q.dy).join('/')}), Rand hält (${h.edge.info.state})`,
      atGrid(h.stop.hands) && atGrid(h.edge.hands) && h.edge.info.state === 'hang');
    check(`${N}: Loslassen blendet weich in den Fall (${h.rel1.label} ${h.rel1.blendT} s, danach ${h.after.mode})`, h.rel1.label === 'fall' && h.rel1.blendT < 0.3 && h.after.mode === 'ground');
    check(`${N}: Zeichenaufrufe ${h.cost.calls} ≤ Stand-Pose ${h.costIdle.calls}`, h.cost.calls <= h.costIdle.calls);
    check(`${N}: am seitlichen Gitterrand bleiben die Griffe am Gitter/Randstab (höchstens ${f3(h.side.out)} m außerhalb ≤ 0,08; haltende Hand ${f3(h.side.planted)} m), danach beide am Gitter`,
      h.side.out <= 0.08 && h.side.planted <= TOL && h.side.state === 'hang' && h.side.hands.every((q) => Math.abs(q.dy) <= TOL));
  }
  for (const [k, txt] of [['small', 'klein'], ['krallen', 'Krallen-Anzug'], ['funken', 'Funkenblüte'], ['halloween', 'Halloween-Verkleidung'], ['riese', 'Riesentrank']]) {
    const q = r[k];
    if (!q) continue;
    check(`${N} ${txt}: hängt mit Pose 'hang', Fäuste am Gitter (${q.hands.map((x) => x.dy).join('/')} m; hangelnd haltende ≤ ${q.worstMoving} m), Zeichenaufrufe ${q.cost.calls} ≤ Stand ${q.costIdle.calls}`,
      q.n >= 0 && q.info.label === 'hang' && atGrid(q.hands) && q.worstMoving <= TOL && q.cost.calls <= q.costIdle.calls);
  }
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
    await page.screenshot({ path: `${OUT}posen_w6_sheet_${g}.png`, fullPage: true });
  }
} catch (err) { console.log('  (Übersichtsbögen übersprungen:', err.message.split('\n')[0], ')'); }

await browser.close();
stop();
process.exit(ok ? 0 : 1);
