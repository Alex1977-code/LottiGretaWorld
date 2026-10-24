// Welt 5, Level 5-3 „Klon-Gewusel in den Blauglut-Gassen“, 5-A „Hörnerherde am Lila Strand“, 5-4 „Kanonenflug über die
// Goldsavanne“ und 5-Kapitän „Krümel im Kicherschlösschen“: Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik,
// Zeitlimit, Sterne, Gegnerzahlen), Routen-Bot (Lotti und Greta von Start bis Zielmast, deterministisch über
// __course.setInput/step), alle Sterne und der Stempel mit der echten Mechanik (5-3: Stampfattacke auf die rissige
// Fliese, Spiegelfrucht-Klone auf dem 3er- und 4er-Lift, Krallen-Anzug an der Kletterwand, Figurenschalter nur für
// Greta; 5-A: fünf Rammbock-Bullen in zwei Wellen; 5-4: Röhrenkanone, Glasröhren, grün leuchtender Hase, Ameisenloch →
// Warp-Box → Höhle, Stempel auf dem Rücken der Riesenameise, Sternring; 5-Kapitän: Krümel springt nicht, Türen,
// Antipp-Plattformen, Kreisgeister, Donut-Blöcke), Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w5b_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5b.mjs [5-3|5-A|5-4|5-Kapitän]
//   PARTS=load,route,targets,extra,sweep,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta ·
//   ONLY=<Text> (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist während der
// Fahrt unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Treffer-Versuche werden
// trotzdem gezählt. Alle Figuren (Spiegelfrucht-Klone) bekommen dieselbe Eingabe – wie im Spiel.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const ROUTES = {};

// =====================================================================================================================
// 5-3 Klon-Gewusel in den Blauglut-Gassen
// =====================================================================================================================
{
  const Y = 1;
  ROUTES['5-3'] = {
    start: [-8, Y, 6.6],
    meta: { stars: 3, stamp: true, time: 100, theme: 'bluelava', music: 'course_bluelava', archetype: 'parcours' },
    enemies: { feuer_schnappblume: 2, pilzling: 2, glutball: 2 },
    timeMax: 60,
    main: [
      { name: 'Südgasse', to: [-11.75, 0.4] },
      { name: 'Lavaspalt West (Glutball)', to: [-11.75, -10.4], jump: 30, jumpAt: 3.6 },
      { name: 'Westgasse', to: [-11.75, -25] },
      { name: 'Nordgasse', to: [-6, -29.6] },
      { name: 'Zielmast', to: [10.6, -30.4], within: 0.3 },
    ],
    alt: [
      { name: 'Brücke A', to: [1.6, 1.4] },
      { to: [1.6, -9.6], run: false },
      { name: 'Marktinsel', to: [1.4, -18.6], run: false },
      { name: 'Brücke B', to: [1.2, -27], run: false },
      { name: 'Zielmast', to: [10.6, -30.4], within: 0.3 },
    ],
    targets: [
      { name: 'Stern 0: Stampfattacke auf die rissige Fliese, Stern in der Grube', star: 0, from: [-8, Y, 6.6],
        legs: [{ to: [-9.4, 4.6], within: 0.2, run: false }, { poundAt: [-11.2, 4.6] }, { expect: 'fliese' }, { wait: 20 }, { star: 0 },
          { to: [-11.2, 4.6], within: 0.3, run: false }, { to: [-11.2, 2.4], jump: 30, within: 0.4, run: false }, { expect: 'ausDerGrube' }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Stampfattacke (darüberlaufen und -springen)', star: 0, expectNot: true, from: [-8, Y, 6.6], heroes: ['lotti'],
        legs: [{ to: [-13, 4.6], run: false }, { to: [-9.4, 4.6], jump: 30, run: false }, { to: [-11.2, 4.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { expect: 'flieseHeil' }] },
      { name: 'Stern 1: zwei Spiegelfrüchte, drei Figuren auf dem 3er-Lift → Uhrturm', star: 1, from: [1.6, Y, -9.4],
        legs: [{ to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs2' }, { to: [1.4, -10.6], run: false }, { wait: 240 },
          { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs3' },
          { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150, lift: 'dreier' }, { gather: [-0.25, -1], steps: 360, lift: 'dreier' }, { liftTop: 'dreier' }, { expect: 'drei' }, { gather: [0, -1], steps: 90 }, { star: 1 }], shot: 'stern1', mech: { lift: 'dreier' } },
      { name: 'Stern 1 nicht mit zwei Figuren (3er-Lift bleibt unten)', star: 1, expectNot: true, from: [1.6, Y, -9.4], heroes: ['lotti'],
        legs: [{ to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs2' }, { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150 }, { gather: [-0.25, -1], steps: 420 }, { expect: 'dreierUnten' }] },
      { name: 'Stern 2: vier Figuren auf dem 4er-Lift → Felsterrasse', star: 2, from: [-1.2, Y, -28.4],
        legs: [{ to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 40 },
          { to: [-2.4, -28.4], run: false }, { wait: 240 }, { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'figs4' },
          { to: [-7.4, -30.0], run: false, within: 0.3 }, { gather: [0.05, -1], steps: 150 }, { gather: [-1, -0.25], steps: 420, lift: 'vierer' }, { liftTop: 'vierer' }, { expect: 'vier' }, { gather: [0, -1], steps: 90 }, { star: 2 }], shot: 'stern2', mech: { lift: 'vierer' } },
      { name: 'Stern 2 mit dem Krallen-Anzug (Kletterwand neben dem 4er-Lift)', star: 2, from: [-3.4, Y, -28.4],
        legs: [{ to: [-5.2, -29.4], within: 0.12, run: false, slow: 0.5 }, { wait: 20 }, { hop: 20 }, { wait: 60 }, { to: [-5.2, -26.6], within: 0.3, run: false },
          { to: [-5.2, -28.1], within: 0.2, run: false }, { climbOnto: [-5.2, -29.4, 3.0] }, { wait: 10 }, { expect: 'krallen' },
          { to: [-11.8, -30.2], within: 0.4, run: false }, { to: [-12.6, -33.2], within: 0.3, run: false }, { push: 220, jump: 12, dir: [0, -1] }, { to: [-9, -35.8], within: 0.4, run: false }, { star: 2 }], shot: 'kletterwand' },
      { name: 'Stempel: Greta drückt den Figurenschalter, Kristallstufen zum Dach', stamp: true, from: [11.6, Y, -1.4], heroes: ['greta'],
        legs: [{ to: [11.6, -4.8], within: 0.15, run: false, slow: 0.5 }, { wait: 60 }, { expect: 'stufen' }, { to: [12.4, -5.2], within: 0.3, run: false },
          { to: [12.4, -7.2], jump: 30, within: 0.4, run: false }, { to: [12.4, -9.4], jump: 30, within: 0.4, run: false }, { to: [12.4, -11.6], jump: 30, within: 0.4, run: false },
          { to: [15.0, -11.2], jump: 30, within: 0.4, run: false }, { hop: 20 }, { wait: 20 }], shot: 'stempel' },
      { name: 'Stempel: Lotti drückt den Greta-Schalter nicht', stamp: true, expectNot: true, from: [11.6, Y, -1.4], heroes: ['lotti'],
        legs: [{ to: [11.6, -4.8], within: 0.15, run: false, slow: 0.5 }, { wait: 90 }, { expect: 'keineStufen' }] },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über dem Blauglut-Brunnen', from: [1, Y, -14], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [1.6, -15.6], jump: 24, within: 0.3, run: false }, { to: [3.2, -15.6], jump: 30, within: 0.25, run: false }, { hop: 40 }, { wait: 30 }, { chaseKind: 'powerup', filter: 'oneup', max: 900 }] },
      { name: 'Abkürzung über die Marktinsel (Brücken A und B) bis zum Ziel', routeAlt: true, heroes: ['lotti', 'greta'] },
      { name: 'Alles in einem Lauf (3 Sterne + Stempel + Ziel) unter 100 s, Heldin über das Pause-Menü auf Greta', allInOne: true, heroes: ['lotti'] },
    ],
    // alles in einem Lauf (Lotti, Heldin wechselt für den Stempel über das Pause-Menü zu Greta)
    allInOne: [
      // Heldin zuerst auf Greta (Pause-Menü „Figur“), damit der Figurenschalter drückt
      { hero: 'greta' },
      { to: [-9.4, 4.6], within: 0.2, run: false }, { poundAt: [-11.2, 4.6] }, { star: 0 }, { to: [-11.2, 4.6], within: 0.3, run: false }, { to: [-11.2, 2.4], jump: 30, within: 0.4, run: false },
      { to: [11.6, 3.0] }, { to: [11.6, -4.8], within: 0.15, run: false, slow: 0.6 }, { wait: 40 }, { expect: 'stufen' }, { to: [12.4, -5.2], within: 0.3, run: false },
      { to: [12.4, -7.2], jump: 30, within: 0.4, run: false }, { to: [12.4, -9.4], jump: 30, within: 0.4, run: false }, { to: [12.4, -11.6], jump: 30, within: 0.4, run: false },
      { to: [15.0, -11.2], jump: 30, within: 0.4, run: false }, { hop: 20 }, { to: [11.6, -8], run: false, within: 0.5 }, { to: [11.6, 0.4], within: 0.5 },
      { to: [1.6, 1.6] }, { to: [1.6, -9.4], run: false }, { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [1.4, -10.6], run: false }, { wait: 230 },
      { to: [3.0, -10.6], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { expect: 'figs3' },
      { to: [-2.4, -11.4], run: false, within: 0.3 }, { gather: [-1, 0.1], steps: 150, lift: 'dreier' }, { gather: [-0.25, -1], steps: 360, lift: 'dreier' }, { liftTop: 'dreier' },
      { gather: [0, -1], steps: 90 }, { star: 1 }, { to: [0.2, -15.6], run: false, within: 0.4 }, { to: [1.2, -18.8], run: false, within: 0.4 }, { to: [1.2, -27.4], run: false, within: 0.5 },
      { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-2.4, -28.4], run: false }, { wait: 200 },
      { to: [-6.2, -27.8], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { to: [-4.0, -30.4], within: 0.15, run: false, slow: 0.6 }, { wait: 30 }, { expect: 'figs4' },
      { to: [-7.4, -30.0], run: false, within: 0.3 }, { gather: [0.05, -1], steps: 150, lift: 'vierer' }, { gather: [-1, -0.25], steps: 420, lift: 'vierer' }, { liftTop: 'vierer' },
      { gather: [0, -1], steps: 90 }, { star: 2 }, { gather: [0, 1], steps: 240 }, { wait: 40 }, { to: [10.6, -30.4], within: 0.3 },
    ],
    sweepPts: [[-8, Y, 6.6], [-11.75, Y, -2], [-11.75, Y, -14], [-11.75, Y, -24], [-6, Y, -30], [4, Y, -30], [10, Y, -30], [1.6, Y, -2], [1.6, Y, -11],
      [1.2, Y, -18.6], [11.6, Y, -4], [11.6, Y, -14], [11.6, Y, -24], [-2.6, 6.5, -15.6], [-9, 8.4, -35.6], [15, 6.5, -11]],
    shots: [
      ['start', [-8, Y, 6.6]],
      ['fliese', [-10, Y, 7.4], 0, null, Math.PI * 0.9],
      ['westgasse', [-11.75, Y, -3]],
      ['lavaspalt', [-11.75, Y, -4.6], 140],
      ['bruecke_a', [1.6, Y, 2.2]],
      ['marktinsel', [1.6, Y, -9]],
      ['brunnen', [1.4, Y, -12.4]],
      ['uhrturm', [-2.6, 6.5, -15]],
      ['ostgasse', [11.6, Y, -2]],
      ['schalter', [11.6, Y, -4]],
      ['nordgasse', [-2, Y, -27.6]],
      ['vierer', [-6, Y, -29]],
      ['terrasse', [-9, 8.4, -35.4]],
      ['ziel', [7, Y, -28]],
    ],
  };
}

// =====================================================================================================================
// Ablauf
// =====================================================================================================================
const PORT = 4480;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((o) => t.name.includes(o))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,targets,extra,sweep,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2) : String(v));

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const figs = () => L.players.filter((f) => !f.dead && !f.removedFigure);
  const wrapHurt = () => {
    for (const p of L.players) {
      if (p.__hurtWrapped) continue;
      p.__hurtWrapped = true;
      p.hurtTries = 0;
      const orig = p.hurt.bind(p);
      p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
    }
  };
  wrapHurt();
  const named = (id) => L.named.get(id);
  const COND = {
    krallen: () => P().power === 'krallen',
    stern: () => P().power === 'stern',
    figs2: () => figs().length >= 2,
    figs3: () => figs().length >= 3,
    figs4: () => figs().length >= 4,
    fliese: () => !!named('fliese')?.broken,
    flieseHeil: () => !named('fliese')?.broken,
    ausDerGrube: () => P().pos.y > 0.9,
    drei: () => (named('dreier')?.trips ?? 0) > 0,
    dreierUnten: () => (named('dreier')?.trips ?? 0) === 0 && (named('dreier')?.s ?? 0) < 0.01,
    vier: () => (named('vierer')?.trips ?? 0) > 0,
    stufen: () => !!named('stempelweg')?.want,
    keineStufen: () => !named('stempelweg')?.want,
  };
  const W = {
    place(pos, o = {}) {
      // Klone entfernen, Heldin setzen
      for (const f of L.players.slice()) if (f !== L.player) L.removeFigure?.(f, 'clear');
      const p = P();
      c.setInput(null);
      c.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      L.runtime.status = 'play';
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      c.step(o.settle ?? 20);
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
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
    drive(legs, o = {}) {
      const p0 = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, maxFigs: 1, liftTrips: {}, pounds: 0 };
      const track = [];
      const tick = (inp) => {
        const p = P();
        if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        wrapHurt();
        mech.maxFigs = Math.max(mech.maxFigs, figs().length);
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 6) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play') { if (hold) for (const f of L.players) f.invuln = Math.max(f.invuln, 5); c.setInput(Lg_?.rideInput ?? {}); c.step(1); steps++; }
          log.push(['fahrt', n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      let Lg_ = null;
      const goTo = (tx, tz, within = 0.25, max = 900) => {
        let i = 0;
        for (; i < max; i++) {
          const p = P();
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false });
        }
        return i < max;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        Lg_ = Lg;
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.hero) { c.setHero(Lg.hero); tick({}); log.push(['Heldin', Lg.hero]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.push) {
          const holdJ = Lg.jump ?? 0;
          for (let k = 0; k < Lg.push; k++) tick({ ...this.stick(Lg.dir[0], Lg.dir[1]), run: false, jump: k < holdJ });
          log.push([Lg.name ?? `drücken${li}`, Lg.push, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
          continue;
        }
        if (Lg.gather) {
          // alle Figuren in eine Richtung drücken (Ecke am Lift); optional aufhören, sobald der Lift fährt
          for (let k = 0; k < Lg.steps; k++) {
            if (Lg.lift && named(Lg.lift)?.state === 'up') break;
            tick({ ...this.stick(Lg.gather[0], Lg.gather[1], Lg.mag ?? 0.7), run: false });
          }
          log.push(['sammeln', figs().length, JSON.stringify(c.squad?.log?.slice(-3) ?? []), figs().map((f) => `${f.pos.x.toFixed(1)},${f.pos.y.toFixed(1)},${f.pos.z.toFixed(1)}`).join(' ')]);
          continue;
        }
        if (Lg.liftTop) {
          const lift = named(Lg.liftTop);
          let k = 0;
          for (; k < (Lg.max ?? 900) && lift.state !== 'top'; k++) tick({});
          log.push(['Lift', Lg.liftTop, lift.state, lift.count, k, +lift.s.toFixed(2)]);
          mech.liftTrips[Lg.liftTop] = lift.trips;
          if (lift.state !== 'top') log.push(['FEHLER: Lift nicht oben', Lg.liftTop]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) {
          const filter = Lg.filter ? (e) => e.spec?.power === Lg.filter || e.power === Lg.filter || e.name === Lg.filter : null;
          const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter });
          log.push(['jagd', Lg.chaseKind, n, +P().pos.x.toFixed(1), +P().pos.y.toFixed(1), +P().pos.z.toFixed(1), P().power]);
          continue;
        }
        if (Lg.until && !Lg.to) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        if (Lg.climbOnto) {
          // senkrecht hochspringen, erst über der Oberkante (y) zum Ziel lenken – z. B. auf einen ?-Block
          const [cx, cz, top] = Lg.climbOnto;
          let k = 0, left = false;
          for (; k < 300; k++) {
            const q = P();
            const above = q.pos.y > top + 0.15;
            tick({ ...(q.mode === 'air' && above ? this.airSteer(cx, cz, 0, 0, 3.5, 6) : {}), jump: k < 40, run: false });
            if (P().mode === 'air') left = true;
            if (left && P().mode === 'ground') break;
          }
          log.push(['hinauf', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode]);
          continue;
        }
        if (Lg.poundAt) {
          const [tx2, tz2] = Lg.poundAt;
          let k = 0, pounding = false;
          for (; k < 300; k++) {
            const q = P();
            const dx = tx2 - q.pos.x, dz = tz2 - q.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && q.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.3 && q.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(q.mode === 'air' ? this.airSteer(tx2, tz2, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 26, run: false });
          }
          mech.pounds++;
          log.push(['stampfen auf', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state, pounding]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? P().pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = L.players.reduce((a, f) => a + (f.hurtTries ?? 0), 0);
      const p = P();
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track, figs: figs().length };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        for (const f of L.players) f.invuln = Math.max(f.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const n = L.named.get(id); return n?.info?.() ?? (n ? JSON.parse(JSON.stringify(n, (k, v) => (typeof v === 'object' && v && (v.isVector3 || k === 'shape' || k === 'badge') ? undefined : v))) : null); },
    figs: () => figs().length,
  };
  window.__w5 = W;
  return Object.keys(W);
}

const allErrors = [];
let loaded = null;
async function load(id, fresh = false) {
  allErrors.push(...errors);
  errors.length = 0;
  if (loaded === id && !fresh) {
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

const W = (name, ...args) => sc(([n, a]) => window.__w5[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 500) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w5b_${name}.png` });
  return s;
}

/** Ergebnis eines Bot-Laufs ausgeben (bei Fehler oder VERBOSE das ganze Protokoll). */
function report(res, ok) {
  if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
}

async function parcours(id) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id, true))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, world: d.world }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  if (PARTS.has('load')) {
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const m = R.meta;
    check(`${id}: Welt 5, ${m.archetype}, ${m.stars} Sterne${m.stamp ? ' + Stempel' : ''}, ${m.time} s, Thema ${m.theme}, Musik ${m.music}`,
      meta.world === 5 && meta.archetype === m.archetype && meta.stars === m.stars && (kinds.stamp ?? 0) === (m.stamp ? 1 : 0) && meta.timeLimit === m.time && meta.theme === m.theme && meta.music === m.music);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    const s = await sc(() => { const c = window.__course; c.step(240); return c.state(); });
    check(`${id}: 2 s ohne Fehler`, errors.length === 0 && !s.player.dead);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Trefferversuche ${res.mech.hurts}`);
    report(res, reached);
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.timeMax} s (${res.time.toFixed(1)} s)`, reached && res.time < R.timeMax);
    if (hero === HEROES[0]) sweepTrack = res.track;
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech?.lift && !(res.mech.liftTrips[t.mech.lift] > 0)) ok = false;
      report(res, ok);
      check(`${id}: ${t.name} (${hero}, Figuren max ${res.mech.maxFigs}${t.mech?.lift ? `, Liftfahrten ${res.mech.liftTrips[t.mech.lift] ?? 0}` : ''})`, !!ok);
      if (t.shot && hero === 'lotti' || (t.shot && !t.heroes?.includes('lotti') && hero === t.heroes?.[0])) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Extras
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      if (t.routeAlt) {
        await W('place', R.start, { hero, settle: 2 });
        const res = await W('drive', R.alt, {});
        const reached = res.status === 'goal' || res.status === 'done';
        report(res, reached);
        check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s)`, reached);
        continue;
      }
      if (t.allInOne) {
        await W('place', R.start, { hero, settle: 2 });
        const legs = R.allInOne ?? [];
        const res = await W('drive', legs, { invuln: true });
        const rt = res.rt;
        const reached = res.status === 'goal' || res.status === 'done';
        const ok = reached && rt.stars.every(Boolean) && rt.stamp && res.time < (await sc(() => window.__course.level.data.timeLimit));
        report(res, ok);
        check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s, Sterne ${rt.stars.map((s) => (s ? 1 : 0)).join('')}, Stempel ${rt.stamp})`, ok);
        continue;
      }
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      report(res, ok);
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0})`, ok);
    }
  }

  // ------------------------------------------------ Kennzahlen entlang der Route und an festen Punkten
  if (PARTS.has('sweep') && !ONLY) {
    await load(id);
    const pts = [...(sweepTrack ?? []), ...(R.sweepPts ?? [])];
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    for (const pt of pts) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      if (process.env.VERBOSE) console.log(`      ${pt.map((v) => v.toFixed(1)).join(', ').padEnd(26)} ${st.calls} Aufrufe ${Math.round(st.triangles / 1000)} k`);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    check(`${id}: Messgang über ${pts.length} Punkte – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) return;
  await load(id, true);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
}

for (const id of LEVELS) {
  if (ROUTES[id]) await parcours(id);
  else console.log(`Unbekanntes Level ${id}`);
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(30)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Bilder: Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Bilder: Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
