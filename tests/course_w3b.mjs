// Welt-3-Level 3-2 „Gitterbahn über den Wolken“ (Autoscroller, Kettenzäune) und 3-6 „Gipfelflitzer-Rennen“ (Bergrennen)
// deterministisch prüfen (Simulation nur über window.__course.step(n) / setInput):
//   3-2: Laden ohne Konsolenfehler, Fensterpfad mit drei Richtungen (−Z, senkrecht, +X), Kamera/Grenzen je Pfadlänge,
//        senkrecht unten aus dem Bild = Absturz, fahrende Zäune im Takt der Fahrt-Uhr (auch nach einem Neustart),
//        Routen-Bot Start → Zielmast für Lotti und Greta (Plattformen, Hubzaun, Bröckelbrücke, Warp-Box, Klettern an
//        fahrenden Zäunen, Glasrohr, Schiebezäune, Warp-Box zur Zielinsel), Einklemmen am Hubzaun = Tod, Checkpoint,
//        Sterne 1–3, Stempel (Krallenwand) und 1-Up mit echter Mechanik.
//   3-6: Laden, Routen-Bot Lotti (untere Straße, Stern 1) und Greta (obere Straße) Start → Zielmast, Sprungfelder landen
//        genau auf `to`, Boost-Pfeile/-Tore, Grubentrampolin, Stern 2 (Warp-Box der 9 Flatterkäfer → Hase im Bonus-
//        Oval), Stempel (Trampoline), Stern 3 (Krallen bzw. Gleitblatt → letzte Warp-Box), 1-Up auf dem Tribünendach.
//   Je Abschnitt ein Bild (tests/out/w3lb_*.png) und Kennzahlen (Zeichenaufrufe inkl. Schattenpass, Dreiecke).
// Aufruf (nach npm run build):  PORT_BASE=5200 node tests/course_w3b.mjs [3-2|3-6|all]
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4740;
const which = process.argv[2] ?? 'all';
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const stats = [];
const near = (a, b, e) => Math.abs(a - b) <= e;
const SAVE = 'lotti-greta-course-v1';

// ---------------------------------------------------------------------- Bibliothek im Browser (Bot-Grundzüge)
function installLib() {
  const c = window.__course, L = c.level, P = () => c.player;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const t = window.__t = {};
  t.ent = (id) => L.named.get(id);
  t.arch = () => c.state().archetype;
  t.cam = (n = 1, dt = 0.05) => { for (let i = 0; i < n; i++) { c.rig.update(dt, c.view.time + dt); L.render(dt, c.view.time + dt); c.view.rig.update(dt, c.player, c.world); } return c.view.rig.info(); };
  t.park = () => { const p = P(); p.invuln = 1e9; p.mode = 'script'; p.script = { type: 'test', t: 0 }; };
  t.place = (pos, o = {}) => {
    const p = P();
    c.setInput(null); c.setInput({});
    p.dead = false; p.holding = null;
    p.big = o.big ?? true;
    if (p.power !== (o.power ?? 'none')) p.setPower(o.power ?? 'none');
    p.reset(pos, o.yaw ?? Math.PI / 2);
    p.invuln = o.invuln ?? 0;
    if (L.runtime.status === 'dying') L.runtime.status = 'play';
    L.controlYaw = c.view.rig.controlYaw(p.pos);
    c.view.rig.snap(p);
    if (o.settle) c.step(o.settle);
    return p.info();
  };
  /** Bildfenster bis zur Pfadlänge s fahren lassen (Figur geparkt). */
  t.waitS = (s, max = 120 * 300) => { t.park(); let k = 0; while (L.scroll.s < s && L.scroll.state !== 'done' && k < max) { c.step(1); k++; } return k; };
  /** Stick aus einer Welt-Richtung (Steuerungs-Gier). */
  t.stick = (wx, wz) => { const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy); return { x: co * wx - si * wz, y: -si * wx - co * wz }; };
  t.step = (inp, n = 1) => { c.setInput(inp ?? {}); for (let i = 0; i < n; i++) { c.step(1); if (P().dead) return false; } return true; };
  /** Bis cond() wahr ist (Eingabe inp oder Funktion), höchstens max Schritte → Schritte | −1 (Zeit) | −2 (Tod). */
  t.until = (cond, inp = {}, max = 1200) => {
    for (let i = 0; i < max; i++) {
      if (cond()) return i;
      c.setInput(typeof inp === 'function' ? inp() : inp);
      c.step(1);
      if (P().dead) return -2;
    }
    return -1;
  };
  /** Am Boden zu (x, z) laufen. */
  t.go = (x, z, o = {}) => {
    const p = P(), tol = o.tol ?? 0.25;
    for (let i = 0; i < (o.max ?? 1500); i++) {
      if (p.dead) return { ok: false, dead: true };
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
      if (d < tol) { c.setInput({}); return { ok: true, i }; }
      const k = clamp(d / (o.slow ?? 1.0), 0.25, 1);
      c.setInput({ ...t.stick(dx / d * k, dz / d * k), run: o.run && d > 1.5 });
      c.step(1);
    }
    c.setInput({});
    return { ok: false };
  };
  /** Geradeaus über die Linie z hinaus laufen (Ziel x), ohne abzubremsen. */
  t.past = (x, z, o = {}) => t.until(() => P().pos.z < z || P().dead, () => { const p = P(); const dx = x - p.pos.x, dz = (z - 3) - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d, dz / d), run: o.run !== false }; }, o.max ?? 1500);
  /** Auf ein Sprungfeld/Trampolin zulaufen, bis der Flug beginnt (Skript-Modus). */
  t.launch = (x, z) => t.until(() => P().mode === 'script' || P().dead, () => { const p = P(); const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d, dz / d), run: true }; }, 600);
  t.fly = () => { t.until(() => P().mode === 'script', {}, 30); t.until(() => P().mode !== 'script', {}, 400); return t.until(() => P().mode === 'ground', {}, 200); };
  /** Sprung (vom Boden oder Zaun) mit Lenkung zu (x, z) (Tempo-Regler); endet bei Landung, Griff oder Zeitablauf. */
  t.jumpTo = (x, z, o = {}) => {
    const p = P();
    const hold = o.hold ?? 40;
    let air = false;
    for (let i = 0; i < (o.max ?? 300); i++) {
      if (p.dead) return { ok: false, dead: true };
      if (p.mode !== 'ground' && p.mode !== 'wall') air = true;
      if (air && i > 2 && (p.mode === 'ground' || (p.mode === 'wall' && o.grab !== false))) { c.setInput({}); return { ok: true, mode: p.mode, i }; }
      const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
      let inp = {};
      if (p.mode === 'air' && !(o.rise && p.vel.y > o.rise)) {
        const sp = Math.min(o.vmax ?? 7, d * (o.gain ?? 2.6));
        const tx = d > 1e-3 ? dx / d * sp : 0, tz = d > 1e-3 ? dz / d * sp : 0;
        const ex = tx - p.vel.x, ez = tz - p.vel.z, el = Math.hypot(ex, ez);
        if (el > 0.25) inp = t.stick(ex / el * Math.min(1, el / 1.5), ez / el * Math.min(1, el / 1.5));
      } else if (p.mode !== 'air' && d > (o.tol ?? 0.15)) { const k = clamp(d / (o.slow ?? 0.8), 0, 1); inp = t.stick(dx / d * k, dz / d * k); }
      if (o.into && p.mode !== 'ground') inp.y = Math.max(inp.y ?? 0, o.into);
      inp.jump = i < hold;
      inp.run = !!o.run;
      c.setInput(inp);
      c.step(1);
    }
    c.setInput({});
    return { ok: false };
  };
  t.action = () => { c.setInput({ action: true }); c.step(1); c.setInput({}); c.step(1); };
  /** Am Zaun (quer, Vorderseite zur Kamera) zu (x, y) klettern; stopTop: oben angekommen. */
  t.climb = (x, y, o = {}) => {
    const p = P();
    for (let i = 0; i < (o.max ?? 900); i++) {
      if (p.dead) return { ok: false, dead: true };
      if (p.mode !== 'wall') return { ok: false, lost: true };
      const dx = x - p.pos.x, dy = y - p.pos.y;
      if (Math.abs(dx) < (o.tol ?? 0.15) && Math.abs(dy) < (o.tol ?? 0.15)) { c.setInput({}); return { ok: true, i }; }
      c.setInput({ x: clamp(dx * 3, -1, 1), y: clamp(dy * 3, -1, 1) });
      c.step(1);
    }
    c.setInput({});
    return { ok: false };
  };
  /** Am Zaun id relativ klettern (x = Zaunmitte + du), bis until() (hold) bzw. am Ziel. */
  t.climbRel = (id, du, y, o = {}) => {
    const p = P(), f = L.named.get(id);
    for (let i = 0; i < (o.max ?? 900); i++) {
      if (p.dead) return { ok: false, dead: true };
      if (p.mode !== 'wall') return { ok: false, lost: true };
      const yy = typeof y === 'function' ? y() : y;
      const dx = f.pos.x + du - p.pos.x, dy = yy - p.pos.y;
      if (!o.hold && Math.abs(dx) < 0.2 && Math.abs(dy) < 0.2) { c.setInput({}); return { ok: true, i }; }
      c.setInput({ x: clamp(dx * 3, -1, 1), y: clamp(dy * 3, -1, 1) });
      c.step(1);
      if (o.until && o.until()) { c.setInput({}); return { ok: true, i }; }
    }
    c.setInput({});
    return { ok: false };
  };
  /** Zaun-Hüpfer: abspringen (seitlich zu target), in der Luft zum Zaun lenken und wieder greifen. */
  t.hop = (target, o = {}) => {
    const p = P();
    for (let i = 0; i < (o.max ?? 200); i++) {
      if (p.dead) return { ok: false, dead: true };
      if (i > 4 && p.mode === 'wall') { c.setInput({}); return { ok: true, i, fence: p.fence?.obj?.spec?.id ?? null }; }
      if (i > 4 && p.mode === 'ground') { c.setInput({}); return { ok: false, landed: true }; }
      c.setInput({ x: clamp((target - p.pos.x) * 2, -1, 1), y: o.into ?? 1, jump: i < (o.hold ?? 30) });
      c.step(1);
    }
    c.setInput({});
    return { ok: false };
  };
  /** Im Kreis um (x, z) laufen (Kurbelrad drehen), bis cond(). */
  t.circle = (x, z, r, cond, max = 120 * 8) => { let a = 0; return t.until(cond, () => { a += 0.06; const p = P(); const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r; const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz) || 1; return t.stick(dx / d, dz / d); }, max); };
  t.mark = (log, n, extra = {}) => {
    const p = P(), w = L.scroll;
    log.push({ n, t: +L.time.toFixed(2), ...(w ? { s: +w.s.toFixed(1) } : {}), pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], mode: p.mode, dead: p.dead, ...extra });
  };
}

async function load(id, { hero = 'lotti', fresh = false } = {}) {
  const go = async (url) => { try { await page.goto(url, { waitUntil: 'load', timeout: 120000 }); } catch { await page.goto(url, { waitUntil: 'load', timeout: 180000 }); } };
  if (fresh) {
    await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`);
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log(`${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc((hero) => {
    const c = window.__course;
    c.setManual(true);
    c.level.muted = true;
    c.setHero(hero);
    c.level.runtime.save.lives = 9;
  }, hero);
  await page.evaluate(installLib);
}

/** Aufbau (im Browser), Darstellung nachführen, auf neue Bilder warten, Screenshot, Kennzahlen. */
async function SHOT(name, setup, arg) {
  if (setup) await sc(setup, arg);
  const f0 = await sc(() => {
    const c = window.__course;
    // Unverwundbarkeit lässt die Figur blinken – fürs Bild kurz aus, danach zurück
    window.__shotInv = c.player.invuln;
    c.player.invuln = 0;
    for (const b of c.arch?.hud?.banners ?? []) b.setVisible?.(false);   // Ansagen (z. B. „Los geht's!“) nicht im Bild
    window.__t.cam(12);
    return c.view.frame;
  });
  await page.waitForFunction((f) => window.__course.view.frame >= f, f0 + 8, { timeout: 60000, polling: 100 }).catch(() => {});
  await page.screenshot({ path: `${OUT}w3lb_${name}.png` });
  const s = await sc(() => { const c = window.__course; c.player.invuln = window.__shotInv ?? 0; return c.stats(); });
  stats.push([name, s.calls, s.triangles]);
  return s;
}

// ====================================================================== 3-2 Gitterbahn über den Wolken
/** Hauptroute 3-2 (im Browser): Zaunbahn, Kletterturm, Wolkenstrecke, Zielinsel. */
function route32() {
  const c = window.__course, L = c.level, t = window.__t, p = c.player, w = L.scroll, E = (id) => L.named.get(id);
  p.invuln = 1e9;
  const log = [];
  const M = (n, x) => t.mark(log, n, x);
  const room = (x, m = 1.6) => t.until(() => x + m - w.center.x <= t.arch().frame.front || w.state === 'done', {}, 120 * 20);
  let r;
  // 1 Zaunbahn
  r = t.go(0.6, -3.4, { tol: 0.3 });
  t.until(() => E('p1').pos.z < -12.9, {}, 120 * 20);
  r = t.go(0.6, -16.5); M('i2', { ok: r.ok });
  r = t.go(0.6, -19.6);
  t.until(() => E('hub1').pos.y + 3.8 < 0.25, {}, 120 * 15);
  r = t.go(0.3, -25, { run: true }); M('hubzaun', { ok: r.ok });
  r = t.go(0.0, -34.5, { run: true, tol: 0.4 }); M('bruecke', { ok: r.ok });
  r = t.go(3.0, -43.2);
  t.until(() => E('p2').pos.x > 3.4, {}, 120 * 15);
  r = t.go(3.0, -51.5); M('p2', { ok: r.ok });
  t.until(() => !E('warp1').hidden, {}, 120 * 20);
  r = t.go(0, -55.2);
  r = t.jumpTo(0, -57, { hold: 20, max: 200 });
  t.until(() => p.mode !== 'script', {}, 300);
  t.step({}, 30); M('warp1', { ci: p.pos.z < -61 });
  // 2 Kletterturm
  r = t.go(-3.5, -64.2); M('checkpoint', { cp: !!L.runtime.checkpoint });
  r = t.go(-2.0, -68.9);
  r = t.jumpTo(-2.0, -69.8, { hold: 10, into: 1, max: 120 }); M('k1', { fence: p.fence?.obj?.spec?.id });
  r = t.climb(-2.2, 10.8, { max: 120 * 20 });
  t.until(() => E('k2').pos.x < -1.6 && w.center.y > 7.5, {}, 120 * 14);
  r = t.hop(-2.0); M('k2', { fence: r.fence });
  r = t.climbRel('k2', 1.25, 14.0, { hold: true, until: () => E('k2').pos.x > 3.85, max: 120 * 12 });
  r = t.hop(6.3); M('k3', { fence: r.fence });
  r = t.climb(5.95, 23.0, { max: 120 * 20 });
  t.until(() => E('k4').pos.y < 22.5 && E('k4').pos.y + 7 > p.pos.y + 1.5, {}, 120 * 14);
  r = t.hop(3.6); M('k4', { fence: r.fence });
  r = t.climbRel('k4', -1.1, () => E('k4').pos.y + 7 - 0.65, { hold: true, until: () => p.pos.y > 28.6 && E('k4').pos.y > 25.5, max: 120 * 20 });
  r = t.hop(-0.6); M('k5', { fence: r.fence });
  r = t.climb(-0.4, 37.95, { max: 120 * 30 });
  t.until(() => w.center.y + t.arch().frame.front > p.pos.y + 3.6, { y: 1 }, 120 * 10);
  r = t.jumpTo(3.5, -65.5, { hold: 30, max: 200 }); M('gipfel', { ok: r.ok, y: +p.pos.y.toFixed(2) });
  // 3 Glasrohr, Wolkenstrecke
  r = t.go(4.6, -65.5);
  t.until(() => w.s >= 116.2, {}, 120 * 25);
  r = t.until(() => p.mode === 'script', { x: 1 }, 240);
  t.until(() => p.mode !== 'script', {}, 600);
  t.until(() => p.mode === 'ground', {}, 300); M('glasrohr', { y: +p.pos.y.toFixed(2) });
  r = t.go(16, -65.5);
  room(26.3); r = t.go(26.3, -65.6);
  room(30.5); r = t.jumpTo(29.6, -66, { hold: 30 });
  r = t.go(30.6, -66, { tol: 0.2 }); room(34.6); r = t.jumpTo(33.6, -66, { hold: 35 });
  r = t.go(34.4, -66, { tol: 0.2 }); room(37.6); r = t.jumpTo(37.0, -66, { hold: 30 });
  r = t.go(38.4, -66, { tol: 0.3 }); r = t.jumpTo(40.3, -66, { hold: 12 }); M('wolken', { ok: r.ok });
  t.until(() => E('sz1').pos.x < 41.6, {}, 120 * 12);
  r = t.jumpTo(41.3, -67.9, { hold: 12, into: 1 }); M('sz1', { fence: p.fence?.obj?.spec?.id });
  t.until(() => E('sz1').pos.x > 48.6, { x: 1 }, 120 * 12);
  r = t.jumpTo(52.2, -64.8, { hold: 30 });
  r = t.go(55.4, -66.2, { tol: 0.3 });
  t.until(() => E('sz2').pos.x < 56.9, {}, 120 * 12);
  r = t.jumpTo(56.9, -67.9, { hold: 12, into: 1 }); M('sz2', { fence: p.fence?.obj?.spec?.id });
  r = t.climbRel('sz2', 1.25, 41.0, { hold: true, until: () => E('sz2').pos.x > 60.3 && E('sz3').pos.x < 64.3, max: 120 * 14 });
  r = t.hop(63.2, { hold: 16 }); M('sz3', { fence: r.fence });
  r = t.climbRel('sz3', 1.25, 41.0, { hold: true, until: () => E('sz3').pos.x > 67.7, max: 120 * 14 });
  r = t.jumpTo(72.5, -65.2, { hold: 30 }); M('endstation', { ok: r.ok, ground: p.ground?.tag });
  // 4 Warp-Box beim Halt → Zielinsel → Zielmast
  t.until(() => w.state === 'done' && !E('warp2').hidden, {}, 120 * 20);
  r = t.go(77.6, -66);
  r = t.jumpTo(79, -66, { hold: 20, max: 200 });
  t.until(() => p.mode !== 'script', {}, 400);
  t.step({}, 30); M('zielinsel', { x: p.pos.x });
  r = t.go(120.6, -69.6, { run: true, tol: 0.4 });
  t.step({}, 240); M('ziel', { finished: c.finished });
  return { log, finished: c.finished, dead: p.dead, time: +L.time.toFixed(1), deaths: L.runtime.deaths ?? null, pushes: t.arch().pushes };
}

const stage = (b, n) => b.log.find((x) => x.n === n) ?? {};

async function test32a() {
  console.log('\n3-2 „Gitterbahn über den Wolken“');
  await load('3-2', { fresh: true });
  check('3-2: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
  let r = await sc(() => {
    const c = window.__course, L = c.level;
    const kinds = {};
    for (const e of L.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    return { title: L.data.title, arch: L.data.archetype, theme: L.data.theme, music: L.data.music, limit: L.data.timeLimit, kinds, stars: L.data.stars.length, stamp: !!L.data.stamp, end: L.scroll.s1, sky: c.view.theme.label };
  });
  console.log(`  Arten: ${JSON.stringify(r.kinds)}`);
  check(`3-2: „${r.title}“, autoscroller, Thema ${r.theme} (${r.sky}), Musik ${r.music}, ${r.limit} s, 3 Sterne + Stempel`, r.arch === 'autoscroller' && r.theme === 'skyway' && r.music === 'course_skyway' && r.limit === 400 && r.stars === 3 && r.stamp);
  check(`3-2: Gegner Krabbelkäfer ${r.kinds.krabbelkaefer} (4), Flatterkäfer ${r.kinds.flatterkaefer} (7); ${r.kinds.kettenzaun} Kettenzäune, ${r.kinds.kettenplattform} Kettenplattformen, Kurbelräder ${r.kinds.kurbelrad}, Goldringe ${r.kinds.goldring}`,
    r.kinds.krabbelkaefer === 4 && r.kinds.flatterkaefer === 7 && r.kinds.kettenzaun >= 12 && r.kinds.kettenplattform === 3 && r.kinds.kurbelrad === 2 && r.kinds.goldring >= 2);
  await SHOT('32_a1_start', () => { window.__course.step(20); });

  // Fensterpfad, Kamera und Grenzen je Pfadlänge, senkrecht = Absturz unten
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, w = L.scroll, rig = c.view.rig;
    const out = [];
    for (const s of [30, 90, 150]) {
      t.waitS(s);
      const rr = rig.railAt(w.center.x, w.center.z, {});
      out.push({ s: +w.s.toFixed(1), dir: [w.dir.x, w.dir.y, w.dir.z].map((v) => +v.toFixed(2)), pitch: +rr.pitch.toFixed(1), dist: +rr.dist.toFixed(1), mode: t.arch().frame ? c.arch.frame.backMode : null, front: c.arch.frame.front });
    }
    return out;
  });
  console.log(`  Fenster: ${JSON.stringify(r)}`);
  check(`3-2: Fenster fährt nach −Z (Kamera ${r[0].pitch}°), senkrecht nach oben (${r[1].pitch}°, unten = Absturz), dann nach +X (${r[2].pitch}°, Seitenansicht)`,
    r[0].dir[2] < -0.9 && r[1].dir[1] > 0.9 && r[2].dir[0] > 0.9 && r[0].pitch > 38 && r[1].pitch < 22 && r[2].pitch > 22 && r[2].pitch < 32 && r[1].mode === 'kill' && r[0].mode === 'push' && r[2].mode === 'push');

  // Routen-Bot Lotti
  await load('3-2', { hero: 'lotti' });
  const botL = await sc(route32);
  console.log(`  Bot Lotti: ${JSON.stringify(botL.log.map((x) => [x.n, x.s, x.pos, x.mode, x.fence ?? x.ok ?? '']))}`);
  check(`3-2 Lotti: Zaunbahn (Schiebeplattform, Hubzaun, Bröckelbrücke, Querplattform, Warp-Box durchs Gittertor)`, stage(botL, 'hubzaun').ok && stage(botL, 'p2').ok && stage(botL, 'warp1').ci && !stage(botL, 'warp1').dead);
  check(`3-2 Lotti: Kletterturm an fahrenden Zäunen (${['k1', 'k2', 'k3', 'k4', 'k5'].map((n) => stage(botL, n).fence).join(' → ')}) bis zum Gipfelsims`, ['k1', 'k2', 'k3', 'k4', 'k5'].every((n) => stage(botL, n).fence === n) && stage(botL, 'gipfel').y > 37);
  check(`3-2 Lotti: Glasrohr, Wolken, Schiebezäune (${['sz1', 'sz2', 'sz3'].map((n) => stage(botL, n).fence).join(', ')}), Endstation, Zielinsel, Zielmast (${botL.time} s)`, stage(botL, 'glasrohr').y > 43 && ['sz1', 'sz2', 'sz3'].every((n) => stage(botL, n).fence === n) && botL.finished && !botL.dead);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}w3lb_32_ergebnis.png` });

  // Routen-Bot Greta
  await load('3-2', { hero: 'greta' });
  const botG = await sc(route32);
  console.log(`  Bot Greta: ${JSON.stringify(botG.log.map((x) => [x.n, x.s, x.pos, x.mode, x.fence ?? x.ok ?? '']))}`);
  check(`3-2 Greta: ganze Route Start → Zielmast (Zäune ${['k1', 'k2', 'k3', 'k4', 'k5', 'sz1', 'sz2', 'sz3'].filter((n) => stage(botG, n).fence === n).length}/8, ${botG.time} s)`,
    botG.finished && !botG.dead && ['k1', 'k2', 'k3', 'k4', 'k5', 'sz1', 'sz2', 'sz3'].every((n) => stage(botG, n).fence === n));

}

async function test32b() {
  console.log('\n3-2 (Sterne, Stempel, Einklemmen, Checkpoint, 1-Up)');
  let r;
  // Stern 1: Ringbahn durch zwei Goldringe, vom Plattformzaun abspringen
  await load('3-2', { hero: 'greta' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, E = (id) => L.named.get(id);
    p.invuln = 1e9;
    const rb = E('ringbahn');
    const out = { idle: !rb.running };
    t.go(-4.6, 0.5, { tol: 0.2 });
    t.jumpTo(-6.8, 0.5, { hold: 12 });
    t.step({}, 4);
    out.running = rb.running;
    const coins0 = L.runtime.coins;
    t.until(() => rb.pos.z < -15.1, () => t.stick((-6.9 - p.pos.x) * 2, (rb.pos.z - 0.2 - p.pos.z) * 2), 120 * 10);
    out.rings = ['ring1', 'ring2'].map((id) => !E(id) || E(id).done || !E(id).alive);
    out.ringCoins = L.runtime.coins - coins0;
    t.until(() => p.pos.x < -7.5, () => t.stick(-1, (rb.pos.z - p.pos.z) * 2), 120);
    t.action();
    out.grab = p.fence?.obj?.spec?.id ?? null;
    t.until(() => p.vel.y === 0 && p.pos.y > 1.7, { y: 1 }, 240);
    out.top = +p.pos.y.toFixed(2);
    out.before = !!L.runtime.stars[0];
    return out;
  });
  await SHOT('32_a1_ringbahn');
  r = await sc((out) => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player;
    t.until(() => p.pos.z < -20.6, {}, 120 * 6);
    for (let i = 0; i < 160; i++) { c.setInput({ x: p.mode === 'wall' ? 0 : -Math.max(0, Math.min(1, (p.pos.x + 7.3) * 2)), jump: i < 40 }); c.step(1); if (i > 5 && p.mode === 'ground') break; }
    out.got = !!L.runtime.stars[0];
    t.until(() => p.mode === 'ground', () => (p.mode === 'wall' ? { y: -1 } : {}), 360);
    out.back = p.ground?.tag ?? null;
    return out;
  }, r);
  console.log(`  Stern 1: ${JSON.stringify(r)}`);
  check(`3-2 Stern 1: Ringbahn fährt erst, wenn man aufspringt; zwei Goldringe (${r.ringCoins} Münzen); Plattformzaun hinauf, Absprung → Stern, Landung wieder auf der Bahn`, r.idle && r.running && r.rings.every(Boolean) && r.ringCoins >= 10 && r.grab === 'ringbahn' && !r.before && r.got && r.back === 'kettenplattform');
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player;
    const rb = L.named.get('ringbahn');
    t.until(() => rb.pos.z < -29.9, () => t.stick((-6.9 - p.pos.x) * 2, (rb.pos.z - p.pos.z) * 2), 120 * 10);
    const g = t.go(-6.9, -34, { tol: 0.3 });
    return { ok: g.ok, z: p.pos.z, dead: p.dead };
  });
  check('3-2: von der Ringbahn weiter auf Insel I3', r.ok && !r.dead);

  // Stern 2: Hubzaun-Gasse ganz rechts
  await load('3-2', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, E = (id) => L.named.get(id);
    t.waitS(32);
    t.place([0, 0, -34], { invuln: 1e9, settle: 2 });
    t.go(3.8, -35); t.go(7.9, -35);
    const pass = [];
    [-38, -41.5, -45, -48.5].forEach((z, i) => {
      const f = E(`gasse${i + 1}`);
      t.go(7.9, z + 0.9, { tol: 0.15 });
      const up = f.pos.y > -2.5;
      t.until(() => f.pos.y < -2.5, {}, 120 * 8);
      const g = t.go(7.9, z - 1.2, { tol: 0.2 });
      pass.push(g.ok);
    });
    t.go(7.9, -51.2, { tol: 0.2 });
    const got = !!L.runtime.stars[1];
    const j = t.jumpTo(4.5, -52, { hold: 20 });
    return { pass, got, back: j.ok && !p.dead };
  });
  check(`3-2 Stern 2: ganz rechts durch die Hubzaun-Gasse (4 Zäune machen nacheinander Platz) → Stern, zurück auf die Torinsel`, r.pass.every(Boolean) && r.got && r.back);
  await SHOT('32_a1_gasse', () => {
    const t = window.__t;
    t.waitS(38);
    t.place([7.9, 0, -39.5], { invuln: 1e9, settle: 4 });
  });

  // Einklemmen am Hubzaun: wer trödelt, bis der Zaun wieder hochfährt, wird von der hinteren Grenze gegen ihn gedrückt
  await load('3-2', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, w = L.scroll, E = (id) => L.named.get(id);
    const hub = E('hub1');
    const out = { phases: [] };
    t.waitS(19);
    t.place([0, 0, -19.4], { invuln: 1e9, settle: 1 });
    // Figur steht vor dem Zaun und wartet (kein Durchlaufen, auch nicht, wenn er unten ist)
    let n = 0, low = false, rising = false;
    const c0 = t.arch().crushed;
    while (!p.dead && n < 120 * 20) {
      c.setInput({}); c.step(1); n++;
      if (hub.pos.y < -3.5) low = true;
      if (low && hub.pos.y > -3.5) rising = true;
    }
    return { dead: p.dead, cause: p.deathCause, crushed: t.arch().crushed - c0, hubY: +hub.pos.y.toFixed(2), s: +w.s.toFixed(1), low, rising };
  });
  console.log(`  Einklemmen: ${JSON.stringify(r)}`);
  check(`3-2: Hubzaun senkt sich, fährt wieder hoch – wer trödelt, wird zwischen hinterer Grenze und Zaun eingeklemmt (${r.cause}, s ${r.s})`, r.low && r.rising && r.dead && r.cause === 'crush' && r.crushed === 1);
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, w = L.scroll;
    // wer die Warp-Box auslässt, wird am Gittertor eingeklemmt
    let m = 0; while (p.dead && m < 900) { c.step(1); m++; }
    t.waitS(64);
    t.place([2.5, 0, -58.6], { invuln: 0, settle: 1 });
    let n = 0;
    const c0 = t.arch().crushed;
    while (!p.dead && n < 120 * 20) { c.setInput({ ...t.stick(0, -1) }); c.step(1); n++; }
    return { dead: p.dead, cause: p.deathCause, crushed: t.arch().crushed - c0, s: +w.s.toFixed(1), z: +p.pos.z.toFixed(2) };
  });
  check(`3-2: ohne Warp-Box hängt man am Gittertor fest und wird eingeklemmt (${r.cause}, s ${r.s})`, r.dead && r.cause === 'crush');

  // Senkrecht: unten aus dem Bild = Absturz; Checkpoint mit Fensterlage; Zäune im Takt der Fahrt-Uhr
  await load('3-2', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, w = L.scroll, E = (id) => L.named.get(id);
    const ids = ['p1', 'hub1', 'p2', 'k2', 'k4', 'sz1', 'sz2'];
    const at = () => ids.map((id) => { const f = E(id); return [f.pos.x, f.pos.y, f.pos.z]; });
    t.waitS(64);
    t.place([-3.5, 0, -64.0], { invuln: 0, settle: 1 });
    const cp = !!L.runtime.checkpoint;
    const snapS = w.s, snapClock = w.clock, fences0 = at();
    // auf der Insel stehen bleiben, während das Fenster nach oben fährt
    let n = 0;
    while (!p.dead && n < 120 * 30) { c.setInput({}); c.step(1); n++; }
    const death = { dead: p.dead, cause: p.deathCause, cy: +w.center.y.toFixed(1), s: +w.s.toFixed(1), mode: c.arch.frame.backMode };
    let m = 0; while (p.dead && m < 900) { c.step(1); m++; }
    c.step(1);   // Zäune rücken im ersten Schritt nach dem Neustart auf die zurückgestellte Uhr
    const s1 = w.s, clock1 = w.clock, fences1 = at();
    const diffs = fences0.map((a, i) => +Math.hypot(a[0] - fences1[i][0], a[1] - fences1[i][1], a[2] - fences1[i][2]).toFixed(3));
    return { cp, snapS: +snapS.toFixed(2), snapClock: +snapClock.toFixed(2), death, s: +s1.toFixed(2), clock: +clock1.toFixed(2), z: +p.pos.z.toFixed(1), diffs, diff: Math.max(...diffs) };
  });
  console.log(`  Kletterturm/Checkpoint: ${JSON.stringify(r)}`);
  check(`3-2: senkrechte Fahrt – wer unten bleibt, fällt aus dem Bild (${r.death.cause} bei s ${r.death.s}, Fenster y ${r.death.cy}, backMode ${r.death.mode})`, r.cp && r.death.dead && r.death.cause === 'fall' && r.death.mode === 'kill');
  check(`3-2: Neustart am Checkpoint mit Fensterlage und Fahrt-Uhr von damals (s ${r.s} ≈ ${r.snapS}, Uhr ${r.clock} ≈ ${r.snapClock})`, near(r.s, r.snapS, 0.3) && near(r.clock, r.snapClock, 0.2) && r.z < -62);
  check(`3-2: fahrende Zäune folgen der Fahrt-Uhr – nach dem Neustart stehen alle wie damals (Abweichung ${r.diff} m)`, r.diff < 0.3);

  // Stempel: Krallen-Anzug aus dem ?-Block, Krallenwand hinter dem Glasrohr-Eingang, Zaun → Stempel
  await load('3-2', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player;
    const out = {};
    // ?-Block auf der Checkpoint-Insel gibt den Krallen-Anzug
    t.waitS(64);
    t.place([3.2, 0, -64.5], { invuln: 1e9, settle: 4 });
    t.until(() => p.vel.y < 0 && p.mode === 'air', { jump: true }, 120);
    t.until(() => p.mode === 'ground', {}, 120);
    const pu = L.entities.find((e) => e.kind === 'powerup' && e.power === 'krallen');
    out.popped = !!pu;
    if (pu) {
      // der Anzug bleibt oben auf dem Block liegen: seitlich anlaufen und auf den Block springen
      t.step({}, 80);
      t.go(pu.pos.x + 1.7, pu.pos.z, { tol: 0.15 }); t.step({}, 30);
      t.jumpTo(pu.pos.x, pu.pos.z, { hold: 40, max: 160 });
      t.step({}, 10);
      out.blockTop = +p.pos.y.toFixed(2);
    }
    out.power = p.power;
    // ohne Krallen: die Wand ist zu hoch
    t.waitS(108);
    t.place([3.6, 37.6, -65.5], { invuln: 1e9, settle: 2 });
    t.go(3.6, -68.4, { tol: 0.15 });
    let k = 0, maxTop = false;
    t.until(() => false, () => { if (p.mode === 'ground' && p.pos.y > 41.7) maxTop = true; return { y: 1, jump: (k++ % 50) < 25 }; }, 300);
    out.noClaw = maxTop;
    // mit Krallen: hinauf, an den Zaun, Stempel
    t.place([3.6, 37.6, -65.5], { invuln: 1e9, settle: 2, power: 'krallen' });
    t.go(3.6, -68.4, { tol: 0.15 });
    k = 0;
    out.climb = t.until(() => p.pos.y > 41.7 && p.mode === 'ground', () => ({ y: 1, jump: k++ < 20 }), 600);
    t.jumpTo(3.6, -70.0, { hold: 10, into: 1, max: 120 });
    out.fence = p.fence?.obj?.spec?.id ?? null;
    t.until(() => L.runtime.stamp, { y: 1 }, 400);
    out.stamp = !!L.runtime.stamp;
    return out;
  });
  console.log(`  Stempel: ${JSON.stringify(r)}`);
  check(`3-2 Stempel: ?-Block gibt den Krallen-Anzug (${r.power}); ohne Krallen kein Weg auf die Wand, mit Krallen hinauf, Zaun ${r.fence} → Stempel`, r.popped && r.power === 'krallen' && !r.noClaw && r.climb > 0 && r.stamp);
  await SHOT('32_a2_gipfel', () => {
    const c = window.__course, t = window.__t;
    c.player.invuln = 1e9;
    t.place([5.2, 37.6, -64.5], { invuln: 1e9, settle: 4 });
  });

  // Stern 3: Kurbelrad nach dem Glasrohr → Plattform → Zaun → Stern
  await load('3-2', { hero: 'greta' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, E = (id) => L.named.get(id);
    const out = {};
    t.waitS(117.5);
    t.place([12, 43.5, -65.6], { invuln: 1e9, settle: 2 });
    const kr = E('kurbel3');
    t.go(17.6, -65.6, { tol: 0.2 });
    t.jumpTo(17.6, -68.6, { hold: 40, into: 1, max: 140 });
    out.noCrank = p.fence?.obj?.spec?.id ?? null;
    t.until(() => p.mode === 'ground', {}, 200);
    t.go(13.0, -63.4, { tol: 0.3 });
    t.circle(14.2, -64.6, 1.25, () => kr.full || kr.k > 0.98);
    out.k = +kr.k.toFixed(2); out.platY = +kr.platformY.toFixed(2);
    t.go(17.6, -65.4, { tol: 0.25 });
    t.jumpTo(17.6, -67.2, { hold: 40, max: 160 });
    out.onPlat = p.ground?.tag ?? null;
    t.jumpTo(17.6, -68.7, { hold: 40, into: 1, max: 160 });
    out.fence = p.fence?.obj?.spec?.id ?? null;
    t.until(() => L.runtime.stars[2] || p.mode !== 'wall', { y: 1 }, 300);
    out.got = !!L.runtime.stars[2];
    return out;
  });
  console.log(`  Stern 3: ${JSON.stringify(r)}`);
  check(`3-2 Stern 3: ohne Kurbeln kein Griff; um das Kurbelrad laufen hebt die Plattform (y ${r.platY}), von dort an den Zaun, oben der Stern`, r.noCrank === null && r.k > 0.95 && r.onPlat === 'kurbelrad:plattform' && r.fence === 'g3' && r.got);
  await SHOT('32_a3_kurbelrad', () => {
    const c = window.__course;
    c.player.invuln = 1e9;
  });

  // 1-Up: Kurbelrad auf der Zielinsel → Plattform → Wolke
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player, E = (id) => L.named.get(id);
    t.waitS(999);
    t.place([103.5, 30, -63.8], { invuln: 1e9, settle: 2 });
    const kr = E('kurbelZiel'), lives0 = L.runtime.lives;
    t.circle(105.5, -62.5, 1.25, () => kr.full || kr.k > 0.98);
    t.go(108.8, -62.2, { tol: 0.25 });
    t.jumpTo(108.8, -60, { hold: 40, max: 160 });
    const plat = p.ground?.tag ?? null;
    t.jumpTo(112.6, -59.4, { hold: 40, max: 200 });
    t.go(112.6, -59.4, { tol: 0.2 });
    t.step({}, 30);
    return { plat, lives: L.runtime.lives - lives0, k: +kr.k.toFixed(2), pos: [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)], ground: p.ground?.tag ?? null };
  });
  console.log(`  1-Up: ${JSON.stringify(r)}`);
  check(`3-2 1-Up: Kurbelrad der Zielinsel hebt die Plattform, Sprung auf die Wolke → Extraleben`, r.plat === 'kurbelrad:plattform' && r.lives >= 1);
  await SHOT('32_a4_zielinsel', () => {
    const t = window.__t;
    t.place([104, 30, -70], { invuln: 1e9, settle: 4 });
  });

}

async function test32c() {
  console.log('\n3-2 (Bilder und Kennzahlen je Abschnitt)');
  // Bilder und Kennzahlen je Abschnitt
  await load('3-2', { hero: 'lotti' });
  const SECTIONS = [
    ['32_a1_platte', 8, [0.6, 0, -5.5], 'p1'], ['32_a1_hubzaun', 18, [0.6, 0, -18]], ['32_a1_bruecke', 27, [0, 0, -27.8]],
    ['32_a1_querplattform', 44, [3, 0, -43]], ['32_a1_torinsel', 62, [1.5, 0, -53]], ['32_a2_checkpoint', 68, [-2, 0, -64]],
    ['32_a2_k1', 82, [-2.15, 9, -69.62], 'wall'], ['32_a2_k3', 92, [6, 20, -69.62], 'wall'], ['32_a2_k5', 104, [-1.5, 33, -69.62], 'wall'],
    ['32_a3_wolken', 140, [29.6, 42.4, -66]], ['32_a3_schiebezaun', 160, [52, 40.2, -64.5]], ['32_a3_endstation', 186, [74, 40, -65]],
  ];
  for (const [name, s, pos, mode] of SECTIONS) {
    await SHOT(name, ({ s, pos, mode }) => {
      const c = window.__course, t = window.__t, L = c.level;
      t.waitS(s);
      // auf der Schiebeplattform P1 (wo sie gerade ist)
      if (mode === 'p1') { const f = L.named.get('p1'); t.until(() => f.pos.z > -3.6, {}, 120 * 12); pos = [f.pos.x + 0.5, f.pos.y + 0.36, f.pos.z - 1]; }
      t.place(pos, { invuln: 1e9, settle: 2 });
      // am Zaun: im Fallen greifen (Stick zum Zaun)
      if (mode === 'wall') t.until(() => c.player.mode === 'wall', { y: 1 }, 90);
      t.step({}, 30);
    }, { s, pos, mode });
  }
}

// ====================================================================== 3-6 Gipfelflitzer-Rennen
function route36(upper) {
  const c = window.__course, L = c.level, t = window.__t, p = c.player;
  p.invuln = 1e9;
  const log = [];
  const M = (n, x) => t.mark(log, n, x);
  let r;
  const route = (pts) => { for (const [x, z] of pts) { const q = t.go(x, z, { run: true, tol: 0.6, slow: 0.3 }); if (!q.ok) return q; } return { ok: true }; };
  r = route([[0, -12]]); t.launch(0, -17.6); t.fly();
  M('sf1', { z: p.pos.z });
  r = route([[2.6, -29.5]]);
  const vb = []; t.until(() => p.pos.z < -32.5, () => { vb.push(p.gs); return { ...t.stick(0, -1), run: true }; }, 200);
  M('boost', { gs: +Math.max(...vb).toFixed(1) });
  t.launch(2.6, -35.6); t.fly();
  M('sf2', { z: p.pos.z });
  if (upper) {
    t.past(-8.5, -58); t.past(-8.5, -64); t.past(-8.5, -122.5);
    M('oben', { y: +p.pos.y.toFixed(2) });
  } else {
    t.past(4.5, -56); t.past(8.5, -64); t.past(8.5, -92.6);
    M('unten', { star1: !!L.runtime.stars[0] });
    t.go(8.5, -93.4, { run: true, tol: 0.2, slow: 0.2 });
    t.jumpTo(8.5, -102, { hold: 40, run: true });
    route([[8.5, -117.6]]);
    t.jumpTo(8.5, -119.4, { hold: 20 });
    t.until(() => p.mode !== 'script', {}, 400); t.step({}, 20);
    M('warp', { y: +p.pos.y.toFixed(2) });
  }
  r = route([[0, -138], [-3, -153.0]]);
  M('checkpoint', { cp: !!L.runtime.checkpoint });
  route([[0, -152]]);
  t.past(0, -159.5);
  t.jumpTo(0, -170.5, { hold: 30 });
  M('boostschraege', { z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2) });
  route([[0, -171]]); t.launch(0, -174.4); t.fly();
  M('sf3', { z: p.pos.z });
  route([[-2, -189]]); t.launch(-2, -192.4); t.fly();
  M('sf4', { z: p.pos.z });
  r = route([[0, -212], [0, -228], [0, -241]]);
  M('gipfel', { y: +p.pos.y.toFixed(2) });
  r = route([[0, -276]]);
  M('rutschhang', { y: +p.pos.y.toFixed(2) });
  t.launch(0, -279); t.fly();
  M('sfZiel', { z: +p.pos.z.toFixed(2), y: +p.pos.y.toFixed(2) });
  route([[0, -297.6]]);
  t.step({}, 240);
  M('ziel', { finished: c.finished });
  return { log, finished: c.finished, dead: p.dead, time: +L.time.toFixed(1) };
}

async function test36a() {
  console.log('\n3-6 „Gipfelflitzer-Rennen“');
  await load('3-6', { fresh: true });
  check('3-6: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
  let r = await sc(() => {
    const c = window.__course, L = c.level;
    const kinds = {};
    for (const e of L.entities) kinds[e.kind] = (kinds[e.kind] ?? 0) + 1;
    return { title: L.data.title, arch: L.data.archetype, theme: L.data.theme, music: L.data.music, limit: L.data.timeLimit, kinds, stars: L.data.stars.length, stamp: !!L.data.stamp, sky: c.view.theme.label, stand: L._race?.stand?.seats ?? 0, len: -L.data.goal.pos[2] };
  });
  console.log(`  Arten: ${JSON.stringify(r.kinds)}`);
  check(`3-6: „${r.title}“, Parcours, Thema ${r.theme} (${r.sky}), Musik ${r.music}, ${r.limit} s, ${r.len} m, 3 Sterne + Stempel`, r.arch === 'parcours' && r.theme === 'race' && r.music === 'course_race' && r.limit === 400 && r.stars === 3 && r.stamp && r.len > 280);
  check(`3-6: Gegner Schnappblume ${r.kinds.schnappblume} (5), Flatterkäfer ${r.kinds.flatterkaefer} (28), Pilzling ${r.kinds.pilzling}; Tribüne mit ${r.stand} Tierchen`, r.kinds.schnappblume === 5 && r.kinds.flatterkaefer === 28 && r.kinds.pilzling === 3 && r.stand >= 30);
  await SHOT('36_a1_start', () => { window.__course.step(20); });
  // Ampel am Startbogen
  r = await sc(() => {
    const c = window.__course, L = c.level;
    const a = L.named.get('ampel');
    const before = a.go;
    c.step(120 * 3.2);
    return { before, after: a.go };
  });
  check('3-6: Ampel am Start-Ziel-Bogen springt nach 3 s auf Grün', !r.before && r.after);

  // Routen-Bot Lotti (untere Straße mit Stern 1)
  await load('3-6', { hero: 'lotti' });
  const botL = await sc(route36, false);
  console.log(`  Bot Lotti: ${JSON.stringify(botL.log.map((x) => [x.n, x.pos, x.star1 ?? x.gs ?? x.cp ?? '']))}`);
  check(`3-6 Lotti: Sprungfelder landen genau auf dem Ziel (z ${stage(botL, 'sf1').z}, ${stage(botL, 'sf2').z}, ${stage(botL, 'sf3').z}, ${stage(botL, 'sf4').z}; Ziel −30,4 / −48,6 / −185 / −203)`,
    near(stage(botL, 'sf1').z, -30.4, 0.15) && near(stage(botL, 'sf2').z, -48.6, 0.15) && near(stage(botL, 'sf3').z, -185, 0.15) && near(stage(botL, 'sf4').z, -203, 0.15));
  check(`3-6 Lotti: Boost-Pfeil bringt ${stage(botL, 'boost').gs} m/s`, stage(botL, 'boost').gs >= 15.5);
  check(`3-6 Lotti: untere Straße – Stern 1 unter dem Felsbogen, Warp-Box hinauf zum Hang, Checkpoint`, stage(botL, 'unten').star1 && stage(botL, 'warp').y > 3.9 && stage(botL, 'checkpoint').cp);
  check(`3-6 Lotti: Boost-Schräge über die Grube, Gipfel (y ${stage(botL, 'gipfel').y}), Rutschhang, Sprungfeld zur Zielinsel, Zielmast (${botL.time} s)`, stage(botL, 'boostschraege').y > 9.9 && stage(botL, 'gipfel').y > 17.9 && stage(botL, 'sfZiel').y > 5.9 && botL.finished && !botL.dead);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}w3lb_36_ergebnis.png` });

  // Routen-Bot Greta (obere Straße mit den Schnappblumen)
  await load('3-6', { hero: 'greta' });
  const botG = await sc(route36, true);
  console.log(`  Bot Greta: ${JSON.stringify(botG.log.map((x) => [x.n, x.pos]))}`);
  check(`3-6 Greta: obere Straße (y ${stage(botG, 'oben').y}) → Hang → Zielmast (${botG.time} s)`, stage(botG, 'oben').y > 3.9 && botG.finished && !botG.dead);

}

async function test36b() {
  console.log('\n3-6 (Grube, Sterne, Stempel, 1-Up)');
  let r;
  // Grubentrampolin: wer neben dem Sprungfeld in die Lücke fällt, hüpft aufs Trampolin und wieder heraus
  await load('3-6', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, t = window.__t, p = c.player;
    t.place([3.2, 0, -18.6], { invuln: 1e9, settle: 2 });
    const fell = t.until(() => p.pos.y < -4.9 && p.mode === 'ground', () => t.stick(0, -1), 240);
    t.step({}, 30); t.go(1.4, -23.5, { tol: 0.15 }); t.step({}, 30);
    let maxY = -10, bounced = false;
    for (let i = 0; i < 600; i++) {
      const tz = bounced ? -29.5 : -23.5, dx = 0 - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz) || 1;
      const steer = true;
      c.setInput({ ...(steer ? t.stick(dx / d * Math.min(1, d), dz / d * Math.min(1, d)) : {}), jump: true });
      c.step(1);
      if (p.vel.y > 17) bounced = true;
      maxY = Math.max(maxY, p.pos.y);
      if (bounced && p.mode === 'ground') break;
    }
    return { fell, bounced, maxY: +maxY.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2) };
  });
  check(`3-6: Pilztrampolin in der Grube schleudert hinaus (Scheitel y ${r.maxY}), Landung auf der Strecke (y ${r.y})`, r.maxY > 2 && r.y > -0.1 && r.z < -26.9);

  // Stern 2: Aufstieg zur Warp-Box (9 Flatterkäfer) → Bonus-Oval → Hase; Stempel über Trampoline
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player;
    const out = {};
    const BX = 98, BZ = -190;
    const guards = L.entities.filter((e) => e.kind === 'flatterkaefer' && Math.hypot(e.pos.x - 10.8, e.pos.z + 190) < 5.6 && e.pos.y > 11.5).length;
    out.guards = guards;
    // Treppe hinauf aufs Plateau und in die Warp-Box; prallt man an einem Wächter ab, neuer Anlauf (wie ein Spieler)
    out.tries = 0;
    for (let k = 0; k < 5 && p.pos.x < 80; k++) {
      out.tries++;
      t.place([2, 10, -189.5], { invuln: 1e9, settle: 2 });
      t.step({}, k * 70);
      t.go(4.0, -189.5, { tol: 0.2 });
      let jk = 0;
      t.until(() => p.pos.x > 80 || (p.pos.x > 8.9 && p.mode === 'ground' && p.pos.y > 13.9), () => ({ ...t.stick(1, 0), jump: (jk++ % 30) < 12 }), 600);
      if (p.pos.x < 80) { t.step({}, 20); t.jumpTo(10.8, -190, { hold: 20, max: 200 }); }
      t.until(() => p.mode !== 'script', {}, 400); t.step({}, 30);
    }
    out.bonus = p.pos.x > 80;
    if (!out.bonus) return out;
    const hase = L.entities.find((e) => e.kind === 'bunny');
    const boosts = [];
    out.hase = t.until(() => hase.state === 'caught' || L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden), () => { boosts.push(p.gs); const dx = hase.pos.x - p.pos.x, dz = hase.pos.z - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d, dz / d), run: true }; }, 120 * 40);
    out.maxGs = +Math.max(...boosts).toFixed(1);
    t.go(BX - 2.6, BZ, { tol: 0.3 });
    t.jumpTo(BX, BZ, { hold: 25 });
    t.step({}, 20);
    out.star2 = !!L.runtime.stars[1];
    t.go(BX + 4, BZ + 3.0, { tol: 0.2 });
    t.jumpTo(BX + 4, BZ + 1, { hold: 30, max: 90, grab: false });
    t.jumpTo(BX + 8.5, BZ - 2.5, { hold: 60, max: 300, grab: false });
    t.jumpTo(BX + 9.5, BZ - 7.5, { hold: 60, max: 300 });
    t.step({}, 30);
    out.stamp = !!L.runtime.stamp;
    // Rückweg
    t.place([BX - 7, 0, BZ + 10], { invuln: 1e9, settle: 2 });
    t.jumpTo(BX - 10, BZ + 10, { hold: 20, max: 200 });
    t.until(() => p.mode !== 'script', {}, 400); t.step({}, 20);
    out.back = p.pos.x < 20 && p.pos.y > 9.9;
    return out;
  });
  console.log(`  Bonus: ${JSON.stringify(r)}`);
  check(`3-6 Stern 2: Warp-Box auf dem Aufstieg (bewacht von ${r.guards} Flatterkäfern) → Bonus-Oval, Hase gefangen (nach ${(r.hase / 120).toFixed(1)} s, ${r.tries}. Anlauf) → Stern auf dem Siegertreppchen`, r.guards === 9 && r.bonus && r.hase >= 0 && r.star2);
  check('3-6 Stempel: nach Stern 2 über zwei Pilztrampoline auf den Stempel-Sims; Warp-Box zurück zum Hang', r.stamp && r.back);
  await SHOT('36_a3_bonus', () => {
    const t = window.__t;
    t.place([98 - 8, 0, -190 + 8], { invuln: 1e9, settle: 4 });
  });

  // Stern 3 (Krallen-Anzug aus dem Baum, Felsturm → Warp-Box → Wolkenterrasse) und der Gleitblatt-Weg; 1-Up
  await load('3-6', { hero: 'lotti' });
  r = await sc(() => {
    const c = window.__course, L = c.level, t = window.__t, p = c.player;
    const out = {};
    t.place([5.0, 0, 1.0], { invuln: 1e9, settle: 2 });
    out.tree = t.until(() => p.power === 'krallen', () => { const tree = L.named.get('krallenbaum'); const drop = L.entities.find((e) => e.kind === 'powerup' && e.power === 'krallen'); const tg = drop ? drop.pos : tree.pos; const dx = tg.x - p.pos.x, dz = tg.z - p.pos.z, d = Math.hypot(dx, dz) || 1; return t.stick(dx / d, dz / d); }, 120 * 8);
    // ohne Krallen: Felsturm nicht zu erklimmen
    t.place([-9.6, 18, -235], { invuln: 1e9, settle: 2 });
    let k = 0, top = false;
    t.until(() => false, () => { if (p.mode === 'ground' && p.pos.y > 23.9) top = true; return { x: -1, jump: (k++ % 40) < 20 }; }, 360);
    out.noClaw = top;
    t.place([-9.6, 18, -235], { invuln: 1e9, settle: 2, power: 'krallen' });
    k = 0;
    out.climb = t.until(() => p.pos.y > 23.9 && p.mode === 'ground', () => ({ x: -1, jump: k++ < 20 }), 600);
    t.jumpTo(-13, -235, { hold: 20, max: 200 });
    t.until(() => p.mode !== 'script', {}, 400); t.step({}, 30);
    out.terrace = p.pos.y > 31.9;
    t.go(-42, -235.5, { tol: 0.3 });
    out.star3 = !!L.runtime.stars[2];
    // Gleitblatt aus dem ?-Block am Checkpoint (bleibt oben liegen: auf den Block springen), dann vom Gipfel-Trampolin
    t.place([3.4, 10, -153.4], { invuln: 1e9, settle: 2 });
    t.until(() => p.vel.y < 0 && p.mode === 'air', { jump: true }, 120);
    t.until(() => p.mode === 'ground', {}, 120);
    out.leafPopped = L.entities.some((e) => e.kind === 'powerup' && e.power === 'gleitblatt');
    t.step({}, 80);
    t.go(3.4 + 1.7, -153.4, { tol: 0.15 }); t.step({}, 30);
    t.jumpTo(3.4, -153.4, { hold: 40, max: 160 });
    t.step({}, 10);
    out.leaf = p.power;
    t.place([-1.5, 18, -232.6], { invuln: 1e9, settle: 2, power: 'gleitblatt' });
    t.jumpTo(-1.5, -235, { hold: 20, max: 80, grab: false });
    t.until(() => p.mode === 'ground' && (p.pos.y > 23.9 || (p.pos.y < 18.5 && p.pos.x < -6)), () => { const dx = -13 - p.pos.x, dz = -235 - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d, dz / d), jump: true }; }, 120 * 8);
    out.glide = p.pos.y > 23.9;
    t.place([-1.5, 18, -232.6], { invuln: 1e9, settle: 2 });
    t.jumpTo(-1.5, -235, { hold: 20, max: 80, grab: false });
    t.until(() => p.mode === 'ground' && (p.pos.y > 23.9 || p.pos.x < -6 || p.pos.y < 17), () => { const dx = -13 - p.pos.x, dz = -235 - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d, dz / d), jump: true }; }, 120 * 8);
    out.noGlide = p.pos.y > 23.9;
    // 1-Up auf dem Tribünendach: von der Strecke über die Bande aufs Pilztrampolin, aufs Dach, zum Extraleben
    t.place([-4.6, 0, -11.4], { invuln: 1e9, settle: 2 });
    const lives0 = L.runtime.lives;
    t.jumpTo(-6.8, -11.4, { hold: 30, max: 160, grab: false }); t.step({}, 30);
    t.go(-6.9, -11.5, { tol: 0.1 }); t.step({}, 30);
    let hk = 0;
    out.bounce = t.until(() => p.vel.y > 17, () => { const dx = -8.2 - p.pos.x, dz = -11.5 - p.pos.z, d = Math.hypot(dx, dz) || 1; return { ...t.stick(dx / d * Math.min(1, d), dz / d * Math.min(1, d)), jump: hk++ < 12 || p.vel.y < 0 }; }, 200);
    t.jumpTo(-8.6, -8.6, { hold: 80, max: 300 });
    out.roof = p.ground?.tag ?? null;
    t.go(-9.5, -4, { tol: 0.2 });
    t.step({}, 20);
    out.oneup = L.runtime.lives - lives0;
    return out;
  });
  console.log(`  Geheimnisse: ${JSON.stringify(r)}`);
  check('3-6: Krallen-Anzug fällt aus dem Baum an der Boxengasse', r.tree >= 0);
  check('3-6 Stern 3: Felsturm nur mit Krallen-Anzug (ohne: kein Weg hinauf) → letzte Warp-Box → Wolkenterrasse → Stern', !r.noClaw && r.climb > 0 && r.terrace && r.star3);
  check(`3-6 Stern 3 (zweiter Weg): Gleitblatt aus dem ?-Block am Checkpoint (${r.leaf}), damit vom Gipfel-Trampolin auf den Felsturm gleiten – ohne Gleitblatt zu kurz`, r.leafPopped && r.leaf === 'gleitblatt' && r.glide && !r.noGlide);
  check(`3-6 1-Up: Pilztrampolin hinter der Tribüne → Dach → Extraleben`, r.oneup >= 1);
  await SHOT('36_a4_terrasse', () => {
    const t = window.__t;
    t.place([-40, 32, -233], { invuln: 1e9, settle: 4 });
  });

}

async function test36c() {
  console.log('\n3-6 (Bilder und Kennzahlen je Abschnitt)');
  // Bilder und Kennzahlen je Abschnitt
  await load('3-6', { hero: 'lotti' });
  const SECTIONS = [
    ['36_a1_tribuene', [0, 0, 0]], ['36_a1_grube', [0, 0, -14]], ['36_a1_kaefer', [2, 0, -46.5]],
    ['36_a2_gabelung', [0, 0, -56]], ['36_a2_oben', [-8.5, 4, -84]], ['36_a2_unten', [8.5, 0, -82]],
    ['36_a3_hang', [0, 4, -126]], ['36_a3_boostschraege', [0, 10, -151]], ['36_a3_waechter', [2, 10, -186]],
    ['36_a4_aufstieg', [0, 10, -208]], ['36_a4_gipfel', [0, 18, -232]], ['36_a4_rutschhang', [0, 18, -241]],
    ['36_a4_ziel', [0, 6, -292]],
  ];
  for (const [name, pos] of SECTIONS) {
    await SHOT(name, (pos) => {
      const c = window.__course, t = window.__t;
      t.place(pos, { invuln: 1e9, settle: 30 });
    }, pos);
  }
}

// Teilläufe (je < 10 min unter Last): 3-2a Laden/Fenster/Routen, 3-2b Sterne/Stempel/Einklemmen/Checkpoint/1-Up,
// 3-2c Bilder je Abschnitt; 3-6a/b/c ebenso. '3-2', '3-6' bzw. 'all' = alles.
const PARTS = { '3-2a': test32a, '3-2b': test32b, '3-2c': test32c, '3-6a': test36a, '3-6b': test36b, '3-6c': test36c };
for (const [k, fn] of Object.entries(PARTS)) if (which === 'all' || which === k || which === k.slice(0, 3)) await fn();

console.log('\nKennzahlen (Zeichenaufrufe inkl. Schattenpass / Dreiecke):');
for (const [n, calls, tri] of stats) console.log(`  ${n.padEnd(24)} ${String(calls).padStart(4)}  ${(tri / 1000).toFixed(0).padStart(4)} k`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTri = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) check(`Budget: höchstens ${maxCalls} Zeichenaufrufe (< 120) und ${(maxTri / 1000).toFixed(0)} k Dreiecke (< 300 k) an allen Stellen`, maxCalls < 120 && maxTri < 300000);

const ok = summary(errors);
await browser.close();
stop();
process.exit(ok ? 0 : 1);
