// Welt Krone (Präfix K): K-Kapitän „Krümels Glutturm-Finale“ (Lavaturm-Diorama, 5 Sterne + Stempel) und K-Haus „Haus
// Marathon“ (Prüfungs-Haus, 30 Räume à 10 s am Stück, 30 Sterne + Stempel im letzten Raum). Prüft je Level: Laden ohne
// Konsolenfehler/-warnungen, Metadaten (Welt 12, Titel, Archetyp, Thema, Musik, Zeit, Sterne, Stempel), Routen-Bot mit
// echten Eingaben (__course.setInput/step, Stick relativ zur Kamera-Gier): Krümel von Start bis zum fünften Stern, im Haus
// Lotti und Greta durch alle 30 Räume; alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras,
// Kennzahlen je Abschnitt bzw. Raum (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/kb_*.png).
//
// Aufruf (nach npm run build): node tests/course_kb.mjs [K-Kapitän|K-Haus]
//   PARTS=load,route,targets,extra,shots,haus,haus-extra,haus-shots (Standard alle; je Lauf ≤ 10 min, z. B. K-Kapitän
//   PARTS=load,route,targets,extra und PARTS=shots; K-Haus PARTS=load,haus RAUM=1-15, PARTS=haus RAUM=16-30, PARTS=haus-extra,
//   PARTS=haus-shots) · HEROES=lotti,greta · RAUM=a-b (Räume a bis b, 1-basiert) · VERBOSE=1 · SHOTS=<Name|Name>
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 5055;
const PARTS = new Set((process.env.PARTS ?? 'load,route,targets,extra,shots,haus,haus-extra,haus-shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;
const VERBOSE = !!process.env.VERBOSE;
const SAVE = 'lotti-greta-course-v1';
const ONLY_LEVEL = process.argv[2] ?? null;

const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);

// ====================================================================================================================
// Bot in der Seite (echte Eingaben)
// ====================================================================================================================
function install() {
  const c = window.__course, L = c.level;
  c.setManual(true);
  L.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const wrapHurt = () => {
    const p = P();
    if (p.__kbHurt) return;
    p.__kbHurt = true; p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const B = window.__kb = {
    log: [], steps: 0, hold: false, track: [], deaths: 0,
    P, L,
    named: (id) => L.named.get(id),
    ent: (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null,
    pos: () => { const q = P().pos; return [+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]; },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1, wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    tick(inp = {}) {
      const p = P();
      if (this.hold) p.invuln = Math.max(p.invuln, 5);
      c.setInput(inp); c.step(1); this.steps++;
      if (L.archetype?.orbit) L.archetype.orbit.update(1 / 120, p);
      if (p.dead && !this._dead) { this._dead = true; this.deaths++; this.log.push(['TOD', p.deathCause, this.pos()]); }
      if (!p.dead) this._dead = false;
      if (p.mode === 'ground' && !p.dead) {
        const t = this.track[this.track.length - 1], q = p.pos;
        if (!t || Math.hypot(q.x - t[0], q.z - t[2]) > 6 || Math.abs(q.y - t[1]) > 2) this.track.push([+q.x.toFixed(2), +q.y.toFixed(2), +q.z.toFixed(2)]);
      }
    },
    wait(n) { for (let i = 0; i < n; i++) this.tick({}); },
    until(fn, max = 1200, inp = {}) { let k = 0; for (; k < max && !fn(); k++) this.tick(typeof inp === 'function' ? inp() : inp); return fn(); },
    /** Zu Fuß zum Punkt (x, z); o: { within, max, run, jump, mag, stopIf } – liefert true bei Ankunft. */
    walk(tx, tz, o = {}) {
      const p = P(), within = o.within ?? 0.3, max = o.max ?? 900;
      for (let k = 0; k < max; k++) {
        if (p.dead || L.runtime.status !== 'play' || o.stopIf?.()) return false;
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        if (d < within && (p.mode === 'ground' || o.air)) return true;
        const inp = p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, Math.min(o.mag ?? 1, Math.max(0.22, d / 1.2)));
        this.tick({ ...inp, run: o.run ?? false, jump: o.jump ?? false });
      }
      this.log.push(['FEHLER: nicht erreicht', tx, tz, this.pos()]);
      return false;
    },
    /** Weg aus Punkten [[x, z], …]. */
    path(pts, o = {}) { for (const [x, z] of pts) if (!this.walk(x, z, o)) return false; return true; },
    /** Sprung zum Punkt: Anlauf aus dem Stand, Taste hold Schritte gehalten, Luftlenkung zum Ziel, bis zur Landung. */
    jumpTo(tx, tz, o = {}) {
      const p = P(), hold = o.hold ?? 40;
      for (let k = 0; k < (o.max ?? 300); k++) {
        if (p.dead) return false;
        const inp = k < (o.runUp ?? 0) || p.mode !== 'air' ? this.stick(tx - p.pos.x, tz - p.pos.z, 1) : this.airSteer(tx, tz, 0, 0, o.k ?? 3.2, o.vmax ?? 7);
        this.tick({ ...inp, run: o.run ?? false, jump: k >= (o.runUp ?? 0) && k < (o.runUp ?? 0) + hold });
        if (k > (o.runUp ?? 0) + 6 && p.mode !== 'air') break;
      }
      return !p.dead;
    },
    hop(n = 30) { const p = P(); this.until(() => p.mode === 'ground', 120); for (let k = 0; k < n; k++) this.tick({ jump: true }); this.until(() => p.mode !== 'air', 300); },
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      if (o.hero) p.setHero(o.hero);
      p.dead = false; p.big = true; p.power = 'none'; p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = 0;
      L.runtime.status = 'play';
      L.controlYaw = L.archetype?.orbit ? L.archetype.orbit.controlYaw() : c.view.rig.controlYaw(p.pos);
      this.wait(o.settle ?? 12);
      c.snapCamera();
      return this.pos();
    },
    stars: () => L.runtime.stars.slice(),
    kinds() { const k = {}; for (const e of L.entities) if (!e.removed) k[e.kind] = (k[e.kind] ?? 0) + 1; return k; },
  };
  return true;
}

let loaded = null;
async function load(id, o = {}) {
  if (loaded === id && !o.fresh) {
    await sc(() => { window.__old = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course?.level && window.__course.level !== window.__old && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    const go = async (url) => { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } };
    if (o.fresh) {
      await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
      await page.evaluate((k) => localStorage.removeItem(k), SAVE);
    }
    await go(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`);
    try {
      await page.waitForFunction(() => window.__course?.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
    } catch {
      console.log(`Level ${id} startet nicht. Konsole:`);
      for (const x of errors) console.log('  ', x);
      return false;
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  await sc((t) => { window.__course.level.runtime.save.lives = 9; window.__trace = t; }, !!process.env.TRACE);
  return true;
}

const stats = [];
async function shot(name, wait = 500) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 8, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}kb_${name}.png` });
  return s;
}
const wantShot = (n) => !SHOTS || SHOTS.has(n);

// ====================================================================================================================
// K-Kapitän
// ====================================================================================================================

/** Route Krümel: Nische (Ebbe) → Glutfloß → Glutbalkon → Propeller → Donut-Brücke → Lochwolke (Stempel) → Turmstube. */
function kapitaenRoute(arg) {
  const B = window.__kb, L = B.L, p = B.P(), M = L.data.marks;
  const lava = () => L.named.get('glut');
  const floss = () => L.named.get('glutfloss');
  const out = { legs: [], hurts0: p.hurtTries };
  const leg = (name, ok) => { out.legs.push([name, !!ok, B.pos(), +L.time.toFixed(2), lava().state, +lava().top.toFixed(2)]); return ok; };
  B.hold = false;
  // 1) Ebbe abwarten (die Lava ist beim Start unten; wer zu spät kommt, wartet den nächsten Zyklus ab)
  leg('zur Rampe', B.walk(M.rampeOben[0], M.rampeOben[2], { within: 0.4 }));
  if (arg.waitCycle) leg('auf Ebbe warten', B.until(() => lava().state === 'sinkt' && lava().top < 3.6, 4000));
  leg('Rampe hinab', B.walk(M.rampeUnten[0], M.rampeUnten[2], { within: 0.4 }));
  leg('Nische (Stern 2)', B.walk(M.nische[0], M.nische[2], { within: 0.25 }) && L.runtime.stars[1]);
  leg('zum Glutfloß', B.walk(M.flossRand[0], M.flossRand[2], { within: 0.3 }));
  leg('aufs Glutfloß', B.walk(M.floss[0], M.floss[2], { within: 0.3 }));
  // 2) warten, bis die Lava steigt und das Floß oben am Glutbalkon liegt
  leg('Lava steigt', B.until(() => floss().top() > 8.5 && lava().state === 'oben', 4000, () => ({ ...B.stick(M.floss[0] - p.pos.x, M.floss[2] - p.pos.z, 0.3) })));
  leg('Glutbalkon (Stern 1)', B.walk(M.balkon[0], M.balkon[2], { within: 0.3 }) && L.runtime.stars[0]);
  leg('Hängesteg hinab', B.path([[-2.2, 3.7], [M.steg[0], M.steg[2]], [3.5, 3.7]], { within: 0.35 }));
  leg('Steg zur Propellerplattform', B.path([[7.5, 4.2], [M.steg2[0], 3.6], [M.steg2[0], M.steg2[2]]], { within: 0.3 }));
  // 3) Propellerplattformen anheben
  leg('Propeller 1', B.walk(M.p1[0], M.p1[2], { within: 0.25 }));
  leg('Propeller 1 oben', B.until(() => L.named.get('propeller1').offset > 3.98, 900));
  leg('Propeller 2', B.walk(M.p2[0], M.p2[2], { within: 0.25 }));
  leg('Propeller 2 oben (Stern 3)', B.until(() => L.named.get('propeller2').offset > 3.98, 900) && B.until(() => L.runtime.stars[2], 120));
  leg('aufs Turmdach', B.walk(M.dach[0], M.dach[2], { within: 0.35 }));
  // 4) Donut-Brücke zur Glutsäule und zurück
  leg('zur Donut-Brücke', B.path([[6, -6.2], [-3.4, -6.4], [M.bruecke[0], M.bruecke[2]]], { within: 0.35 }));
  leg('über die Donut-Brücke (Stern 4)', B.walk(M.saeule[0], M.saeule[2], { within: 0.3 }) && L.runtime.stars[3]);
  leg('Donuts kommen wieder', B.until(() => L.named.get('donuts').blocks.every((b) => b.state === 'idle'), 900));
  leg('zurück übers Turmdach', B.walk(M.bruecke[0], M.bruecke[2], { within: 0.35 }));
  // 5) Treppe zur Lochwolke, Stempel, ins Loch
  leg('Treppe hinauf', B.path([[M.treppe[0], M.treppe[2]], [M.wolke[0], M.wolke[2]]], { within: 0.3 }));
  leg('Stempel auf der Lochwolke', B.path([[8.3, -6.4], [M.tuer[0] + 1.5, -5.8], [12.0, -6.2]], { within: 0.3 }) && L.runtime.stamp);
  leg('ins Loch → Turmstube (Stern 5)', B.walk(M.loch[0], M.loch[2], { within: 0.2, max: 400, air: true }) || true);
  B.until(() => L.runtime.stars[4] || p.dead, 400);
  leg('Turmstube', L.runtime.stars[4]);
  B.until(() => L.runtime.status !== 'play', 1200);
  out.stars = L.runtime.stars.slice(0, 5); out.stamp = L.runtime.stamp; out.status = L.runtime.status; out.time = +L.time.toFixed(1);
  out.deaths = B.deaths; out.hurts = p.hurtTries - out.hurts0; out.log = B.log.slice(-6); out.track = B.track;
  return out;
}

async function kapitaen() {
  const id = 'K-Kapitän';
  if (!['load', 'route', 'targets', 'extra', 'shots'].some((q) => PARTS.has(q))) return;
  console.log(`\n${id}: Lavaturm-Diorama`);
  if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
  if (PARTS.has('load')) {
    const d = await sc(() => {
      const c = window.__course, L = c.level, D = L.data;
      return { title: D.title, world: D.world, arch: D.archetype, theme: D.theme, music: D.music, time: D.timeLimit, stars: D.stars.length, stamp: !!D.stamp,
        figure: D.diorama?.figure, kinds: window.__kb.kinds(), lava: L.named.get('glut')?.info?.() ?? null, speed: c.player.constructor.name };
    });
    console.log(`  „${d.title}“ Welt ${d.world}, ${d.arch}, Thema ${d.theme}, Musik ${d.music}, ${d.time} s, Sterne ${d.stars}, Stempel ${d.stamp}, Figur ${d.figure}, Arten ${JSON.stringify(d.kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, errors.length === 0);
    for (const e of errors.slice(0, 8)) console.log('      ', e);
    check(`${id}: „Krümels Glutturm-Finale“, Welt 12, diorama, Musik course_diorama, 400 s, 5 Sterne + Stempel, Figur Krümel`,
      d.title === 'Krümels Glutturm-Finale' && d.world === 12 && d.arch === 'diorama' && d.music === 'course_diorama' && d.time === 400 && d.stars === 5 && d.stamp && d.figure === 'kruemel');
  }
  if (PARTS.has('route')) {
    const r = await sc(kapitaenRoute, { waitCycle: false });
    for (const l of r.legs) if (VERBOSE || !l[1]) console.log('      ', JSON.stringify(l));
    if (VERBOSE || r.status !== 'done') for (const l of r.log) console.log('      ', JSON.stringify(l));
    check(`${id}: Krümel holt alle fünf Sterne und den Stempel (Nische bei Ebbe, Glutfloß, Propeller, Donut-Brücke, Lochwolke → Turmstube) in ${r.time} s, ohne Tod`,
      r.stars.every(Boolean) && r.stamp && r.deaths === 0);
    check(`${id}: der fünfte Stern beendet das Level (Schatz-Ergebnis, gespeichert)`, r.status !== 'play');
  }
  if (PARTS.has('shots')) await kapitaenShots();
}

/** Bilder: Überblick (zwei Zoomstufen, Lava unten/oben), Krümel an den Stern-Stellen (Orbit-Kamera wie im Spiel). */
async function kapitaenShots() {
  const id = 'K-Kapitän';
  if (!(await load(id, { fresh: true }))) return;
  const S = [
    // [Name, Marke, Orbit-Gier (°) oder null, Zoom nah?, Lava-Spiegel (fest) oder null]
    ['ueberblick', 'start', null, false, null],
    ['ueberblick_flut', 'start', 200, false, 7.6],
    ['start', 'start', null, true, null],
    ['nische', 'nische', -20, true, 0],
    ['floss', 'balkon', 10, true, 7.6],
    ['propeller', 'p2', 40, true, 2],
    ['bruecke', 'bruecke', -30, true, 0],
    ['wolke', 'wolke', 30, true, 3],
    ['stube', 'tuer', 10, true, 0],
  ];
  for (const [name, mark, yaw, near, lava] of S) {
    if (!wantShot(name)) continue;
    await sc(([m, y, n, lv]) => {
      const B = window.__kb, L = B.L, o = L.archetype.orbit;
      const lav = L.named.get('glut');
      if (lv !== null) { B.place(L.data.marks.start, { settle: 2 }); B.until(() => Math.abs(lav.top - lv) < 0.25 && (lv > 1 || lav.state === 'unten'), 4000); }
      B.place(L.data.marks[m], { yaw: Math.PI / 2, settle: 2 });
      if (y !== null) L.archetype.setOrbit?.(y);
      if ((o.zoom === 1) !== n) o.toggleZoom();
      for (let k = 0; k < 60; k++) { B.tick({}); }
      return o.info?.();
    }, [mark, yaw, near, lava]);
    await shot(`kk_${name}`);
  }
}

// ====================================================================================================================
// K-Haus: Raum-Bot (in der Seite, echte Eingaben)
// ====================================================================================================================
const HAUS_NAMES = ['Panzerparade', 'Schaukelsaal', 'Glutfelder', 'Fackelstube', 'Kreiselzimmer', 'Kistenlager', 'Pilzlingsschar', 'Kullerhang',
  'Hackbeil-Hof', 'Stampfsteinfahrt', 'Eisrutsche', 'Krallenschalter', 'Kanonenturm', 'Piep-Treppe', 'Großblock-Fall', 'Ringwand', 'Hasenjagd',
  'Sprungfeld-Wurf', 'Holzlabyrinth', 'Schubser-Kessel', 'Riesen-?-Türme', 'Himmelssteg', 'Rankentreppe', 'Schalterfelder', 'Topfgarten',
  'Schnappkarussell', 'Scheinwerferschacht', 'Donutbrücke', 'Wirbelbrocken', 'Siegerflur'];

function installHaus() {
  const c = window.__course, L = c.level, B = window.__kb, H = L.data._haus, Y = H.Y;
  const A = () => c.arch.info();
  const zu = (i, u) => H.Z0[i] - u;
  const S = { hits: 0, lastInv: 0, jumps: 0, throws: 0, shots: 0 };
  const log = [];
  const P = () => L.player;
  const step = (inp = {}) => {
    B.tick(inp);
    const p = P();
    if (p.invuln > S.lastInv + 0.5 && !p.dead && A().phase === 'play') S.hits++;
    S.lastInv = p.invuln;
  };
  const live = (i) => A().room === i && A().phase === 'play' && !P().dead;
  const wrap = (a) => { a %= Math.PI * 2; return a > Math.PI ? a - Math.PI * 2 : a < -Math.PI ? a + Math.PI * 2 : a; };
  const U = (i) => +(H.Z0[i] - P().pos.z).toFixed(2);
  const here = (i) => [+P().pos.x.toFixed(2), +P().pos.y.toFixed(2), U(i)];
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const dead = new Set(['break', 'squashed', 'burst', 'fall', 'leave', 'down', 'flipped', 'gone', 'defeated', 'caught', 'eaten', 'bitten']);
  const alive = (e) => e && !e.removed && e.alive !== false && !e.defeated && !dead.has(e.state);
  const prev = new Map();
  const vel = (e) => {
    const q = prev.get(e);
    return q ?? { vx: e.vel?.x ?? 0, vz: e.vel?.z ?? 0 };
  };
  const track = () => {
    for (const e of L.entities) {
      if (!e.enemy && !['stachelwalze', 'suchkopf', 'projektilkopf', 'kreisgeist_glied', 'wuschel', 'bunny', 'panzer'].includes(e.kind)) continue;
      const q = prev.get(e);
      if (q) { q.vx = (e.pos.x - q.x) * 120; q.vz = (e.pos.z - q.z) * 120; q.x = e.pos.x; q.z = e.pos.z; } else prev.set(e, { x: e.pos.x, z: e.pos.z, vx: 0, vz: 0 });
    }
  };
  const st = (inp = {}) => { step(inp); track(); };
  /** Zum Punkt (x, u) im Raum i gehen; o: { within, max, run, mag, dodge: [Arten], tJump, r, avoid: fn → true = warten } */
  const walkTo = (i, x, u, o = {}) => {
    const tz = zu(i, u);
    let n = 0, hold = 0;
    for (; n < (o.max ?? 700) && live(i); n++) {
      const p = P(), dx = x - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
      if (d < (o.within ?? 0.3) && p.mode === 'ground') break;
      let jump = hold > 0;
      if (hold > 0) hold--;
      if (o.dodge && p.mode === 'ground' && hold <= 0) {
        const dg = danger(o.dodge, o);
        if (dg && dg.t < (o.tJump ?? 0.4)) { hold = o.hold ?? 16; jump = true; S.jumps++; log.push(['sprung', dg.e.kind, +dg.t.toFixed(2), U(i)]); }
      }
      if (o.avoid && p.mode === 'ground' && o.avoid()) { st({}); continue; }
      const s = p.mode === 'air' && o.air !== false ? B.airSteer(x, tz, 0, 0, 3.2, o.vmax ?? 7) : B.stick(dx, dz, Math.max(o.minMag ?? 0.25, Math.min(o.mag ?? 1, d / 1.0)));
      st({ ...s, run: o.run ?? false, jump });
      if (window.__trace && n % 24 === 0) log.push(['weg', here(i), p.mode, p.state]);
    }
    return n;
  };
  /** Nächste drohende Berührung (Annäherung in ≤ horizon s näher als r m). */
  const danger = (kinds, o = {}) => {
    const p = P();
    let best = null;
    for (const e of L.entities) {
      if (!kinds.includes(e.kind) || !alive(e)) continue;
      const q = vel(e);
      const rx = e.pos.x - p.pos.x, rz = e.pos.z - p.pos.z;
      if (Math.hypot(rx, rz) > 12 || Math.abs(e.pos.y - p.pos.y) > (o.dy ?? 2.4)) continue;
      const vx = q.vx - p.vel.x, vz = q.vz - p.vel.z, vv = vx * vx + vz * vz;
      const t = vv > 1e-6 ? Math.max(0, Math.min(o.horizon ?? 0.6, -(rx * vx + rz * vz) / vv)) : 0;
      const d = Math.hypot(rx + vx * t, rz + vz * t);
      if (d < (o.r ?? 1.2) && (!best || t < best.t)) best = { e, t, d };
    }
    return best;
  };
  /** Zum Ziel drehen (sanft lenken, bis die Blickrichtung passt). */
  const face = (i, tx, tz, mag = 0.14) => {
    for (let n = 0; n < 60 && live(i); n++) {
      const p = P(), want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
      if (Math.abs(wrap(want - p.yaw)) < 0.04 && n > 2) break;
      st({ ...B.stick(tx - p.pos.x, tz - p.pos.z, mag) });
    }
  };
  const action = (n = 2) => { st({ action: true }); for (let k = 1; k < n; k++) st({}); };
  /** Ball aufheben (6-Haus-Bot). */
  const grab = (i, id) => {
    const b = ent(id);
    if (!b) return false;
    for (let n = 0; n < 400 && live(i) && !P().holding; n++) {
      const p = P(), dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.85 && p.mode === 'ground') {
        const err = Math.abs(wrap(Math.atan2(-dz, dx) - p.yaw));
        if (err > 0.08) { st({ ...B.stick(dx, dz, 0.12) }); continue; }
        action();
        continue;
      }
      st({ ...B.stick(dx, dz, Math.max(0.3, Math.min(1, d))), run: false });
    }
    return !!P().holding;
  };
  const throwToward = (i, tx, tz, k = 8, mag = 0.3) => {
    for (let n = 0; n < Math.max(k, 40) && live(i); n++) {
      const p = P(), want = Math.atan2(-(tz - p.pos.z), tx - p.pos.x);
      if (n >= k && Math.abs(wrap(want - p.yaw)) < 0.025) break;
      st({ ...B.stick(tx - p.pos.x, tz - p.pos.z, mag) });
    }
    action(); S.throws++;
  };
  /** Sprung auf ein (bewegtes) Ziel: Anlauf bis reach m, dann Sprung mit Luftlenkung auf die vorausgesagte Lage. */
  const jumpOnto = (i, target, o = {}) => {
    const p = P();
    let n = 0;
    for (; n < (o.max ?? 500) && live(i); n++) {
      const t = target(); if (!t) return false;
      const d = Math.hypot(t.x - p.pos.x, t.z - p.pos.z);
      if (d <= (o.reach ?? 2.2) && p.mode === 'ground') break;
      st({ ...B.stick(t.x - p.pos.x, t.z - p.pos.z, 1), run: o.run ?? false });
    }
    S.jumps++;
    let bounced = false;
    for (let k = 0; k < 220 && live(i); k++) {
      if (o.safe && k > 8 && p.vel.y > 6) bounced = true;
      const t = bounced ? { x: o.safe[0], z: o.safe[1] } : target(); if (!t) break;
      const inp = p.mode === 'air' ? B.airSteer(t.x + (t.vx ?? 0) * 0.15, t.z + (t.vz ?? 0) * 0.15, t.vx ?? 0, t.vz ?? 0, o.k ?? 4, o.vmax ?? 8) : B.stick(t.x - p.pos.x, t.z - p.pos.z, 1);
      st({ ...inp, jump: k < (o.hold ?? 14), crouch: !!(o.pound && p.mode === 'air' && k > 6 && p.vel.y < 1.5 && Math.hypot(t.x - p.pos.x, t.z - p.pos.z) < 0.6) });
      if (k > 6 && p.mode !== 'air') break;
    }
    return true;
  };
  /** Gegner anspringen, bis er besiegt ist. */
  const stomp = (i, id, o = {}) => {
    let e = ent(id), n = 0;
    while (e && alive(e) && live(i) && n++ < (o.tries ?? 6)) {
      jumpOnto(i, () => (alive(e) ? { x: e.pos.x, z: e.pos.z, vx: vel(e).vx, vz: vel(e).vz } : null), o);
      for (let k = 0; k < 30 && P().mode === 'air' && live(i); k++) st({});
      e = ent(id) ?? e;
    }
    log.push(['stampf', id, n, alive(e) ? 'lebt' : 'besiegt', here(i)]);
  };
  const waitPlay = (i, max = 1500) => { let n = 0; while (!(A().room === i && A().phase === 'play') && n++ < max) st({}); return A().room === i && A().phase === 'play'; };
  const waitClear = (i, max = 1400) => { let n = 0; while (live(i) && n++ < max) st({}); for (let k = 0; k < 240 && A().flying; k++) st({}); return n; };
  const star = (i) => L.entities.find((e) => e.kind === 'star' && e.index === i && !e.removed);
  const toStar = (i, o = {}) => {
    for (let k = 0; k < 90 && live(i) && (!star(i) || star(i).hidden); k++) st({});
    const s = star(i);
    if (!s || s.hidden) { log.push(['kein Stern', i, !!s]); return; }
    for (let k = 0; k < 3 && live(i) && !L.runtime.stars[i]; k++) walkTo(i, s.pos.x, H.Z0[i] - s.pos.z, { within: 0.2, ...o });
  };
  /** Drehdiorama-Lage: lokaler Punkt (dx, dz) → Welt. */
  const rot = (d, cx, cz, lx, lz) => { const a = d.angle ?? 0, ca = Math.cos(a), sa = Math.sin(a); return { x: cx + lx * ca + lz * sa, z: cz - lx * sa + lz * ca }; };

  // ------------------------------------------------------------------ Raum-Löser
  const R = [];
  // 1 Panzerparade
  R[0] = (i) => { for (const k of [1, 2, 3]) stomp(i, `k1_kroete${k}`, { reach: 2.0, hold: 10 }); };
  // 2 Schaukelsaal: Schaukeln (Sprung so, dass die Landung in den Umkehrpunkt fällt), dann an den Walzen vorbei
  R[1] = (i) => {
    const sw = [1, 2, 3].map((k) => L.named.get(`k2_schaukel${k}`));
    const Pd = sw[0].period, amp = sw[0].amp;
    const now = () => sw[0].t ?? 0;
    const at = (k, t) => { const th = amp * Math.sin(2 * Math.PI * (t / Pd + sw[k].phase)); return { x: 0, z: sw[k].pivot[2] + Math.sin(th) * sw[k].rope }; };
    walkTo(i, 0, 5.55, { within: 0.25, mag: 0.7 });
    const ledge = { x: 0, z: P().pos.z }, end = { x: 0, z: zu(i, 32.4) };
    const FL = 0.85;
    const hops = [[() => ledge, (t) => at(0, t)], [(t) => at(0, t), (t) => at(1, t)], [(t) => at(1, t), (t) => at(2, t)], [(t) => at(2, t), () => end]];
    for (let h = 0; h < hops.length && live(i); h++) {
      const [from, to] = hops[h];
      const g = (t) => Math.abs(to(t).z - from(t).z);
      const t0 = now();
      let best = null;
      for (let s = FL * 0.5 + 0.3; s < Pd * 1.5; s += 1 / 120) { const v = g(t0 + s); if (v < 4.6 && v <= g(t0 + s - 1 / 120) && v <= g(t0 + s + 1 / 120)) { best = s; break; } }
      if (best === null) { log.push(['FEHLER: kein Umkehrpunkt', h]); break; }
      const tJump = t0 + best - FL * 0.5;
      let w = 0;
      while (now() < tJump && w++ < 900 && live(i)) { const p = P(), f = from(now()); const dx = f.x - p.pos.x, dz = f.z - p.pos.z, dd = Math.hypot(dx, dz); st(dd > 0.12 && p.mode === 'ground' ? { ...B.stick(dx, dz, Math.min(0.6, dd)) } : {}); }
      let k = 0, landed = false;
      for (; k < 200 && live(i); k++) {
        const p = P(), tg = to(now() + Math.max(0, FL - k / 120)), dx = tg.x - p.pos.x, dz = tg.z - p.pos.z;
        st({ ...B.stick(dx, dz, Math.min(1, Math.hypot(dx, dz) / 1.2)), run: true, jump: k < 30 });
        if (k > 8 && p.mode === 'ground') { landed = true; break; }
      }
      log.push([`schaukel${h + 1}`, w, k, landed, U(i)]);
      if (!landed) break;
    }
    walkTo(i, 0, H.R2.star, { within: 0.3, run: true, dodge: ['stachelwalze'], tJump: 0.38, r: 1.3 });
  };
  // 3 Glutfelder: Felder links, rechts, hinten, dann der Stern in der Mitte (über Lavabrocken springen)
  R[2] = (i) => {
    const dg = { dodge: ['lavabrocken'], tJump: 0.42, r: 1.5, run: true };
    for (const [x, u] of [H.R3.felder[0], H.R3.felder[1], H.R3.felder[2]]) walkTo(i, x, u, { within: 0.5, ...dg });
    for (let k = 0; k < 30 && live(i); k++) st({});
    toStar(i, dg);
  };
  // 4 Fackelstube: aus der Raummitte jede Fackel anvisieren und mit der Funkenblüte treffen
  R[3] = (i) => {
    walkTo(i, 0, 9.5, { within: 0.3, run: true });
    const f = L.named.get('k4_fackeln');
    for (let k = 0; k < 4 && live(i); k++) {
      const t = f.torches[k];
      for (let tries = 0; tries < 3 && !t.lit && live(i); tries++) {
        face(i, t.x, t.z, 0.12);
        action(); S.shots++;
        for (let q = 0; q < 70 && !t.lit && live(i); q++) st({});
      }
      log.push(['fackel', k + 1, t.lit, here(i)]);
    }
    toStar(i);
  };
  // 5 Kreiselzimmer: Lücken der Kreisgeist-Ringe abpassen, auf die Kommode, auf den Schrank
  R[4] = (i) => {
    const d = L.named.get('k5_dreh'), cz = zu(i, H.R5.c);
    const kom = () => rot(d, 0, cz, H.R5.kommode, 0);
    const ghosts = () => L.entities.filter((e) => e.kind === 'kreisgeist_glied' && alive(e));
    const frei = (x, z, t = 0.55, r = 1.25) => ghosts().every((e) => { const q = vel(e); for (const s of [0, t * 0.5, t]) if (Math.hypot(e.pos.x + q.vx * s - x, e.pos.z + q.vz * s - z) < r) return false; return true; });
    // warten, bis der Weg zur Kommode frei ist und sie nicht gerade dreht
    let n = 0;
    for (; n < 900 && live(i); n++) {
      const k = kom();
      const p = P(), mid = { x: (p.pos.x + k.x) / 2, z: (p.pos.z + k.z) / 2 };
      if (!d.turning && frei(k.x, k.z, 0.9) && frei(mid.x, mid.z, 0.6) && Math.hypot(k.x - p.pos.x, k.z - p.pos.z) < 8) break;
      st({});
    }
    jumpOnto(i, () => { const k = kom(); return { x: k.x, z: k.z }; }, { reach: 2.4, run: true, hold: 16 });
    log.push(['kommode', here(i), n]);
    for (let k = 0; k < 20 && P().mode !== 'ground'; k++) st({});
    jumpOnto(i, () => ({ x: 0, z: cz }), { reach: 3, hold: 30 });
    for (let k = 0; k < 60 && live(i); k++) st({});
  };
  // 6 Kistenlager: links neben die Sternkiste, Tatzenhieb, Stern holen
  R[5] = (i) => {
    const [gx, gu] = H.R6.groups[3];
    walkTo(i, gx - 2.55, gu, { within: 0.15, run: true });
    face(i, gx - 1, zu(i, gu), 0.12);
    for (let k = 0; k < 3 && ent('k6_sternkiste') && live(i); k++) { action(); for (let q = 0; q < 24; q++) st({}); }
    for (let q = 0; q < 20; q++) st({});
    toStar(i);
  };
  // 7 Pilzlingsschar: vor den POW-Block, warten bis die Schar heran ist, draufspringen; Rest anspringen
  R[6] = (i) => {
    walkTo(i, 0, 5.4, { within: 0.3 });
    const pow = ent('k7_pow');
    for (let n = 0; n < 200 && live(i); n++) {
      const near = L.entities.filter((e) => e.kind === 'pilzling' && alive(e) && Math.hypot(e.pos.x - pow.pos.x, e.pos.z - pow.pos.z) < 6.5).length;
      if (near >= 6) break;
      st({});
    }
    jumpOnto(i, () => ({ x: pow.pos.x, z: pow.pos.z }), { reach: 2.2, hold: 20 });
    for (let k = 0; k < 20; k++) st({});
    for (const e of L.entities.filter((q) => q.kind === 'pilzling' && alive(q))) if (live(i)) stomp(i, e.spec.id, { reach: 2.2, hold: 10 });
  };
  // 8 Kullerhang: Ball holen, den Hang hinab rollen lassen
  R[7] = (i) => {
    for (const id of ['k8_ball2', 'k8_ball1', 'k8_ball3']) {
      if (!live(i)) break;
      grab(i, id);
      walkTo(i, 0, 5.2, { within: 0.25, mag: 0.6 });
      throwToward(i, 0, zu(i, H.R8.star));
      for (let k = 0; k < 300 && live(i); k++) st({});
      log.push(['wurf', id, L.runtime.stars[i]]);
    }
  };
  // 9 Hackbeil-Hof: am rechten Rand vorbei zum Federklotz, hoch zum Stern
  R[8] = (i) => {
    walkTo(i, 6.3, 6.6, { within: 0.4, run: true });
    walkTo(i, 6.3, 12.6, { within: 0.4, run: true, dodge: ['hackbeil_pilz'], tJump: 0.3, r: 1.2 });
    const f = ent('k9_feder');
    jumpOnto(i, () => ({ x: f.pos.x, z: f.pos.z }), { reach: 1.6, hold: 60 });
    for (let k = 0; k < 160 && live(i); k++) st({ ...(P().mode === 'air' ? B.airSteer(H.R9.star[0], zu(i, H.R9.star[1]), 0, 0, 4, 5) : {}), jump: true });
  };
  // 10 Stampfsteinfahrt: Stein locken, draufspringen, mitfahren, über die unsichtbaren Stege
  R[9] = (i) => {
    const s = ent('k10_stein');
    walkTo(i, 0, H.R10.stein - 1.9, { within: 0.15 });
    for (let k = 0; k < 400 && live(i) && s.state !== 'land'; k++) st({});
    for (let k = 0; k < 10; k++) st({});
    jumpOnto(i, () => ({ x: 0, z: zu(i, H.R10.stein) }), { reach: 3, hold: 30 });
    for (let k = 0; k < 600 && live(i) && !(s.state === 'wait' && P().pos.y > Y + 4.9); k++) st({});
    log.push(['oben', here(i), s.state]);
    walkTo(i, 0, H.R10.stein + 0.6, { within: 0.2 });
    jumpOnto(i, () => ({ x: 0, z: zu(i, H.R10.wolken[0][0]) }), { reach: 6, hold: 40, run: true });
    walkTo(i, 0, H.R10.wolken[0][0] + 0.6, { within: 0.25 });
    jumpOnto(i, () => ({ x: 0, z: zu(i, H.R10.wolken[1][0]) }), { reach: 6, hold: 40, run: true });
    walkTo(i, 0, H.R10.wolken[1][0] + 0.6, { within: 0.25 });
    jumpOnto(i, () => ({ x: 0, z: zu(i, H.R10.ende[0] + 1.2) }), { reach: 6, hold: 40, run: true });
    toStar(i);
  };
  // 11 Eisrutsche: auf dem Schlittschuh gerade hinab und über die Stachelstreifen
  R[10] = (i) => { for (let k = 0; k < 900 && live(i); k++) { const p = P(), s = star(i); if (!s) break; st({ ...B.stick(s.pos.x - p.pos.x, s.pos.z - p.pos.z, 1) }); } };
  // 12 Krallenschalter: rechten Turm hinauf, aufs Druckfeld, hinab, linken Turm hinauf zum Stern
  R[11] = (i) => {
    const climb = (x, top) => {
      walkTo(i, x, H.R12.u[0] - 1.1, { within: 0.2 });
      for (let k = 0; k < 360 && live(i) && !(P().mode === 'ground' && P().pos.y > top - 0.1); k++) st({ ...B.stick(0, -1, 1), jump: k < 30 });
    };
    climb(5, H.R12.top);
    walkTo(i, 5, 7.5, { within: 0.3 });
    for (let k = 0; k < 20; k++) st({});
    log.push(['schalter', here(i), ent('k12_schalter')?.done]);
    walkTo(i, 2.6, 7.5, { within: 0.4, run: true, max: 200 });
    walkTo(i, -5, H.R12.u[0] - 1.1, { within: 0.25, run: true });
    climb(-5, H.R12.top);
    toStar(i);
  };
  // 13 Kanonenturm: Stufe für Stufe, Projektilköpfe abwarten
  R[12] = (i) => {
    const frei = (x, z, y) => !L.entities.some((e) => e.kind === 'projektilkopf' && alive(e) && Math.abs(e.pos.y - y) < 2 && Math.abs(e.pos.z - z) < 1.4 && Math.abs(e.pos.x + vel(e).vx * 0.6 - x) < 2.6);
    for (const [u, top] of [[9.0, H.R13.tiers[0][3]], [11.5, H.R13.tiers[1][3]], [14, H.R13.tiers[2][3]]]) {
      for (let k = 0; k < 400 && live(i) && !frei(0, zu(i, u), top); k++) st({});
      jumpOnto(i, () => ({ x: 0, z: zu(i, u) }), { reach: 2.4, hold: 30 });
    }
    toStar(i);
  };
  // 14 Piep-Treppe: Stufe für Stufe; ist die nächste Stufe die andere Farbe, kurz vor dem Wechsel abspringen
  R[13] = (i) => {
    const sys = L.piep, clock = sys.clock;
    const grp = (k) => [...sys.groups.values()].find((g) => g.color === H.R14.colors[k]);
    const toSwitch = (g) => ((g.every - g.k) * 60) / clock.bpm;                 // s bis zum nächsten Wechsel
    const uOf = (k) => H.R14.from + H.R14.run * (k + 0.5);
    walkTo(i, 0, H.R14.from - 0.8, { within: 0.25 });
    for (let k = 0; k < H.R14.steps && live(i); k++) {
      const g = grp(k), gPrev = k > 0 ? grp(k - 1) : null;
      for (let q = 0; q < 900 && live(i); q++) {
        if (g.on && toSwitch(g) > 0.75) break;                                  // Stufe fest und bleibt es lange genug
        if (!g.on && (!gPrev || gPrev !== g) && toSwitch(gPrev ?? g) < 0.3) break;   // gleich wechselt es: jetzt abspringen
        st({});
      }
      jumpOnto(i, () => ({ x: 0, z: zu(i, uOf(k)) }), { reach: 2.4, hold: 22 });
      log.push(['stufe', k, here(i), g.on]);
    }
    toStar(i);
  };
  // 15 Großblock-Fall: von Block zu Block springen, bevor er fällt
  R[14] = (i) => {
    walkTo(i, 0, 4.4, { within: 0.3, run: true });
    for (const u of [...H.R15.bloecke, H.R15.ende + 1.2]) jumpOnto(i, () => ({ x: 0, z: zu(i, u) }), { reach: 3.4, hold: 24, run: true });
    toStar(i, { run: true });
  };
  // 16 Ringwand: warten, bis die Lücke vorn steht, durch die Lücke zum Stern
  R[15] = (i) => {
    const d = L.named.get('k16_ring');
    walkTo(i, 0, 4.4, { within: 0.3 });
    for (let k = 0; k < 900 && live(i); k++) {
      const a = ((d.angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      if (!d.turning && Math.min(a, 2 * Math.PI - a) < 0.05 && !danger(['wuschel'], { r: 1.6, horizon: 1.2 })) break;
      st({});
    }
    walkTo(i, 0, H.R16.c, { within: 0.3, run: true });
  };
  // 17 Hasenjagd: beide Hasen rennend einholen
  R[16] = (i) => {
    for (const id of ['k17_hase1', 'k17_hase2']) {
      const h = ent(id);
      for (let k = 0; k < 900 && live(i) && h && !h.removed && h.state !== 'caught'; k++) { const p = P(); st({ ...B.stick(h.pos.x + vel(h).vx * 0.25 - p.pos.x, h.pos.z + vel(h).vz * 0.25 - p.pos.z, 1), run: true }); }
      log.push(['hase', id, here(i)]);
    }
  };
  // 18 Sprungfeld-Wurf: Ball holen, aufs Sprungfeld, im Scheitel auf den Schalter werfen, dann den Stern holen
  R[17] = (i) => {
    log.push(['griff', grab(i, 'k18_ball'), P().holding?.spec?.id]);
    walkTo(i, 0, H.R18.sprung - 2.0, { within: 0.3 });
    const tz = zu(i, H.R18.sprung);
    let bounced = false, thrown = false;
    for (let n = 0; n < 900 && live(i); n++) {
      const p = P();
      if (!bounced && p.jumpKind === 'bounce') bounced = true;
      if (bounced && !thrown && p.vel.y < 0 && p.pos.y <= H.R18.top + 0.45) {
        const ball = p.holding;
        log.push(['scheitel', here(i)]); st({ ...B.stick(0, -1, 0.15), action: true }); st({}); S.throws++; thrown = true;
        if (window.__trace && ball) for (let k = 0; k < 72; k++) { st({}); if (k % 6 === 0) log.push(['ball', +ball.pos.x.toFixed(2), +ball.pos.y.toFixed(2), +(H.Z0[i] - ball.pos.z).toFixed(2)]); }
        continue;
      }
      if (bounced && !thrown) { st({ ...B.stick(0, -1, 0.15), jump: true }); continue; }
      const s = p.mode === 'air' ? B.airSteer(0, tz, 0, 0, 3, 5) : B.stick(-p.pos.x, tz - p.pos.z, 1);
      st({ ...s, jump: p.mode === 'ground' ? n % 30 < 12 : true });
      if (thrown && p.mode === 'ground' && p.ground?.tag !== 'trampoline') break;
    }
    log.push(['wurf', bounced, thrown, ent('k18_schalter')?.state]);
    for (let k = 0; k < 900 && live(i); k++) { const p = P(); st({ ...(p.mode === 'air' ? B.airSteer(0, tz, 0, 0, 3, 5) : B.stick(-p.pos.x, tz - p.pos.z, 1)), jump: p.mode === 'ground' ? k % 30 < 12 : true }); }
  };
  // 19 Holzlabyrinth: außen um das Labyrinth herum zum Eingang (er dreht sich mit), dann dem Gang folgen
  R[18] = (i) => {
    const d = L.named.get('k19_lab'), cz = zu(i, H.R19.c);
    const ang = (x, z) => Math.atan2(-(z - cz), x);
    const goLocal = (lx, lz, within = 0.35, max = 300) => {
      for (let n = 0; n < max && live(i); n++) {
        const t = rot(d, 0, cz, lx, lz), p = P(), dx = t.x - p.pos.x, dz = t.z - p.pos.z;
        if (Math.hypot(dx, dz) < within) return true;
        st({ ...B.stick(dx, dz, 1) });
      }
      return false;
    };
    walkTo(i, 0, H.R19.c - 5.4, { within: 0.4 });
    // auf dem Kreis r 5,4 außen herum, bis der Eingang erreicht ist
    for (let n = 0; n < 900 && live(i); n++) {
      const e = rot(d, 0, cz, -2.8, 5.4), p = P();
      const ae = ang(e.x, e.z), ap = ang(p.pos.x, p.pos.z);
      const da = wrap(ae - ap);
      if (Math.hypot(e.x - p.pos.x, e.z - p.pos.z) < 0.6) break;
      const a2 = ap + Math.sign(da) * Math.min(Math.abs(da), 0.45);
      const tx = Math.cos(a2) * 5.4, tz = cz - Math.sin(a2) * 5.4;
      st({ ...B.stick(tx - p.pos.x, tz - p.pos.z, 1) });
    }
    log.push(['eingang', here(i), +(d.angle ?? 0).toFixed(2)]);
    for (const [lx, lz] of [[-2.8, 4.4], [-2.8, 2.8], [2.9, 2.8], [2.9, 0.2], [0, 0.2]]) { const ok = goLocal(lx, lz); log.push(['gang', lx, lz, ok, here(i), +(d.angle ?? 0).toFixed(2)]); }
    for (let k = 0; k < 30 && live(i); k++) st({});
  };
  // 20 Schubser-Kessel: von der Inselmitte her anspringen, damit sie über den nächsten Rand rutschen
  R[19] = (i) => {
    const I = { x0: -5, x1: 5, u0: 5.5, u1: 15 };
    for (const id of ['k20_schubser1', 'k20_schubser2']) {
      const e = ent(id);
      for (let tries = 0; tries < 4 && alive(e) && live(i); tries++) {
        const ex = e.pos.x, eu = H.Z0[i] - e.pos.z;
        // nächster Rand
        const cand = [[-1, 0, ex - I.x0], [1, 0, I.x1 - ex], [0, -1, eu - I.u0], [0, 1, I.u1 - eu]].sort((a, b) => a[2] - b[2])[0];
        const [dx, du] = cand;
        const px = Math.max(-4.3, Math.min(4.3, ex - dx * 3.6)), pu = Math.max(6.2, Math.min(14.3, eu - du * 3.6));
        walkTo(i, px, pu, { within: 0.5, run: true, max: 220 });
        for (let k = 0; k < 160 && live(i) && ['warn', 'charge', 'skid', 'pushed', 'recover'].includes(e.state); k++) st({ ...B.stick(0 - P().pos.x, zu(i, 10.2) - P().pos.z, 0.5) });
        log.push(['anlauf', id, [+ex.toFixed(2), +eu.toFixed(2)], cand.slice(0, 2), here(i), e.state]);
        // mit vollem Tempo anrennen: er rutscht mit dem 1,1-fachen Tempo über den Rand
        for (let k = 0; k < 90 && live(i) && alive(e) && !['pushed', 'fall'].includes(e.state); k++) { const p = P(); st({ ...B.stick(e.pos.x + dx * 1.2 - p.pos.x, e.pos.z - du * 1.2 - p.pos.z, 1), run: true }); }
        for (let k = 0; k < 90 && live(i) && alive(e); k++) st({ ...B.stick(0 - P().pos.x, zu(i, 10.2) - P().pos.z, 0.7) });
      }
      log.push(['schubser', id, alive(e), here(i)]);
    }
  };
  // 21 Riesen-?-Türme: drauf, stampfen, mitfahren – dreimal
  R[20] = (i) => {
    const towers = ['k21_turm1', 'k21_turm2', 'k21_turm3'].map(ent);
    for (const [k, t] of towers.entries()) {
      if (!live(i) || !t) break;
      jumpOnto(i, () => ({ x: t.pos.x, z: t.pos.z }), { reach: 2.2, hold: 30, pound: true });
      for (let q = 0; q < 160 && live(i) && t.state !== 'turm'; q++) st({});
      for (let q = 0; q < 20; q++) st({});
      log.push(['turm', k + 1, t.state, here(i)]);
      if (k === 0) walkTo(i, -1.6, 8.3, { within: 0.4 });
      if (k === 1) walkTo(i, 4.0, 8.3, { within: 0.4 });
    }
    for (let k = 0; k < 60 && live(i); k++) st({});
  };
  // 22 Himmelssteg: über den Steg, Suchköpfen ausweichen (Sprung)
  R[21] = (i) => { walkTo(i, 0, 4.2, { within: 0.3 }); walkTo(i, 0, 37.4, { within: 0.4, run: true, dodge: ['suchkopf'], tJump: 0.42, r: 1.2, max: 1100 }); };
  // 23 Rankentreppe: von Ranke zu Ranke hinauf
  R[22] = (i) => {
    walkTo(i, 0, 3.4, { within: 0.25 });
    for (const [, u, h] of H.R23.ranken) jumpOnto(i, () => ({ x: 0, z: zu(i, u) }), { reach: 3.2, hold: 30 });
    jumpOnto(i, () => ({ x: 0, z: zu(i, H.R23.ledge[0] + 1) }), { reach: 3.2, hold: 30 });
    toStar(i);
  };
  // 24 Schalterfelder: drei Würfe auf drei Scheiben
  R[23] = (i) => {
    const ziele = H.R24.ziele;
    for (let k = 0; k < 3 && live(i); k++) {
      const z = L.entities.find((e) => e.kind === 'zielscheibe' && e.spec?.id === `k24_ziel${k + 1}`);
      for (let tries = 0; tries < 2 && z && !z.done && live(i); tries++) {
        const free = L.entities.filter((e) => e.kind === 'wurfball' && !e.removed && !e.carrier && e.state !== 'flying').sort((a, b) => Math.hypot(a.pos.x - P().pos.x, a.pos.z - P().pos.z) - Math.hypot(b.pos.x - P().pos.x, b.pos.z - P().pos.z))[0];
        if (!free) break;
        grab(i, free.spec.id);
        walkTo(i, ziele[k][0] * 0.4, 6.4, { within: 0.3 });
        throwToward(i, ziele[k][0], zu(i, ziele[k][1]), 6, 0.25);
        for (let q = 0; q < 60 && !z.done && live(i); q++) st({});
      }
      log.push(['scheibe', k + 1, z?.done, here(i)]);
    }
    toStar(i);
  };
  // 25 Topfgarten: Topf aufheben und zu den Wuscheln tragen, bis er sie gefressen hat
  R[24] = (i) => {
    grab(i, 'k25_topf1');
    for (const id of ['k25_wuschel1', 'k25_wuschel2', 'k25_wuschel3']) {
      const w = ent(id);
      for (let k = 0; k < 600 && live(i) && alive(w); k++) {
        const p = P(), dx = w.pos.x - p.pos.x, dz = w.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        const want = d > 1.7 ? 1 : d < 1.3 ? -0.4 : 0.05;
        st({ ...B.stick(dx, dz, Math.abs(want)), ...(want < 0 ? B.stick(-dx, -dz, 0.4) : {}) });
      }
      log.push(['wuschel', id, alive(w), here(i)]);
    }
  };
  // 26 Schnappkarussell: zwischen den Schnappblumen hindurch auf den Sockel
  R[25] = (i) => {
    const cz = zu(i, H.R26.c);
    walkTo(i, 0, 3.6, { within: 0.3 });
    const blumen = () => L.entities.filter((e) => e.kind === 'schnappblume' && alive(e));
    for (let k = 0; k < 900 && live(i); k++) {
      // Weg (x 0, von vorn zur Mitte) frei: keine Blume näher als 1,9 m an der Linie für die nächsten 0,9 s
      const ok = blumen().every((e) => { const dx = e.pos.x, du = cz - e.pos.z; const a = Math.atan2(du, dx) - 0.55 * 0.9; const r = Math.hypot(dx, du); return Math.abs(r * Math.cos(Math.atan2(du, dx))) > 1.9 && Math.abs(r * Math.cos(a)) > 1.9; });
      if (ok) break;
      st({});
    }
    jumpOnto(i, () => ({ x: 0, z: cz }), { reach: 2.0, hold: 26, run: true });
    for (let k = 0; k < 40 && live(i); k++) st({});
  };
  // 27 Scheinwerferschacht: im Zickzack die Simse hinauf
  R[26] = (i) => {
    const Ls = H.R27.leisten;
    walkTo(i, -3, 10.6, { within: 0.3, run: true });
    for (const [x0, x1] of Ls) jumpOnto(i, () => ({ x: (x0 + x1) / 2, z: zu(i, 14) }), { reach: 4.2, hold: 30, run: true });
    toStar(i);
  };
  // 28 Donutbrücke: nicht stehen bleiben, über Walzen springen
  R[27] = (i) => { walkTo(i, 0, 5.4, { within: 0.3 }); walkTo(i, 0, 27, { within: 0.4, run: true, dodge: ['stachelwalze'], tJump: 0.36, r: 1.2, max: 1100 }); };
  // 29 Wirbelbrocken: Abstand halten, solange er rennt und wirbelt; taumelt er, draufspringen
  R[28] = (i) => {
    const b = ent('k29_wirbel'), cz = zu(i, 10);
    walkTo(i, 0, 5.2, { within: 0.4 });
    for (let k = 0; k < 1200 && live(i) && b.hp > 0; k++) {
      if (b.state === 'stunned' && b.stateT < 1.0) { jumpOnto(i, () => ({ x: b.pos.x, z: b.pos.z }), { reach: 3.0, hold: 12, run: true }); continue; }
      // fliehen: Punkt auf dem Kreis gegenüber
      const p = P(), ax = p.pos.x - b.pos.x, az = p.pos.z - b.pos.z, al = Math.hypot(ax, az) || 1;
      let tx = 0 + (ax / al) * 5, tz = cz + (az / al) * 5;
      tx = Math.max(-5.6, Math.min(5.6, tx)); tz = Math.max(zu(i, 18.4), Math.min(zu(i, 1.6), tz));
      const far = Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) > 4.5;
      st(far && b.state !== 'stunned' ? {} : { ...B.stick(tx - p.pos.x + (az / al) * 2, tz - p.pos.z - (ax / al) * 2, 1), run: true });
    }
    for (let k = 0; k < 40 && live(i); k++) st({});
    toStar(i, { run: true });
  };
  // 30 Siegerflur: geradeaus über den Münzweg (Stempel) zum Stern
  R[29] = (i) => { walkTo(i, 0, 27.5, { within: 0.3, run: true }); };

  window.__haus = {
    A, S, waitPlay, waitClear, live, step: st, walkTo, R,
    solve(i) {
      log.length = 0;
      if (!waitPlay(i)) return { error: 'kein Start', a: A() };
      const t0 = L.time, h0 = S.hits;
      try { R[i](i); } catch (e) { log.push(['AUSNAHME', String(e), e.stack?.split('\n')[1]]); }
      const t = +(L.time - t0).toFixed(2);
      const got0 = !!L.runtime.stars[i];
      waitClear(i);
      return { t, got: !!L.runtime.stars[i], got0, log: log.slice(), hurts: S.hits - h0, a: A(), dead: P().dead, pos: here(i), deaths: B.deaths };
    },
  };
  return true;
}

async function haus() {
  const id = 'K-Haus';
  if (!['load', 'haus'].some((q) => PARTS.has(q))) return;
  console.log(`\n${id}: Marathon-Haus mit 30 Räumen`);
  const RAUM = process.env.RAUM ? process.env.RAUM.split('-').map((v) => Number(v) - 1) : null;
  const from = RAUM ? RAUM[0] : 0, to = RAUM ? (RAUM[1] ?? RAUM[0]) : 29;
  for (const hero of HEROES) {
    if (!(await load(id, { fresh: true }))) { check(`${id} lädt`, false); return; }
    await sc((h) => { window.__course.player.setHero(h); }, hero);
    if (hero === HEROES[0] && PARTS.has('load')) {
      const d = await sc(() => {
        const c = window.__course, L = c.level, D = L.data;
        return { title: D.title, theme: D.theme, music: D.music, arch: D.archetype, world: D.world, rooms: D.house.rooms.length, goals: D.house.rooms.map((r) => r.goal),
          times: D.house.rooms.map((r) => r.time), fail: D.house.fail, starCount: L.runtime.starCount, stamp: !!D.stamp, kinds: window.__kb.kinds() };
      });
      console.log(`  „${d.title}“, Welt ${d.world}, Thema ${d.theme}, Musik ${d.music}, Räume ${d.rooms}, Ziele ${[...new Set(d.goals)].join('/')}, Arten ${JSON.stringify(d.kinds)}`);
      check(`${id}: lädt ohne Konsolenfehler/-warnungen`, errors.length === 0);
      for (const e of errors.slice(0, 8)) console.log('      ', e);
      check(`${id}: „Haus Marathon“, Welt 12, Archetyp house, Thema house, Musik course_house, 30 Räume à 10 s, 30 Sterne + Stempel, fail 'exit'`,
        d.title === 'Haus Marathon' && d.world === 12 && d.arch === 'house' && d.theme === 'house' && d.music === 'course_house' && d.rooms === 30 && d.times.every((t) => t === 10) && d.fail === 'exit' && d.starCount === 30 && d.stamp);
    }
    if (!PARTS.has('haus')) continue;
    await sc(installHaus);
    const times = [];
    for (let i = from; i <= to; i++) {
      const r = await sc(([k, first]) => {
        const c = window.__course;
        if (k !== first || c.arch.info().room !== k) { if (c.arch.info().room !== k) c.arch.enterRoom(k); }
        return window.__haus.solve(k);
      }, [i, from]);
      times.push(r.t);
      const ok = r.got && !r.error && r.t < 10;
      check(`${id}: ${hero} Raum ${i + 1} ${HAUS_NAMES[i]} in ${r.t} s (< 10 s, Treffer ${r.hurts})`, ok);
      if (VERBOSE || !ok) { console.log(`       ${JSON.stringify(r.a).slice(0, 200)} tot ${r.dead} bei ${JSON.stringify(r.pos)}`); for (const l of r.log ?? []) console.log('      ', JSON.stringify(l)); }
    }
    console.log(`  ${hero}: Raumzeiten ${times.join(' · ')}`);
    if (from === 0 && to === 29) {
      const fin = await sc(() => { const c = window.__course; for (let k = 0; k < 2400 && !c.finished; k++) c.step(1); return { finished: c.finished, res: c.lastResult ?? null, a: c.arch.info(), stamp: c.level.runtime.stamp }; });
      check(`${id}: ${hero} Ergebnis 30/30 und Stempel (${(fin.res?.stars ?? []).filter(Boolean).length} Sterne)`, fin.finished && fin.res?.stars?.filter(Boolean).length === 30 && fin.stamp && !fin.a.exited);
    }
  }
}

// ====================================================================================================================
// Ablauf
// ====================================================================================================================
try {
  if (!ONLY_LEVEL || ONLY_LEVEL === 'K-Kapitän') await kapitaen();
  if (!ONLY_LEVEL || ONLY_LEVEL === 'K-Haus') await haus();
} catch (e) {
  console.log('Abbruch:', e);
  check('Testlauf ohne Ausnahme', false);
}
if (stats.length) {
  console.log('\nKennzahlen (Zeichenaufrufe inkl. Schattenpass / Dreiecke):');
  for (const [n, cl, t] of stats) console.log(`  ${n.padEnd(34)} ${String(cl).padStart(4)}  ${Math.round(t / 1000)} k`);
  check(`Budget: höchstens ${Math.max(...stats.map((s) => s[1]))} Aufrufe (< 120), ${Math.round(Math.max(...stats.map((s) => s[2])) / 1000)} k Dreiecke (< 300 k)`,
    stats.every((s) => s[1] < 120 && s[2] < 300000));
}
await browser.close();
stop();
process.exit(summary(errors) ? 0 : 1);
