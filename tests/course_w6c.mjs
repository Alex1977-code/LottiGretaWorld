// Welt 6, Level 6-5 „Pustewind am Eisgipfel“, 6-6 „Kanonenturm im Wolkenwerk“ und 6-Haus „Haus Volltreffer“ deterministisch
// prüfen (Simulation nur über window.__course.step(n) / setInput – echte Eingaben, kein Teleport auf den Routen):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot Lotti und
// Greta von Start bis Zielmast (6-5, 6-6), alle Sterne und Stempel mit der echten Mechanik samt Gegenproben, Extras,
// Prüfungs-Haus (alle fünf Räume mit Wurfbällen in je < 10 s, Gegenproben, Zeitablauf), Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w6c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w6c.mjs [6-5|6-6|6-Haus]
//   PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta ·
//   ONLY=<Text> (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> · DETAIL=1
//   (Zeichenaufrufe je Objekt) · RAUM=n (6-Haus: nur dieser Raum)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Auf den Routen ist die
// Figur unverwundbar (Treffer werden gezählt), damit Geometrie und Mechanik geprüft werden; im Prüfungs-Haus nicht.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4660;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const ALL = ['6-5', '6-6', '6-Haus'];
const LEVELS = only ? [only] : ALL;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots,haus,haus-extra').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;
const VERBOSE = !!process.env.VERBOSE;
const SAVE = 'lotti-greta-course-v1';

// ====================================================================== Seiten-Hilfen (allgemein)
/** In der Seite: window.__w6 mit place, stick, drive (Wegpunkte), chase, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = () => c.level;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const W = {
    P, L,
    place(pos, o = {}) {
      const p = P();
      c.setInput(null); c.setInput({});
      c.squad?.clear?.();
      if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
      p.setHero(o.hero ?? p.hero ?? 'lotti');
      p.dead = false;
      p.big = o.big ?? true;
      p.power = 'none'; p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.updateHalf?.();
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (L().runtime.status === 'dying') L().runtime.status = 'play';
      L().controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L().controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    rt: () => L().runtime.info(),
    info: () => P().info(),
    arch: () => c.arch?.info?.() ?? null,
    kinds: () => { const m = {}; for (const e of L().entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L().runtime.save.lives,
    named: (id) => { const e = L().named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L().entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      const acc = new Map();
      const orig = r.renderBufferDirect;
      r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
        const t0 = r.info.render.triangles;
        orig.call(this, camera, scene, geometry, material, object, group);
        const key = `${scene ? '' : 'S:'}${label(object)}`;
        const a = acc.get(key) ?? { calls: 0, tris: 0 };
        a.calls++; a.tris += r.info.render.triangles - t0;
        acc.set(key, a);
      };
      const f0 = v.frame;
      const wait = () => {
        if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; }
        r.renderBufferDirect = orig;
        res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[1] - x[1] || y[2] - x[2]).slice(0, 40));
      };
      requestAnimationFrame(wait);
    }),
  };
  window.__w6 = W;
  return Object.keys(W);
}

// ====================================================================== 6-Haus: Raum-Bot (in der Seite)
/**
 * window.__haus: solve(i) löst Raum i mit Wurfbällen (echte Eingaben: Stick, Sprung, Aktion), zählt Treffer und Würfe.
 * Hilfen: walkTo (Wegpunkt), grab (zum Ball, Aktion), throwToward (ein paar Schritte in Zielrichtung, Aktion), waitPlay.
 */
function installHaus() {
  const c = window.__course, W6 = window.__w6, L = c.level, H = L.data._haus;
  const A = () => c.arch.info();
  const zu = (i, u) => H.Z0[i] - u;
  const S = { hits: 0, lastInv: 0, throws: 0, jumps: 0 };
  const step = (inp) => {
    c.setInput(inp); c.step(1);
    const p = L.player;
    if (p.invuln > S.lastInv + 0.5 && !p.dead && A().phase === 'play') S.hits++;
    S.lastInv = p.invuln;
  };
  const live = (i) => A().room === i && A().phase === 'play' && !L.player.dead;
  const walkTo = (i, x, u, o = {}) => {
    const tz = zu(i, u);
    let n = 0;
    for (; n < (o.max ?? 600) && live(i); n++) {
      const p = L.player, dx = x - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
      if (d < (o.within ?? 0.3) && p.mode === 'ground') break;
      step({ ...W6.stick(dx, dz, Math.max(o.minMag ?? 0.25, Math.min(o.mag ?? 1, d / 1.0))), run: o.run ?? false });
    }
    return n;
  };
  const ball = (id) => L.named.get(id);
  /** Zum Ball gehen (er liegt danach vor der Brust), zu ihm drehen und aufheben. */
  const grab = (i, id) => {
    const b = ball(id);
    if (!b) return false;
    const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
    let n = 0;
    for (; n < 400 && live(i) && !L.player.holding; n++) {
      const p = L.player, dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.85 && p.mode === 'ground') {
        const err = Math.abs(wrap(Math.atan2(-dz, dx) - p.yaw));
        if (err > 0.08) { step({ ...W6.stick(dx, dz, 0.12) }); continue; }
        step({ action: true }); step({});
        continue;
      }
      step({ ...W6.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
    }
    if (L.player.holding && L.player.holding !== b) log.push(['falscher Ball', L.player.holding.spec?.id]);
    return L.player.holding === b;
  };
  /** In Richtung (tx, tz) drehen (sanft lenken, bis die Blickrichtung passt) und werfen. */
  const throwToward = (i, tx, tz, k = 8, mag = 0.35) => {
    const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
    for (let n = 0; n < Math.max(k, 30) && live(i); n++) {
      const p = L.player, want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
      if (n >= k && Math.abs(wrap(want - p.yaw)) < 0.025) break;
      step({ ...W6.stick(tx - p.pos.x, tz - p.pos.z, mag) });
    }
    step({ action: true }); step({});
    S.throws++;
  };
  const waitPlay = (i, max = 1500) => { let n = 0; while (!(A().room === i && A().phase === 'play') && n++ < max) step({}); return A().room === i && A().phase === 'play'; };
  const waitClear = (i, max = 1200) => {
    let n = 0;
    while (live(i) && n++ < max) step({});
    for (let k = 0; k < 240 && A().flying; k++) step({});   // Stern fliegt noch zur Figur
    return n;
  };
  const log = [];
  const solve = [
    // 1 Kullerbahn: Ball vom Balkon in die Rinne werfen – er rollt durchs Mauseloch auf den Stern
    (i) => {
      grab(i, 'r1_ball');
      walkTo(i, 0, 5.2, { within: 0.25, mag: 0.6 });
      throwToward(i, 0, zu(i, 20));
      log.push(['wurf1', +L.player.pos.x.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
    },
    // 2 Bühne frei: an das Kraftfeld, warten bis die Hebebühne oben ankommt, dann werfen
    (i) => {
      grab(i, 'r2_ball3');
      walkTo(i, 0, 7.4, { within: 0.25 });
      const lift = L.named.get('r2_buehne');
      const top = H.R2.liftHi + 0.5;
      let prev = lift.shape.y1, n = 0;
      for (; n < 900 && live(i); n++) {
        const y = lift.shape.y1;
        if (y > top - 0.12 && prev <= top - 0.12) break;   // gerade oben angekommen
        prev = y;
        step({});
      }
      throwToward(i, 0, zu(i, H.R2.lift), 4, 0.2);
      log.push(['wurf2', n]);
    },
    // 3 Sprungfeld: Ball holen, aufs Sprungfeld springen, im Scheitel werfen, dann den Stern über dem Sprungfeld holen
    (i) => {
      grab(i, 'r3_ball');
      walkTo(i, 0, H.R3.sprung - 2.0, { within: 0.3 });
      const tz = zu(i, H.R3.sprung);
      let n = 0, bounced = false, thrown = false, apex = 0;
      for (; n < 900 && live(i); n++) {
        const p = L.player;
        if (!bounced && p.jumpKind === 'bounce') bounced = true;
        if (bounced && !thrown && p.vel.y < 0.6) { apex = p.pos.y; step({ ...W6.stick(0, -1, 0.15), action: true }); step({}); S.throws++; thrown = true; continue; }
        const st = p.mode === 'air' ? W6.airSteer(0, tz, 0, 0, 3, 5) : W6.stick(-p.pos.x, tz - p.pos.z, 1);
        if (bounced && !thrown) { step({ ...W6.stick(0, -1, 0.15), jump: true }); continue; }
        step({ ...st, jump: p.mode === 'ground' ? n % 30 < 12 : true });
        if (thrown && p.mode === 'ground' && p.ground?.tag !== 'trampoline') break;
      }
      log.push(['sprung3', bounced, thrown, +apex.toFixed(2), L.named.get('r3_schalter')?.state]);
      // weiter hüpfen, bis der Stern eingesammelt ist
      for (let k = 0; k < 900 && live(i); k++) {
        const p = L.player;
        const st = p.mode === 'air' ? W6.airSteer(0, tz, 0, 0, 3, 5) : W6.stick(-p.pos.x, tz - p.pos.z, 1);
        step({ ...st, jump: p.mode === 'ground' ? k % 30 < 12 : false });
      }
    },
    // 4 Gehege: Ball ans Kraftfeld tragen, auf den POW-Block werfen
    (i) => {
      grab(i, 'r4_ball2');
      walkTo(i, 0, 6.6, { within: 0.25 });
      throwToward(i, 0, zu(i, H.R4.pow), 4, 0.2);
      log.push(['wurf4', L.named.get('r4_pow')?.n ?? null]);
    },
    // 5 Schießbude: fünf Bälle, fünf Scheiben (je ein Ball, ein Wurf)
    (i) => {
      H.ZIELE5.forEach(([x, u], k) => {
        if (!live(i)) return;
        const t0 = c.level.time;
        walkTo(i, H.BAELLE5[k], H.R5.baelle - 0.85, { within: 0.12, mag: 0.7 });
        const ok = grab(i, `r5_ball${k + 1}`);
        const t1 = c.level.time;
        throwToward(i, x, zu(i, u), 7, 0.3);
        for (let n = 0; n < (k === 4 ? 70 : 24) && live(i); n++) step({});
        log.push(['scheibe', k + 1, ok, +(t1 - t0).toFixed(2), L.targets?.ziele5?.n ?? 0, +L.player.pos.x.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
      });
      // Stern auf der Wurfbühne holen
      const st = L.entities.find((e) => e.kind === 'star' && e.index === 4 && !e.removed && !e.hidden);
      log.push(['stern5', !!st, A().time, st ? [+st.pos.x.toFixed(2), +st.pos.y.toFixed(2), +(H.Z0[i] - st.pos.z).toFixed(2), st.touch] : null]);
      if (st) walkTo(i, st.pos.x, H.Z0[i] - st.pos.z, { within: 0.2, max: 400 });
      log.push(['ende5', A().time, +L.player.pos.x.toFixed(2), +L.player.pos.y.toFixed(2), +(H.Z0[i] - L.player.pos.z).toFixed(2)]);
    },
  ];
  window.__haus = {
    solve: (i) => {
      log.length = 0;
      const h0 = S.hits, t0 = S.throws;
      if (!waitPlay(i)) return { error: 'kein Start', a: A() };
      const f0 = c.level.time;
      solve[i](i);
      waitClear(i);
      return { log: log.slice(), hits: S.hits - h0, throws: S.throws - t0, a: A(), t: +(c.level.time - f0).toFixed(2) };
    },
    step, waitPlay, walkTo, grab, throwToward, live, S, A, zu,
  };
  return true;
}

// ====================================================================== Laden
const allErrors = [];
let loaded = null;
async function load(id, o = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !o.fresh) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    const go = async (url) => { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } };
    if (o.fresh) {
      await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
    await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`);
    try {
      await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${id} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  await sc((h) => { const c = window.__course; c.setHero(h); c.level.runtime.save.lives = 9; }, o.hero ?? 'lotti');
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w6[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w6c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w6.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ====================================================================== 6-Haus
const HAUS_NAMES = ['Kullerbahn (Ball durchs Mauseloch auf den Stern)', 'Bühne frei (Stern auf der roten Hebebühne treffen)', 'Sprungfeld (vom Sprungfeld auf den Druckschalter)',
  'Pilzling-Gehege (Ball auf den POW-Block)', 'Schießbude (fünf Schalterscheiben)'];

async function haus() {
  const id = '6-Haus';
  console.log(`\n${id}: fünf Räume mit Wurfbällen`);
  for (const hero of HEROES) {
    if (!(await load(id, { fresh: true, hero }))) { check(`${id} lädt`, false); return; }
    if (hero === HEROES[0] && PARTS.has('load')) {
      const d = await sc(() => {
        const c = window.__course, L = c.level, D = L.data;
        return { title: D.title, theme: D.theme, music: D.music, arch: D.archetype, world: D.world, rooms: D.house.rooms.length, goals: D.house.rooms.map((r) => r.goal),
          times: D.house.rooms.map((r) => r.time), fail: D.house.fail, starCount: L.runtime.starCount, kinds: window.__w6.kinds(),
          tapeten: (() => { const n = new Set(); L.view.three.traverse((o) => { if (/^tapete:/.test(o.name)) n.add(o.name); }); return n.size; })(),
          felder: (() => { let n = 0; L.view.three.traverse((o) => { if (o.name === 'kraftfeld') n++; }); return n; })() };
      });
      console.log(`  „${d.title}“, Welt ${d.world}, Thema ${d.theme}, Musik ${d.music}, Räume ${d.rooms} (${d.goals.join(', ')}), Arten ${JSON.stringify(d.kinds)}`);
      check(`${id}: lädt ohne Konsolenfehler/-warnungen`, errors.length === 0);
      for (const e of errors.slice(0, 8)) console.log('     ', e);
      check(`${id}: „Haus Volltreffer“, Welt 6, Archetyp house, Thema house, Musik course_house, 5 Räume à 10 s, 5 Sterne, fail 'exit'`,
        d.title === 'Haus Volltreffer' && d.world === 6 && d.arch === 'house' && d.theme === 'house' && d.music === 'course_house' && d.rooms === 5 && d.times.every((t) => t === 10) && d.fail === 'exit' && d.starCount === 5);
      check(`${id}: Ziele reach, reach, reach, defeatAll, reach`, d.goals.join() === 'reach,reach,reach,defeatAll,reach');
      check(`${id}: Wurfbälle 14, Zielscheiben 5, Druckschalter 1, POW 1, Pilzlinge 6 (${JSON.stringify(d.kinds)})`,
        d.kinds.wurfball === 14 && d.kinds.zielscheibe === 5 && d.kinds.pswitch === 1 && d.kinds.pow === 1 && d.kinds.pilzling === 6);
      check(`${id}: fünf eigene Tapeten, drei Kraftfelder (${d.tapeten}, ${d.felder})`, d.tapeten === 5 && d.felder === 3);
    }
    await sc(installHaus);
    const RAUM = process.env.RAUM ? Number(process.env.RAUM) - 1 : null;
    const r = await sc((R) => {
      const c = window.__course, Hs = window.__haus;
      const out = [];
      for (let i = 0; i < 5; i++) {
        if (R !== null && i !== R) { if (i < R) { c.arch.enterRoom(i + 1); } continue; }
        if (R !== null && i === R && c.arch.info().room !== i) c.arch.enterRoom(i);
        const res = Hs.solve(i);
        out.push({ room: i, cleared: c.arch.info().cleared, ...res, stars: c.level.runtime.stars.slice(0, 5) });
        Hs.step({});
      }
      for (let i = 0; i < 1800 && !c.finished && R === null; i++) Hs.step({});
      return { out, finished: c.finished, res: c.lastResult ?? null, a: c.arch.info(), save: window.__w6.save().levels?.['6-Haus'] ?? null };
    }, RAUM);
    for (const o of r.out) {
      const ok = o.stars[o.room] && !o.error && o.t < 10 && o.hits === 0;
      check(`${id}: ${hero} Raum ${o.room + 1} ${HAUS_NAMES[o.room]} in ${o.t} s (< 10 s, Würfe ${o.throws}, Treffer ${o.hits})`, ok);
      if (VERBOSE || !ok) console.log(`     Raum ${o.room + 1}: ${JSON.stringify(o.log)} ${JSON.stringify(o.a)}`);
    }
    if (RAUM === null) check(`${id}: ${hero} Ergebnis 5/5 gespeichert (${(r.res?.stars ?? []).map(Number).join('')})`, r.finished && r.res?.stars?.filter(Boolean).length === 5 && r.save?.stars?.filter(Boolean).length === 5 && !r.a.exited);
  }
}

// ====================================================================== Ablauf
for (const id of LEVELS) {
  if (id === '6-Haus') {
    if (PARTS.has('haus') || PARTS.has('load')) await haus();
    continue;
  }
}

if (stats.length) {
  console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
  for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
  const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
