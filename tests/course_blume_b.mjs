// Welt Blume (Remix-Welt 2), Level B-5 „Hasenhatz im Morgenrot“ (Remix von 5-4), B-6 „Grauspuk in der Mondscheinvilla“
// (Remix von 3-3), B-7 „Kanonenhelm-Tauchgang im Leuchtturmriff“ (Remix von 3-5) und B-8 „Turbo-Piep über dem Neonsteg“
// (Remix von 4-3): Laden ohne Konsolenfehler/-warnungen, Gegenprobe „Basislevel unverändert“, Remix-Regeln wirksam (Licht,
// Filter, Klang-Variante, Gegnertausch, Zeit, Piep-Takt, entfernte/neue Objekte), Routen-Bot (Lotti und Greta von Start bis
// Ziel, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne und
// Geheimnisse mit der echten Mechanik samt Gegenproben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass,
// Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/blume_b_*.png).
// Aufruf (nach npm run build): node tests/course_blume_b.mjs [B-5|B-6|B-7|B-8]   (Port 5015 + PORT_BASE)
//   PARTS=load,rules,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur alle 8 Schritte)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller und Trefferversuche werden gezählt), damit Geometrie und Mechanik geprüft werden; Gegenproben
// laufen verwundbar. Die Zeit läuft auf der Route mit (Remix-Zeitlimits gelten wirklich). Piep-Blöcke (B-8): die Musik-Uhr
// läuft manuell (music.setManualClock(true), je Simulationsschritt advanceClock(1/120)) – der Takt folgt der Musik wie im Spiel.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf,
// airK/airMax (Luftlenkung), ride (Ende, sobald eine Fahrt – Kanone, Röhre, Warp-Box – vorbei ist), rideInput (Stick während
// der Fahrt: Abzweige) } · { wait } · { hop } · { crouch } (Röhre) · { star: i } · { chaseKind, ids } · { expect } · { until }
// (Name aus COND oder Ausdruck '=…') · { warp: [x, z] } · { board: Id, when } (auf eine fahrende Plattform springen) ·
// { stay: Id, until } (darauf mitfahren) · { waitBeat: [lo, hi], mod } (Piep-Takt) · { log: Ausdruck }
const S1 = 10, T2 = 10.5, T3 = 14.5, T4 = 19, Y3 = 9, LEDGE = 24, TOP = 39, ZF = 47;
const ROUTES = {
  'B-5': {
    base: '5-4',
    start: [0, S1, 30],
    meta: { stars: 3, time: 500, theme: 'savanna@morgen', music: 'course_savanna', variant: 'morgen', archetype: 'parcours' },
    enemies: { bunny: 10, 'seg:drehplattform': 0, sternring: 0, figurenschalter: 1, wuschel: 8, riesenameise: 1, 'seg:cloud': 4 },
    main: [
      { name: 'Morgenwiese', to: [0, 8] },
      { name: 'Röhrenkanone 1', to: [0, -2.6], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { name: 'Landeplatz → Rampe', to: [5, -51], run: false },
      { to: [5, -58.6], run: false },
      { to: [4, -59.6], within: 0.3, run: false },
      { name: 'Glasröhre B', to: [4, -63], ride: true, run: false },
      { to: [3, -78.4], within: 0.3, run: false },
      { name: 'Glasröhre C', to: [3, -82], ride: true, run: false },
      { name: 'Gipfel', to: [1, -98.7], within: 0.25, run: false },
      { until: 'brueckeZneu', max: 2400 },
      { name: 'Drehbrücke', to: [1, -110.8], within: 0.4 },
      { name: 'Röhrenkanone 2', to: [1, -114], jump: 30, jumpAt: 1.4, within: 0.3, run: false, ride: true, max: 1500 },
      { name: 'Dritter Berg', to: [2, -187] },
      { name: 'Glasröhre D (Hohe Wand)', to: [2, -192], ride: true, run: false },
      { name: 'Sims', to: [-5, -201.6], within: 0.4, run: false },
      { name: 'Glasröhre E', to: [-9, -201.6], ride: true, run: false },
      { name: 'Plateau', to: [0, -221.4], within: 0.25, run: false, autoJump: false },
      { name: 'bewegte Wolke 1', board: 'wolke_ab', when: '=plat(\'wolke_ab\').z > -224.6' },
      { stay: 'wolke_ab', until: '=plat(\'wolke_ab\').z < -229.4' },
      { name: 'Insel', to: [0, -235], within: 0.5, run: false },
      { to: [0, -241.2], within: 0.25, run: false, autoJump: false },
      { name: 'bewegte Wolke 2 (quer)', board: 'wolke_bc', when: '=Math.abs(plat(\'wolke_bc\').x) < 1.6', jumpAt: 8 },
      { to: [null, -245.8], within: 0.3, run: false },
      { name: 'Zielplateau', to: [null, -254.5], jump: 30, jumpAt: 7.4, within: 0.5 },
      { to: [-0.8, -270.6], within: 0.3, run: false },
      { name: 'Wolkenlift', board: 'wolkenlift', when: '=plat(\'wolkenlift\').y < 38.6' },
      { stay: 'wolkenlift', until: '=plat(\'wolkenlift\').y > 46.3', max: 1800 },
      { name: 'Zielfelsen', to: [6, -274], jump: 20, within: 0.5, run: false },
      { name: 'Zielmast', to: [8, -276], within: 0.2, run: false },
    ],
    routeChecks: [
      { name: 'Kanonen, vier Glasröhren, zwei bewegte Wolken und der Wolkenlift gefahren', ok: (r) => r.mech.rides >= 6 && r.mech.boards === 3 },
    ],
    targets: [
      { name: 'Stern 0: den Riesenhasen auf der Morgenwiese fangen (Items im Kreis, Stern an der Fangstelle)', star: 0, from: [0, S1, 30],
        legs: [{ chaseKind: 'bunny', ids: ['riesenhase'], max: 6000 }, { wait: 2 }, { log: 'L.entities.filter((e) => e.kind === \'powerup\' || e.kind === \'coin\' && Math.hypot(e.pos.x - P().pos.x, e.pos.z - P().pos.z) < 4).map((e) => [e.kind, e.power, !!e.removed, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1)])' },
          { expect: '=(L.signals?.riesenhase ?? 0) === 1 && L.entities.filter((e) => e.kind === \'powerup\' && !e.removed).length >= 2 && L.entities.filter((e) => e.kind === \'coin\' && Math.hypot(e.pos.x - P().pos.x, e.pos.z - P().pos.z) < 4).length >= 4' }, { star: 0 }], shot: 'stern0',
        mech: (r) => r.giant?.caught, mechText: (r) => `Haken ${r.giant?.hooks}, Pausen ${r.giant?.rests}` },
      { name: 'Stern 0 nicht ohne Fangen (Stern bleibt versteckt)', star: 0, expectNot: true, from: [0, S1, 30], heroes: ['lotti'],
        legs: [{ to: [0, 12], run: false }, { wait: 240 }] },
      { name: 'Stern 1: vom Gipfel auf die Wolkenplattform, Glasröhre daneben zum Felsturm', star: 1, from: [4, T4, -94],
        legs: [{ to: [7.4, -94], within: 0.3, run: false }, { to: [11.2, -94], jump: 24, within: 0.4, run: false }, { expect: '=P().pos.y > 19.8' },
          { name: 'Glasröhre zum Felsturm', to: [14, -94], ride: true, run: false }, { to: [31.5, -95], within: 0.4, run: false }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Glasröhre (Weitsprung von der Wolke zu kurz)', star: 1, expectNot: true, from: [11.6, T4 + 1, -94], heroes: ['lotti'],
        legs: [{ to: [10.2, -94], within: 0.3, run: false }, { long: [30, -95] }, { wait: 60 }] },
      { name: 'Stern 1: Rückweg vom Felsturm durch die Glasröhre zur Wolke', from: [31.5, 21, -95], heroes: ['lotti'], extraLike: true,
        legs: [{ to: [29.4, -95], ride: true, run: false }, { wait: 30 }, { expect: '=P().pos.x < 15 && P().pos.y > 19.5' }] },
      { name: 'Stern 2: Greta drückt den Figurenschalter, Wolkenstufen zum Stern', star: 2, from: [-9, TOP, -255], heroes: ['greta'],
        legs: [{ to: [-11.5, -257.6], within: 0.2, run: false, slow: 0.5 }, { wait: 90 }, { expect: '=ent(\'wolkenstufen\')?.shown || true' },
          { to: [-11.5, -260.6], within: 0.3, run: false }, { to: [-11.5, -262.6], jump: 24, within: 0.4, run: false },
          { to: [-11, -266.6], jump: 24, within: 0.4, run: false }, { to: [-8, -270], jump: 24, within: 0.4, run: false }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2: Lotti drückt den Greta-Schalter nicht (keine Wolkenstufen, Stern zu hoch)', star: 2, expectNot: true, from: [-9, TOP, -255], heroes: ['lotti'],
        legs: [{ to: [-11.5, -257.6], within: 0.2, run: false, slow: 0.5 }, { wait: 90 }, { to: [-8, -270], within: 0.3, run: false }, { hop: 40 }, { wait: 30 }] },
    ],
    extra: [
      { name: 'Kleiner Hase auf der Morgenwiese gibt ein Item (Gleitblatt)', from: [-6, S1, 24], heroes: ['lotti'],
        legs: [{ chaseKind: 'bunny', ids: ['hase_m1'], max: 3600 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }], mech: (r) => r.power === 'gleitblatt', mechText: (r) => `Power ${r.power}` },
      { name: 'Grün leuchtender Hase auf dem dritten Berg gibt einen Funkelstern', from: [6, Y3, -150], heroes: ['lotti'],
        legs: [{ chaseKind: 'bunny', ids: ['sternhase'], max: 3600 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }], mech: (r) => r.power === 'stern', mechText: (r) => `Power ${r.power}` },
      { name: 'Wolkenlift: ohne Lift ist der Zielfelsen zu hoch (Sprung vom Zielplateau)', from: [3, TOP, -270], heroes: ['lotti'],
        legs: [{ to: [4.6, -273], jump: 40, within: 0.3, max: 300, land: false, run: false }, { wait: 60 }], allowFail: true, mech: (r) => r.pos[1] < TOP + 0.5, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
    ],
    shots: [
      ['start', [0, S1, 30]],
      ['wiese', [0, S1, 14]],
      ['kanone', [0, S1, 1.6]],
      ['landeplatz', [0, 7, -45]],
      ['gipfel', [6, T4, -94]],
      ['wolke', [11.6, T4 + 1, -94]],
      ['turm', [31, 21, -95]],
      ['checkpoint', [0, Y3, -148]],
      ['hasen', [12, Y3, -160]],
      ['sims', [-1, LEDGE, -200.6]],
      ['plateau', [0, TOP, -219]],
      ['insel', [0, TOP, -238]],
      ['zielplateau', [-4, TOP, -258]],
      ['ziel', [7, ZF, -274]],
    ],
  },
};

const PORT = 5015;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((k) => t.name.includes(k))) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,rules,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

// Musik-Aufrufe mitschneiden (music.play(name, opts)): window.__audio wird in main.js gesetzt → Setter umhüllt play
await page.addInitScript(() => {
  let a;
  Object.defineProperty(window, '__audio', {
    configurable: true,
    get() { return a; },
    set(v) {
      a = v;
      const m = v?.music;
      if (m && !m.__spy) { const orig = m.play.bind(m); m.__calls = []; m.play = (n, o) => { m.__calls.push([n, o ?? null]); return orig(n, o); }; m.__spy = true; }
    },
  });
});

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const M = () => window.__audio?.music;
  const TAU = Math.PI * 2;
  const step1 = () => { if (M()?.manualClock) M().advanceClock(1 / 120); c.step(1); };
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.type ?? src?.constructor?.name ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id) ?? L.entities.find((e) => e.spec?.id === id && !e.removed) ?? null;
  /** Lage einer (fahrenden) Plattform: Mitte der Unterseite { x, y, z } (Wolke: pm.pos, MovingBox: mb.pos, Floß, Entität). */
  const plat = (id) => { const h = ent(id); return h?.pm?.pos ?? h?.mb?.pos ?? h?.pos ?? null; };
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    krallen: () => P().power === 'krallen',
    funken: () => P().power === 'funken',
    sichel: () => P().power === 'sichel',
    gleitblatt: () => P().power === 'gleitblatt',
    // B-5: Drehbrücke steht gerade (nach einer Drehung) quer zum Gipfel
    brueckeZneu: (() => { let was = null; return () => { const b = L.named.get('drehbruecke'); const z = Math.abs(Math.sin(b.angle)) > 0.985; const ok = was === true && !b.turning && z; was = b.turning; return ok; }; })(),
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at, plat, beat). */
  const beat = () => L.beepClock?.beat ?? 0;
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', 'plat', 'beat', `return (${k.slice(1)});`)(P, L, ent, at, plat, beat) : COND[k]());
  const W = {
    place(pos, o = {}) {
      const p = P();
      if (typeof pos === 'string') pos = L.data.marks[pos];
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      if (p.helmet) { p.helmet = null; p.helmetFx = null; }
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (o.helmet) p.wearHelmet(o.helmet);
      L.runtime.status = 'play';
      if (o.timeLeft) L.runtime.timeLeft = o.timeLeft;
      L.controlYaw = c.view.rig.controlYaw(p.pos);
      for (let i = 0; i < (o.settle ?? 20); i++) step1();
      c.snapCamera();
      wrapHurt();
      p.hurtTries = 0;
      return p.info();
    },
    /** Takt (B-8): Musik-Uhr manuell, Level-Musik läuft (Zählzeit 0 jetzt). */
    beepMusic() { const m = M(); if (!m) return null; m.setManualClock(true); m.stop(); m.play(L.data.music, L.data.musicVariant ? { variant: L.data.musicVariant } : undefined); step1(); return L.beepClock?.info() ?? null; },
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
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, boards: 0, stomped: [], hurtList: [] };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let rode = false, Lg_ = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); step1(); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (window.__trace && steps % 8 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, inp?.jump ? 'J' : '', +beat().toFixed(2)]);
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist.slice(-8))]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(Lg_?.rideInput ?? {}); step1(); steps++; }
          if (kind === 'glasnetz' || kind === 'glasspipe' || kind === 'pipe') mech.pipes++;
          mech.rides++;
          rode = true;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      const goTo = (x, z, r = 0.25) => { for (let n = 0; n < 400 && !p.dead; n++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))), run: false }); } };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        Lg_ = Lg;
        if (p.dead || L.runtime.status !== 'play') break;
        rode = false;
        if (Lg.wait && !Lg.to && !Lg.throwAt) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.log) { log.push(['wert', Lg.log, JSON.stringify(new Function('P', 'L', 'ent', 'plat', `return (${Lg.log});`)(P, L, ent, plat))]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until && !Lg.stay) { let k = 0, okU = false; for (; k < (Lg.max ?? 1200) && !(okU = cond(Lg.until)); k++) tick({}); log.push(['bis', Lg.until, k]); if (!okU) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.waitBeat) {
          const mod = Lg.mod ?? 4, [lo, hi] = Lg.waitBeat;
          let k = 0;
          const inWin = () => { const b = ((beat() % mod) + mod) % mod; return b >= lo && b < hi; };
          while (!inWin() && k++ < 120 * 30) tick({});
          log.push([Lg.name ?? 'takt', k, +beat().toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          for (let k = 0; k < 30; k++) tick({});
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, tick }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, tick, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ auf eine fahrende Plattform springen (wenn when gilt), bis die Figur darauf steht
        if (Lg.board) {
          if (Lg.when) { let w = 0; for (; w < (Lg.wmax ?? 2400) && !cond(Lg.when); w++) tick({}); log.push(['warten', Lg.board, w]); }
          let k = 0, on = false;
          const h = ent(Lg.board);
          for (; k < (Lg.max ?? 600) && !on && !p.dead; k++) {
            const q = plat(Lg.board), dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz);
            const mv = h?.mover ?? h?.mb?.mover ?? null;
            on = p.mode === 'ground' && Math.abs(p.pos.y - (q.y + (h?.shape ? h.shape.max[1] - h.shape.min[1] : 0.6))) < 0.3 && d < (Lg.r ?? 1.0);
            if (on) break;
            const jump = p.mode === 'ground' ? (d < (Lg.jumpAt ?? 4.5) && d > 0.9 && (q.y + 0.6 > p.pos.y - 0.2 || d > 1.6)) : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(q.x, q.z, mv?.vx ?? 0, mv?.vz ?? 0, 3, 7) : this.stick(dx, dz, Math.min(1, d))), jump, run: false });
          }
          mech.boards++;
          log.push(['aufgestiegen', Lg.board, on, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: nicht auf die Plattform', Lg.board]);
          continue;
        }
        // ------------------------------------------------ auf der Plattform mitfahren (Mitte halten) bis until
        if (Lg.stay) {
          let k = 0;
          for (; k < (Lg.max ?? 2400) && !p.dead; k++) {
            if (Lg.until && cond(Lg.until)) break;
            const q = plat(Lg.stay), dx = q.x - p.pos.x, dz = q.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.25 ? { ...this.stick(dx, dz, Math.min(0.6, d)), run: false } : {});
          }
          log.push(['mitgefahren', Lg.stay, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, ok = false;
          const r0 = mech.rides;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const jump = p.mode === 'ground' ? d < 2.0 : p.vel.y > 0;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { ok = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (ok) mech.warps++;
          log.push(['warp', `${Lg.warp}`, ok, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!ok) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Weitsprung
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            if (k > ru + 20 && p.mode === 'ground') break;
            if (p.state === 'longjump') longed = true;
            if (p.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: true, crouch: k >= ru && k < ru + 3, jump: k >= ru + 2 && k < ru + 6 });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          if (rode && Lg.ride) break;
          const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0 && !Lg.ride) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, Lg.airK ?? 2.6, Lg.airMax ?? 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        if (rode && Lg.ride) settle();
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +L.runtime.timeLeft.toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
        if (Lg.ride && !rode) { log.push(['FEHLER: keine Fahrt', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      const g = ent('riesenhase');
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, deathCause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track,
        giant: g ? { caught: g.state === 'caught' || g.removed || !g.alive, hooks: g.hooks, rests: g.rests } : null };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const tick = o.tick ?? ((inp) => { p.invuln = Math.max(p.invuln, 5); c.setInput(inp); step1(); });
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && x.state !== 'caught' && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6 && dy > -0.5) || (dy > 0.8 && (n % 48) < 30);
        tick({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt: Aufrufe, Dreiecke. */
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) if (!e.removed) m[e.kind] = (m[e.kind] ?? 0) + 1; for (const s of L.data.segments) if (s.type) m[`seg:${s.type}`] = (m[`seg:${s.type}`] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = ent(id); return e?.info?.() ?? (e ? { state: e.state ?? null } : null); },
    cond: (k) => cond(k),
    step: (n) => { for (let i = 0; i < n; i++) step1(); },
  };
  window.__bb = W;
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
  if (ROUTES[id]?.beep) await W('beepMusic');
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__bb[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => { window.__course.player.invuln = 0; window.__course.snapCamera(); });
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}blume_b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__bb.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ------------------------------------------------------------------ Remix-Regeln je Level (Daten + Laufzeit, Gegenprobe Basis)
const RULES = {};
RULES['B-5'] = async () => {
  const r = await sc(() => {
    const c = window.__course, L = c.level, CL = window.__courseLevels;
    const base = CL.get('5-4'), raw = CL.raw('B-5');
    const calls = window.__audio?.music?.__calls ?? [];
    const ents = (k) => L.entities.filter((e) => e.kind === k && !e.removed);
    const g = L.named.get('riesenhase') ?? ents('bunny').find((e) => e.giant);
    const clouds = ['wolke_ab', 'wolke_bc', 'wolkenlift'].map((id) => L.named.get(id)?.pm?.path?.length ?? (L.named.get(id) ? 2 : 0));
    return {
      stub: CL.isRemix(raw) && raw.remix.base === '5-4' && !raw.segments, title: L.data.title, theme: L.data.theme, light: c.view.theme.light,
      music: L.data.music, variant: L.data.musicVariant, call: calls.filter((x) => x[0] === 'course_savanna').slice(-1)[0] ?? null, mVariant: window.__audio?.music?.variant ?? null,
      limit: L.runtime.timeLimit, stamp: ents('stamp').length, bunnies: ents('bunny').length, giant: g ? { size: g.baseScale, speed: g.speed, items: g.items, x: +g.pos.x.toFixed(1), z: +g.pos.z.toFixed(1) } : null,
      rewards: ents('bunny').filter((e) => !e.giant).map((e) => JSON.stringify(e.reward)), clouds, bars: L.data.segments.filter((s) => s.type === 'drehplattform').length,
      ring: ents('sternring').length, start: L.data.start.pos, goal: L.data.goal.pos, schalter: ents('figurenschalter').map((e) => e.spec.hero),
      baseTitle: base.title, baseTheme: base.theme, baseMusic: base.music, baseVariant: base.musicVariant ?? null, baseLimit: base.timeLimit, baseStamp: !!base.stamp, baseRemix: base.remix ?? null,
      baseBars: base.segments.filter((s) => s.type === 'drehplattform').length, baseRing: base.items.some((i) => i.kind === 'sternring'), baseStar1: base.items.find((i) => i.id === 'sternhase')?.star,
      baseBunnies: base.items.filter((i) => i.kind === 'bunny').length, baseStart: base.start.pos, baseGoal: base.goal.pos, baseStars: base.stars.length, baseCam: base.camera.length,
    };
  });
  console.log(`  Remix: ${JSON.stringify({ theme: r.theme, call: r.call, giant: r.giant, rewards: r.rewards, clouds: r.clouds, start: r.start, goal: r.goal })}`);
  check('B-5: Remix-Platzhalter (remixOf, Basis 5-4), eigener Titel; Morgen-Beleuchtung (savanna@morgen)', r.stub && r.title === 'Hasenhatz im Morgenrot' && r.theme === 'savanna@morgen' && r.light === 'morgen');
  check('B-5: Musik der Basis mit Klang-Variante morgen → music.play(\'course_savanna\', { variant: \'morgen\' })', r.music === 'course_savanna' && r.variant === 'morgen' && r.call?.[1]?.variant === 'morgen' && r.mVariant === 'morgen');
  check(`B-5: 500 s, kein Stempel, Start auf der Morgenwiese (z ${r.start[2]}), Ziel auf dem Zielfelsen (y ${r.goal[1]})`, r.limit === 500 && r.stamp === 0 && r.start[2] > 20 && r.goal[1] === 47);
  check(`B-5: ${r.bunnies} Hasen, davon ein Riesenhase am Start (× ${r.giant?.size}, ${r.giant?.speed} m/s, Items ${r.giant?.items?.length}); kleine Hasen geben Items`, r.bunnies === 10 && r.giant?.size === 4 && r.giant.z > 6 && r.giant.items.length === 4
    && r.rewards.filter((x) => x.includes('power') && !x.includes('oneup')).length >= 5);
  check(`B-5: Drehbalken und Sternring ersetzt durch bewegte Wolken und Wolkenlift (${r.clouds.join('/')}); Figurenschalter für ${r.schalter.join(',')}`, r.bars === 0 && r.ring === 0 && r.clouds.every((n) => n >= 2) && r.schalter.length === 1 && r.schalter[0] === 'greta');
  check('B-5: Gegenprobe Basis 5-4 unverändert (Titel, Thema savanna, Musik ohne Variante, 400 s, Stempel, 2 Drehbalken, Sternring, Sternhase, 3 Hasen, Start/Ziel, 6 Kameraschienen)',
    r.baseTitle === 'Kanonenflug über die Goldsavanne' && r.baseTheme === 'savanna' && r.baseMusic === 'course_savanna' && r.baseVariant === null && r.baseLimit === 400 && r.baseStamp && r.baseRemix === null
    && r.baseBars === 2 && r.baseRing && r.baseStar1 === 1 && r.baseBunnies === 3 && r.baseStart[2] === 3.6 && r.baseGoal[1] === 39 && r.baseStars === 1 && r.baseCam === 6);
};

// ------------------------------------------------------------------ Sonder-Proben (extra[].probe)
const PROBES = {};

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id}`);
  loaded = null;
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, variant: d.musicVariant, archetype: d.archetype, stars: d.stars.length, world: d.world, stamp: d.stamp }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music} (${meta.variant}), Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('       ', e);
    check(`${id}: Welt 11, ${R.meta.stars} Sterne, kein Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music} + ${R.meta.variant}, Archetyp ${R.meta.archetype}`,
      meta.world === 11 && meta.stars === R.meta.stars && !kinds.stamp && !meta.stamp && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music
      && meta.variant === R.meta.variant && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }
  if (PARTS.has('rules') && RULES[id]) await RULES[id](R);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast), Zeit läuft mit
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Restzeit ${res.rt.time} s, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined, stomped: res.mech.stomped.length })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length) {
    await load(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    const per = [];
    for (const pt of sweepTrack) {
      await W('place', pt, { settle: 6, timeLeft: 99 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Geheimnisse
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, timeLeft: t.timeLeft ?? null, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, { invuln: t.invuln });
      if (t.named) res.named = await W('named', t.named);
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : true;
      if (t.expectNot) ok = !ok;
      if (!t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.expectNot && res.dead) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      if (t.probe) {
        const ok = await PROBES[t.probe](t, hero);
        check(`${id}: ${t.name} (${hero})`, !!ok);
        continue;
      }
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: t.legsFrom ? 2 : 10, timeLeft: t.timeLeft ?? null, ...(t.place ?? {}) });
      const legs = t.legsFrom ? R[t.legsFrom] : t.legs;
      const res = await W('drive', legs, { invuln: t.invuln });
      if (t.named) res.named = await W('named', t.named);
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots ?? []) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, yaw, timeLeft: 99 });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); window.__bb.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
  }
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
