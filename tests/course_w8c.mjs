// Welt 8, Level 8-Haus „Haus Krallenkraxel“ (Prüfungs-Haus: zehn Kletterräume à 10 s, alles mit dem Krallen-Anzug),
// 8-6 „Finsterfahrt im Spiegelspukhaus“ (stockdunkles Spukhaus mit Licht-Helm-Pflicht, runde Aufzugplattformen, Spuke,
// Kreisgeister, POW-Block, Großspuk, großer Spiegel, Türreihe mit Großspuk-Jagd, Figurenschalter) und 8-7 „Kullerklotz-Ritt
// durchs Glutinferno“ (Kristall-Felsklötze über Lava, Würfel mit zwei Abstürzen, Festland mit Hammer-Werfern, Lavahang,
// lange Kurvenroute):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120
// inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w8c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w8c.mjs [8-Haus|8-6|8-7]
//   PARTS=load,route,sweep,targets,extra,shots,haus,haus-extra (Standard alle; je Lauf ≤ 10 min – 8-6 und 8-7 am besten in zwei
//   Läufen: PARTS=load,route,sweep und PARTS=targets,extra,shots) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/Extras mit
//   diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1 (Zeichenaufrufe je
//   Objekt bei den Bildern) · RAUM=n (8-Haus: nur dieser Raum) · TRACE=1 (Spur der Figur im Protokoll)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Gegenproben
// und das Prüfungs-Haus laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } (Sprung auf der Stelle) · { star: i } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung } ·
// { stompAll: Id-Anfang } · { pound: [x, z], above } · { klotz: Id, pound: n (Stampfattacken unterwegs), leave: { z } (vorher
// abspringen), jumpAt: { z } (auf der Fahrt hochspringen), exit: [x, z] } · { warp: [x, z] } · { ride: mover-Id, board, exit, to } ·
// { light: Id-Anfang } (Licht-Helm auf Geister richten, bis sie verschwinden)
const ROUTES = {
  '8-7': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'inferno', music: 'course_inferno', archetype: 'parcours' },
    enemies: { feuer_werfer: 3, lavablase: 10, knochenflieger: 2 },
    main: [
      { name: 'Wachstumsbeere aus dem ?-Block', to: [2.4, 1.2], within: 0.2, run: false }, { hop: 20 }, { chaseKind: 'powerup', max: 600 },
      { name: 'zum ersten Felsklotz', to: [0, -6.4], within: 0.4, run: false },
      { name: 'Felsklotz 1 (Schlangenlinie, zweimal Stampfen)', klotz: 'klotz1', pound: 2, exit: [0, -61] },
      { expect: 'plateau1' },
      { name: 'Würfel-Felsklotz (zwei Abstürze)', to: [0, -65], within: 0.4, run: false },
      { klotz: 'wuerfel', exit: [0, -131] },
      { expect: 'festland' },
      { name: 'Kontrollpunkt', to: [0, -134], within: 0.6 },
      { name: 'Hammer-Werfer 1', stompAll: 'hammer1' },
      { to: [-2, -160], within: 0.6 },
      { name: 'Hammer-Werfer 3', stompAll: 'hammer3' },
      { name: 'zum Lavahang', to: [0, -179.6], within: 0.4, run: false },
      { name: 'Felsklotz 3 (Lavahang hinab)', klotz: 'klotz3', exit: [0, -246] },
      { expect: 'plateau3' },
      { to: [0, -258], within: 0.5 },
      { name: 'Felsklotz 4 (lange Kurvenroute)', to: [0, -260.6], within: 0.4, run: false },
      { klotz: 'klotz4', pound: 2, exit: [0, -350] },
      { expect: 'zielinsel' },
      { name: 'Zielmast', to: [0, -356], within: 0.2 },
    ],
    routeChecks: [
      { name: 'vier Felsklotz-Fahrten, der Würfel stürzt zweimal 3 m ab, Stampfen gibt Schub', ok: (r) => r.mech.klotz === 4 && r.mech.falls === 2 && r.mech.boosts >= 2 },
    ],
    targets: [
      { name: 'Stern 0: vom Würfel auf die Kristall-Insel springen, der Stern-Klotz bringt zurück zum Festland', star: 0, from: [0, 0, -63],
        legs: [{ to: [0, -65], within: 0.4, run: false }, { klotz: 'wuerfel', hold: [-1.1, 0], leave: { z: -94.3 } }, { to: [5.5, -95], jump: 40, jumpAt: 4.0, within: 0.5, run: true }, { star: 0 },
          { klotz: 'sternklotz', exit: [8.4, -131] }, { expect: 'festland' }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne den Sprung (auf dem Würfel bleiben)', star: 0, expectNot: true, from: [0, 0, -63], heroes: ['lotti'],
        legs: [{ to: [0, -65], within: 0.4, run: false }, { klotz: 'wuerfel', exit: [0, -131] }] },
      { name: 'Stern 1: Sternenring – acht Sternmünzen auf den Kristallsäulen', star: 1, from: [0, -14, -244],
        legs: [{ to: [-1.6, -246.2], within: 0.3, run: false }, { to: [-6.6, -246.2], within: 0.4 },
          ...[[-9.2, -246], [-11.6, -246.8], [-13.8, -248.4], [-15.2, -250.8], [-15.2, -253.6], [-13.8, -256], [-11.6, -257.6], [-9.2, -258.4]].map(([x, z]) => ({ to: [x, z], jump: 26, within: 0.45, run: false })),
          { to: [-5.4, -257], jump: 30, within: 0.5, run: false }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne den Ring (Säulen ablaufen ohne Durchlaufen)', star: 1, expectNot: true, from: [-6.4, -14, -246.2], heroes: ['lotti'],
        legs: [...[[-9.2, -246], [-11.6, -246.8], [-13.8, -248.4]].map(([x, z]) => ({ to: [x, z], jump: 26, within: 0.45, run: false })), { wait: 60 }] },
      { name: 'Stern 2: auf der Kurvenfahrt unter dem Kristallbogen hochspringen', star: 2, from: [0, -14, -258],
        legs: [{ to: [0, -260.6], within: 0.4, run: false }, { klotz: 'klotz4', jumpAt: { z: -299.4 }, exit: [0, -350] }], shot: 'stern2' },
      { name: 'Stern 2 nicht ohne Sprung (unter dem Bogen sitzen bleiben)', star: 2, expectNot: true, from: [0, -14, -258], heroes: ['lotti'],
        legs: [{ to: [0, -260.6], within: 0.4, run: false }, { klotz: 'klotz4', exit: [0, -350] }] },
      { name: 'Stempel: über den Absatz auf die Basaltsäule, Hammer-Werfer besiegen, zum Stempel hochspringen', stamp: true, from: [0, -6, -148],
        legs: [{ to: [1.4, -151.4], within: 0.4, run: false }, { to: [1.5, -154], jump: 30, within: 0.4, run: false }, { stompAll: 'hammer2' },
          { to: [4.5, -154], jump: 30, within: 0.3, run: false }, { hop: 40 }], shot: 'stempel' },
      { name: 'Stempel nicht vom Boden neben der Säule', stamp: true, expectNot: true, from: [4.5, -6, -156.4], heroes: ['lotti'],
        legs: [{ hop: 40 }, { to: [6.6, -154], within: 0.3, run: false }, { hop: 40 }] },
    ],
    extra: [
      { name: 'Felsklotz ruht in der Lava, solange niemand draufsteht', from: [0, 0, -5], heroes: ['lotti'],
        legs: [{ wait: 600 }], mech: (r) => r.mech.k1 === 'ruhe', mechText: (r) => `Zustand ${r.mech.k1}` },
      { name: 'Extraleben: unsichtbarer Block neben dem Rastplatz', from: [-4.4, 0, 1.2], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-4.4, -0.8], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block am Festland-Ende', from: [8.6, -6, -170], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [8.6, -172.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['klotz1', [0, 0.2, -9.2]],
      ['fahrt1', [0, 0.2, -9.2], 1200, null, Math.PI / 2, 'klotz1'],
      ['plateau1', [0, 0, -62]],
      ['wuerfel', [0, 0.2, -67.7], 1700, null, Math.PI / 2, 'wuerfel'],
      ['festland', [0, -6, -136]],
      ['saeule', [1.2, -6, -150]],
      ['hang', [0, -5.8, -183.2], 1200, null, Math.PI / 2, 'klotz3'],
      ['plateau3', [0, -14, -248]],
      ['kurve', [0, -13.8, -263.3], 2400, null, Math.PI / 2, 'klotz4'],
      ['ziel', [0, -14, -350]],
    ],
  },
};

const PORT = 4870;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const ALL = ['8-Haus', '8-6', '8-7'];
const LEVELS = only ? [only] : ALL;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots,haus,haus-extra').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;
const VERBOSE = !!process.env.VERBOSE;
const SAVE = 'lotti-greta-course-v1';

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    // 8-7
    plateau1: () => at(-7, 7, -0.5, -57.5, -67),
    festland: () => at(-11, 13, -6.5, -127.5, -183),
    plateau3: () => at(-8, 8, -14.5, -241.5, -263),
    zielinsel: () => at(-9, 9, -14.5, -345.5, -363),
  };
  const W = {
    COND,
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      if (p.helmet) { p.helmet = null; p.helmetFx = null; }
      p.holding = null;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      p.updateHalf?.();
      if (o.power) p.setPower(o.power);
      if (o.helmet) L.spawn(`helm_${o.helmet}`, { pos: [pos[0], pos[1], pos[2]] });
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
    /** Lenkung in der Luft: Wunschgeschwindigkeit zum Ziel (tx, tz) plus Mitbewegung (vx, vz). */
    airSteer(tx, tz, vx = 0, vz = 0, k = 3.2, vmax = 7) {
      const p = P();
      let wx = (tx - p.pos.x) * k + vx, wz = (tz - p.pos.z) * k + vz;
      const wl = Math.hypot(wx, wz); if (wl > vmax) { wx *= vmax / wl; wz *= vmax / wl; }
      const ex = wx - p.vel.x, ez = wz - p.vel.z, el = Math.hypot(ex, ez);
      return el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.2)) : { x: 0, y: 0 };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { hurts: 0, klotz: 0, falls: 0, boosts: 0, warps: 0, rides: 0, stomped: [], hurtList: [] };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if ((p.mode === 'ground' || p.mode === 'wall') && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      const walk = (tx, tz, within = 0.4, max = 600, o2 = {}) => {
        let k = 0;
        for (; k < max && !p.dead; k++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2)))), run: o2.run ?? false, jump: o2.jump ?? false });
        }
        return k;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Kristall-Felsklotz: aufsteigen, mitfahren (Mitte halten), stampfen, absteigen
        if (Lg.klotz) {
          const k = L.named.get(Lg.klotz);
          const mb = k.mb;
          const topY = () => mb.pos.y + mb.size.y;
          let n = 0;
          for (; n < 600 && !p.dead; n++) {
            const dx = mb.pos.x - p.pos.x, dz = mb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (k.carries(p) && d < 0.35 && p.mode === 'ground') break;
            const up = topY() > p.pos.y + 0.35 && p.mode === 'ground' && d < 2.6;
            tick({ ...(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.3, d)))), run: false, jump: up });
          }
          const b0 = k.boosts ?? 0, f0 = k.falls ?? 0;
          let pounds = 0, lastPound = 0, jumped = false;
          const [hx, hz] = Lg.hold ?? [0, 0];
          for (n = 0; n < 120 * 90 && !p.dead && L.runtime.status === 'play'; n++) {
            if (k.state === 'ende' || k.state === 'sinkt' || k.state === 'weg') break;
            if (Lg.leave && mb.pos.z <= Lg.leave.z) break;
            const dx = mb.pos.x + hx - p.pos.x, dz = mb.pos.z + hz - p.pos.z, d = Math.hypot(dx, dz);
            if (Lg.jumpAt && !jumped && mb.pos.z <= Lg.jumpAt.z && p.mode === 'ground') {
              jumped = true;
              for (let q = 0; q < 240 && !p.dead; q++) { tick({ ...this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6), jump: q < (Lg.jumpAt.hold ?? 40) }); if (q > 4 && p.mode === 'ground') break; }
              log.push(['hochsprung', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
              continue;
            }
            if (Lg.pound && pounds < Lg.pound && k.state === 'faehrt' && steps - lastPound > 300 && p.mode === 'ground' && d < 0.5) {
              pounds++; lastPound = steps;
              for (let q = 0; q < 14; q++) tick({ ...this.stick(dx, dz, Math.min(1, d)), jump: true });
              tick({ crouch: true }); tick({ crouch: true });
              for (let q = 0; q < 240 && p.mode !== 'ground' && !p.dead; q++) tick({});
              continue;
            }
            tick(p.mode === 'air' ? this.airSteer(mb.pos.x, mb.pos.z, mb.mover.vx, mb.mover.vz, 4, 6) : (d > 0.08 ? this.stick(dx, dz, Math.min(1, d * 1.5)) : {}));
          }
          mech.klotz++;
          mech.falls += (k.falls ?? 0) - f0;
          mech.boosts += (k.boosts ?? 0) - b0;
          log.push(['felsklotz', Lg.klotz, k.state, n, (k.falls ?? 0) - f0, (k.boosts ?? 0) - b0, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (Lg.exit) {
            const [ex, ez] = Lg.exit;
            const j = walk(ex, ez, 0.5, 900, { run: false });
            if (j >= 900) log.push(['FEHLER: Ausstieg nicht erreicht', Lg.exit]);
          }
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          const pre = Lg.stompAll;
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(pre));
            if (!list.length) break;
            list.sort((a, b) => Math.hypot(a.pos.x - p.pos.x, a.pos.z - p.pos.z) - Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z));
            const e = list[0];
            let k = 0;
            for (; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              if (p.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (p.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: p.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && k > 4 && (pounded || p.state === 'groundpound')) break;
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5 && p.pos.y > (Lg.above ?? -99)) { pounded = true; }
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box / Rätselbox springen und hindurch
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.lives = L.runtime.save?.lives;
      mech.k1 = L.named.get('klotz1')?.state ?? null;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
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
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = ent(id); return e?.info?.() ?? null; },
    cond: (k) => COND[k](),
  };
  window.__w8 = W;
  return Object.keys(W);
}

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
    await go(`http://localhost:${port}/?course=${encodeURIComponent(id)}&scale=2&adapt=0`);
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
  await sc((h) => { const c = window.__course; c.level.runtime.save.lives = 9; void h; }, o.hero ?? 'lotti');
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w8[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w8c_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w8.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ====================================================================== Parcours (8-6, 8-7)
async function parcours(id) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); return; }
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); return; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, world: d.world, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('      ', e);
    check(`${id}: Welt 8, ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.world === 8 && meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) {
      const have = typeof n === 'function' ? await sc(n) : (kinds[kind] ?? 0);
      const want = typeof n === 'function' ? R.enemyCounts[kind] : n;
      check(`${id}: ${want}× ${kind} (${have})`, have === want);
    }
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 300 s (${res.time.toFixed(1)} s)`, reached && res.time < 300);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt, { settle: 6 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    console.log(`  Messgang: ${per.length} Punkte, Aufrufe Ø ${(per.reduce((a, q) => a + q[1], 0) / per.length).toFixed(1)}, Dreiecke Ø ${Math.round(per.reduce((a, q) => a + q[2], 0) / per.length / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0] && PARTS.has('shots')) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || VERBOSE) for (const l of res.log) console.log('      ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0] && PARTS.has('shots')) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) return;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, rideKlotz = null] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw });
    if (steps) {
      await sc(([n, inp, kid]) => {
        const c = window.__course, L = c.level, p = c.player, W8 = window.__w8;
        p.invuln = 99;
        const k = kid ? L.named.get(kid) : null;
        for (let i = 0; i < n; i++) {
          if (k) { const dx = k.mb.pos.x - p.pos.x, dz = k.mb.pos.z - p.pos.z, d = Math.hypot(dx, dz); c.setInput(d > 0.08 ? W8.stick(dx, dz, Math.min(1, d * 1.5)) : {}); } else c.setInput(inp ?? {});
          c.step(1);
        }
        p.invuln = 0; c.setInput(null);
      }, [steps, input ?? {}, rideKlotz]);
    }
    await shot(`${id}_${name}`);
  }
}

for (const id of LEVELS) {
  if (id === '8-Haus') {
    if (globalThis.haus && (PARTS.has('haus') || PARTS.has('load'))) await globalThis.haus();
    if (globalThis.hausExtra && PARTS.has('haus-extra')) await globalThis.hausExtra();
    continue;
  }
  await parcours(id);
}

console.log('\n  Kennzahlen je Bild (Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
for (const [n, c, t] of stats) console.log(`    ${n.padEnd(28)} ${String(c).padStart(4)} Aufrufe  ${String(Math.round(t / 1000)).padStart(4)} k Dreiecke`);
const maxCalls = Math.max(0, ...stats.map((s) => s[1])), maxTris = Math.max(0, ...stats.map((s) => s[2]));
if (stats.length) {
  check(`Zeichenaufrufe < 120 (max ${maxCalls})`, maxCalls < 120);
  check(`Dreiecke < 300 k (max ${Math.round(maxTris / 1000)} k)`, maxTris < 300000);
}
await browser.close();
stop();
allErrors.push(...errors);
process.exit(summary(allErrors) ? 0 : 1);
