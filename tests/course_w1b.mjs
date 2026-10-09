// Kurs-Level 1-3 („Kraxelei am Klötzchenberg“) und 1-5 („Kippfeld-Manege“): Laden ohne Konsolenfehler,
// Routen-Bot je Abschnitt für Lotti und Greta (deterministisch: Eingaben über __course.setInput, Simulation
// schrittweise über step(1); Teleport an Abschnittsanfänge), Ziel, alle Sterne und Stempel, Hauptroute < 180 s
// Spielzeit, Kennzahlen (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k), Screenshots tests/out/w1b_*.png.
// Aufruf: PORT_BASE=2100 node tests/course_w1b.mjs [1-3|1-5]
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4196;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const only = process.argv[2] ?? null;
const sc = (fn, arg) => page.evaluate(fn, arg);
const f1 = (v) => (typeof v === 'number' ? v.toFixed(1) : v);

// ------------------------------------------------------------------ Bot in der Seite
/** Installiert window.__bot: place(pos, opts), run(actions, opts) → Ergebnis mit Spur und Laufzeit. */
function installBot() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  const P = () => c.player;
  const dirInput = (wx, wz) => {
    // Weltrichtung → Stick (umgekehrt zu Player: want = R(controlYaw) · move)
    const cy = c.level.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
    const l = Math.hypot(wx, wz) || 1;
    wx /= l; wz /= l;
    return { x: co * wx - si * wz, y: -si * wx - co * wz };
  };
  const step = (inp) => { c.setInput(inp); c.step(1); };
  /** Mitte/Oberseite der bewegten Plattform (Form mit mover-Flag), deren Mitte z0 am nächsten liegt. */
  const movers = () => [...c.world.shapes.values()].filter((sh) => sh.mover);
  const mover = (z0, x0) => {
    if (typeof z0 === 'string') {
      // benannte bewegte Plattform (mover mit id → level.named { shape })
      const n = c.level.named.get(z0), sh = n?.shape;
      if (!sh) return null;
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      return { x: cx, y: sh.top, z: cz, sh };
    }
    let best = null, bd = Infinity;
    for (const sh of movers()) {
      const cx = sh.type === 'cyl' ? sh.x : (sh.x0 + sh.x1) / 2, cz = sh.type === 'cyl' ? sh.z : (sh.z0 + sh.z1) / 2;
      const d = Math.abs(cz - z0) + (x0 === undefined ? 0 : Math.abs(cx - x0));
      if (d < bd) { bd = d; best = { x: cx, y: sh.top, z: cz, sh }; }
    }
    return best;
  };
  const bot = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null); c.setInput({});
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = o.big ?? true;
      p.power = o.power ?? 'none';
      p.powerTime = 0;
      p.updateHalf?.();
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = 0;
      c.level.runtime.status = 'play';
      c.level.controlYaw = c.view.rig.controlYaw(p.pos);
      c.view.rig.snap(p);
      c.step(o.settle ?? 30);
      return p.info();
    },
    /** Gegner entfernen (reine Geometrie-Prüfung). */
    /** Gegner entfernen (reine Wege-Prüfung); Zwischenbosse bleiben (keep), der Bosskampf hat einen eigenen Abschnitt. */
    calm(keep = ['riesenschnappblume']) { for (const e of c.level.entities) if (e.enemy && e.alive && !keep.includes(e.kind)) e.kill(); },
    /** Anzahl der Entitäten je Art (frisch geladen). */
    count(kind) { return c.level.entities.filter((e) => e.kind === kind).length; },
    run(actions, o = {}) {
      const log = [];
      const t0 = c.level.time;
      let fail = null;
      const p = P();
      for (let ai = 0; ai < actions.length && !fail; ai++) {
        const a = actions[ai];
        const max = a.max ?? 1500;
        let n = 0;
        const dead = () => p.dead || c.level.runtime.status === 'dying';
        if (a.go) {
          let [tx, tz] = a.go;
          const tol = a.tol ?? 0.45;
          for (; n < max; n++) {
            if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + a.go[0]; tz = m.z + a.go[1]; } }
            if (a.target) { const t = a.target(p, c, bot); if (t) { tx = t[0]; tz = t[1]; } }
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (Math.hypot(dx, dz) < tol) break;
            if (a.until && a.until(p, c)) break;
            const d = dirInput(dx, dz);
            step({ ...d, run: !!a.run, jump: !!a.hold });
            if (dead()) break;
            if (a.stalk && p.mode === 'stalk') break;
          }
        } else if (a.waitfor) {
          for (; n < max; n++) { if (a.waitfor(p, c, bot)) break; step({}); if (dead()) break; }
          if (n >= max) fail = 'Bedingung nicht erreicht';
        } else if (a.jump) {
          // Sprung jetzt drücken, dabei zum Ziel lenken bis zur Landung (nah am Ziel: Stick los)
          let [tx, tz] = a.jump;
          const hold = a.hold ?? 60;
          let air = false;
          for (; n < max; n++) {
            if (a.track !== undefined) { const m = mover(a.track); if (m) { tx = m.x + (a.jump[0] ?? 0); tz = m.z + (a.jump[1] ?? 0); } }
            if (a.target) { const t = a.target(p, c, bot); if (t) { tx = t[0]; tz = t[1]; } }
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            // Wunschgeschwindigkeit zum Ziel (bremst vor dem Ziel), Stick = Richtung der Abweichung
            const k = a.gain ?? 2.2, vmax = a.vmax ?? 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            const d = el < 0.3 ? { x: 0, y: 0 } : dirInput(ex, ez);
            if (el < 2) { d.x *= el / 2; d.y *= el / 2; }
            step({ ...d, run: a.run !== false, jump: n < hold });
            if (p.mode !== 'ground') air = true;
            if (air && (p.mode === 'ground' || p.mode === 'stalk' || p.mode === 'wall' || p.mode === 'script')) break;
            if (dead()) break;
          }
        } else if (a.climb) {
          // Ranke hoch, bis es nicht weiter geht
          let still = 0, lastY = p.pos.y;
          for (; n < max && p.mode === 'stalk'; n++) {
            step({ x: 0, y: 1 });
            if (p.pos.y <= lastY + 1e-4) still++; else still = 0;
            lastY = p.pos.y;
            if (still > 6) break;
          }
          if (p.mode !== 'stalk') fail = `nicht an der Ranke (${p.mode})`;
        } else if (a.wallclimb) {
          // Wandsprung-Kette zwischen zwei Wänden: erste Wand in Richtung dir (±X), bis Höhe until, dann zum Ziel
          const w = a.wallclimb;
          let dir = w.dir, last = false, phase = 'in', top = false;
          // z halten (PD auf die Geschwindigkeit) – Stick-y ist −Z
          const zfix = () => (w.z === undefined ? 0 : -Math.max(-1, Math.min(1, ((w.z - p.pos.z) * 3 - p.vel.z) * 0.5)));
          for (; n < max; n++) {
            if (phase === 'in') {
              // in die erste Wand springen
              step({ x: dir, y: zfix(), jump: n < 24 });
              last = n < 24;
              if (p.mode === 'wall') phase = 'chain';
            } else if (p.mode === 'wall' && !top) {
              // an der Wand: loslassen, dann drücken (Flanke) → Wandsprung zur anderen Seite
              if (last) { step({ x: 0, y: 0, jump: false }); last = false; }
              else { step({ x: 0, y: 0, jump: true }); last = true; if (p.mode !== 'wall') dir = -dir; }
            } else {
              top = top || p.pos.y >= w.until;
              let inp = { x: dir, y: zfix() };
              if (w.seek && !top && Math.abs(p.pos.y - w.seek[1]) < 1.0) {
                // wie ein Mensch: auf Höhe des Ziels hinlenken (Luftsteuerung)
                const vx = (w.seek[0] - p.pos.x) * 3 - p.vel.x, vz = (w.seek[2] - p.pos.z) * 3 - p.vel.z;
                inp = Math.hypot(vx, vz) < 0.3 ? { x: 0, y: 0 } : dirInput(vx, vz);
              }
              if (top && w.then) {
                // zum Ziel lenken und dort abbremsen (wie beim Sprung)
                const vx = (w.then[0] - p.pos.x) * 2.5 - p.vel.x, vz = (w.then[1] - p.pos.z) * 2.5 - p.vel.z;
                inp = Math.hypot(vx, vz) < 0.3 ? { x: 0, y: 0 } : dirInput(vx, vz);
              } else if (top) inp = { x: 0, y: 0 };
              step({ ...inp, jump: !top });
              last = !top;
              if (p.mode === 'ground' && phase === 'chain') break;
            }
            if (w.trace && n % 3 === 0) log.push(['t', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +p.vel.x.toFixed(1), p.mode, p.state, top]);
            if (dead()) break;
            if (w.stop && w.stop(p, c)) { top = true; }
          }
        } else if (a.input) {
          for (; n < (a.n ?? 1); n++) { step(a.input); if (dead()) break; }
        } else if (a.wait) {
          for (; n < a.wait; n++) { step({}); if (dead()) break; }
        } else if (a.teleport) {
          p.reset(a.teleport, Math.PI / 2);
          c.level.controlYaw = c.view.rig.controlYaw(p.pos);
          c.view.rig.snap(p);
          c.step(20);
        } else if (a.exec) {
          a.exec(c);
        }
        log.push([ai, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.yaw.toFixed(2)]);
        if (dead()) fail = `tot (${p.deathCause ?? '?'}) bei Aktion ${ai}`;
        else if (a.go && n >= max) fail = `Ziel ${a.go} nicht erreicht`;
      }
      c.setInput({});
      return { fail, log, time: +(c.level.time - t0).toFixed(2), pos: [p.pos.x, p.pos.y, p.pos.z].map((v) => +v.toFixed(2)), mode: p.mode, rt: c.level.runtime.info() };
    },
  };
  bot.mover = mover;
  /** Lage eines (sichtbaren) Sterns mit Index i bzw. einer benannten Entität. */
  bot.star = (i) => { const e = c.level.entities.find((x) => x.kind === 'star' && x.index === i && x.alive && !x.hidden); return e ? [e.pos.x, e.pos.z, e.pos.y] : null; };
  bot.named = (id) => c.level.named.get(id) ?? null;
  bot.alive = (id) => { const e = c.level.named.get(id); return !!e && e.alive && !e.defeated && !e.removed; };
  window.__bot = bot;
  return true;
}

/** Aktionen als JSON-Daten übertragbar machen (until/exec als Quelltext). */
const runRoute = (actions, o = {}) => sc(([acts, opt]) => {
  const revive = (a) => {
    const b = { ...a };
    if (typeof a.until === 'string') b.until = new Function('p', 'c', `return (${a.until});`);
    if (typeof a.exec === 'string') b.exec = new Function('c', a.exec);
    if (typeof a.waitfor === 'string') b.waitfor = new Function('p', 'c', 'bot', `return (${a.waitfor});`);
    if (typeof a.target === 'string') b.target = new Function('p', 'c', 'bot', `return (${a.target});`);
    if (a.wallclimb && typeof a.wallclimb.stop === 'string') b.wallclimb = { ...a.wallclimb, stop: new Function('p', 'c', `return (${a.wallclimb.stop});`) };
    return b;
  };
  return window.__bot.run(acts.map(revive), opt);
}, [actions, o]);
const place = (pos, o = {}) => sc(([p, opt]) => window.__bot.place(p, opt), [pos, o]);

async function load(id) {
  try { await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 60000 }); }
  catch { await page.waitForTimeout(2000); await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 60000 }); }
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 40000 });
  } catch {
    console.log(`Level ${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    stop(); process.exit(1);
  }
  await page.waitForTimeout(300);
  await sc(installBot);
}

// ------------------------------------------------------------------ Bildschirmfotos und Kennzahlen
const stats = [];
async function shot(name, pos, o = {}) {
  await sc(([p, opt]) => {
    const c = window.__course;
    if (p) window.__bot.place(p, { hero: opt.hero ?? 'lotti', settle: opt.settle ?? 20 });
    if (opt.pre) new Function('c', 'bot', opt.pre)(c, window.__bot);
    if (opt.zoom !== undefined && c.view.rig.zoomIndex !== opt.zoom) c.view.rig.toggleZoom();
    c.view.rig.userYawTarget = opt.yaw ?? 0;
    c.snapCamera();
    c.setInput(null);
  }, [pos, o]);
  await page.waitForTimeout(o.wait ?? 1100);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  try { await page.screenshot({ path: `${OUT}w1b_${name}.png`, timeout: 90000 }); }
  catch (e) { console.log(`    (Bild ${name} übersprungen: ${e.message.split('\n')[0]})`); }
}

// ------------------------------------------------------------------ Routen
// Jeder Abschnitt: start (Teleport), Aktionen, Erwartung (Endbereich). Kamera-Gier ist überall 0 → x = +X, y = −Z.
const shots = (n, gap = 110) => Array.from({ length: n }, () => [{ input: { action: true }, n: 1 }, { wait: gap }]).flat();
const R13 = {
  id: '1-3',
  enemies: { krallen_pilzling: 8, schnappblume: 14, riesenschnappblume: 1 },
  main: [
    { name: 'Startplatz → Feld', start: [0, 0, 6], acts: [{ go: [0, -8], run: true }, { go: [0, -21], run: true }], expect: (s) => s.pos[2] < -20 && Math.abs(s.pos[1] - 1) < 0.2 },
    { name: 'Schnappblumenfeld → Hang', start: [0, 1, -21], acts: [{ go: [0.5, -44.3], run: true }, { jump: [0.5, -49.5] }], expect: (s) => s.pos[2] < -47.3 && Math.abs(s.pos[1] - 3) < 0.2 },
    { name: 'POW-Hang → Ranke → Wolkenstart', start: [0, 3, -49], acts: [
      { go: [-3, -70], run: true }, { go: [-3, -76] }, { go: [-3, -80.4], tol: 0.2, stalk: true, max: 300 }, { climb: true }, { jump: [-3, -84], run: false },
    ], expect: (s) => s.pos[2] < -81.5 && Math.abs(s.pos[1] - 15) < 0.2 },
    { name: 'Wolkenpfad → Holzbrücke', start: [0, 15, -86], acts: [
      { go: [-0.6, -87.6], tol: 0.3 }, { jump: [-1, -92] },
      { go: [0.1, -93.2], tol: 0.3 }, { jump: [2.5, -98.5] },
      { go: [1.6, -99.7], tol: 0.3 }, { jump: [-1.5, -105] },
      { go: [-0.7, -106.3], tol: 0.3 }, { jump: [1.5, -111.5] },
      { go: [1.5, -112.9], tol: 0.3 }, { jump: [1.5, -118.5] },
      { go: [1.5, -127], run: true },
    ], expect: (s) => s.pos[2] < -126.5 && Math.abs(s.pos[1] - 17) < 0.2 },
    { name: 'Doppelhügel', start: [1.5, 17, -127], acts: [{ go: [0.3, -134], run: true }, { go: [0.3, -147], run: true }, { go: [-3.5, -152], run: true }], expect: (s) => s.pos[2] < -151.5 && Math.abs(s.pos[1] - 17) < 0.2 },
    { name: 'Riesenblock-Treppe → Ranke → Gipfelbrücke', start: [-3.5, 17, -152], acts: [
      { jump: [-3.5, -155.5] }, { go: [-1.4, -157], run: true, tol: 0.3 }, { jump: [2.5, -159.5] },
      { go: [0.4, -161], run: true, tol: 0.3 }, { jump: [-3.5, -163.5] }, { go: [-1.4, -165], run: true, tol: 0.3 }, { jump: [2.5, -167.5] },
      { go: [2.5, -170.6], tol: 0.2, stalk: true, max: 400 }, { climb: true }, { jump: [2.5, -174], run: false },
      { go: [0, -186.6], run: true },
    ], expect: (s) => s.pos[2] < -186 && Math.abs(s.pos[1] - 30) < 0.2 },
    { name: 'Riesenschnappblume (Funkenblüte) → Warp-Box → Gipfel', start: [0, 30, -186.6], power: 'funken', keepBoss: true, acts: [
      { go: [0, -188.6], tol: 0.25 }, { wait: 20 }, ...shots(8, 120),
      { waitfor: '!bot.alive("gipfelboss")', max: 900 },
      { waitfor: 'bot.named("zielbox") && !bot.named("zielbox").hidden', max: 400 },
      { go: [0, -189.4], tol: 0.25 }, { jump: [0, -191], run: false }, { waitfor: 'p.pos.y > 39 && p.mode === "ground"', max: 900 },
    ], expect: (s) => Math.abs(s.pos[1] - 40) < 0.3 && s.pos[2] < -204 },
    { name: 'Gipfel → Zielmast', start: [0, 40, -205.5], acts: [{ go: [0, -211.2], run: true, until: 'p.mode === "script"', max: 600 }, { wait: 60 }], expect: (s) => s.rt.status === 'goal' || s.rt.status === 'done' },
  ],
  extras: [
    { name: 'Stern 1 (Rankenbaum)', start: [-6.5, 0, 3], acts: [{ go: [-6.5, -0.2], tol: 0.2, stalk: true, max: 300 }, { climb: true }, { jump: [-6.5, -3.2], run: false }, { wait: 30 }], expect: (s) => s.rt.stars[0] },
    { name: 'Stempel (Wandsprung-Schacht)', start: [7, 0, -3.6], acts: [{ go: [7, -6.2], tol: 0.15 }, { wait: 30 }, { wallclimb: { dir: 1, until: 9.5, z: -6.2, seek: [7, 7.6, -6.2], stop: 'c.level.runtime.stamp' } }, { wait: 20 }], expect: (s) => s.rt.stamp },
    { name: 'POW sprengt die Ziegelwand → Röhre → P-Schalter-Raum', start: [2, 9, -71.6], acts: [
      { go: [2, -73.5], tol: 0.15 }, { wait: 30 }, { input: { jump: true }, n: 30 }, { wait: 90 },
      { waitfor: 'c.level.entities.filter((e) => e.kind === "brick" && e.alive && Math.abs(e.pos.z + 77.5) < 0.1).length === 0', max: 60 },
      { go: [6.5, -77.6], tol: 0.2 }, { wait: 20 }, { jump: [6.5, -79.7], run: false, hold: 20 }, { wait: 10 }, { go: [6.5, -79.7], tol: 0.15, max: 120 }, { wait: 10 }, { input: { crouch: true }, n: 6 }, { waitfor: 'p.pos.x > 55 && p.mode === "ground"', max: 900 },
    ], expect: (s) => s.pos[0] > 55 },
    { name: 'Stern 2 (Druckschalter, 8 blaue Münzen)', start: [66, 0, -64], acts: [
      { go: [68.4, -66.2], tol: 0.3 }, { jump: [70, -67], run: false }, { wait: 10 },
      { go: [70, -63.1], run: true, tol: 0.35 }, { jump: [70, -61.8], run: false },
      { go: [73.5, -61], run: true, tol: 0.4 }, { go: [74, -63.9], run: true, tol: 0.3 }, { jump: [74, -66], run: false },
      { go: [76.5, -70], run: true, tol: 0.4 }, { go: [71.9, -74.2], run: true, tol: 0.3 }, { jump: [70, -75.5], run: false },
      { go: [67.9, -74], run: true, tol: 0.3 }, { jump: [66, -72], run: false },
      { go: [63.5, -66], run: true, tol: 0.4 }, { go: [66, -63.5], run: true, tol: 0.4 },
      { waitfor: 'bot.star(1) || c.level.runtime.stars[1]', max: 120 }, { go: [0, 0], target: 'bot.star(1)', until: 'c.level.runtime.stars[1]', tol: 0.3, run: true, max: 400 }, { wait: 20 },
    ], expect: (s) => s.rt.stars[1] },
    { name: 'Stern 3 (Wolkenkanone → Münzhimmel)', start: [-5.5, 20, -135.3], acts: [
      { go: [-5.5, -135.5], tol: 0.2 }, { jump: [-5.5, -137.5], run: false }, { waitfor: 'p.pos.x < -40 && p.mode === "ground"', max: 900 },
      { go: [-46, -123.4], run: false, tol: 0.4 }, { go: [-46, -124.5], tol: 0.25 }, { jump: [-46, -129], run: false },
      { go: [-46, -138.3], run: true, tol: 0.3 }, { jump: [-43, -144.5], run: false },
      { go: [-44.2, -147.3], tol: 0.3 }, { jump: [-48, -154], run: false },
      { go: [-47.4, -156.3], tol: 0.3 }, { jump: [-46, -162], run: false },
      { go: [-46, -164.5], tol: 0.3 }, { wait: 20 },
    ], expect: (s) => s.rt.stars[2] },
  ],
};

const R15 = {
  id: '1-5',
  enemies: { krabbelkaefer: 8, brummer: 8, flatterkaefer: 6, zauberkroete: 1 },
  main: [
    { name: 'Schalter-Feld 1 (alle Felder) → Steg', start: [0, 0, 5], acts: [
      { go: [-5, -1], tol: 0.35 }, { go: [0, -1], tol: 0.35 }, { go: [5, -1], tol: 0.35 }, { go: [5, -7], tol: 0.35 }, { go: [0, -7], tol: 0.35 }, { go: [-5, -7], tol: 0.35 },
      { wait: 150 },
      { go: [-1, -13.4], run: true }, { jump: [-1, -16.5], run: false }, { go: [-0.3, -17.6], tol: 0.3 }, { jump: [0, -20], run: false },
      { go: [0.6, -21.1], tol: 0.3 }, { jump: [1, -23.5], run: false }, { go: [1, -24.6], tol: 0.3 }, { jump: [0.5, -28.5], run: false },
    ], expect: (s) => s.pos[2] < -27.2 && Math.abs(s.pos[1]) < 0.2 },
    { name: 'Schalter-Feld 2: fahrende Plattformen', start: [0, 0, -29], acts: [
      { go: [0, -33] }, { waitfor: 'Math.abs(bot.mover("lift1").x - p.pos.x) < 1.2 && bot.mover("lift1").sh.mover.vx * (p.pos.x - bot.mover("lift1").x) <= 0', max: 2000 },
      { go: [0, -34.6], tol: 0.3 }, { jump: [0, 0], track: 'lift1', run: false },
      { go: [0, 1.2], track: 'lift1', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x - p.pos.x) < 1.6', max: 2000 },
      { go: [0, -1.2], track: 'lift1', tol: 0.3 }, { jump: [0, 0], track: 'lift2', run: false },
      { go: [0, 1.2], track: 'lift2', tol: 0.3 }, { waitfor: 'Math.abs(bot.mover("lift2").x) < 0.6', max: 2000 },
      { go: [0, -1.2], track: 'lift2', tol: 0.3 }, { jump: [0, -52], run: false },
    ], expect: (s) => s.pos[2] < -50.2 && Math.abs(s.pos[1] - 1.5) < 0.2 },
    { name: 'Checkpoint-Trommel', start: [0, 1.5, -51], acts: [{ go: [0, -55.4] }, { jump: [0, -61], run: false }, { go: [0, -63.2] }, { wait: 10 }], expect: (s) => Math.abs(s.pos[1] - 2.5) < 0.2 && !!s.rt.checkpoint },
    { name: 'Flatterkäfer-Zone', start: [0, 2.5, -64], acts: [
      { go: [-2.5, -67.2], tol: 0.3 }, { jump: [-4, -73], run: false }, { go: [-1.8, -75.1], tol: 0.3 }, { jump: [3, -80], run: false },
      { go: [2, -82.1], tol: 0.3 }, { jump: [-1, -86.5], run: false }, { go: [-2, -91.4] },
    ], expect: (s) => Math.abs(s.pos[1] - 4) < 0.2 && s.pos[2] < -90 },
    { name: 'Krabbelkäfer-Gang', start: [0, 4, -91], acts: [{ go: [0, -91.6], tol: 0.3 }, { jump: [0, -97], run: false }, { go: [0, -124.4], run: true }], expect: (s) => Math.abs(s.pos[1] - 4) < 0.2 && s.pos[2] < -123.5 },
    { name: 'Wechselschalter-Fähre', start: [0, 4, -124.3], acts: [
      { waitfor: 'bot.mover("faehre").z > -132.6', max: 3000 }, { jump: [0, 0], track: 'faehre', run: false },
      { waitfor: 'bot.mover("faehre").z < -151.6', max: 3000 }, { go: [0, -157.2], tol: 0.3 }, { jump: [0, -161], run: false },
    ], expect: (s) => Math.abs(s.pos[1] - 4) < 0.2 && s.pos[2] < -159.2 },
    { name: 'Glasrohr-Kanone → Zielbühne', start: [0, 4, -160.2], acts: [
      { go: [3.5, -160.4], tol: 0.25 }, { go: [3.5, -165], until: 'p.mode === "script"', max: 300 }, { waitfor: 'p.mode === "ground" && p.pos.z < -184', max: 1200 },
    ], expect: (s) => Math.abs(s.pos[1] - 10) < 0.3 && s.pos[2] < -184 },
    { name: 'Zielbühne → Zielmast', start: [0, 10, -186.5], acts: [{ go: [0, -191.2], until: 'p.mode === "script"', max: 600 }, { wait: 60 }], expect: (s) => s.rt.status === 'goal' || s.rt.status === 'done' },
  ],
  extras: [
    { name: 'Stern 1 (Wandsprung neben der Warp-Box)', start: [7.75, 0, -8], acts: [{ go: [7.75, -11], tol: 0.15 }, { wait: 30 }, { wallclimb: { dir: 1, until: 7.4, z: -11, then: [5.4, -11] } }, { go: [5.5, -11.5], tol: 0.25, max: 200 }, { wait: 20 }], expect: (s) => s.rt.stars[0] },
    { name: 'Warp-Box → Zuschauerloge → zurück', start: [2, 0, -9], acts: [
      { go: [2, -9.9], tol: 0.25 }, { jump: [2, -11.6], run: false }, { waitfor: 'p.pos.x < -15 && p.mode === "ground"', max: 900 },
      { go: [-20, -20], run: true, tol: 0.4 }, { go: [-20, -24.2], tol: 0.25 }, { jump: [-20, -26], run: false }, { waitfor: 'p.pos.x > -5 && p.mode === "ground"', max: 900 },
    ], expect: (s) => Math.abs(s.pos[1]) < 0.3 && s.pos[2] < -27 },
    { name: 'Stempel mit Krallen (vor „alle Schalter an“)', start: [-9.5, 4, -159.2], power: 'krallen', acts: [{ go: [-9.5, -160.5], tol: 0.15, max: 120 }, { wait: 10 }, { input: { y: 1, jump: true }, n: 20 }, { input: { y: 1 }, n: 240 }, { wait: 30 }, { go: [-9.5, -163.6], tol: 0.15, max: 200, until: 'c.level.runtime.stamp' }, { wait: 20 }], expect: (s) => s.rt.stamp },
    { name: 'Stempel per Wandsprung', reload: true, start: [-7.25, 4, -159.6], acts: [{ go: [-7.25, -163.2], tol: 0.15 }, { wait: 30 }, { wallclimb: { dir: -1, until: 12.3, z: -163.2, then: [-9.6, -163.4] } }, { go: [-9.5, -163.6], tol: 0.25, max: 200 }, { wait: 20 }], expect: (s) => s.rt.stamp },
    { name: 'Stern 2 (Rätselbox → Kistenraum, Funkenblüte)', start: [-1.5, 4, -88], acts: [
      { go: [-0.2, -89.7], tol: 0.25 }, { jump: [1.5, -90], run: false }, { waitfor: 'p.pos.x > 50 && p.mode === "ground"', max: 900 }, { wait: 30 },
      { go: [60, -85.5], tol: 0.25 }, { go: [60, -84], tol: 0.12 }, { wait: 40 }, { input: { jump: true }, n: 30 }, { wait: 90 },
      { go: [60, -85.9], tol: 0.2 }, { wait: 20 }, { jump: [60, -84], run: false }, { wait: 30 },
      { exec: 'if (c.player.power !== "funken") console.warn("[Bot] keine Funkenblüte");' },
      // Feuerbälle treffen Kisten derzeit nicht (fireball.js ruft onHit nur für Gegner) → Stampfattacke von oben
      { go: [57, -84.2], tol: 0.4 }, { go: [53.2, -90.4], tol: 0.2 }, { wait: 20 }, { jump: [53.2, -91.6], run: false },
      { go: [53.2, -92.8], tol: 0.15, max: 200 }, { wait: 20 }, { input: { jump: true }, n: 16 }, { input: { crouch: true }, n: 4 }, { wait: 90 },
      { waitfor: 'bot.star(1) || c.level.runtime.stars[1]', max: 200 }, { go: [0, 0], target: 'bot.star(1)', until: 'c.level.runtime.stars[1]', tol: 0.3, max: 600 }, { wait: 20 },
    ], expect: (s) => s.rt.stars[1] },
    { name: 'Stern 3 (alle Wechselfelder auf der Fähre)', start: [0, 4, -124.3], acts: [
      { waitfor: 'bot.mover("faehre").z > -132.6', max: 3000 }, { jump: [0, 4.4], track: 'faehre', run: false }, { wait: 10 },
      { go: [-3.5, 3.5], track: 'faehre', tol: 0.35 }, { go: [-4.2, 0], track: 'faehre', tol: 0.35 }, { go: [-3.5, -3.5], track: 'faehre', tol: 0.35 },
      { go: [3.5, -3.5], track: 'faehre', tol: 0.35 }, { go: [4.2, 0], track: 'faehre', tol: 0.35 }, { go: [3.5, 3.5], track: 'faehre', tol: 0.35 },
      { waitfor: 'bot.star(2) || c.level.runtime.stars[2]', max: 200 }, { go: [0, 0], target: 'bot.star(2)', until: 'c.level.runtime.stars[2]', tol: 0.3, max: 600 }, { input: { jump: true }, n: 20 }, { wait: 60 },
      // alle Schalter an → die Wackelplattform am Stempel-Turm ist abgestürzt (Krallen-Weg zu, Wandsprung bleibt)
      { waitfor: '["fall", "gone"].includes(c.level.named.get("wackel")?.state)', max: 400 },
    ], expect: (s) => s.rt.stars[2] },
  ],
};

// ------------------------------------------------------------------ Ablauf
async function testLevel(R) {
  console.log(`\nKurs-Level ${R.id}`);
  const onlyPart = process.env.W1B_PART ?? null;          // Fehlersuche: nur Abschnitte/Extras mit diesem Namensteil
  const heroes = process.env.W1B_HERO ? [process.env.W1B_HERO] : ['lotti', 'greta'];
  for (const hero of heroes) {
    errors.length = 0;
    await load(R.id);
    const loadErrors = errors.slice();
    if (hero === 'lotti') {
      check(`${R.id}: lädt ohne Konsolenfehler`, loadErrors.length === 0);
      if (loadErrors.length) for (const x of loadErrors.slice(0, 12)) console.log('    ', x);
      // Gegnerzahlen laut Bauplan
      const counts = {};
      for (const k of Object.keys(R.enemies)) counts[k] = await sc((kind) => window.__bot.count(kind), k);
      console.log(`  Gegner: ${Object.entries(counts).map(([k, n]) => `${k} ${n}/${R.enemies[k]}`).join(', ')}`);
      check(`${R.id}: Gegnerzahlen laut Bauplan`, Object.keys(R.enemies).every((k) => counts[k] === R.enemies[k]));
    }
    let total = 0, allOk = true;
    for (const sec of R.main) {
      if (onlyPart && !sec.name.includes(onlyPart)) continue;
      await place(sec.start, { hero, power: sec.power });
      if (sec.calm !== false) await sc(() => window.__bot.calm());
      const r = await runRoute(sec.acts);
      const ok = !r.fail && sec.expect(r);
      allOk = allOk && ok;
      total += r.time;
      console.log(`  [${hero}] ${sec.name}: ${ok ? 'ok' : 'FEHLER'} ${r.fail ?? ''} t=${f1(r.time)} s, Ende ${r.pos.map(f1).join('/')} (${r.mode})`);
      if (!ok) for (const l of r.log) console.log('       ', JSON.stringify(l));
    }
    check(`${R.id} [${hero}]: alle Abschnitte der Hauptroute`, allOk);
    console.log(`  [${hero}] Hauptroute ${f1(total)} s Spielzeit`);
    check(`${R.id} [${hero}]: Hauptroute < 180 s (${f1(total)} s)`, total < 180);
    // Extras auf frisch geladenem Level (die Hauptroute endet am Zielmast → Szene ist fertig)
    if (!onlyPart || R.extras.some((ex) => ex.name.includes(onlyPart))) await load(R.id);
    for (const ex of R.extras) {
      if (onlyPart && !ex.name.includes(onlyPart)) continue;
      if (ex.reload) await load(R.id);
      await place(ex.start, { hero, power: ex.power });
      await sc(() => window.__bot.calm());
      const r = await runRoute(ex.acts);
      const ok = !r.fail && ex.expect(r);
      console.log(`  [${hero}] ${ex.name}: ${ok ? 'ok' : 'FEHLER'} ${r.fail ?? ''} Ende ${r.pos.map(f1).join('/')} (${r.mode})`);
      if (!ok) for (const l of r.log) console.log('       ', JSON.stringify(l));
      check(`${R.id} [${hero}]: ${ex.name}`, ok);
    }
  }
}

const shotsOnly = !!process.env.W1B_SHOTS_ONLY;   // nur Bilder (schnelle Sichtprüfung)
const noShots = !!process.env.W1B_PART;
if (!shotsOnly && (!only || only === '1-3')) await testLevel(R13);
if (!shotsOnly && (!only || only === '1-5')) await testLevel(R15);

// Screenshots entlang der Route (frisch geladen, mit Gegnern)
// Situationen: pre = Code in der Seite (c = __course, bot = __bot) nach dem Absetzen, z. B. ein paar Schritte rechnen
const runSteps = (inp, n) => `c.setInput(${JSON.stringify(inp)}); c.step(${n}); c.setInput({});`;
const SHOTS = {
  '1-3': [
    ['13_start', [0, 0, 6]], ['13_baum', [-5, 0, 2]], ['13_krone', [-6.5, 7, -2.6], { yaw: 15 }], ['13_schacht', [7, 0, -3.8]],
    ['13_feld', [0, 1, -21]], ['13_feld_mitte', [1, 1, -29]], ['13_hang', [0, 3, -50]], ['13_nische', [3, 9, -74]],
    ['13_ranke', [-3, 9, -77]], ['13_wolken', [0, 15, -86.5]], ['13_wolkensprung', [-0.6, 15, -87.6], { pre: runSteps({ y: 1, jump: true }, 40) }],
    ['13_huegel', [1.5, 17, -127.5]], ['13_kanone', [-5.5, 20, -134.8]], ['13_treppe', [0, 17, -152.5]],
    ['13_treppensprung', [-1.4, 19, -157], { pre: runSteps({ x: 0.6, y: 0.5, jump: true }, 36) }],
    ['13_bruecke', [0, 30, -175]], ['13_arena', [0, 30, -187]], ['13_boss', [0, 30, -189.5], { pre: 'c.step(90);' }],
    ['13_gipfel', [0, 40, -205.5]], ['13_praum', [64, 0, -63]], ['13_himmel', [-46, 46, -121]], ['13_himmel_ende', [-46, 48, -160.5]],
  ],
  '1-5': [
    ['15_start', [0, 0, 5]], ['15_schalter', [-5, 0, -1], { pre: runSteps({ x: 1 }, 150) }], ['15_sternwand', [7.75, 0, -7.5]],
    ['15_feld2', [0, 0, -28]], ['15_plattformen', [0, 0, -34]], ['15_check', [0, 2.5, -60]], ['15_flatter', [-4, 3, -71.5]], ['15_raetsel', [-2, 4, -85]],
    ['15_gang', [0, 4, -96]], ['15_faehre', [0, 4, -124]], ['15_faehre_fahrt', null, { pre: 'const m = bot.mover("faehre"); bot.place([m.x, m.y + 0.05, m.z + 3], {}); c.step(400);' }],
    ['15_lande', [0, 4, -160]], ['15_turm', [-7.2, 4, -159.5]], ['15_kanonenflug', [3.5, 4, -160.4], { pre: runSteps({ y: 1 }, 170) }],
    ['15_ziel', [0, 10, -186.5]], ['15_loge', [-20, 6, -18]], ['15_kisten', [60, 0, -82]],
  ],
};
for (const id of Object.keys(SHOTS)) {
  if ((only && only !== id) || noShots) continue;
  errors.length = 0;
  await load(id);
  for (const [name, pos, o] of SHOTS[id]) await shot(name, pos, o ?? {});
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(14)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
if (stats.length) {
  const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
process.exit(summary([]) ? 0 : 1);
