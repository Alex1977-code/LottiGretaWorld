// Welt 7, Level 7-3 „Pfeilflitzer über dem Glutstrom“ (Sprint 100 s: 56 Boost-Pfeile, Donut-Blöcke, Stachelwalzen,
// Glasröhren, Sternring, Grube mit Röhre ins Pilzling-Versteck, Dreifach-Gabelung), 7-4 „Schubser-Rummel im Blauglutkessel“
// (blaue Lava: auftauchende Pfeilplattformen, Zylinder, rotierende Stachelwalzen, Pendelstacheln, Schubser, Knochenflieger,
// Kippplattform) und Arena 7-B „Blaufeuer-Prinz im Glutzwinger“ (blauer Schubser-Prinz mit blauen Feuerbällen, 300 s):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegner- und Bausteinzahlen), Routen-Bot
// (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf
// der Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Geheimnisse und Extraleben, Kennzahlen
// entlang der Route und je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/w7b_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w7b.mjs [7-3|7-4|7-B]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · TRACE=1 (Spur) · SHOTS=<Name|Name> (nur
//   diese Bilder) · DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt – die
// Routen kommen ohne einen aus (Walzen übersprungen bzw. umlaufen, Pendel und Plattformen abgewartet). Gegenproben laufen
// verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump,
// stopIf } · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } · { expect } ·
// { until } · { pipe: [x, z], stick } (in eine Glasröhren-Öffnung laufen) · { warp: [x, z] } (Warp-/Rätselbox) ·
// { push: Id, dir } (Schubser in Richtung dir in die Lava stoßen) · { stompAll } · { fight: Id } (Schubser-Prinz) ·
// { kill } · { arrowUp: Id } (warten, bis die Pfeilplattform oben ist und bleibt) · { onPlat: Id, to } (auf eine
// fahrende/kippende Fläche springen)
const VX = 140;
const Y0 = 2, Y1 = 5, Y2 = 8, YZ = 11;
const ROUTES = {
  '7-3': {
    start: [0, Y0, 7],
    meta: { stars: 3, time: 100, theme: 'lavarun', music: 'course_redhot', archetype: 'parcours' },
    enemies: { pilzling: 24 },
    blocks: { pfeile: 56, walzen: 13 },
    main: [
      { name: 'Start-Pfeile', to: [0, -28.9], within: 0.9 },
      { name: 'Lücke 1 (Boost-Sprung)', to: [0, -40], jump: 30, within: 1.2 },
      { to: [0, -51], within: 0.9 },
      { name: 'Donut-Brücke', to: [0, -66.5], within: 0.9 },
      { name: 'Walzen-Slalom', to: [1.6, -76.5], within: 0.8 },
      { to: [2.25, -83.6], within: 0.7 },
      { to: [-2.25, -86.6], within: 0.7 },
      { to: [-2.25, -94], within: 0.7 },
      { name: 'über Walze 3', to: [0, -108.4], jumpZ: -97.2, jump: 30, within: 0.9 },
      { name: 'Glasröhre 1', pipe: [0, -111.5], run: true },
      { expect: 'onP1' },
      { name: 'Mittelweg', to: [0, -159.5], within: 0.8 },
      { name: 'Lücke Mitte', to: [0, -172], jump: 30, within: 1.2 },
      { name: 'Checkpoint 1', to: [0, -183.2], within: 0.6 },
      { name: 'Pfeil-Damm', to: [0, -243.5], within: 0.9 },
      { to: [0, -284.6], within: 0.9 },
      { name: 'Donut-Brücke 2', to: [0, -295], within: 0.9 },
      { to: [0, -311.5], within: 0.8 },
      { name: 'Walzen-Slalom 2', to: [2.25, -316], within: 0.8 },
      { to: [2.25, -323.6], within: 0.7 },
      { to: [-2.25, -326.6], within: 0.7 },
      { name: 'Glasröhre 2 (Pfeil lenkt hinein)', pipe: [-1.2, -335.5], run: true },
      { expect: 'onP4' },
      { name: 'rechter Weg (Donuts)', to: [8.5, -362.5], within: 1.6 },
      { to: [8.5, -395], within: 0.9 },
      { name: 'Checkpoint 2', to: [0, -400.5], within: 0.7 },
      { name: 'Mittelweg der Gabelung', to: [0, -420.6], within: 0.9 },
      { name: 'Lücke', to: [0, -431], jump: 30, within: 1.2 },
      { name: 'Ziel-Röhre Mitte', pipe: [0, -447.5], run: true },
      { expect: 'onGoalPlat' },
      { name: 'Zielmast', to: [0, -476], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Boost-Pfeile genutzt (≥ 25), drei Glasröhren-Fahrten', ok: (r) => r.mech.boosts >= 25 && r.mech.pipes === 3 },
      { name: 'ohne einen Treffer-Versuch (Walzen umlaufen bzw. übersprungen)', ok: (r) => r.mech.hurts === 0 },
    ],
    targets: [
      { name: 'Stern 0: rechter Weg am Ende von Rasstrecke 1 – über zwei Stachelwalzen', star: 0, from: [7, Y1, -144],
        legs: [{ to: [7, -152.2], within: 0.4, run: false }, { to: [7, -158.6], jump: 30, run: false, within: 0.8 }, { to: [7, -161.3], within: 0.4, run: false },
          { to: [7, -167.8], jump: 30, run: false, within: 0.8 }, { star: 0 }, { to: [0, -183], within: 0.8 }], shot: 'stern0' },
      { name: 'Stern 0 nicht auf dem Mittelweg', star: 0, expectNot: true, from: [0, Y1, -144], heroes: ['lotti'],
        legs: [{ to: [0, -159.5], within: 0.8 }, { to: [0, -172], jump: 30, within: 1.2 }, { to: [0, -183], within: 0.8 }] },
      { name: 'Stern 1: Sternring – acht Sternmünzen in 10 s, Stern über der Grube', star: 1, from: [0, Y1, -184],
        legs: [{ to: [0, -241.6], within: 1.0 }, { until: 'stern1Visible', max: 300 }, { star: 1 }, { expect: 'inPit' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Sternring (über die Grube springen)', star: 1, expectNot: true, from: [0, Y1, -246], heroes: ['lotti'],
        legs: [{ to: [4.5, -252.5], jump: 30, within: 0.6, run: false }, { wait: 60 }] },
      { name: 'Stern 2: Mittelweg der zweiten Gabelung durch drei Stachelwalzen', star: 2, from: [0, Y2, -361],
        legs: [{ to: [0, -368.6], within: 0.4, run: false }, { to: [0, -374.8], jump: 30, run: false, within: 0.8 }, { to: [0, -377.6], within: 0.4, run: false },
          { to: [0, -383.8], jump: 30, run: false, within: 0.8 }, { to: [0, -386.6], within: 0.4, run: false }, { to: [0, -392.6], jump: 30, run: false, within: 0.8 },
          { star: 2 }], shot: 'stern2', mech: (r) => r.mech.hurts === 0, mechText: (r) => `Treffer-Versuche ${r.mech.hurts}` },
      { name: 'Stern 2 nicht auf dem linken Weg', star: 2, expectNot: true, from: [-8.5, Y2, -361], heroes: ['lotti'],
        legs: [{ to: [-8.5, -377.4], within: 0.8 }, { to: [-8.5, -388], jump: 30, within: 1.2 }, { to: [-8.5, -395], within: 0.8 }] },
      { name: 'Stempel: linker Abzweig nach Stern 1, über die Lücke, Sprung zurück auf den Hauptweg', stamp: true, from: [-7.5, Y1, -258],
        legs: [{ to: [-7.5, -273.2], within: 0.6 }, { to: [-8, -283.5], jump: 30, within: 0.8 }, { expect: 'onStampIsland' }, { to: [-6.6, -284], within: 0.5, run: false },
          { to: [0, -283.5], jump: 30, within: 0.9 }], shot: 'stempel' },
      { name: 'Stempel nicht vom Hauptweg aus', stamp: true, expectNot: true, from: [0, Y1, -262], heroes: ['lotti'],
        legs: [{ to: [0, -284.6], within: 0.9 }, { to: [0, -295], within: 0.9 }] },
    ],
    extra: [
      { name: 'Geheimnis: Grube → Röhre ins Pilzling-Versteck, Funkelstern, Pilzlinge, Röhre zurück', from: [4.5, Y1 - 2.5, -250.6], heroes: ['lotti'], expectCoins: 10,
        legs: [{ to: [4.5, -252.5], jump: 20, within: 0.3, run: false }, { crouch: 20 }, { expect: 'inVersteck' }, { to: [VX - 6, -259], within: 0.3, run: false }, { hop: 24 },
          { chaseKind: 'powerup', max: 900 }, { expect: 'funkelstern' }, { chaseKind: 'pilzling', max: 1200 },
          { to: [VX + 10, -242.5], jump: 20, within: 0.3, run: false }, { crouch: 20 }, { expect: 'backOnP3' }],
        mech: (r) => r.mech.defeated >= 5, mechText: (r) => `Pilzlinge besiegt ${r.mech.defeated}` },
      { name: 'Extraleben: unsichtbarer Block auf dem Gabelungsplateau', from: [6.5, Y1, -138], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6.5, -140], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block im Pilzling-Versteck', from: [VX + 10, Y1, -256], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [VX + 10, -258], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Donut-Blöcke fallen unter einer stehenden Figur (Lava)', from: [0.5, Y0, -51.4], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0.5, -55.5], within: 0.2, run: false }, { wait: 400 }], mech: (r) => r.dead && r.cause === 'lava', mechText: (r) => `tot: ${r.dead} (${r.cause})` },
      { name: 'Stachelwalze verletzt (nicht gesprungen)', from: [0, Y0, -95], heroes: ['lotti'], invuln: false,
        legs: [{ to: [0, -103], within: 0.6, run: false, autoJump: false, max: 240, partial: true }], mech: (r) => r.mech.hurts > 0, mechText: (r) => `Treffer ${r.mech.hurts}` },
    ],
    shots: [
      ['start', [0, Y0, 7]],
      ['damm', [0, Y0, -20]],
      ['luecke', [0, Y0, -28]],
      ['donut', [0, Y0, -48]],
      ['walzen', [1, Y0, -75]],
      ['walzen2', [-2, Y0, -92]],
      ['rohr1', [0, Y0, -106]],
      ['gabelung1', [0, Y1, -136]],
      ['rechts1', [7, Y1, -150]],
      ['cp1', [0, Y1, -184]],
      ['damm2', [0, Y1, -210]],
      ['grube', [-1, Y1, -246]],
      ['stempelweg', [-7.5, Y1, -266]],
      ['donut2', [0, Y1, -280]],
      ['walzen3', [2.5, Y1, -313]],
      ['gabelung2', [0, Y2, -360]],
      ['mitte2', [0, Y2, -368]],
      ['cp2', [0, Y2, -401]],
      ['gabelung3', [0, Y2, -412]],
      ['links3', [-10.5, Y2, -415]],
      ['rechts3', [12, Y2, -414]],
      ['ziel', [0, YZ, -463]],
      ['versteck', [VX - 10, Y1, -260]],
    ],
  },
};

const PORT = 4720;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'load,route,sweep,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');
const SHOTS = process.env.SHOTS ? new Set(process.env.SHOTS.split('|')) : null;

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const named = (id) => L.named.get(id);
  const ent = (id) => L.entities.find((e) => e.spec?.id === id && !e.removed);
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? src?.tag ?? String(src); return orig(src); };
  };
  wrapHurt();
  const hud = () => L.archetype?.hud?.state?.() ?? {};
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const COND = {
    // 7-3
    onP1: () => at(-10, 10, 4.5, -130, -147),
    onP4: () => at(-11, 11, 7.5, -354, -367),
    onGoalPlat: () => at(-13, 13, 10.5, -459, -483),
    inPit: () => at(2.5, 6.5, 2.2, -248.8, -256.2),
    inVersteck: () => P().pos.x > 110,
    backOnP3: () => at(-9, 9, 4.5, -243, -263),
    funkelstern: () => P().power === 'stern',
    sternring: () => !!ent('sternring')?.active || (named('sternring')?.state ?? '') === 'run',
    stern1Visible: () => L.entities.some((e) => e.kind === 'star' && e.index === 1 && !e.hidden && !e.removed),
    onStampIsland: () => at(-10, -6, 4.5, -278.8, -286.2),
    // 6-A-artig (7-B)
    fightOn: () => !!named('prinzKampf')?.started && named('prinz')?.state !== 'wait',
    gateLocked: () => !!named('prinzKampf')?.locked,
    hud3: () => hud().boss?.hp === 3,
    prinzAim: () => named('prinz')?.state === 'aim',
    prinzFull: () => named('prinz')?.hp === 3,
    prinzReset: () => { const b = named('prinz'); return b.hp === 3 && b.state === 'wait' && !named('prinzKampf').started && !named('prinzKampf').locked && !P().dead; },
    arenaStar: () => !!L.archetype?.info?.().starTouch,
    arenaDone: () => L.runtime.status === 'done' || L.runtime.status === 'goal',
  };
  const W = {
    place(pos, o = {}) {
      const p = P();
      c.setInput(null);
      p.setHero(o.hero ?? 'lotti');
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
      const mech = { hurts: 0, pipes: 0, warps: 0, rides: 0, boosts: 0, trips: 0, kicks: 0, stomped: [], hurtList: [] };
      const foes0 = L.entities.filter((e) => e.enemy && e.alive && !e.defeated);
      const track = [];
      let lastHurts = p.hurtTries ?? 0, lastBoost = 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.boostTime > lastBoost + 0.2) mech.boosts++;
        lastBoost = p.boostTime;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '', +Math.hypot(p.vel.x, p.vel.z).toFixed(1)]);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'glasspipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') {
          if (Lg.until && COND[Lg.until]?.()) { log.push(['bis', Lg.until, 0]); continue; }
          if (!(Lg.wait || Lg.expect || Lg.until)) break;
        }
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) { if (p.dead) { c.setInput({}); c.step(1); steps++; } else tick({}); } continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 40; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) { if (p.dead || L.runtime.status !== 'play') { c.setInput({}); c.step(1); steps++; } else tick({}); } log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.kill) { p.invuln = 0; p.die('fall'); log.push(['tot gesetzt']); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ in eine Glasröhren-Öffnung laufen (unterwegs Stick halten)
        if (Lg.pipe) {
          const [tx, tz] = Lg.pipe;
          stickInScript = Lg.stick ?? null;
          const r0 = mech.pipes;
          let k = 0;
          for (; k < 900 && mech.pipes === r0 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...this.stick(dx, dz, 1), run: Lg.run ?? false });
          }
          stickInScript = null;
          settle();
          log.push(['röhre', `${Lg.pipe}`, mech.pipes > r0, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (mech.pipes === r0) { log.push(['FEHLER: Glasröhre nicht betreten', Lg.pipe]); break; }
          continue;
        }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
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
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        const late = !!Lg.jumpAt || Lg.jumpZ !== undefined;
        let best = Infinity, still = 0, auto = 0, j0 = late ? null : 0;
        if (holdJ && !late) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});
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
          if (p.mode === 'air' && holdJ && j0 !== null && Lg.steer !== false) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else if (p.mode === 'air' && Lg.steer === false) st = {};
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && COND[Lg.stopIf]()) break;
          if (j0 === null && ((Lg.jumpAt && dist <= Lg.jumpAt) || (Lg.jumpZ !== undefined && p.pos.z <= Lg.jumpZ))) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && !Lg.partial) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.defeated = foes0.filter((e) => e.defeated || !e.alive || e.removed).length;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, cause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
        if (e.touch === false && kind === 'star') { p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); continue; }
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200 && L.runtime.status === 'play') { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    /** Aufschlüsselung des nächsten Bildes je Objekt (Name der nächsten benannten Hülle bzw. Entitäts-Art): Aufrufe, Dreiecke. */
    detail: () => new Promise((res) => {
      const v = c.view, r = v.renderer;
      for (const e of L.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; let nm = null; for (let q = o; q; q = q.parent) if (q.name) { nm = q.name.replace(/:\d+$/, ''); break; } if (nm && nm.startsWith('kurs:')) nm += `/${o.type}${o.count ? '×' + o.count : ''}/${o.geometry?.index ? o.geometry.index.count / 3 : (o.geometry?.attributes?.position?.count ?? 0) / 3 | 0}`; return nm ?? o.type; };
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
    arch: () => c.state().archetype,
    save: () => JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}'),
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    blocks: () => {
      const w7 = L.w7 ?? {};
      return {
        pfeile: named('pfeile')?.n ?? 0,
        walzen: (w7.rollers ?? []).filter((r) => r.kind === 'stachelwalze_rot' || r.spikes === 'ringsum' || /walze/.test(r.spec?.id ?? r.id ?? '')).length,
        rollers: (w7.rollers ?? []).length, arrows: (w7.arrows ?? []).length, pendulums: (w7.pendulums ?? []).length,
      };
    },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__w7b = W;
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
  if (process.env.TRACE) await sc(() => { window.__trace = true; });
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w7b[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w7b_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w7b.detail());
    console.log(`      ${name}:`);
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  if (!R) { console.log(`Level ${id}: keine Route`); continue; }
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    const blocks = await W('blocks');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}, Bausteine: ${JSON.stringify(blocks)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = R.meta.arena ? meta.slots === 1 && !meta.stamp : (meta.stars === R.meta.stars && kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Stern(e)${R.meta.arena ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    for (const [k, n] of Object.entries(R.blocks ?? {})) check(`${id}: ${n}× ${k} (${blocks[k] ?? 0})`, (blocks[k] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.time} s (${res.time.toFixed(1)} s)`, reached && res.time < R.meta.time);
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
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(26)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
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
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}${t.mechText ? `, ${t.mechText(res)}` : ''})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
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
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
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
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
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
