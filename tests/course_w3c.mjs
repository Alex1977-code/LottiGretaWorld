// Welt 3, Level 3-3 „Die Mondscheinvilla“ (Spukhaus) und 3-Kapitän „Krümel und der Röhrensee“ (See-Diorama):
// Laden ohne Konsolenfehler/-warnungen; 3-3: Routen-Bot (Lotti und Greta) vom Start über alle Räume (Türen teleportieren)
// bis zum falschen Zielmast (Streich → versteckte Treppe) und weiter zum echten Zielmast, alle Sterne und der Stempel mit der
// echten Mechanik (ins Spuk-Gemälde springen → Warp-Box → Drehraum → Warp-Box auf die Empore → Sofa mit Stempel; Regal in
// der Regalgasse zurückschieben; Sofa-Lift zur falschen Röhre), Licht-Helm löst Spuke und Kreisgeister auf, Stimmung
// innen/außen, Drehraum dreht sich; 3-Kapitän: alle 5 Sterne per Skript (Mauseloch → Röhre, an der ersten Gabelung nach
// oben; an der Kreuzung geradeaus ins Wasser, schwimmen; rechts in die Kuppel auf den Wasserschalter → Wasser und Holzsteg
// steigen; über den Steg), Krümel als Figur (Mütze, Rucksack, Schwimmring), Rammfisch, Sieg → Ergebnis. Kennzahlen je Bild
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Screenshots tests/out/w3c_*.png.
// Aufruf (nach npm run build): PORT_BASE=5400 node tests/course_w3c.mjs [3-3|3-Kapitän]   (PARTS=route,targets,extra,shots)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen, wartet auf Spuk-Treppen/Sofas (waitNamed), fährt Türen und Warp-Boxen. Gegner bleiben aktiv; die
// Figur ist für die Routenfahrt unverwundbar, damit nur die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen 3-3
// Wegpunkte [x, z]; jump = Halteschritte der Sprungtaste; door = in die Tür laufen; waitNamed = { id, key, eq | min };
// face = Blickrichtung; touch = auf einen Punkt zulaufen, bis eine Bedingung (probe) gilt.
const Y = 1;
const ROUTE_33 = {
  start: [0, Y, 8],
  enemies: { spuk: 15, kreisgeist_kreis: 4, kreisgeist: 6 },
  main: [
    // A Spukflur
    { name: 'Flur', to: [0, -14] },
    { name: 'vor die Spuk-Treppe', to: [0, -23.4], run: false, within: 0.4 },
    { waitNamed: { id: 'treppe_a', key: 'k', min: 0.999 } },
    { name: 'Spuk-Treppe hinauf', to: [0, -29.2], run: false, within: 0.3 },
    { name: 'Tür zur Bibliothek', to: [0, -32], door: true, run: false },
    // B Bibliothek
    { name: 'Bibliothek', to: [62.2, -41.4], within: 0.3 },
    { name: 'Regal schieben', to: [62.2, -45.1], run: false, within: 0.3, max: 1600 },
    { name: 'am Regal vorbei', to: [64.4, -45.1], run: false, within: 0.4 },
    { name: 'Checkpoint', to: [65.4, -48.4] },
    { name: 'vor die Treppe', to: [65.4, -51.6], run: false, within: 0.3 },
    { waitNamed: { id: 'treppe_b1', key: 'k', min: 0.999 } },
    { name: 'Treppe 1 hinauf', to: [65.4, -56.4], run: false, within: 0.3 },
    { waitNamed: { id: 'treppe_b2', key: 'k', min: 0.999 } },
    { name: 'Treppe 2 hinauf', to: [65.4, -60.4], run: false, within: 0.3 },
    { name: 'Galerie', to: [59.5, -61.4], run: false, within: 0.3 },
    { name: 'Tür zum Außenhof', to: [59.5, -64], door: true, run: false },
    // C Außenhof 1
    { name: 'Außenhof', to: [114.6, -74] },
    { to: [114.6, -84.6] },
    { name: 'Grabenkante', to: [120, -87.4], run: false, within: 0.4 },
    { name: 'Grabplatte 1', to: [120, -89.8], jump: 30, within: 0.5 },
    { name: 'Grabplatte 2', to: [117.2, -92.6], jump: 36, within: 0.5 },
    { name: 'Grabplatte 3', to: [120.4, -95], jump: 34, within: 0.5 },
    { name: 'über den Graben', to: [120.2, -98.4], jump: 34, within: 0.5 },
    { name: 'Tür ins Haus', to: [120, -105], door: true, run: false },
    // E Stufenhalle
    { name: 'Halle', to: [176, -136.4], within: 0.3 },
    { waitNamed: { id: 'treppe_e1', key: 'k', min: 0.999 } },
    { name: 'Spuk-Treppe 1', to: [176, -143], run: false, within: 0.4 },
    { name: 'Stufe 1', to: [180, -144.6], run: false, within: 0.3 },
    { waitNamed: { id: 'treppe_e3', key: 'k', min: 0.999 } },
    { name: 'Spuk-Treppe 2', to: [180, -151], run: false, within: 0.4 },
    { name: 'Außentür', to: [180, -159], door: true, run: false },
    // F Außenhof 2
    { name: 'Außenhof 2', to: [235.4, -168] },
    { to: [235.4, -176.6] },
    { name: 'Brücke', to: [240, -181.6] },
    { to: [240, -189.6] },
    { to: [234.6, -193] },
    { to: [234.6, -201.6] },
    { name: 'falscher Zielmast', to: [240, -205.6], run: false, within: 0.3, max: 400 },
    { waitNamed: { id: 'zieltreppe', key: 'k', min: 0.999 } },
    { name: 'versteckte Treppe', to: [240, -215.4], run: false, within: 0.4 },
    { name: 'Zielmast', to: [240, -219.6], within: 0.3 },
  ],
  targets: [
    { name: 'Stern 0: ins Spuk-Gemälde springen, Warp-Box, Drehraum', star: 0, from: [-0.4, Y, 1.6],
      legs: [{ name: 'Anlauf, Sprung ins Gemälde', to: [-4.7, 1.6], jump: 14, jumpAt: 1.4, within: 0.25, land: false, max: 200 }, { wait: 60, skipIfX: -40 },
        { name: 'Warp-Box in der Nische', to: [-6.4, 1.6], jump: 30, within: 0.3, endOnRide: true, skipIfX: -40 }, { wait: 30 },
        { dreh: true }, { wait: 40 }], shot: 'stern0' },
    { name: 'Stempel: nach Stern 0 Warp-Box auf die Empore, Sofa', stamp: true, from: [-60, Y, 44.6],
      legs: [{ name: 'Warp-Box im Drehraum', to: [-60, 41.6], jump: 30, jumpAt: 1.8, within: 0.3, endOnRide: true }, { wait: 40 },
        { to: [4, 3], run: false, within: 0.3 }, { name: 'aufs Sofa', to: [3.9, 1.4], jump: 20, within: 0.3 }, { wait: 300 }], shot: 'stempel' },
    { name: 'Stern 1: Regal in der Regalgasse zurückschieben, Nische', star: 1, from: [54, Y, -45],
      legs: [{ name: 'Regal schieben', to: [54, -51.3], run: false, within: 0.3, max: 1400 }, { to: [53.2, -50.2], run: false, within: 0.3 },
        { name: 'in die Nische', to: [50.6, -50.2], run: false, within: 0.4 }, { wait: 20 }], shot: 'stern1' },
    { name: 'Stern 2: Sofa-Lift zur falschen Röhre', star: 2, from: [-2.6, Y, -19.4],
      legs: [{ name: 'aufs Sofa', to: [-4.3, -21], jump: 20, within: 0.25 }, { waitNamed: { id: 'sofa_lift', key: 'state', eq: 'top' } },
        { name: 'auf den Sims', to: [-4, -22.8], run: false, within: 0.3 }, { name: 'auf die Röhre', to: [-4.1, -23.5], jump: 30, within: 0.3 }, { wait: 30 }], shot: 'stern2' },
  ],
  extra: [
    { name: 'Licht-Helm: aufsetzen, Spuk anleuchten → löst sich auf', from: [2.6, Y, 7.4], heroes: ['lotti'], invuln: false,
      legs: [{ to: [2.6, 6.2], run: false, within: 0.3 }, { wait: 20 }, { to: [-1.5, -1.5], run: false, within: 0.4 }, { faceSpuk: true }, { wait: 260 }],
      check: 'licht' },
    { name: 'Licht-Helm löst Kreisgeister des Brunnen-Rings auf', from: [112, Y, -72.8], heroes: ['lotti'], invuln: false,
      legs: [{ to: [112, -71.6], run: false, within: 0.3 }, { wait: 20 }, { to: [115.2, -76], run: false, within: 0.3 }, { face: [1, 0] }, { wait: 420 }],
      check: 'ring' },
    { name: 'Spuk folgt nur, wenn man wegschaut', from: [0, Y, -2], heroes: ['lotti'], legs: [{ wait: 10 }], check: 'spukBlick' },
    { name: 'Stimmung: Außenhof Nacht, Haus innen', from: [114, Y, -76], heroes: ['lotti'], legs: [{ wait: 30 }], check: 'mood' },
    { name: 'Drehraum dreht sich in Vierteldrehungen', from: [-60, Y, 50.4], heroes: ['lotti'], legs: [{ wait: 1300 }], check: 'dreh' },
  ],
  shots: [
    ['start', [0, Y, 8]], ['flur', [0, Y, -12]], ['flurende', [0, Y, -22]], ['gemaelde', [-2.6, Y, 3]], ['empore', [4, Y + 7, 3.2]],
    ['sims', [-4, Y + 6.6, -22.8]], ['drehraum', [-60, Y, 50]], ['bibliothek', [64, Y, -38]], ['regalgasse', [54, Y, -45]],
    ['treppen', [64, Y, -50]], ['galerie', [62, Y + 4, -61]], ['hof1', [112, Y, -74]], ['graben', [120, Y, -86.6]],
    ['halle', [176, Y, -134]], ['stufen', [180, Y + 4, -144]], ['hof2', [232, Y, -167]], ['bruecke', [240, Y, -180]],
    ['falsch', [237, Y, -200]], ['ziel', [240, Y + 6.6, -216]],
  ],
};

const PORT = 4460;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['3-3', '3-Kapitän'];
const PARTS = new Set((process.env.PARTS ?? 'route,targets,extra,shots').split(','));
// Teilläufe (Rechner unter Last): ONLY=Teil des Namens (Sterne/Mechanik), HERO=lotti|greta
const ONLY = process.env.ONLY ?? '';
const HEROES = (list) => (process.env.HERO ? [process.env.HERO] : list);
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : v);

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      c.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      c.level.runtime.status = 'play';
      c.level.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = c.level.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    named(id) { return c.level.named.get(id); },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      const jumps = [];
      let steps = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && c.level.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.setInput({}); c.step(1); steps++;
          }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      for (let li = 0; li < legs.length; li++) {
        const L = legs[li];
        if (p.dead || c.level.runtime.status !== 'play') break;
        rode = false;
        if (L.skipIfX !== undefined && p.pos.x < L.skipIfX) { log.push(['übersprungen', L.name ?? li]); continue; }
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick({}); continue; }
        if (L.face) { const st = this.stick(L.face[0], L.face[1], 0.3); for (let i = 0; i < 6; i++) tick(st); for (let i = 0; i < 12; i++) tick({}); continue; }
        if (L.faceSpuk) {
          W.spukGone = 0;
          const prev = c.level.onEnemyDefeated;
          c.level.onEnemyDefeated = (e) => { if (e.kind === 'spuk') W.spukGone++; prev?.(e); };
          let e = null, best = 1e9;
          for (const x of c.level.entities) if (x.kind === 'spuk' && x.alive && !x.defeated) { const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
          if (e) { for (let i = 0; i < 8; i++) tick(this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z, 0.25)); }
          log.push(['spuk', e ? +best.toFixed(2) : null]);
          continue;
        }
        if (L.waitNamed) {
          const w = L.waitNamed, h = this.named(w.id);
          let n = 0;
          const ok = () => (w.eq !== undefined ? h?.[w.key] === w.eq : (h?.[w.key] ?? -1) >= w.min);
          while (!ok() && n++ < (w.max ?? 3000)) tick({});
          log.push(['warten', w.id, n]);
          if (n >= (w.max ?? 3000)) { log.push(['FEHLER: wartet vergeblich', w.id]); break; }
          continue;
        }
        if (L.dreh) {
          // Drehraum: warten, bis er gerade eine Vierteldrehung beendet hat und Viertel 0 zeigt; dann Stufe → Brett → Stern
          const d = this.named('dreh');
          this.drive([{ to: [-59.2, 45.4], run: false, within: 0.3 }], o);
          let n = 0;
          while (!(d.quarter === 0 && !d.turning && d.t < 0.3) && n++ < 4000) tick({});
          log.push(['dreh', n, d.quarter, d.turns]);
          const seq = [{ to: [-62.4, 45.4], jump: 20, jumpAt: 2.0, within: 0.5 }, { to: [-59, 45.4], jump: 24, jumpAt: 2.2, within: 0.5 }, { to: [-58.8, 45.4], jump: 40, within: 0.6, land: false }];
          const r = this.drive(seq, o);
          log.push(...r.log);
          continue;
        }
        const max = L.max ?? 900;
        const within = L.within ?? 0.6;
        const holdJ = L.jump ?? 0;
        let i = 0, airborne = false, landed = false, best = Infinity, still = 0, j0 = L.jumpAt ? null : 0;
        if (holdJ && L.to) jumps.push([L.name ?? `leg${li}`, this.landingVisible(L.to[0], L.to[1])]);
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          if (rode && L.endOnRide !== false) break;
          const T = L.to;
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          const done = !L.door && dist < within && (!holdJ || L.land === false || (landed && p.mode === 'ground'));
          if (done && i > 0) break;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) {
            const k = 2.6, vmax = 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            let mag = 1;
            if (dist < 1.2 && !holdJ && !L.door) mag = Math.max(0.2, Math.min(1, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= L.jumpAt) j0 = i;
          const jump = holdJ ? (j0 !== null && i - j0 < holdJ) : (still > 60 && still < 86 && !L.door && L.autoJump !== false);
          tick({ ...st, run: L.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([L.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, L.to]); break; }
      }
      c.setInput({});
      return { log, jumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: c.level.runtime.status, rt: c.level.runtime.info() };
    },
    landingVisible(x, z) {
      const p = P(), rig = c.view.rig;
      const r = rig.railAt(p.pos.x, p.pos.z, {});
      const D = Math.PI / 180, yaw = r.yaw * D, pitch = r.pitch * D;
      const tx = p.pos.x - Math.sin(yaw) * r.ahead, ty = p.pos.y + r.height, tz = p.pos.z - Math.cos(yaw) * r.ahead;
      const cam = { x: tx + Math.sin(yaw) * Math.cos(pitch) * r.dist, y: ty + Math.sin(pitch) * r.dist, z: tz + Math.cos(yaw) * Math.cos(pitch) * r.dist };
      const g = c.world.raycastDown(x, p.pos.y + 14, z, 40);
      const land = { x, y: (g ? g.y : p.pos.y) + 1.0, z };
      const hit = c.world.raycast(cam, land);
      return !hit || hit.t > 0.97 || !!hit.shape?.camIgnore;
    },
    rt: () => c.level.runtime.info(),
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    probe(name) {
      const L = c.level, p = P();
      const ents = (k) => L.entities.filter((e) => e.kind === k);
      switch (name) {
        case 'licht': {
          const near = ents('spuk').filter((e) => !e.defeated && Math.hypot(e.pos.x + 3, e.pos.z + 5) < 4).length;
          return { ok: p.helmet === 'licht' && near === 0 && W.spukGone >= 1, helmet: p.helmet, near, gone: W.spukGone };
        }
        case 'ring': {
          const ring = L.named.get('ring_brunnen');
          return { ok: p.helmet === 'licht' && (ring?.aliveCount ?? 10) < 10, helmet: p.helmet, alive: ring?.aliveCount };
        }
        case 'spukBlick': {
          // Spuk vor der Figur: Blick zu ihm → er erstarrt (shy); Blick weg → er folgt
          const s = ents('spuk').find((e) => e.alive && Math.hypot(e.pos.x + 3, e.pos.z + 5) < 3);
          if (!s) return { ok: false, err: 'kein Spuk' };
          const look = (dx, dz, n) => { for (let i = 0; i < n; i++) { c.setInput(W.stick(dx, dz, 0.2)); c.step(1); p.invuln = 5; } c.setInput({}); };
          look(s.pos.x - p.pos.x, s.pos.z - p.pos.z, 6); for (let i = 0; i < 60; i++) { c.step(1); p.invuln = 5; }
          const d0 = Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z), st0 = s.state;
          for (let i = 0; i < 90; i++) { c.step(1); p.invuln = 5; }
          const d1 = Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z);
          look(-(s.pos.x - p.pos.x), -(s.pos.z - p.pos.z), 6); for (let i = 0; i < 120; i++) { c.step(1); p.invuln = 5; }
          const d2 = Math.hypot(s.pos.x - p.pos.x, s.pos.z - p.pos.z), st2 = s.state;
          return { ok: st0 === 'shy' && Math.abs(d1 - d0) < 0.2 && d2 < d1 - 0.5 && st2 === 'chase', st0, st2, d0: +d0.toFixed(2), d1: +d1.toFixed(2), d2: +d2.toFixed(2) };
        }
        case 'mood': {
          const out = L.moodNow;
          W.place([0, 1, 6], { settle: 10 });
          const inn = L.moodNow;
          return { ok: out === 'aussen' && inn === null, out, inn };
        }
        case 'dreh': { const d = L.named.get('dreh'); return { ok: d.turns >= 2, turns: d.turns, quarter: d.quarter }; }
        default: return { ok: false };
      }
    },
  };
  window.__w3c = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id) {
    await sc(() => { window.__oldLevel = window.__course.level; window.__course.restartLevel(); });
    await page.waitForFunction(() => window.__course && window.__course.level && window.__course.level !== window.__oldLevel && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } else {
    await page.goto(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
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
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w3c[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 500) {
  await sc(() => { const c = window.__course; c.snapCamera(); if (c.arch?.orbit) c.arch.orbit.inited = false; });
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w3c_${name}.png` });
  return s;
}

// =====================================================================================================================
// 3-3 Die Mondscheinvilla
// =====================================================================================================================
async function test33() {
  const id = '3-3', R = ROUTE_33;
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, stars: d.stars?.length ?? 0, stamp: !!d.stamp, goal: !!d.goal }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“ (${meta.theme}, ${meta.music}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Thema ghost, Musik course_ghost, 500 s, 3 Sterne, Stempel, Zielmast`, meta.theme === 'ghost' && meta.music === 'course_ghost' && meta.timeLimit === 500 && meta.stars === 3 && meta.stamp && meta.goal);
  const nSpuk = (kinds.spuk ?? 0), nRing = kinds.kreisgeist_kreis ?? 0, nKg = (kinds.kreisgeist ?? 0) + (kinds.kreisgeist_glied ?? 0);
  check(`${id}: Spuke (${nSpuk} inkl. 3 Großspuke), Kreisgeister (${nKg} in ${nRing} Ringen und einzeln)`, nSpuk >= 13 && nRing === 4 && nKg >= 30);

  for (const hero of PARTS.has('route') ? (process.env.HERO ? [process.env.HERO] : ['lotti', 'greta']) : []) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    const trick = await sc(() => { const f = window.__course.level.named.get('falsch'); return { tricked: !!f?.tricked, banner: window.__course.level.lastBanner }; });
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Münzen ${res.rt.coins}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: ${hero} – falscher Zielmast spielt den Streich („${trick.banner}“) und öffnet die Treppe`, trick.tricked);
    check(`${id}: Routen-Bot ${hero} erreicht den echten Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
  }

  for (const t of PARTS.has('targets') ? R.targets.filter((x) => x.name.includes(ONLY)) : []) {
    for (const hero of HEROES(t.heroes ?? ['lotti', 'greta'])) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      const ok = t.stamp ? rt.stamp : rt.stars[t.star];
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot && hero === 'lotti') { await sc(() => { window.__course.player.invuln = 0; }); await shot(`${id}_${t.shot}`); }
    }
  }

  for (const t of PARTS.has('extra') ? R.extra.filter((x) => x.name.includes(ONLY)) : []) {
    for (const hero of HEROES(t.heroes ?? ['lotti'])) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const pr = await W('probe', t.check);
      if (!pr.ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} ${JSON.stringify(pr)}`, !!pr.ok);
      if (t.check === 'licht' || t.check === 'ring') await shot(`${id}_${t.check}`, 300);
    }
  }

  loaded = null;
  if (PARTS.has('shots')) await load(id);
  for (const [name, pos] of PARTS.has('shots') ? R.shots : []) {
    await W('place', pos, { settle: 30 });
    await sc(() => { window.__course.player.invuln = 0; });
    await shot(`${id}_${name}`);
  }
  check(`${id}: keine Konsolenfehler/-warnungen im Lauf`, errors.length === 0);
}

// =====================================================================================================================
// 3-Kapitän Krümel und der Röhrensee
// =====================================================================================================================
function kapitaenHelpers() {
  const c = window.__course, p = c.player, L = c.level;
  const stick = (dx, dz, mag = 1) => { const l = Math.hypot(dx, dz) || 1, wx = dx / l, wz = dz / l, cy = L.controlYaw, co = Math.cos(cy), si = Math.sin(cy); return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag }; };
  const K = {
    stick,
    safe() { p.invuln = 1e6; },
    walk(tx, tz, max = 2400, tol = 0.25) {
      let i = 0;
      for (; i < max; i++) {
        const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
        if (d < tol || p.mode === 'script' || c.finished || p.treasure) break;
        c.setInput(stick(dx, dz, Math.min(1, d / 0.6))); c.step(1);
      }
      c.setInput({});
      return i;
    },
    /** in der Röhre fahren; dir(p) → [dx, dz] | null je Schritt (Stick an Gabelungen) */
    ride(dir, max = 3000) {
      let n = 0;
      const path = [];
      while (p.mode === 'script' && n < max) { const d = dir?.(p); c.setInput(d ? stick(d[0], d[1]) : {}); c.step(1); n++; if (n % 30 === 0) path.push([+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); }
      c.setInput({});
      return { n, path };
    },
    pos: () => [+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state],
  };
  window.__k = K;
  return true;
}

async function testKapitaen() {
  const id = '3-Kapitän';
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); return; }
  await sc(kapitaenHelpers);
  const loadErrors = errors.slice();
  const d0 = await sc(() => {
    const c = window.__course, L = c.level;
    return {
      arch: c.state().archetype, title: L.data.title, theme: L.data.theme, music: L.data.music, timeLimit: L.data.timeLimit,
      stars: L.runtime.stars.length, hud: window.__game.scene.getScene('CourseUI').nStars, rig: c.rig.info?.(),
      fish: L.entities.filter((e) => e.kind === 'rammfisch').length, water: L.waterLevel('see'),
      steg: [L.named.get('stegA').deckY, L.named.get('stegB').deckY],
    };
  });
  console.log(`  „${d0.title}“ (${d0.theme}, ${d0.music}), Zeitlimit ${d0.timeLimit} s, Wasser ${f2(d0.water)}, Steg ${d0.steg.map(f2).join('/')}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Archetyp diorama, Thema diorama, Musik course_diorama, 400 s, 5 Sterne (HUD ${d0.hud})`, !!d0.arch && d0.theme === 'diorama' && d0.music === 'course_diorama' && d0.timeLimit === 400 && d0.stars === 5 && d0.hud === 5);
  check(`${id}: Krümel als Figur (Kapitänsmütze, Rucksack) ${JSON.stringify(d0.rig)}`, d0.rig?.kind === 'kruemel' && d0.rig.cap && d0.rig.pack);
  check(`${id}: ein Rammfisch im See (${d0.fish})`, d0.fish === 1);
  const nj = await sc(() => {
    const c = window.__course, p = c.player;
    c.step(20);
    const y0 = p.pos.y;
    let maxY = y0;
    for (let i = 0; i < 90; i++) { c.setInput({ jump: true }); c.step(1); maxY = Math.max(maxY, p.pos.y); }
    c.setInput({});
    return { dy: maxY - y0 };
  });
  check(`${id}: Krümel springt nicht (Höhe ${f2(nj.dy)} m)`, nj.dy < 0.02);
  await shot(`${id}_start`);

  // Alle 5 Sterne (Bauplan-Reihenfolge 1 … 5), der 5. beendet das Level
  const route = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, rt = L.runtime, K = window.__k;
    const log = [];
    K.safe();
    c.arch.setOrbit(28);
    // 1: gegenüber dem Start – am rechten Ufer entlang nach hinten, das Ufer hinten nach links
    K.walk(8.6, -1); K.walk(7, -4.5); K.walk(-11.6, -4.8); c.step(5);
    log.push(['s1', rt.stars[0], ...K.pos()]);
    // 2: Mauseloch unter der Seewarte, an der ersten Gabelung links nach oben
    K.walk(-5, -4.4); K.walk(-5, -7.5, 400);
    const inPipe = p.mode === 'script';
    const r2 = K.ride((q) => (q.pos.z > -3 ? [-1, 0] : null));
    c.step(120);
    log.push(['s2', inPipe, r2.n, rt.stars[1], ...K.pos()]);
    if (!rt.stars[1]) { K.walk(-4.2, -10.4); c.step(5); }
    // zurück: in die Röhre auf der Terrasse, an der Gabelung zum Mauseloch (ohne Stick: Richtung bleibt)
    const net = L.named.get('roehre'), end = L.data.marks.pipeTop;
    const node = net.nodes.filter((q) => q.end).sort((a, b) => Math.hypot(a.pos.x - end[0], a.pos.z - end[2]) - Math.hypot(b.pos.x - end[0], b.pos.z - end[2]))[0];
    K.walk(node.pos.x + node.out.x * 1.0, node.pos.z + node.out.z * 1.0, 600);
    let n = 0; while (p.mode !== 'script' && n++ < 300) { c.setInput(K.stick(-node.out.x, -node.out.z)); c.step(1); }
    const r2b = K.ride((q) => (q.pos.z > -3 ? [0, -1] : null));
    c.step(120);
    log.push(['zurück', r2b.n, ...K.pos()]);
    // 3: Mauseloch, an der Kreuzung geradeaus ins Wasser, zum Strand schwimmen
    K.walk(-5, -4.4); K.walk(-5, -7.5, 400);
    K.ride(null);
    let maxY = -9, swimRing = false;
    for (let i = 0; i < 200; i++) { c.step(1); maxY = Math.max(maxY, p.pos.y); if (p.mode === 'swim') { c.rig.update(0.05, c.view.time); if (c.rig.info?.().ring) swimRing = true; } }
    log.push(['s3', rt.stars[2], 'swim', p.mode, 'ring', swimRing, ...K.pos()]);
    const sw = K.walk(-3.6, 1.6, 3000, 0.4) + K.walk(2.6, 0, 3000, 0.4); K.walk(7.4, -1, 1500);
    log.push(['Strand', sw, ...K.pos()]);
    // 4: Mauseloch, an der Kreuzung rechts → Kuppel, fällt auf den Wasserschalter
    K.walk(-5, -4.4); K.walk(-5, -7.5, 400);
    K.ride((q) => (q.pos.z > -1 ? [1, 0] : null));
    c.step(60);
    const sch = L.named.get('schalter');
    log.push(['Schalter', sch.pressed, ...K.pos()]);
    c.step(260);
    log.push(['Wasser', +L.waterLevel('see').toFixed(2), 'Steg', +L.named.get('stegA').deckY.toFixed(2), +L.named.get('stegB').deckY.toFixed(2)]);
    K.walk(2.1, 4.4); c.step(5);
    log.push(['s4', rt.stars[3]]);
    // aus der Kuppel: kurze Röhre zum rechten Ufer
    K.walk(2.2, 5.5, 300); K.walk(3.6, 5.5, 600); K.ride(null); c.step(60);
    log.push(['Kuppel verlassen', ...K.pos()]);
    // 5: über den Holzsteg auf das Leuchtturm-Inselchen
    K.walk(6.6, 9);
    const sy = []; let k5 = 0;
    for (; k5 < 3000; k5++) { const dx = -10.2 - p.pos.x, dz = 9.6 - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 || p.treasure) break; c.setInput(K.stick(dx, dz, Math.min(1, d / 0.6))); c.step(1); if (k5 % 60 === 0) sy.push(+p.pos.y.toFixed(2)); }
    c.setInput({});
    p.invuln = 0;
    c.step(60);
    log.push(['s5', rt.stars[4], p.treasure, 'Steg-Höhen', JSON.stringify(sy)]);
    return { log, stars: rt.stars.slice(), treasure: p.treasure, water: L.waterLevel('see') };
  });
  console.log('   Weg:', JSON.stringify(route.log));
  check(`${id}: Stern 1 gegenüber dem Start`, route.stars[0]);
  check(`${id}: Stern 2 – Mauseloch unter der Seewarte, Röhre an der Gabelung nach oben (Dachterrasse)`, route.stars[1]);
  check(`${id}: Stern 3 – an der Kreuzung geradeaus ins Wasser (Krümel schwimmt mit Schwimmring)`, route.stars[2] && JSON.stringify(route.log).includes('"ring",true'));
  check(`${id}: Stern 4 – Wasserschalter in der Röhren-Kuppel hebt Wasser (${f2(route.water)}) und Holzsteg`, route.stars[3] && route.water > -0.2);
  check(`${id}: Stern 5 – über den gehobenen Holzsteg`, route.stars[4]);
  check(`${id}: 5. Stern startet den Siegesablauf`, route.treasure);
  await shot(`${id}_sieg`);
  const fin = await sc(() => {
    const c = window.__course;
    for (let i = 0; i < 600 && !c.finished; i++) c.step(1);
    return { finished: c.finished, result: c.lastResult };
  });
  check(`${id}: Level endet mit Ergebnis (Schatz statt Zielmast)`, fin.finished && fin.result?.pole === null && fin.result.stars.length === 5);

  // Mechanik: Steg ohne Schalter zu tief, Rammfisch rammt einen Schwimmer
  await load(id);
  await sc(kapitaenHelpers);
  const mech = await sc(() => {
    const c = window.__course, p = c.player, L = c.level, K = window.__k;
    const deckLow = L.named.get('stegB').deckY;
    // Krümel vom rechten Ufer ins Wasser, zum Fisch schwimmen
    K.walk(6.4, 9.0);
    c.teleport(-1, -1.4, 6.6); c.step(30);
    const f = L.entities.find((e) => e.kind === 'rammfisch');
    let rams = 0, hurt = false, states = new Set();
    const big0 = p.big;
    for (let i = 0; i < 900; i++) { c.setInput(K.stick(f.pos.x - p.pos.x, f.pos.z - p.pos.z, 0.4)); c.step(1); states.add(f.state); if (p.invuln > 1) hurt = true; if (hurt) break; }
    c.setInput({});
    return { deckLow, swim: p.mode, states: [...states], hurt, big0, big: p.big };
  });
  check(`${id}: Holzsteg ohne Schalter tief im Wasser (Deck ${f2(mech.deckLow)} < Ufer 0)`, mech.deckLow < -1);
  check(`${id}: Rammfisch dreht sich zu Krümel im Wasser und rammt (${mech.states.join('/')})`, mech.hurt && mech.states.includes('charge'));

  for (const [i, deg] of [[0, 28], [1, 118], [2, -152], [3, -62]].values()) {
    await sc((d) => { const c = window.__course; c.teleport(9.5, 0, 9.5); c.arch.setOrbit(d); c.step(3); }, deg);
    await shot(`${id}_diorama_${deg}`);
    void i;
  }
  await sc(() => {
    const c = window.__course, o = c.arch.orbit;
    o.toggleZoom(); o.dists[1] = 6.5; o.tilt(-12); c.arch.setOrbit(60);
    c.teleport(8.5, 0, 9.4); c.step(20); c.setInput({ x: -0.5 }); c.step(14); c.setInput({}); c.step(2);
  });
  await shot(`${id}_kruemel`);
  await sc(() => {
    const c = window.__course, o = c.arch.orbit;
    o.dists[1] = 9; c.arch.setOrbit(10);
    c.teleport(-4, -1.4, 6.4); c.step(60);
  });
  await shot(`${id}_kruemel_schwimmt`);
  await sc(() => { const c = window.__course; c.arch.orbit.dists[1] = 13; c.arch.setOrbit(-20); c.teleport(-4.5, 10.2, -9.6); c.step(30); });
  await shot(`${id}_terrasse`);
  check(`${id}: keine Konsolenfehler/-warnungen im Lauf`, errors.length === 0);
}

for (const id of LEVELS) {
  if (id === '3-3') await test33();
  else await testKapitaen();
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
if (stats.length) {
  const maxCalls = Math.max(...stats.map((s) => s[1])), maxTris = Math.max(...stats.map((s) => s[2]));
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
