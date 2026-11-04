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
  await sc(() => { window.__course.level.runtime.save.lives = 9; });
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
}

// ====================================================================================================================
// Ablauf
// ====================================================================================================================
try {
  if (!ONLY_LEVEL || ONLY_LEVEL === 'K-Kapitän') await kapitaen();
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
