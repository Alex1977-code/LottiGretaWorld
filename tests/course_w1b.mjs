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
    calm() { for (const e of c.level.entities) if (e.enemy && e.alive) e.kill(); },
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
          const [tx, tz] = a.go, tol = a.tol ?? 0.45;
          for (; n < max; n++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (Math.hypot(dx, dz) < tol) break;
            if (a.until && a.until(p)) break;
            const d = dirInput(dx, dz);
            step({ ...d, run: !!a.run, jump: !!a.hold });
            if (dead()) break;
            if (a.stalk && p.mode === 'stalk') break;
          }
        } else if (a.jump) {
          // Sprung jetzt drücken, dabei zum Ziel lenken bis zur Landung (nah am Ziel: Stick los)
          const [tx, tz] = a.jump, hold = a.hold ?? 60;
          let air = false;
          for (; n < max; n++) {
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
            if (air && (p.mode === 'ground' || p.mode === 'stalk' || p.mode === 'wall')) break;
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
        log.push([ai, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (dead()) fail = `tot (${p.deathCause ?? '?'}) bei Aktion ${ai}`;
        else if (a.go && n >= max) fail = `Ziel ${a.go} nicht erreicht`;
      }
      c.setInput({});
      return { fail, log, time: +(c.level.time - t0).toFixed(2), pos: [p.pos.x, p.pos.y, p.pos.z].map((v) => +v.toFixed(2)), mode: p.mode, rt: c.level.runtime.info() };
    },
  };
  window.__bot = bot;
  return true;
}

/** Aktionen als JSON-Daten übertragbar machen (until/exec als Quelltext). */
const runRoute = (actions, o = {}) => sc(([acts, opt]) => {
  const revive = (a) => {
    const b = { ...a };
    if (typeof a.until === 'string') b.until = new Function('p', `return (${a.until});`);
    if (typeof a.exec === 'string') b.exec = new Function('c', a.exec);
    if (a.wallclimb && typeof a.wallclimb.stop === 'string') b.wallclimb = { ...a.wallclimb, stop: new Function('p', 'c', `return (${a.wallclimb.stop});`) };
    return b;
  };
  return window.__bot.run(acts.map(revive), opt);
}, [actions, o]);
const place = (pos, o = {}) => sc(([p, opt]) => window.__bot.place(p, opt), [pos, o]);

async function load(id) {
  await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load' });
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
    if (opt.pre) new Function('c', opt.pre)(c);
    if (opt.zoom !== undefined && c.view.rig.zoomIndex !== opt.zoom) c.view.rig.toggleZoom();
    c.view.rig.userYawTarget = opt.yaw ?? 0;
    c.snapCamera();
    c.setInput(null);
  }, [pos, o]);
  await page.waitForTimeout(o.wait ?? 1100);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w1b_${name}.png` });
}

// ------------------------------------------------------------------ Routen
// Jeder Abschnitt: start (Teleport), Aktionen, Erwartung (Endbereich). Kamera-Gier ist überall 0 → x = +X, y = −Z.
const R13 = {
  id: '1-3',
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
      { go: [0, -187], run: true },
    ], expect: (s) => s.pos[2] < -186 && Math.abs(s.pos[1] - 30) < 0.2 },
    { name: 'Gipfel → Zielmast', start: [0, 40, -205.5], acts: [{ go: [0, -211.2], run: true, until: 'p.mode === "script"', max: 600 }, { wait: 60 }], expect: (s) => s.rt.status === 'goal' || s.rt.status === 'done' },
  ],
  extras: [
    { name: 'Stern 1 (Rankenbaum)', start: [-6.5, 0, 3], acts: [{ go: [-6.5, -0.2], tol: 0.2, stalk: true, max: 300 }, { climb: true }, { jump: [-6.5, -3.2], run: false }, { wait: 30 }], expect: (s) => s.rt.stars[0] },
    { name: 'Stempel (Wandsprung-Schacht)', start: [7, 0, -3.6], acts: [{ go: [7, -6.2], tol: 0.15 }, { wait: 30 }, { wallclimb: { dir: 1, until: 9.5, z: -6.2, seek: [7, 7.6, -6.2], stop: 'c.level.runtime.stamp' } }, { wait: 20 }], expect: (s) => s.rt.stamp },
  ],
};

const R15 = {
  id: '1-5',
  main: [
    { name: 'Schalter-Feld 1', start: [0, 0, 5], acts: [{ go: [0, -12], run: true }], expect: (s) => s.pos[2] < -11 },
  ],
  extras: [],
};

// ------------------------------------------------------------------ Ablauf
async function testLevel(R) {
  console.log(`\nKurs-Level ${R.id}`);
  for (const hero of ['lotti', 'greta']) {
    errors.length = 0;
    await load(R.id);
    const loadErrors = errors.slice();
    if (hero === 'lotti') {
      check(`${R.id}: lädt ohne Konsolenfehler`, loadErrors.length === 0);
      if (loadErrors.length) for (const x of loadErrors.slice(0, 12)) console.log('    ', x);
    }
    let total = 0, allOk = true;
    for (const sec of R.main) {
      await place(sec.start, { hero });
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
    for (const ex of R.extras) {
      await place(ex.start, { hero });
      await sc(() => window.__bot.calm());
      const r = await runRoute(ex.acts);
      const ok = !r.fail && ex.expect(r);
      console.log(`  [${hero}] ${ex.name}: ${ok ? 'ok' : 'FEHLER'} ${r.fail ?? ''} Ende ${r.pos.map(f1).join('/')} (${r.mode})`);
      if (!ok) for (const l of r.log) console.log('       ', JSON.stringify(l));
      check(`${R.id} [${hero}]: ${ex.name}`, ok);
    }
  }
}

if (!only || only === '1-3') await testLevel(R13);
if (!only || only === '1-5') await testLevel(R15);

// Screenshots entlang der Route (frisch geladen, mit Gegnern)
const SHOTS = {
  '1-3': [
    ['13_start', [0, 0, 6]], ['13_baum', [-5, 0, 2]], ['13_feld', [0, 1, -21]], ['13_hang', [0, 3, -50]], ['13_nische', [3, 9, -74]],
    ['13_ranke', [-3, 9, -77]], ['13_wolken', [0, 15, -86.5]], ['13_huegel', [1.5, 17, -127.5]], ['13_treppe', [0, 17, -152.5]],
    ['13_bruecke', [0, 30, -175]], ['13_arena', [0, 30, -187]], ['13_gipfel', [0, 40, -205.5]], ['13_praum', [64, 0, -63]], ['13_himmel', [-46, 46, -121]],
  ],
  '1-5': [
    ['15_start', [0, 0, 5]], ['15_feld2', [0, 0, -28]], ['15_check', [0, 2.5, -60]], ['15_flatter', [-4, 3, -71.5]], ['15_raetsel', [-2, 4, -85]],
    ['15_gang', [0, 4, -96]], ['15_faehre', [0, 4, -124]], ['15_lande', [0, 4, -160]], ['15_ziel', [0, 10, -186.5]], ['15_loge', [-20, 6, -18]], ['15_kisten', [60, 0, -82]],
  ],
};
for (const id of Object.keys(SHOTS)) {
  if (only && only !== id) continue;
  errors.length = 0;
  await load(id);
  for (const [name, pos] of SHOTS[id]) await shot(name, pos);
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(14)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
await browser.close();
stop();
process.exit(summary([]) ? 0 : 1);
