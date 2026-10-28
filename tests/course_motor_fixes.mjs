// Kurs-Modus, Motor-Feinschliff nach Welt 6 (Präzisierung „Motor-Feinschliff nach Welt 6“): je behobener Motor-Schwäche
// eine deterministische Prüfung mit Gegenprobe in der Motor-Werkbank 0-29 (Werferturm-Arena 0-30, dazu 5-B, 5-5, 5-6, 6-1):
//   inst   Instanz-Regeln je Art (LEVEL.instances / view.instanceRule) für Entitäts-Modelle, Stachelkugel-Detailstufe und
//          sparsamer Schatten-Stellvertreter, farHide je Art
//   pound  Stampfattacke auf fahrender Plattform und fahrendem Wagen (Träger-Tempo), Level-Umweg wie 6-Panzer bleibt harmlos
//   cam    Kamerastrahl: Rampe mit echter Form, einzelner ?-Block nahe der Figur zieht nicht heran, Ziegelreihe weiter
//   ball   Wurfball: Hangabtrieb auch in kurzen Luftphasen (Gegenprobe slopeAir: 0 = altes Verhalten)
//   eis    Eiskante sparsam und standardmäßig an (Dreiecke je Kante gegenüber dem Registry-Modell)
//   maske  Pilz-Maske über dem Stachelwerfer (Sprung über seine Mitte), Gegenproben ohne Maske / alte Blickregel
//   gelee  Gelee-Brocken ohne Boss in ihrer Farbe (eigene Instanz-Gruppe je Farbe)
//   w5     Farbfeld als eine Instanz-Gruppe, Rot-Blau-Flipper nur im Bild
//   kraft  Kraftfeld-Form `ballPass`: Figur gestoppt, Wurfball und Feuerball fliegen hindurch; Gegenprobe Glaswand
//   arena  Werferturm-Reiter mit kind/spawnedBy: Arena-Neustart ohne Warnung, genau ein Werfer (0-30 ohne, 5-B mit Level-Hilfe)
//   level  echte Level: 5-5 Farbfeld 1 Aufruf, 5-6 Flipper außerhalb des Bildes 0 Aufrufe, 6-1 Stachelkugel-Detailstufe
// Aufruf (nach npm run build): node tests/course_motor_fixes.mjs   (Port 4700 + PORT_BASE; vite preview)
// PARTS=inst,pound,cam,ball,eis,maske,gelee,w5,kraft,arena,level (Standard alle; jeder Teil < 2 min) · VERBOSE=1
import { startServer, launchBrowser, makeChecker } from './helpers.mjs';

const PORT = 4700;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const PARTS = new Set((process.env.PARTS ?? 'inst,pound,cam,ball,eis,maske,gelee,w5,kraft,arena,level').split(','));
const VERBOSE = !!process.env.VERBOSE;
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);
const k1 = (t) => `${(t / 1000).toFixed(1)} k`;

async function load(id, extra = '') {
  errors.length = 0;
  await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0${extra}`, { waitUntil: 'load', timeout: 120000 });
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(() => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    const P = () => c.player;
    const L = () => c.level;
    const v = c.view, r = v.renderer;
    window.__t = {
      marks: c.level.data.marks ?? {},
      tick(n = 1) { for (let i = 0; i < n; i++) c.step(1); },
      place(pos, o = {}) {
        const p = P();
        c.setInput(null);
        c.setInput({});
        p.dead = false;
        p.big = o.big ?? true;
        p.power = 'none';
        p.powerTime = 0;
        if (p.helmet) { p.helmet = null; p.helmetFx = null; }
        p.helmetCooldown = 0;
        p.holding = null;
        p.reset(pos, o.yaw ?? Math.PI / 2);
        p.skidTurnTime = 0;
        p.invuln = o.invuln ?? 0;
        p.updateHalf();
        L().runtime.status = 'play';
        L().controlYaw = v.rig.controlYaw(p.pos);
        v.rig.snap(p);
        window.__t.tick(o.settle ?? 20);
        return p.info();
      },
      named: (id) => L().named.get(id),
      ent: (id) => L().entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
      ents: (kind) => L().entities.filter((e) => e.kind === kind && !e.removed),
      /** Ein Bild zeichnen und je Objekt (Name der nächsten benannten Hülle bzw. E:Art) Aufrufe/Dreiecke zählen; S: = Schattenpass. */
      detail() {
        for (const e of L().entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
        const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
        const acc = {};
        const orig = r.renderBufferDirect;
        r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
          const t0 = r.info.render.triangles;
          orig.call(this, camera, scene, geometry, material, object, group);
          const key = `${scene ? '' : 'S:'}${label(object)}`;
          const a = (acc[key] ??= [0, 0]);
          a[0]++; a[1] += r.info.render.triangles - t0;
        };
        try { c.renderFrame(); } finally { r.renderBufferDirect = orig; }
        const st = c.stats();
        return { acc, calls: st.calls, tris: st.triangles, inst: { ...v.instancer.stats } };
      },
    };
  });
}

const T = (name, ...args) => sc(([n, a]) => window.__t[n](...a), [name, args]);
const get = (d, k) => d.acc[k] ?? [0, 0];

// ======================================================================== Motor-Werkbank 0-29
const WB = ['inst', 'pound', 'cam', 'ball', 'eis', 'maske', 'gelee', 'w5', 'kraft'].filter((p) => PARTS.has(p));
if (WB.length) {
  await load('0-29');
  console.log('Motor-Werkbank 0-29');
  check('0-29 lädt ohne Konsolenfehler', errors.length === 0);
  for (const e of errors.slice(0, 6)) console.log('   ', e);
}

// ------------------------------------------------------------------ 1 Instanz-Regeln, Stachelkugel
if (PARTS.has('inst')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, v = c.view, L = c.level;
    t.place([0, 1, -17], { settle: 10 });
    const d0 = t.detail();
    // Regel shadow: false
    v.instanceRule('stachelkugel', { shadow: false });
    const d1 = t.detail();
    // Regel shadowDist: 6 m um die Figur (links vorn)
    v.instanceRule('stachelkugel', { shadowDist: 6 });
    t.place([-7, 1, -19], { settle: 2 });
    const near = t.ents('stachelkugel').filter((e) => Math.hypot(e.pos.x - c.player.pos.x, e.pos.z - c.player.pos.z) <= 6).length;
    const d2 = t.detail();
    v.instanceRule('stachelkugel', null);
    const d3 = t.detail();
    // farHide je Art (Pilzlinge 14 m entfernt)
    v.instanceRule('pilzling', { farHide: 10 });
    t.place([0, 1, -18], { settle: 2 });
    c.renderFrame();
    const farVis = t.ents('pilzling').filter((e) => e.model.root.visible).length;
    t.place([0, 1, -29], { settle: 2 });
    c.renderFrame();
    const nearVis = t.ents('pilzling').filter((e) => e.model.root.visible).length;
    v.instanceRule('pilzling', null);
    // Detailstufe: Figur so weit vor den Kugeln, dass sie > 24 m von der Kamera und noch im Bild liegen
    let d4 = null;
    for (let z = -2; z >= -14 && !(d4?.inst.lod >= 6 && (d4.acc['instanzen:stachelkugel']?.[1] ?? 0) > 0); z -= 1) {
      t.place([0, 1, z], { settle: 2 });
      d4 = t.detail();
    }
    return { d0, d1, d2, d3, d4, near, farVis, nearVis, balls: t.ents('stachelkugel').length };
  });
  const m0 = get(r.d0, 'instanzen:stachelkugel'), s0 = get(r.d0, 'S:instanzen:stachelkugel');
  console.log(`  Stachelkugeln (${r.balls}): Hauptpass ${m0[0]} Aufruf(e) / ${k1(m0[1])}, Schattenpass ${s0[0]} / ${k1(s0[1])} (Stellvertreter ${r.d0.inst.shadowLow}), Einzel ${JSON.stringify(get(r.d0, 'E:stachelkugel'))}`);
  check('Stachelkugeln: alle als eine Instanz-Gruppe im Hauptpass (volle Kugel ≈ 5,7 k je Stück)', m0[0] === 1 && m0[1] >= r.balls * 5000 && get(r.d0, 'E:stachelkugel')[0] === 0);
  check('Stachelkugeln: Schattenpass mit sparsamem Stellvertreter (< 1,5 k je Kugel statt ≈ 5,7 k)', s0[0] >= 1 && r.d0.inst.shadowLow >= 1 && s0[1] / r.d0.inst.shadowLow < 1500);
  const s1 = get(r.d1, 'S:instanzen:stachelkugel'), s2 = get(r.d2, 'S:instanzen:stachelkugel'), s3 = get(r.d3, 'S:instanzen:stachelkugel');
  console.log(`  Regeln: shadow:false → Schatten ${s1[0]} / ${k1(s1[1])} · shadowDist 6 → ${r.d2.inst.shadowLow} Schatten (nah: ${r.near}) · ohne Regel → ${r.d3.inst.shadowLow}; Pilzlinge farHide 10: fern sichtbar ${r.farVis}, nah ${r.nearVis}`);
  check('LEVEL.instances[Art] wirkt auf Entitäts-Modelle: shadow: false → kein Sonnenschatten der Stachelkugeln (Hauptpass bleibt)', s1[0] === 0 && get(r.d1, 'instanzen:stachelkugel')[0] === 1 && r.d1.inst.ruled >= r.balls);
  check('shadowDist je Art: nur die Kugeln im Umkreis werfen Schatten (Gegenprobe ohne Regel: mehr)', r.d2.inst.shadowLow === r.near && r.near >= 1 && r.d3.inst.shadowLow > r.near);
  check('farHide je Art (Level.render): ferne Pilzlinge nicht gezeichnet, nahe wieder', r.farVis === 0 && r.nearVis >= 4);
  const m4 = get(r.d4, 'instanzen:stachelkugel');
  console.log(`  Detailstufe (Kamera > 24 m): ${r.d4.inst.lod} Kugeln sparsam, Hauptpass ${m4[0]} / ${k1(m4[1])}`);
  check('Stachelkugel-Detailstufe: ferne Kugeln (> 24 m Kamera) zeichnen die sparsame Kugel (< 1,5 k je Stück)', r.d4.inst.lod >= 6 && m4[1] > 0 && m4[1] < r.d4.inst.lod * 1500);
}

// ------------------------------------------------------------------ 2 Stampfen auf fahrenden Trägern
if (PARTS.has('pound')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const lift = t.named('lift'), wagen = t.named('wagen');
    // carrier: { x(), top(), mover, wait() } – Figur mittig drauf, hochspringen, im Scheitel stampfen, Landung relativ messen
    const run = (cr, hook = false) => {
      for (let i = 0; i < 900 && !cr.ready(); i++) t.tick(1);
      t.place([cr.x(), cr.top() + 0.05, cr.z], { settle: 0 });
      t.tick(24);
      const rel0 = p.pos.x - cr.x();
      let off = null;
      if (hook) {
        // Level-Umweg wie 6-Panzer (kolonnenSetup): beim Stampfen über dem Träger die Figur mit dessen Verschiebung mitnehmen
        off = L.onStep(() => { if (p.state === 'groundpound' && Math.abs(p.pos.x - cr.x()) < 2.6 && p.pos.y > cr.top() - 0.2) { p.pos.x += cr.mover.dx ?? 0; p.pos.z += cr.mover.dz ?? 0; } });
      }
      c.setInput({ jump: true }); t.tick(1); c.setInput({});
      let i = 0;
      for (; i < 240 && (p.vel.y > 0.4 || p.mode !== 'air'); i++) t.tick(1);
      c.setInput({ crouch: true }); t.tick(1); c.setInput({});
      const pounded = p.state === 'groundpound';
      for (i = 0; i < 400 && p.mode === 'air'; i++) t.tick(1);
      off?.();
      const rel1 = p.pos.x - cr.x();
      return { rel0: +rel0.toFixed(3), rel1: +rel1.toFixed(3), drift: +(rel1 - rel0).toFixed(3), pounded, onIt: p.ground?.mover === cr.mover, mode: p.mode };
    };
    const L1 = { x: () => lift.pm.pos.x, top: () => lift.pm.pos.y + 0.5, z: -50, mover: lift.mover, ready: () => lift.pm.pos.x > -7 && lift.pm.pos.x < -5 && lift.mover.dx > 0 };
    const W1 = { x: () => wagen.pos.x, top: () => wagen.pos.y + 1.0, z: -66, mover: wagen.mover, ready: () => wagen.pos.x > -7 && wagen.pos.x < -5 && wagen.mover.dx > 0 };
    const lifted = run(L1);
    const hooked = run(L1, true);
    const wag = run(W1);
    // Gegenprobe: feste Plattform – waagerecht keine Drift
    const S = { x: () => 0, top: () => 3.5, z: -58, mover: undefined, ready: () => true };
    const still = run(S);
    return { lifted, hooked, wag, still, speed: Math.hypot(lift.mover.vx, lift.mover.vz) };
  });
  console.log(`  Plattform (${f2(r.speed)} m/s): Drift ${f2(r.lifted.drift)} m (stampft ${r.lifted.pounded}, landet drauf ${r.lifted.onIt}); mit Level-Umweg ${f2(r.hooked.drift)} m; Wagen ${f2(r.wag.drift)} m; feste Plattform ${f2(r.still.drift)} m`);
  check('Stampfattacke auf fahrender Plattform: die Figur fährt mit und landet an derselben Stelle (Drift < 0,3 m statt ≈ 2 m)', r.lifted.pounded && r.lifted.onIt && Math.abs(r.lifted.drift) < 0.3);
  check('Stampfattacke auf fahrendem Wagen (vehicle wie Panzer/Zug): Landung an derselben Stelle', r.wag.pounded && r.wag.onIt && Math.abs(r.wag.drift) < 0.3);
  check('Level-Umweg (6-Panzer: Figur beim Stampfen selbst mitschieben) bleibt harmlos – nicht doppelt', r.hooked.pounded && r.hooked.onIt && Math.abs(r.hooked.drift) < 0.3);
  check('Gegenprobe feste Plattform: Stampfen bleibt senkrecht', r.still.pounded && Math.abs(r.still.drift) < 0.05);
}

// ------------------------------------------------------------------ 3 Kamera
if (PARTS.has('cam')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player, rig = c.view.rig, w = L.world;
    const vec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
    const at = (pos) => {
      t.place(pos, { settle: 10 });
      rig.snap(p);
      let minD = Infinity;
      for (let i = 0; i < 90; i++) { rig.update(1 / 60, p, w); minD = Math.min(minD, rig.distNow); }
      const want = rig.cur.dist * rig.zoom * rig.powerZoom * rig.groupZoom;
      // alter Strahl: Hüllquader aller Formen (CollisionWorld.raycast) zur Wunschposition
      const dir = rig.offsetDir(rig.cur, vec());
      const head = { x: p.pos.x, y: p.pos.y + p.half.y * 2 + 0.15, z: p.pos.z };
      const end = { x: rig.target.x + dir.x * want, y: rig.target.y + dir.y * want, z: rig.target.z + dir.z * want };
      const old = w.raycast(head, end);
      return { dist: +rig.distNow.toFixed(2), minD: +minD.toFixed(2), want: +want.toFixed(2), oldTag: old?.shape?.tag ?? old?.shape?.owner?.kind ?? null, oldT: old ? +(old.t).toFixed(3) : null };
    };
    return { rampe: at(t.marks.rampe), block: at(t.marks.fragezeichen), mauer: at(t.marks.mauer), frei: at([-8, 1, -96]) };
  });
  console.log(`  Rampe: Abstand ${r.rampe.minD}/${r.rampe.want} m (alter Strahl trifft ${r.rampe.oldTag}) · ?-Block: ${r.block.minD}/${r.block.want} (alt ${r.block.oldTag}) · Ziegelreihe: ${r.mauer.minD}/${r.mauer.want} (alt ${r.mauer.oldTag}) · frei ${r.frei.minD}/${r.frei.want}`);
  check('Kamera an der Rampe: Strahl prüft die echte Rampenform – kein Heranrücken (Gegenprobe: alter Hüllquader-Strahl war verdeckt)', r.rampe.minD >= r.rampe.want * 0.97 && r.rampe.oldTag === 'ramp');
  check('Kamera: einzelner ?-Block direkt hinter der Figur zieht nicht heran (Gegenprobe: alter Strahl traf ihn)', r.block.minD >= r.block.want * 0.97 && r.block.oldTag !== null);
  check('Kamera: Ziegelreihe (Mauer aus Blöcken) zählt weiter – Kamera rückt heran', r.mauer.minD < r.mauer.want * 0.9 && r.mauer.oldTag !== null);
  check('Kamera frei: voller Abstand', r.frei.minD >= r.frei.want * 0.99 && r.frei.oldTag === null);
}

// ------------------------------------------------------------------ 4 Wurfball am Hang
if (PARTS.has('ball')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course;
    t.place([8, 1, -122], { settle: 2 });
    const balls = [t.ent('ball_hang'), t.ent('ball_alt')];
    for (const b of balls) { b.pos.set(b.home.x, 7.1, -110.6); b.vel.set(0, 0, 0); b.grounded = false; b.thrown = false; b.thrower = null; b.restT = 0; b.rampAir = b.slopeAir; }
    const out = balls.map(() => ({ t: null, vmax: 0, airAcc: 0 }));
    for (let i = 0; i < 360; i++) {
      const v0 = balls.map((b) => -b.vel.z), air0 = balls.map((b) => !b.grounded);
      t.tick(1);
      balls.forEach((b, k) => {
        const o = out[k];
        const vz = -b.vel.z;
        o.vmax = Math.max(o.vmax, Math.hypot(b.vel.x, b.vel.z));
        // Schritt in der Luft begonnen und beendet, waagerecht hangab schneller geworden
        if (air0[k] && !b.grounded && vz > v0[k] + 0.01) o.airAcc++;
        if (o.t === null && b.pos.z < -117.5) o.t = +(i / 120).toFixed(3);
      });
    }
    return out;
  });
  console.log(`  Wurfball am 31°-Hang: neu bis z −117,5 in ${r[0].t} s (vmax ${f2(r[0].vmax)} m/s, ${r[0].airAcc} Luftschritte mit Hangabtrieb) · slopeAir 0 (alt) ${r[1].t} s (vmax ${f2(r[1].vmax)}, ${r[1].airAcc})`);
  check('Wurfball beschleunigt am Hang auch in kurzen Luftphasen (Hüpfer)', r[0].airAcc >= 3 && r[1].airAcc === 0);
  check('Wurfball rollt den Hang schneller hinab als mit slopeAir: 0 (altes Verhalten)', r[0].t !== null && (r[1].t === null || r[0].t < r[1].t - 0.05) && r[0].vmax > r[1].vmax);
}

// ------------------------------------------------------------------ 5 Eiskante
if (PARTS.has('eis')) {
  const r = await sc(() => ({ tris: window.__course.level._lakeTris }));
  const cheap = r.tris.sparsam - r.tris.ohne, fine = r.tris.fein - r.tris.ohne, flatEdge = r.tris.flachKante - r.tris.flach;
  const perM = cheap / (2 * (7 + 10)), perMf = fine / (2 * (7 + 10));
  console.log(`  Eisseen 7 × 10 m mit Sockel: ohne Kante ${r.tris.ohne}, Kante sparsam (Standard) +${cheap} (${perM.toFixed(0)}/m), fein (Registry) +${fine} (${perMf.toFixed(0)}/m); 16 × 40-m-See: sparsam ≈ ${k1(perM * 112)}, fein ≈ ${k1(perMf * 112)} (je Pass) · flache Bahn ohne Angabe ${r.tris.flach}, mit edge: true +${flatEdge}`);
  check('Eiskante bei Eisseen mit Sockel standardmäßig an (ohne edge-Angabe)', cheap > 0);
  check('Eiskante sparsam: höchstens ein Drittel der Dreiecke des Registry-Modells', cheap > 0 && cheap <= fine / 3);
  check('Gegenprobe: flache Bahn ohne Sockel bleibt ohne Angabe ohne Kante (wie bisher), mit edge: true bekommt sie eine', flatEdge > 0);
}

// ------------------------------------------------------------------ 6 Pilz-Maske
if (PARTS.has('maske')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    const w = t.ent('werfer');
    const run = (mask, oldRule = false) => {
      const keep = L.isMaskedFrom;
      if (oldRule) L.isMaskedFrom = (e, f, a = 75) => { const ff = f ?? L.nearestPlayer(e.pos ?? e); return !!ff?.masked && L.isFacing(ff, e.pos ?? e, a); };
      // Werfer zurück auf seinen Platz, blickt +Z
      for (const b of L.entities) if (b.kind === 'stachelkugel_wurf' && !b.removed) b.kill();
      w.pos.set(0, 1, -174); w.vel.set(0, 0, 0); w.yaw = Math.PI / 2 * -1 + Math.PI; w.state = 'idle'; w.cool = 0.4;
      t.place([0, 1, -168.5], { settle: 0, yaw: Math.PI / 2 });
      if (mask) p.wearHelmet('maske');
      const th0 = w.throws;
      // zugewandt stehen (Werfer sieht die maskierte Figur nicht), dann über seine Mitte springen (Bogen, Blick weiter −Z)
      t.tick(150);
      const before = w.throws - th0;
      const samples = [];
      const N = 84;
      for (let i = 0; i <= N; i++) {
        const k = i / N;
        p.pos.set(0, 1 + 0.2 + 3.4 * 4 * k * (1 - k), -168.5 - 11 * k);
        p.vel.set(0, 0, -8); p.mode = 'air'; p.state = 'jump'; p.yaw = Math.PI / 2;
        samples.push(L.isMaskedFrom(w, p));
        t.tick(1);
      }
      t.tick(30);
      const after = w.throws - th0;
      L.isMaskedFrom = keep;
      return { before, after, masked: samples.filter(Boolean).length, of: samples.length, gap: samples.indexOf(false) };
    };
    return { neu: run(true), alt: run(true, true), ohne: run(false) };
  });
  console.log(`  Pilz-Maske: neu ${r.neu.masked}/${r.neu.of} Proben maskiert, Würfe ${r.neu.before}+${r.neu.after - r.neu.before} · alte Blickregel ${r.alt.masked}/${r.alt.of} (erste Lücke ${r.alt.gap}), Würfe ${r.alt.after} · ohne Maske Würfe ${r.ohne.after}`);
  check('Pilz-Maske: Sprung über die Mitte des Stachelwerfers – die Figur bleibt für ihn unsichtbar, er wirft nicht', r.neu.masked === r.neu.of && r.neu.after === 0);
  check('Gegenprobe alte Blickregel: über dem Gegner kippt „zugewandt“ und er wirft', r.alt.masked < r.alt.of && r.alt.after >= 1);
  check('Gegenprobe ohne Maske: der Stachelwerfer wirft', r.ohne.after >= 1);
}

// ------------------------------------------------------------------ 7 Gelee-Brocken
if (PARTS.has('gelee')) {
  const r = await sc(() => {
    const t = window.__t;
    const bs = ['gelee_rot', 'gelee_blau', 'gelee_gruen'].map((id) => t.ent(id));
    const insts = bs.map((b) => b?.slot?.inst);
    const geos = insts.map((i) => i?.meshes?.[0]?.geometry?.uuid);
    return { colors: bs.map((b) => b?.color), distinct: new Set(insts).size, geos: new Set(geos).size, ok: insts.every(Boolean) };
  });
  console.log(`  Gelee-Brocken ohne Boss: Farben ${r.colors.join(', ')} → ${r.distinct} Instanz-Gruppen, ${r.geos} Geometrien`);
  check('Gelee-Brocken außerhalb des Bosskampfs übernehmen ihre Farbe (eigene Instanz-Gruppe je Farbe)', r.ok && r.distinct === 3 && r.geos === 3);
}

// ------------------------------------------------------------------ 8 Farbfeld und Flipper
if (PARTS.has('w5')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, v = c.view;
    t.place(t.marks.farbfeld, { settle: 10 });
    const d0 = t.detail();
    // alle Felder betreten
    const ff = t.named('farbfeld');
    for (const tile of ff.tiles) { t.place([tile.x, tile.y + 0.3, tile.z], { settle: 12 }); }
    t.place(t.marks.farbfeld, { settle: 30 });
    const d1 = t.detail();
    const flipGroups = () => v.groups.list.filter((g) => g.name === 'flipper');
    const fl0 = flipGroups().reduce((a, g) => a + (g.main?.count ?? 0), 0);
    t.place(t.marks.flipper, { settle: 10 });
    const d2 = t.detail();
    const fl1 = flipGroups().reduce((a, g) => a + (g.main?.count ?? 0), 0);
    const flips0 = L.flipper.flips;
    c.setInput({ jump: true }); t.tick(2); c.setInput({}); t.tick(80);
    const d3 = t.detail();
    return { d0, d1, d2, d3, done: ff.done, fl0, fl1, flips: L.flipper.flips - flips0, groups: flipGroups().length };
  });
  const sw0 = get(r.d0, 'instanzen:switch_tile'), sw1 = get(r.d1, 'instanzen:switch_tile');
  console.log(`  Farbfeld 3 × 3: ${sw0[0]} Aufruf(e) (einzeln ${get(r.d0, 'modell:switch_tile')[0]}), nach dem Färben ${sw1[0]} (fertig ${r.done}) · Flipper (${r.groups} Gruppen): außerhalb ${get(r.d0, 'flipper')[0]} Aufrufe / ${r.fl0} Felder, im Bild ${get(r.d2, 'flipper')[0]} / ${r.fl1}, nach Sprung ${r.flips} Wechsel → ${get(r.d3, 'flipper')[0]} Aufrufe`);
  check('Farbfeld (switchtiles): alle neun Felder als eine Instanz-Gruppe (1 Aufruf statt 9), auch nach dem Umklappen', sw0[0] === 1 && get(r.d0, 'modell:switch_tile')[0] === 0 && sw1[0] === 1 && r.done);
  check('Rot-Blau-Flipper außerhalb des Bildes: keine Zeichenaufrufe (Gruppen-Auswahl)', r.groups === 6 && get(r.d0, 'flipper')[0] === 0 && r.fl0 === 0);
  check('Rot-Blau-Flipper im Bild gezeichnet, Farbwechsel beim Sprung unverändert', get(r.d2, 'flipper')[0] >= 2 && r.fl1 >= 10 && r.flips === 1 && get(r.d3, 'flipper')[0] >= 2);
}

// ------------------------------------------------------------------ 9 Kraftfeld „nur Bälle“
if (PARTS.has('kraft')) {
  const r = await sc(() => {
    const t = window.__t, c = window.__course, L = c.level, p = c.player;
    // Figur läuft gegen das Kraftfeld
    t.place([0, 1, -236.5], { settle: 4 });
    c.setInput({ y: 1 }); t.tick(150); c.setInput({});
    const figZ = p.pos.z;
    const shoot = (x, id) => {
      const b = t.ent('ball_kraft');
      b.goneT = -1; b.pos.set(x, 2.0, -237.6); b.vel.set(0, 3, -14); b.thrown = true; b.thrower = p; b.grounded = false; b.hitSet.clear();
      let minZ = 0;
      for (let i = 0; i < 120; i++) { t.tick(1); minZ = Math.min(minZ, b.pos.z); }
      return { minZ: +minZ.toFixed(2), hit: !!t.ent(id)?.done };
    };
    t.place([3, 1, -232], { settle: 2 });
    const ball = shoot(0, 'ziel_kraft');
    const wall = shoot(9, 'ziel_wand');
    const fire = (x) => {
      const f = L.spawn('fireball', { pos: [x, 1.3, -238], dir: [0, -1], speed: 10, vy: 0 });
      let minZ = 0;
      for (let i = 0; i < 60 && !f.removed; i++) { t.tick(1); minZ = Math.min(minZ, f.pos.z); }
      return +minZ.toFixed(2);
    };
    return { figZ: +figZ.toFixed(2), ball, wall, fireK: fire(0), fireW: fire(9) };
  });
  console.log(`  Kraftfeld: Figur bleibt bei z ${r.figZ} (Feld −239,7) · Wurfball bis z ${r.ball.minZ}, Scheibe ${r.ball.hit} · Glaswand: Ball bis ${r.wall.minZ}, Scheibe ${r.wall.hit} · Feuerball ${r.fireK} / Glaswand ${r.fireW}`);
  check('Kraftfeld (Form mit ballPass): die Figur kommt nicht hindurch', r.figZ > -239.7);
  check('Kraftfeld: Wurfball fliegt hindurch und trifft die Zielscheibe dahinter', r.ball.minZ < -241 && r.ball.hit);
  check('Kraftfeld: Feuerball (Geschoss) fliegt hindurch', r.fireK < -241);
  check('Gegenprobe gewöhnliche Wand: Wurfball und Feuerball prallen ab, Scheibe bleibt', r.wall.minZ > -240 && !r.wall.hit && r.fireW > -240);
}

// ======================================================================== Werferturm-Arena
if (PARTS.has('arena')) {
  const arena = async (id) => {
    await load(id);
    const r0 = await sc(() => {
      const a = window.__course.level.archetype;
      return { total: a.total, counted: a.counted.size };
    });
    const r = await sc(() => {
      const t = window.__t, c = window.__course, L = c.level, a = L.archetype;
      const res0 = a.resets;
      c.player.die('fall');
      for (let i = 0; i < 8 * 120 && a.resets === res0; i++) t.tick(1);
      t.tick(60);
      const werfer = L.entities.filter((e) => /_werfer$/.test(e.kind) && !e.removed);
      const turm = L.entities.find((e) => e.kind === 'werferturm' && !e.removed);
      return {
        resets: a.resets - res0, total: a.total, counted: a.counted.size, left: a.left, werfer: werfer.length,
        riding: werfer.filter((w) => w.riding === turm).length, towers: L.entities.filter((e) => e.kind === 'werferturm' && !e.removed).length,
        rider: turm?.rider === werfer[0], counts: !!turm?.rider && a.counted.has(turm.rider), spec: turm?.rider?.spec?.kind ?? null,
      };
    });
    const warn = errors.filter((e) => /unbekannte Entität/.test(e));
    return { ...r, before: r0, warn: warn.length, errs: errors.length };
  };
  const a = await arena('0-30');
  console.log(`  0-30: vorher ${a.before.counted}/${a.before.total}; nach Tod ${a.resets}× neu: ${a.towers} Turm, ${a.werfer} Werfer (reitet ${a.riding}, Spec ${a.spec}), gezählt ${a.counted}/${a.total}, noch ${a.left}; Warnungen ${a.warn}`);
  check('Werferturm-Arena (ohne Level-Hilfe): Neustart baut einen Turm mit genau einem Werfer, der mitzählt (Reiter-Spec mit kind)', a.resets === 1 && a.towers === 1 && a.werfer === 1 && a.riding === 1 && a.counts && a.counted === a.total && a.left === a.total && a.spec === 'feuer_werfer');
  check('Werferturm-Arena: keine Warnung „unbekannte Entität“', a.warn === 0);
  const b = await arena('5-B');
  console.log(`  5-B (mit arenaTowerFix): nach Tod ${b.towers} Turm, ${b.werfer} Werfer (reitet ${b.riding}), gezählt ${b.counted}/${b.total}; Warnungen ${b.warn}`);
  check('5-B mit Level-Hilfe arenaTowerFix: weiter ein Turm, ein Werfer, Zählung stimmt (Hilfe harmlos), keine Warnung', b.resets === 1 && b.towers === 1 && b.werfer === 1 && b.riding === 1 && b.counted === b.total && b.left === b.total && b.warn === 0);
}

// ======================================================================== echte Level
if (PARTS.has('level')) {
  await load('5-5');
  const a = await sc(() => { const t = window.__t; t.place([6.8, 9.05, -119], { settle: 10 }); return t.detail(); });
  console.log(`  5-5 Farbfeld: ${a.calls} Aufrufe / ${k1(a.tris)}, Felder ${get(a, 'instanzen:switch_tile')[0]} Aufruf (einzeln ${get(a, 'modell:switch_tile')[0]})`);
  check('5-5: Farbfeld 3 × 3 als ein Zeichenaufruf', get(a, 'instanzen:switch_tile')[0] === 1 && get(a, 'modell:switch_tile')[0] === 0);
  await load('5-6');
  const b = await sc(() => {
    const t = window.__t, m = t.marks;
    t.place(m.checkpoint, { settle: 10 });
    const cp = t.detail();
    t.place(window.__course.level.data.start.pos, { settle: 10 });
    return { cp, st: t.detail() };
  });
  console.log(`  5-6: Checkpoint ${b.cp.calls} Aufrufe / ${k1(b.cp.tris)} (Flipper ${get(b.cp, 'flipper')[0]} / ${k1(get(b.cp, 'flipper')[1])}) · Start: Flipper ${get(b.st, 'flipper')[0]} / ${k1(get(b.st, 'flipper')[1])}`);
  check('5-6: Flipper-Felder außerhalb des Bildes zeichnen nicht (Checkpoint), im Bild schon (Start)', get(b.cp, 'flipper')[0] === 0 && get(b.st, 'flipper')[0] >= 2);
  await load('6-1');
  const c6 = await sc(() => { const t = window.__t; t.place([0, 1, 4], { settle: 10 }); return t.detail(); });
  const sk = get(c6, 'instanzen:stachelkugel');
  console.log(`  6-1 Start: ${c6.calls} Aufrufe / ${k1(c6.tris)}, Stachelkugeln sparsam ${c6.inst.lod}, Hauptpass ${sk[0]} / ${k1(sk[1])}`);
  check('6-1: ferne Stachelkugeln in der Detailstufe', c6.inst.lod >= 3);
}

// Konsole: nur Fehler/Warnungen seit dem letzten Laden zählen (5-B/6-1 bringen eigene Warnungen nicht mit)
const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
