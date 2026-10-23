// Welt 4: Level 4-5 „Säulenstadt der Stachelwalzen“, Arena 4-A „Glutbrocken-Gerangel“ und Arena 4-B „Blaugitter-Bastion
// der Feuer-Werfer“ – deterministisch über window.__course.step(n) / setInput (Teleport nur als Startpunkt je Prüfung).
//   4-5: Laden ohne Konsolenfehler, Routen-Bot Start → Zielmast für Lotti und Greta (bewegliche Plattformen, Hänge,
//        Stachelstangen-Plattformen), alle Sterne und der Stempel mit der echten Mechanik (Röhre → Schalterraum →
//        Farbfeld; Krallen-Anzug aus dem ?-Block → Rundturm; Schwankplattform; schräge Stufen), die drei Extraleben über
//        die Räuberleiter (Spiegelfrucht, Klon im Gänsemarsch, Hochwurf, Krallen) – und Gegenproben (ohne Klon, ohne
//        Krallen), Mechanik (Walzen rollen den Hang hinab, Stachelstange fährt mit und trifft, Schwankplattform kippt,
//        versiegelte Röhre), Kennzahlen und Bilder je Abschnitt.
//   4-A: Arena, vier Lavabrocken in zwei Wellen (die zweite springt aus der Lava), betäuben → aufheben → in die Lava
//        werfen bzw. gegen einen anderen Brocken, Stern → Ziel, Tod setzt Arena und Wellen zurück.
//   4-B: Arena, drei Feuer-Werfer (springen zwischen Boden und Bühnen), draufspringen, Stern → Ziel innerhalb 100 s.
// Aufruf (nach npm run build): PORT_BASE=5400 node tests/course_w4c.mjs [teil …]
//   Teile: 4-5a (Laden + Routen), 4-5b (Sterne, Stempel, Extraleben), 4-5c (Mechanik), 4-5d (Bilder), 4-A, 4-B
//   (ohne Angabe: alle; je Teil < 10 min). VERBOSE=1 → Protokolle, ONLY=<Text|Text> → nur passende Ziele.
// Bilder tests/out/w4c_*.png. Kennzahlen: Zeichenaufrufe inkl. Schattenpass < 120, Dreiecke < 300 k.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const PORT = 4610;
const ARGS = process.argv.slice(2);
const want = (p) => !ARGS.length || ARGS.includes(p);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((k) => t.name.includes(k))) : list);
const VERBOSE = !!process.env.VERBOSE;

// ------------------------------------------------------------------ Höhen (wie im Level)
const Y0 = 1, Y1 = 3.5, Y2 = 6, Y3 = 9, Y4 = 12, Y5 = 14.5, XS = 80;

// Wegpunkte [x, z]; jump = Schritte mit gehaltener Sprungtaste; untilNamed = warten, bis ein Objekt eine Lage erreicht
// (near ± d), optional mitfahren (ride, off = Versatz [x, z] auf der Plattform); toNamed = auf ein bewegtes Ziel springen.
const MAIN = [
  { name: 'Start', to: [0, -9] },
  { name: 'Hang 1', to: [-0.6, -27.4] },
  { name: 'Säulenplatz', to: [-0.6, -43.4] },
  { name: 'Hang 2', to: [0, -55.2] },
  { to: [0, -60.3], within: 0.35, run: false },
  { name: 'Plattform 1', untilNamed: 'mp1', axis: 'z', near: -63.6, d: 0.2, max: 3000 },
  { toNamed: 'mp1', jump: 24, within: 0.7, run: false },
  { untilNamed: 'mp1', axis: 'z', near: -76.2, d: 0.2, ride: 'mp1', max: 3000 },
  { name: 'Checkpoint', to: [0, -81.6], within: 0.6 },
  { to: [-2, -100], within: 0.6 },
  { name: 'Torbogen', to: [-2, -103.7], within: 0.3, run: false },
  { name: 'Plattform 2a', untilNamed: 'mp2a', axis: 'z', near: -107, d: 0.2, max: 3000 },
  { toNamed: 'mp2a', jump: 24, within: 0.7, run: false },
  { untilNamed: 'mp2a', axis: 'z', near: -117.4, d: 0.2, ride: 'mp2a', max: 3000 },
  { name: 'Rastsäule 1', to: [-2, -120.4], jump: 18, within: 0.5, run: false },
  { name: 'Plattform 2b', untilNamed: 'mp2b', axis: 'x', near: -2, d: 0.2, max: 3000 },
  { toNamed: 'mp2b', jump: 24, within: 0.7, run: false },
  { untilNamed: 'mp2b', axis: 'x', near: 7.2, d: 0.2, ride: 'mp2b', max: 3000 },
  { name: 'Rastsäule 2', to: [7.2, -128.6], jump: 24, within: 0.5, run: false },
  { name: 'Plattform 2c', untilNamed: 'mp2c', axis: 'z', near: -132.2, d: 0.2, max: 3000 },
  { toNamed: 'mp2c', jump: 24, within: 0.7, run: false },
  { untilNamed: 'mp2c', axis: 'z', near: -139.6, d: 0.2, ride: 'mp2c', max: 3000 },
  { name: 'Landung', to: [5, -143], within: 0.6 },
  { name: 'Hang 3', to: [5, -157.6] },
  { name: 'Plateau', to: [7, -165.6], within: 0.35, run: false },
  { name: 'Stachelplattform 1', untilNamed: 'ms1', axis: 'z', near: -169.4, d: 0.2, max: 3000 },
  { toNamed: 'ms1', off: [0, 1.3], jump: 24, within: 0.6, run: false },
  { untilNamed: 'ms1', axis: 'z', near: -181.2, d: 0.2, ride: 'ms1', off: [0, 1.3], max: 3000 },
  { name: 'Insel 3', to: [4.4, -186], within: 0.6 },
  { to: [4.4, -195.6], within: 0.35, run: false },
  { name: 'Stachelplattform 2', untilNamed: 'ms2', axis: 'z', near: -199.2, d: 0.2, max: 3000 },
  { toNamed: 'ms2', off: [-1.3, 0], jump: 24, within: 0.6, run: false },
  { untilNamed: 'ms2', axis: 'z', near: -210.6, d: 0.2, ride: 'ms2', off: [-1.3, 0], max: 3000 },
  { name: 'Insel 4', to: [7, -214.4], jump: 20, within: 0.6, run: false },
  { to: [7, -220.6], within: 0.35, run: false },
  { name: 'Stachelplattform 3', untilNamed: 'ms3', axis: 'z', near: -224.4, d: 0.2, max: 3000 },
  { toNamed: 'ms3', off: [0, 1.3], jump: 24, within: 0.6, run: false },
  { untilNamed: 'ms3', axis: 'z', near: -233.2, d: 0.2, ride: 'ms3', off: [0, 1.3], max: 3000 },
  { name: 'Zielinsel', to: [5, -238], within: 0.6 },
  { name: 'Zielhang', to: [5, -253.4] },
  { name: 'Zielmast', to: [7, -259.2], within: 0.2 },
];

// Sterne/Stempel/Extraleben: from = Startpunkt, power = Power-up beim Start
const TARGETS = [
  { name: 'Stern 0: Röhre in den Schalterraum, alle 16 Felder färben', star: 0, from: [12.6, Y1 + 1.5, -32.8], shot: 'stern0',
    legs: [{ to: [12.6, -35], within: 0.25, run: false }, { crouch: 6 }, { wait: 60 },
      ...[-38, -36, -34, -32].flatMap((z, i) => (i % 2 ? [83, 81, 79, 77] : [77, 79, 81, 83]).map((x) => ({ to: [XS - 80 + x, z], within: 0.35, run: false }))),
      { wait: 80 }, { star: 0 }] },
  { name: 'Stern 1: Krallen-Anzug aus dem ?-Block, Rundturm hinauf', star: 1, from: [-5.4, Y2, -87.0], shot: 'stern1', heroes: ['lotti', 'greta'],
    legs: [{ to: [-5.4, -88.6], within: 0.2, run: false }, { hop: 20 }, { wait: 50 }, { chaseKind: 'powerup', max: 900 }, { wait: 10 },
      { to: [-10, -91.0], within: 0.3, run: false }, { push: 260, jump: 14, dir: [0, -1] }, { to: [-10, -95], within: 0.4, run: false }, { star: 1 }], expectPower: 'krallen' },
  { name: 'Stern 1 nicht ohne Krallen (Sprung am Turm)', star: 1, expectNot: true, from: [-10, Y2, -90.4],
    legs: [{ push: 200, jump: 40, dir: [0, -1] }, { wait: 60 }] },
  { name: 'Stern 2: auf der Schwankplattform', star: 2, from: [1.2, Y4, -190], shot: 'stern2', heroes: ['lotti', 'greta'],
    legs: [{ to: [-2.6, -190], jump: 26, within: 0.5, run: false }, { to: [-6.6, -190], within: 0.3, run: false }, { wait: 20 }] },
  { name: 'Stempel: oben auf den schrägen Stufen', stamp: true, from: [-3.8, Y0, 2.8], shot: 'stempel', heroes: ['lotti', 'greta'],
    legs: [{ to: [-5.2, 1.2], jump: 22, within: 0.4, run: false }, { to: [-6.8, -0.4], jump: 22, within: 0.4, run: false },
      { to: [-8.4, -2.0], jump: 22, within: 0.4, run: false }, { to: [-8.6, -3.9], jump: 24, within: 0.4, run: false }, { wait: 20 }] },
];

const EXTRA = [
  { name: 'Extraleben: Spiegelfrucht, Klon im Gänsemarsch, Räuberleiter, Krallen die Ranken hinauf', from: [4.6, Y2, -89], power: 'krallen', heroes: ['lotti', 'greta'], shot: 'extraleben',
    legs: [{ to: [9, -89], within: 0.3, run: false }, { to: [9, -93.6], within: 0.3, run: false, slow: 0.7 }, { push: 420, dir: [0, -1] }, { wait: 30 }],
    expectLives: 3, expectLaunch: 1 },
  { name: 'Extraleben nicht ohne Klon (Krallen, Sprung aus dem Graben)', from: [9, Y2 - 0.8, -95.3], power: 'krallen', heroes: ['lotti'], noFruit: true,
    legs: [{ push: 240, jump: 40, dir: [0, -1] }, { wait: 40 }, { push: 160, jump: 40, dir: [0, -1] }], expectNoLives: true },
  { name: 'Extraleben nicht ohne Krallen (Klon wirft hoch, Ranken nicht kletterbar)', from: [4.6, Y2, -89], heroes: ['lotti'],
    legs: [{ to: [9, -89], within: 0.3, run: false }, { to: [9, -93.6], within: 0.3, run: false, slow: 0.7 }, { push: 320, dir: [0, -1] }],
    expectNoLives: true, expectLaunch: 1 },
];

const SHOTS = [
  ['start', [0, Y0, 5]],
  ['stufen', [-4, Y0, 3]],
  ['torbogen', [0, Y0, -7]],
  ['hang1', [0, Y0, -13]],
  ['platz', [0, Y1, -29]],
  ['roehre', [10.4, Y1 + 1.5, -32]],
  ['hang2', [0, Y1, -44.5]],
  ['kante', [0, Y2, -58]],
  ['plattform1', [0, Y2, -61]],
  ['checkpoint', [0, Y2, -82]],
  ['turm', [-6.4, Y2, -88]],
  ['balken', [6.6, Y2, -89]],
  ['fahrt', [-2, Y2, -103]],
  ['rastsaeule', [7.2, Y2, -128.6]],
  ['hang3', [6, Y3, -143]],
  ['plateau', [6, Y4, -161]],
  ['stachel1', [7, Y4, -166]],
  ['insel3', [4.4, Y4, -186]],
  ['schwank', [1.2, Y4, -188]],
  ['insel4', [7, Y4, -214.4]],
  ['zielhang', [5, Y4, -238]],
  ['ziel', [7, Y5, -254.6]],
  ['schalterraum', [XS, Y0, -28.2]],
];

const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const SAVE = 'lotti-greta-course-v1';
const stats = [];

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const L = c.level, P = () => c.player;
  L.runtime.save.lives = Math.max(L.runtime.save.lives, 5);
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.holding = null;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    namedPos(id) {
      const m = L.named.get(id);
      const q = m?.box?.pos ?? m?.pm?.pos ?? m?.pos;
      return q ? [q.x, q.z, q.y] : null;
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [], track = [];
      let steps = 0, autoJumps = 0, hurt = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const hist = [];
      let deadLogged = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        const before = p.invuln;
        c.setInput(inp); c.step(1); steps++;
        if (!hold && p.invuln > before + 0.5) hurt++;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (steps % 24 === 0 && p.mode !== 'script') track.push([+p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]);
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') {
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.setInput({}); c.step(1); steps++;
          }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      const rideTo = (id, off) => {
        const r = this.namedPos(id);
        if (!r) return {};
        const dx = r[0] + (off?.[0] ?? 0) - p.pos.x, dz = r[1] + (off?.[1] ?? 0) - p.pos.z, d = Math.hypot(dx, dz);
        return d > 0.15 ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {};
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        rode = false;
        if (Lg.wait) { for (let i = 0; i < Lg.wait; i++) tick(Lg.hold ?? {}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          continue;
        }
        if (Lg.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 });
          log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400 }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.untilNamed) {
          let k = 0;
          for (; k < (Lg.max ?? 1500); k++) {
            const q = this.namedPos(Lg.untilNamed);
            const v = Lg.axis === 'x' ? q[0] : Lg.axis === 'y' ? q[2] : q[1];
            if (Math.abs(v - Lg.near) < (Lg.d ?? 0.4) && k > 2) break;
            tick(Lg.ride ? rideTo(Lg.ride, Lg.off) : {});
          }
          log.push(['warte', Lg.untilNamed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= (Lg.max ?? 1500)) log.push(['FEHLER: Lage nicht erreicht', Lg.untilNamed]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) {
            const d = Lg.dir ? this.stick(Lg.dir[0], Lg.dir[1]) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([Lg.name ?? `push${li}`, Lg.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0;
        const target = () => {
          if (Lg.toNamed) { const q = this.namedPos(Lg.toNamed); if (q) return [q[0] + (Lg.off?.[0] ?? 0), q[1] + (Lg.off?.[1] ?? 0)]; }
          return Lg.to;
        };
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          if (rode) break;
          const T = target();
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || (landed && p.mode === 'ground'));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ) {
            const k = 2.6, vmax = Lg.vmax ?? 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            if (Lg.toNamed) { const m = L.named.get(Lg.toNamed); vx += m?.mover?.vx ?? 0; vz += m?.mover?.vz ?? 0; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          const jump = (holdJ ? i < holdJ : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to ?? Lg.toNamed]); break; }
      }
      c.setInput({});
      p.invuln = hold ? 0 : p.invuln;
      return { log, track, steps, hurt, autoJumps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info() };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best && d < (o.radius ?? 40)) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz, Math.min(1, Math.max(0.3, dist)));
        const dy = e.pos.y - p.pos.y;
        const jump = (dist < 1.4 && dy > 0.6 && (n % 48) < 26);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 2, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      p.invuln = 0;
      return n;
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    figs: () => L.players.map((f) => [+f.pos.x.toFixed(2), +f.pos.y.toFixed(2), +f.pos.z.toFixed(2), f.mode, f.clone ? 'klon' : 'haupt']),
    named: (id) => { const e = L.named.get(id); return e ? { kind: e.kind, alive: e.alive, defeated: !!e.defeated, state: e.state, info: e.info?.() } : null; },
  };
  window.__w4 = W;
  return true;
}

const allErrors = [];
async function load(id, { fresh = false } = {}) {
  allErrors.push(...errors);
  errors.length = 0;
  const go = async (url) => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { await page.goto(url, { waitUntil: 'load', timeout: 150000 }); return true; } catch { /* nochmal */ }
    }
    return false;
  };
  if (fresh) {
    await go(`http://localhost:${port}/?course=0-0&scale=2&adapt=0`);
    await page.evaluate((k) => localStorage.removeItem(k), SAVE);
  }
  if (!(await go(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`))) return false;
  try {
    await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
  } catch {
    console.log(`Level ${id} startet nicht. Konsole:`);
    for (const x of errors) console.log('  ', x);
    return false;
  }
  await page.waitForTimeout(300);
  await sc(install);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w4[n](...a), [name, args]);

async function shot(name, wait = 500) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w4c_${name}.png` });
  return s;
}

// ====================================================================================================== 4-5
const P45 = ['4-5a', '4-5b', '4-5c', '4-5d'].filter(want);
if (P45.length) {
  console.log('\n4-5 „Säulenstadt der Stachelwalzen“');
  if (!(await load('4-5', { fresh: true }))) { check('4-5 lädt', false); }
  else {
    const loadErrors = errors.slice();
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, arch: d.archetype, stars: d.stars.length, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, ${meta.arch}, Thema ${meta.theme}, Musik ${meta.music}, ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    if (want('4-5a')) {
      check('4-5: lädt ohne Konsolenfehler/-warnungen', loadErrors.length === 0);
      for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
      check(`4-5: parcours, ruins, course_ruins, 400 s, 3 Sterne + Stempel`, meta.arch === 'parcours' && meta.theme === 'ruins' && meta.music === 'course_ruins' && meta.timeLimit === 400 && meta.stars === 3 && meta.stamp);
      check(`4-5: Walzenwerfer ${kinds.walzenwerfer ?? 0} (≥ 10), Rollpilze ${kinds.rollpilz ?? 0} (8), Stachelstangen ${kinds.stachelstange ?? 0} (6)`, (kinds.walzenwerfer ?? 0) >= 10 && kinds.rollpilz === 8 && kinds.stachelstange === 6);
      for (const hero of ['lotti', 'greta']) {
        await load('4-5');
        await W('place', [0, Y0, 5], { hero, settle: 2 });
        const res = await W('drive', MAIN, {});
        const reached = res.status === 'goal' || res.status === 'done';
        console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}`);
        if (!reached || VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
        check(`4-5: Routen-Bot ${hero} erreicht den Zielmast`, reached);
        check(`4-5: ${hero} Zeit bis zum Ziel < 180 s (${res.time.toFixed(1)} s)`, reached && res.time < 180);
        const cp = res.rt.checkpoint ?? res.rt.cp ?? null;
        if (hero === 'lotti') console.log(`     Laufzeit-Info: ${JSON.stringify(res.rt).slice(0, 300)}`);
      }
    }
    if (want('4-5b')) {
      for (const t of pick(TARGETS)) {
        for (const hero of t.heroes ?? ['lotti']) {
          await load('4-5');
          await W('place', t.from, { hero, power: t.power, settle: 10 });
          const res = await W('drive', t.legs, {});
          const rt = await W('rt');
          let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
          if (t.expectNot) ok = !ok;
          if (t.expectPower && res.log.every((l) => l[5] !== t.expectPower && l[7] !== t.expectPower)) ok = false;
          if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
          if (!ok || VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
          check(`4-5: ${t.name} (${hero})`, !!ok);
          if (t.shot && ok && hero === 'lotti') await shot(`45_${t.shot}`);
        }
      }
      for (const t of pick(EXTRA)) {
        for (const hero of t.heroes ?? ['lotti']) {
          await load('4-5');
          const lives0 = await W('lives');
          if (t.noFruit) await sc(() => { const L = window.__course.level; for (const e of L.entities) if (e.kind === 'powerup' && e.power === 'spiegel') e.kill(); const s = L.named.get('strauch'); if (s) { s.t = -1e9; } });
          await W('place', t.from, { hero, power: t.power, settle: 10 });
          const res = await W('drive', t.legs, {});
          const lives1 = await W('lives');
          const leiter = await sc(() => { const s = window.__course.level.named.get('leiter'); return { launches: s?.launches ?? 0, log: s?.log ?? [] }; });
          const figs = await W('figs');
          let ok = true;
          if (t.expectLives) ok = ok && lives1 - lives0 >= t.expectLives;
          if (t.expectNoLives) ok = ok && lives1 - lives0 === 0;
          if (t.expectLaunch) ok = ok && leiter.launches >= t.expectLaunch;
          if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
          if (!ok || VERBOSE) { for (const l of res.log) console.log('     ', JSON.stringify(l)); console.log('      Räuberleiter', JSON.stringify(leiter), 'Figuren', JSON.stringify(figs)); }
          check(`4-5: ${t.name} (${hero}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Hochwürfe ${leiter.launches})`, ok);
          if (t.shot && ok && hero === 'lotti') await shot(`45_${t.shot}`);
        }
      }
    }
    if (want('4-5c')) {
      // Walzen rollen den Hang hinab (schneller), zerbrechen
      await load('4-5');
      let r = await sc(() => {
        const c = window.__course, L = c.level, t = window.__w4;
        t.place([-3.6, 1, -6], { settle: 2, invuln: 1e9 });
        const out = { thrown: 0, max: 0, rolledDown: false, broke: false };
        const seen = new Map();
        for (let i = 0; i < 1500; i++) {
          c.step(1);
          for (const e of L.entities) {
            if (e.kind !== 'stachelwalze') continue;
            if (!seen.has(e)) seen.set(e, { z0: e.pos.z, maxV: 0 });
            const s = seen.get(e);
            s.maxV = Math.max(s.maxV, Math.hypot(e.vel.x, e.vel.z));
            if (e.pos.z > s.z0 + 6 && e.pos.y < 3.3) out.rolledDown = true;
            if (e.state === 'break' || e.removed) out.broke = true;
          }
        }
        out.thrown = seen.size;
        out.max = Math.max(0, ...[...seen.values()].map((s) => s.maxV));
        c.player.invuln = 0;
        return out;
      });
      console.log(`  Walzen: ${JSON.stringify(r)}`);
      check(`4-5: Walzenwerfer werfen Stachelwalzen (${r.thrown}), sie rollen den Hang hinab (max ${r.max.toFixed(1)} m/s > 3,5) und zerbrechen`, r.thrown >= 2 && r.rolledDown && r.max > 3.6 && r.broke);
      // Stachelstange fährt auf der Plattform mit und trifft eine stehende Figur
      r = await sc(() => {
        const c = window.__course, L = c.level, t = window.__w4;
        const ss = L.named.get('ss1'), m = L.named.get('ms1');
        const z0 = ss.pos.z, mz0 = m.pm.pos.z;
        for (let i = 0; i < 400; i++) c.step(1);
        const moved = { ss: +(ss.pos.z - z0).toFixed(2), m: +(m.pm.pos.z - mz0).toFixed(2) };
        // stehende Figur im Kreis der Kugeln auf der Insel 3 (große Stachelstange)
        const s2 = L.named.get('ss2');
        t.place([s2.pos.x + 2.0, 12, s2.pos.z], { settle: 4 });
        const p = c.player;
        let hit = false;
        for (let i = 0; i < 900 && !hit; i++) { c.setInput({}); c.step(1); if (p.invuln > 0.5 || !p.big) hit = true; }
        return { moved, hit, hits: s2.hits };
      });
      check(`4-5: Stachelstange fährt mit der Plattform (${r.moved.ss} m = ${r.moved.m} m) und trifft eine stehende Figur (${r.hits})`, Math.abs(r.moved.ss - r.moved.m) < 0.05 && Math.abs(r.moved.m) > 1 && r.hit);
      // Schwankplattform kippt unter Last
      r = await sc(() => {
        const c = window.__course, L = c.level, t = window.__w4;
        const s = L.named.get('schwank');
        t.place([-6.6, 12.4, -190.6], { settle: 1, invuln: 1e9 });
        let maxT = 0;
        for (let i = 0; i < 160; i++) { c.setInput({}); c.step(1); maxT = Math.max(maxT, Math.abs(s.tilt) * 180 / Math.PI); }
        const p = c.player;
        const slid = p.pos.x < -6.8 || p.pos.y < 12;
        c.player.invuln = 0;
        return { maxT: +maxT.toFixed(1), slid };
      });
      check(`4-5: Schwankplattform kippt unter der Figur (${r.maxT}°), sie rutscht ab`, r.maxT > 12 && r.slid);
      // Versiegelte Röhre: Ducken → Ansage, kein Teleport
      r = await sc(() => {
        const c = window.__course, L = c.level, t = window.__w4;
        t.place([11.4, 14.5 + 1.5, -257.8], { settle: 30 });
        for (let i = 0; i < 20; i++) { c.setInput({ crouch: true }); c.step(1); }
        c.setInput({}); c.step(30);
        const info = L.named.get('festung_roehre');
        return { tries: info?.tries ?? 0, banner: L.lastBanner ?? null, pos: [+c.player.pos.x.toFixed(1), +c.player.pos.y.toFixed(1), +c.player.pos.z.toFixed(1)] };
      });
      check(`4-5: versiegelte Röhre zur Werfer-Festung: Ansage „${r.banner}“, bleibt am Ort (${r.pos})`, r.tries >= 1 && /Werfer-Festung/.test(r.banner ?? '') && Math.abs(r.pos[2] + 257.8) < 1);
      // Röhre hin und zurück: Schalterraum-Ausgang führt auf den Säulenplatz
      r = await sc(() => {
        const c = window.__course, t = window.__w4;
        t.place([86.5, 1 + 1.1, -27.6], { settle: 30 });
        for (let i = 0; i < 8; i++) { c.setInput({ crouch: true }); c.step(1); }
        for (let i = 0; i < 400 && c.player.mode === 'script'; i++) { c.setInput({}); c.step(1); }
        c.step(60);
        return [+c.player.pos.x.toFixed(1), +c.player.pos.y.toFixed(1), +c.player.pos.z.toFixed(1)];
      });
      check(`4-5: Ausgangsröhre des Schalterraums führt zurück auf den Säulenplatz (${r})`, Math.abs(r[0] - 6.6) < 2 && Math.abs(r[2] + 40.4) < 2 && r[1] > 3);
    }
    if (want('4-5d')) {
      await load('4-5');
      for (const [name, pos] of SHOTS) {
        await W('place', pos, { settle: 12 });
        await shot(`45_${name}`);
      }
    }
  }
}

// ====================================================================================================== Arena-Hilfen
function arenaInstall() {
  const c = window.__course, L = c.level, P = () => c.player;
  const t = window.__t = {
    arch: () => c.state().archetype,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    count: (kind, f = () => true) => L.entities.filter((e) => e.kind === kind && e.alive && !e.removed && f(e)).length,
    stick(dx, dz, mag = 1) { const l = Math.hypot(dx, dz) || 1, cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy); return { x: (co * dx / l - si * dz / l) * mag, y: (-si * dx / l - co * dz / l) * mag }; },
    face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
    /** Zu (x, z) laufen (echte Eingabe), bis r m nah. */
    go(x, z, o = {}) {
      const p = P();
      let i = 0;
      for (; i < (o.max ?? 900); i++) {
        const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < (o.r ?? 0.4)) break;
        c.setInput({ ...t.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: !!o.run });
        c.step(1);
      }
      c.setInput({}); c.step(o.settle ?? 2);
      return i;
    },
    /** Gegner e mit echter Eingabe anlaufen und draufspringen (in der Luft auf ihn lenken). → { bounced, steps } */
    jumpOn(e, o = {}) {
      const p = P();
      let n = 0, bounced = false, jumped = false;
      const ok = o.until ?? ((x) => x.state === 'stunned' || x.defeated || x.removed);
      for (; n < (o.max ?? 2400) && !bounced; n++) {
        if (ok(e)) { bounced = true; break; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
        let inp;
        if (p.mode === 'air') {
          const vx = dx * 4 + (e.vel?.x ?? 0), vz = dz * 4 + (e.vel?.z ?? 0), ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
          inp = { ...(el > 0.05 ? t.stick(ex, ez, Math.min(1, el / 2.5)) : {}), jump: p.vel.y > 0 };
        } else {
          jumped = d < (o.at ?? 2.0) && Math.abs(e.pos.y - p.pos.y) < 1.2;
          inp = { ...t.stick(dx, dz, 1), run: d > 3, jump: jumped };
        }
        if (o.safe) p.invuln = Math.max(p.invuln, 3);
        c.setInput(inp); c.step(1);
      }
      c.setInput({}); c.step(3);
      return { bounced, steps: n };
    },
    /** Aktion (ein Schritt) mit optionaler Richtung. */
    action(o = {}) { c.setInput({ action: true, ...o }); c.step(1); c.setInput({}); c.step(1); },
  };
  return true;
}

async function arenaLoad(id, fresh = false) {
  const ok = await load(id, { fresh });
  if (ok) await sc(arenaInstall);
  return ok;
}

async function SHOTA(name, setup, arg) {
  if (setup) await sc(setup, arg);
  await sc(() => { const c = window.__course; for (let i = 0; i < 20; i++) c.rig.update(0.05, c.view.time + i * 0.05); c.snapCamera(); });
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(500);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w4c_${name}.png` });
  return s;
}

// ====================================================================================================== 4-A
if (want('4-A')) {
  console.log('\n4-A „Glutbrocken-Gerangel“');
  if (!(await arenaLoad('4-A', true))) check('4-A lädt', false);
  else {
    check('4-A: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
    for (const e of errors.slice(0, 6)) console.log('     ', e);
    let r = await sc(() => {
      const c = window.__course, L = c.level, d = L.data, t = window.__t;
      return { title: d.title, arch: d.archetype, theme: d.theme, music: d.music, time: d.timeLimit, slots: d.starSlots, n: t.count('lavabrocken'), parked: L.entities.filter((e) => e.kind === 'lavabrocken' && e.parked).length, hud: c.state().archetype.hud?.arena ?? null, left: t.arch().left };
    });
    console.log(`  ${JSON.stringify(r)}`);
    check(`4-A: „${r.title}“, Arena, Thema ${r.theme}, Musik ${r.music}, ${r.time} s, 1 Stern`, r.arch === 'arena' && r.theme === 'lava' && r.music === 'course_arena' && r.time === 200 && r.slots === 1);
    check(`4-A: vier Lavabrocken, drei davon warten (zweite Welle), Restanzeige ${r.left}`, r.n === 4 && r.parked === 3 && r.left === 4);
    await SHOTA('4a_start', () => { window.__course.step(30); });
    // Sieg mit echter Mechanik: draufspringen → betäubt → aufheben → in die Lava werfen (bzw. gegen einen anderen Brocken)
    r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, p = c.player;
      p.hurt = () => false;
      const out = { steps: [], waves: null, flew: 0, landed: 0 };
      const t0 = L.time;
      const brocken = () => L.entities.filter((e) => e.kind === 'lavabrocken' && e.alive && !e.removed && !e.defeated && !e.parked);
      const throwOne = (target) => {
        const e = brocken().filter((x) => x.grounded && x.state !== 'air').sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
        if (!e) return null;
        const j = t.jumpOn(e, { safe: true });
        // neben ihn stellen (zur Mitte hin), ihn ansehen, aufheben
        const ax = -e.pos.x, az = -e.pos.z, al = Math.hypot(ax, az) || 1;
        t.go(e.pos.x + (ax / al) * 0.9, e.pos.z + (az / al) * 0.9, { r: 0.25, max: 300 });
        t.face(e.pos.x, e.pos.z);
        t.action();
        const held = p.holding === e;
        let thrownAt = null;
        if (held) {
          const o = target ? brocken().find((x) => x !== e && x.grounded) : null;
          if (o) {
            // gegen einen anderen Brocken werfen: auf 3,5 m heran
            const bx = p.pos.x - o.pos.x, bz = p.pos.z - o.pos.z, bl = Math.hypot(bx, bz) || 1;
            t.go(o.pos.x + (bx / bl) * 3.2, o.pos.z + (bz / bl) * 3.2, { r: 0.4, max: 400 });
            t.face(o.pos.x, o.pos.z);
            thrownAt = o;
          } else {
            // an den Rand und hinaus in die Lava
            const a = Math.atan2(p.pos.z, p.pos.x), r = 8.6;
            t.go(Math.cos(a) * r, Math.sin(a) * r, { r: 0.4, max: 500 });
            t.face(Math.cos(a) * 30, Math.sin(a) * 30);
          }
          c.step(1);
          t.action();
        }
        let gone = false;
        for (let i = 0; i < 240 && !gone; i++) { c.step(1); gone = e.defeated || e.removed; }
        const step = { id: e.spec.id, stunned: j.bounced, held, gone, at: thrownAt?.spec?.id ?? 'lava', otherGone: thrownAt ? (thrownAt.defeated || thrownAt.removed) : null, left: t.arch().left };
        out.steps.push(step);
        return step;
      };
      throwOne(false);
      // zweite Welle: drei springen aus der Lava
      let ys = [];
      for (let i = 0; i < 600; i++) {
        c.step(1);
        const b = brocken();
        if (b.length === 3) { ys.push(Math.min(...b.map((e) => e.pos.y))); if (b.every((e) => e.grounded)) break; }
      }
      out.flew = ys.length ? +Math.min(...ys).toFixed(2) : null;
      out.waves = L.named.get('wellen')?.log ?? null;
      out.landed = L.named.get('wellen')?.landed ?? 0;
      throwOne(true);
      for (let k = 0; k < 4 && brocken().length; k++) throwOne(false);
      out.left = t.arch().left;
      let shown = false;
      for (let i = 0; i < 400 && !shown; i++) { c.step(1); shown = !!t.arch().starTouch; }
      out.star = t.arch().starShown;
      out.time = +(L.time - t0).toFixed(1);
      delete p.hurt;
      return out;
    });
    console.log(`  4-A Kampf: ${JSON.stringify(r)}`);
    const s0 = r.steps[0] ?? {};
    check(`4-A: erster Lavabrocken draufspringend betäubt, aufgehoben und in die Lava geworfen (${JSON.stringify(s0)})`, s0.stunned && s0.held && s0.gone && s0.at === 'lava');
    check(`4-A: danach springen drei Brocken aus der Lava auf die Insel (tiefster Punkt ${r.flew} m, gelandet ${r.landed})`, r.waves?.length === 1 && r.flew !== null && r.flew < 1.2 && r.landed >= 3);
    const s1 = r.steps[1] ?? {};
    check(`4-A: geworfener Brocken trifft einen anderen – beide besiegt (${JSON.stringify(s1)})`, s1.held && s1.gone && s1.otherGone === true);
    check(`4-A: alle vier besiegt (noch ${r.left}), Stern erscheint (${r.time} s)`, r.left === 0 && r.star);
    await SHOTA('4a_stern', () => { window.__course.step(20); });
    r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t;
      const star = L.entities.find((e) => e.kind === 'star' && e.alive);
      if (star) t.go(star.pos.x, star.pos.z, { r: 0.2, max: 900 });
      for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
      return { got: L.runtime.stars[0], won: t.arch().won, finished: c.finished, save: t.save().levels?.['4-A'] ?? null };
    });
    check(`4-A: Stern eingesammelt → Siegespose, Ergebnis, gespeichert (${JSON.stringify(r.save)})`, r.got && r.won && r.finished && r.save?.done === true && r.save.stars?.[0] === true);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}w4c_4a_ergebnis.png` });
    // Tod setzt Arena und Wellen zurück
    await arenaLoad('4-A');
    r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, p = c.player;
      const e = L.named.get('lb1');
      p.hurt = () => false;
      t.jumpOn(e, { safe: true });
      e.kill?.(); if (!e.defeated) { e.defeated = true; L.onEnemyDefeated?.(e); }
      for (let i = 0; i < 400; i++) c.step(1);
      const before = { left: t.arch().left, active: L.entities.filter((x) => x.kind === 'lavabrocken' && x.alive && !x.removed && !x.parked).length };
      delete p.hurt;
      p.invuln = 0;
      p.die('hit');
      for (let i = 0; i < 700 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(10);
      return { before, left: t.arch().left, parked: L.entities.filter((x) => x.kind === 'lavabrocken' && x.parked).length, resets: t.arch().resets, wave: L.named.get('wellen')?.wave };
    });
    console.log(`  4-A Neustart: ${JSON.stringify(r)}`);
    check(`4-A: Tod setzt Arena und Wellen zurück (vorher noch ${r.before.left}, danach ${r.left}, ${r.parked} warten wieder)`, r.before.left === 3 && r.left === 4 && r.parked === 3 && r.wave === 0);
    await SHOTA('4a_welle2', () => {
      const c = window.__course, L = c.level;
      const e = L.named.get('lb1'); e.defeated = true; e.kill?.(); L.onEnemyDefeated?.(e);
      c.player.hurt = () => false;
      for (let i = 0; i < 260; i++) c.step(1);
      c.player.pos.set(0, 2, 6);
    });
    check('4-A: keine Konsolenfehler', errors.length === 0);
  }
}

// ====================================================================================================== 4-B
if (want('4-B')) {
  console.log('\n4-B „Blaugitter-Bastion der Feuer-Werfer“');
  if (!(await arenaLoad('4-B', true))) check('4-B lädt', false);
  else {
    check('4-B: Laden ohne Konsolenfehler/Warnungen', errors.length === 0);
    for (const e of errors.slice(0, 6)) console.log('     ', e);
    let r = await sc(() => {
      const c = window.__course, L = c.level, d = L.data, t = window.__t;
      const cage = L.world.overlapAABB({ x: 0, y: 4, z: -11.3 }, { x: 0.1, y: 0.1, z: 0.1 }).some((s) => s.tag === 'gitter');
      return { title: d.title, arch: d.archetype, theme: d.theme, music: d.music, time: d.timeLimit, slots: d.starSlots, n: t.count('feuer_werfer'), left: t.arch().left, cage };
    });
    console.log(`  ${JSON.stringify(r)}`);
    check(`4-B: „${r.title}“, Arena, Thema ${r.theme}, Musik ${r.music}, ${r.time} s, 1 Stern`, r.arch === 'arena' && r.theme === 'fortress' && r.music === 'course_arena' && r.time === 100 && r.slots === 1);
    check(`4-B: drei Feuer-Werfer (noch ${r.left}), Gitter ringsum`, r.n === 3 && r.left === 3 && r.cage);
    await SHOTA('4b_start', () => { window.__course.step(40); });
    // Werfer werfen Feuerkugeln und springen auf die Bühnen
    r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, p = c.player;
      p.invuln = 1e9;
      let shots = 0, high = 0;
      for (let i = 0; i < 1500; i++) { c.step(1); shots = Math.max(shots, L.entities.filter((e) => e.kind === 'feuerkugel' || e.kind === 'werfer_feuer' || /feuer/.test(e.kind) && e.kind !== 'feuer_werfer').length); high = Math.max(high, L.entities.filter((e) => e.kind === 'feuer_werfer' && e.tier === 'high').length); }
      p.invuln = 0;
      const throws = L.entities.filter((e) => e.kind === 'feuer_werfer').map((e) => e.throws);
      return { shots, high, throws };
    });
    console.log(`  4-B Werfer: ${JSON.stringify(r)}`);
    check(`4-B: Werfer werfen (${r.throws.join('/')}) und springen auf Galerie/Bühnen (${r.high} oben)`, r.throws.every((n) => n > 0) && r.high >= 1);
    await SHOTA('4b_kampf');
    // Sieg: neu laden, mit echter Eingabe jeden Werfer anlaufen und draufspringen; Zeit vom Levelstart bis zum Ziel < 100 s
    await arenaLoad('4-B');
    r = await sc(() => {
      const c = window.__course, L = c.level, t = window.__t, p = c.player;
      const t0 = L.runtime.info().time ?? null;
      const out = { hits: [], hurtCount: 0 };
      const start = L.time;
      for (let n = 0; n < 6 && t.arch().left > 0; n++) {
        const e = L.entities.filter((x) => x.kind === 'feuer_werfer' && x.alive && !x.removed && !x.defeated).sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z))[0];
        if (!e) break;
        const res = t.jumpOn(e, { safe: true, max: 3000, until: (x) => x.defeated || x.removed });
        out.hits.push({ id: e.spec.id, ok: res.bounced, steps: res.steps, y: +e.pos.y.toFixed(1), left: t.arch().left });
      }
      for (let i = 0; i < 400 && !t.arch().starTouch; i++) c.step(1);
      const star = L.entities.find((x) => x.kind === 'star' && x.alive);
      if (star) t.go(star.pos.x, star.pos.z, { r: 0.2, max: 900, run: true });
      for (let i = 0; i < 900 && !c.finished; i++) c.step(1);
      out.time = +(L.time - start).toFixed(1);
      out.finished = c.finished;
      out.got = L.runtime.stars[0];
      out.save = t.save().levels?.['4-B'] ?? null;
      out.timeLeft = L.runtime.info().time ?? null;
      return out;
    });
    console.log(`  4-B Kampf: ${JSON.stringify(r)}`);
    check(`4-B: alle drei Feuer-Werfer draufspringend besiegt (${r.hits.map((h) => `${h.id}@${h.y}`).join(', ')})`, r.hits.length === 3 && r.hits.every((h) => h.ok));
    check(`4-B: Stern eingesammelt, Ziel nach ${r.time} s (< 100 s), gespeichert`, r.got && r.finished && r.time < 100 && r.save?.done === true);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${OUT}w4c_4b_ergebnis.png` });
    // Zeitlimit 100 s: Zeit um → Tod
    await arenaLoad('4-B');
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      p.hurt = () => false;
      let dead = false, cause = null;
      for (let i = 0; i < 101 * 120 && !dead; i++) { c.step(1); if (p.dead) { dead = true; cause = p.deathCause; } }
      delete p.hurt;
      return { dead, cause, t: +L.time.toFixed(1) };
    });
    check(`4-B: nach 100 s ist die Zeit um (${r.cause} bei ${r.t} s)`, r.dead && r.cause === 'time');
    await arenaLoad('4-B');
    await SHOTA('4b_galerie', () => { const c = window.__course; c.player.pos.set(0, 4.6, -7); c.player.invuln = 1e9; c.step(60); });
    check('4-B: keine Konsolenfehler', errors.length === 0);
  }
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(26)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
