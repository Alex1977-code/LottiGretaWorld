// Welt Stern „Sternenzelt“, Level S-1 „Regenbogenritt durchs Sternenzelt“ (Regenbogen-Plattformen mit Hüpfmäusen, Trapeze,
// Sprung auf Pflaume im Sternenbach und Reitfahrt, Fackelplatz mit Wolkenkanone, Riesentrank-Strecke, Druckknopf-Finale mit
// Münzregen), S-2 „Plattenpurzeln zwischen den Planetoiden“ (kippende Drehplatten mit Krakenpilzen, Farb-Plattenbahn,
// Boost-Strecke auf Drehplatten, Plattentreppe mit Plattenwand, Schachbrett mit Gabelung; Abschluss schaltet das
// Sternenglanz-Kostüm frei) und S-Kapitän „Krümel im Kurbel-Karussell“ (mechanisches Diorama, per Trittschalter drehbar,
// Stern 4 nur in gedrehter Ansicht, Funkenflämmchen): Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit,
// Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta von Start bis Ziel, deterministisch über
// __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne und der Stempel mit der echten
// Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke
// < 300 k) und Bilder aus der Spielkamera (tests/out/sa_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_sa.mjs [S-1|S-2|S-Kapitän]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar, wo es darauf ankommt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf }
// · { wait } · { hop } (Sprung auf der Stelle) · { crouch } (Röhre) · { star: i } · { chaseKind, ids } · { expect } ·
// { until } (Name aus COND oder Ausdruck '=…') · { warp: [x, z] } (auf Warp-Box/Wolkenkanone springen) · { stompAll } ·
// { pound: [x, z] } · { climb: [x, z], top } · { grab: [x, z] } (Power-up aus ?-Block) · { trapeze: id } · { swing: id,
// next | land } · { mount: true } (auf Pflaume springen) · { ride: [[z, lat] …], jump: [[z0, z1] …] } (Pflaume lenken bis
// zum Absteigen) · { roll: id, via } (Schiebekugel) · { fire: id } (Feuerbälle auf ein Ziel) · { tiles: id } (Schaltfelder)
// · { die } · { power: name } (Power-up direkt setzen – nur für Gegenproben)
const Y = 0, FY = -1, HY = 18;
const ROUTES = {
  'S-1': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'rainbow', music: 'course_rainbow', archetype: 'parcours_ride', world: 9 },
    enemies: { huepfmaus: 15 },
    main: [
      { name: 'Startplatz', to: [0, -5], within: 0.6 },
      { name: 'unter dem Ziegelpaar hindurch', to: [0, -17], within: 0.6 },
      { to: [0, -25.6], within: 0.25, run: false },
      { name: 'Trapez 1', trapeze: 't1' },
      { swing: 't1', land: true },
      { name: 'Plattform 2', to: [0, -45.6], within: 0.25, run: false },
      { name: 'Trapez-Kette', trapeze: 't2a' },
      { swing: 't2a', next: 't2b' },
      { swing: 't2b', next: 't2c' },
      { swing: 't2c', land: true },
      { name: 'Plattform 3', to: [0, -72.6], within: 0.25, run: false },
      { name: 'Trapez 3', trapeze: 't3' },
      { swing: 't3', land: true },
      { name: 'Steg', to: [0, -85.6], within: 0.4, run: false },
      { name: 'Sprung auf Pflaume', mount: true },
      { name: 'Reitfahrt durch den Sternenbach', ride: [[-86, 0], [-200, 0]] },
      { expect: 'onFackel' },
      { name: 'Fackelplatz', to: [0, -234], within: 0.6 },
      { name: 'Brücke', to: [0, -242], within: 0.6 },
      { to: [-6, -250], within: 0.6 },
      { name: 'Riesentrank-Strecke (linker Pfad)', to: [-6, -295], within: 0.6 },
      { to: [0, -300], within: 0.5 },
      { name: 'Finale', to: [0, -324], within: 0.6 },
      { name: 'Treppe', to: [0, -337.6], within: 0.4 },
      { name: 'Zielmast', to: [0, -342.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'fünf Trapeze, Pflaume geritten und am Fackelplatz abgestiegen', ok: (r) => r.mech.trapezes === 5 && r.mech.ride > 600 && r.mech.dismounted },
    ],
    targets: [
      { name: 'Stern 0: Krallen-Anzug, Kristallturm hinauf, Röhre über dem Ziegelpaar, zwei Kugeln in die Tore', star: 0, from: [0, Y, 6],
        legs: [{ grab: [-1, 1.6], back: [-1, 4] }, { expect: 'krallen' }, { to: [-4.9, -11.2], within: 0.3, run: false },
          { climb: [-4.9, -13.2], top: 9.8, then: [-2, -14] }, { to: [-0.6, -14], within: 0.2, run: false, jump: 20 }, { crouch: 20 }, { expect: 'inKugelraum' },
          { roll: 'kugel_rosa', via: [[116, -16, 0.6], [116, -22.3, 0.5]] }, { roll: 'kugel_blau', via: [[124, -16, 0.6], [124, -22.3, 0.5]] },
          { until: 'stern0da', max: 300 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Krallen-Anzug (Rückwärtssalto vom Ziegel reicht nicht auf den Sims)', star: 0, expectNot: true, from: [0, Y, -11], heroes: ['lotti', 'greta'],
        legs: [{ to: [0.5, -12.6], within: 0.3, run: false }, { to: [0.5, -14], jump: 30, within: 0.3, run: false, land: true, max: 200 }, { expect: 'aufZiegel' },
          { backflip: true }, { wait: 60 }, { expect: 'nichtAufSims' }] },
      { name: 'Stern 1: Riesentrank, rechte Sternblock-Mauer zertrümmern, Röhre, alle 16 Farbfelder', star: 1, from: [0, FY, -240.5],
        legs: [{ grab: [0, -244], back: [0, -241.6] }, { expect: 'giant' }, { to: [6.2, -277], within: 0.5 }, { until: 'nischeOffen', max: 240 },
          { until: '=P().power === \'none\'', max: 1800 }, { to: [9.6, -277.6], within: 0.3, run: false }, { to: [9.6, -277], within: 0.2, run: false, jump: 20 }, { crouch: 20 },
          { expect: 'inFarbraum' }, { tiles: 'farbfelder' }, { until: 'stern1da', max: 300 }, { star: 1 }], shot: 'stern1' },
      { name: 'Farbfeld-Nische nicht ohne Riesentrank (Mauer hält)', star: 1, expectNot: true, from: [4, FY, -277], heroes: ['lotti'],
        legs: [{ to: [9.6, -277], within: 0.3, max: 240 }, { pound: [8, -277] }, { wait: 60 }, { expect: 'nischeZu' }] },
      { name: 'Stern 2: Funkenblüte, beide Sternfackeln anzünden, Wolkenkanone in den Wolkenhimmel, Sternring', star: 2, from: [0, FY, -210],
        legs: [{ grab: [0, -214], back: [0, -211.6] }, { expect: 'fire' }, { to: [-2, -218], within: 0.4, run: false }, { fire: 'fackel_l', dist: 3.5 }, { fire: 'fackel_r', dist: 3.5 },
          { expect: 'kanoneDa' }, { warp: [0, -229] }, { expect: 'imHimmel' }, { to: [14, -244.6], within: 0.4, run: false }, { name: 'durch den Sternring', to: [14, -248.4], within: 0.4, run: false },
          ...[[13, -252], [11, -256.5], [8.8, -261], [6.8, -265.5], [5.2, -270], [4, -274.5], [3, -279], [2.4, -284]].map(([x, z]) => ({ to: [x, z], jump: 20, jumpAt: 3.1, within: 0.6, run: false })),
          { to: [1.4, -285.6], within: 0.4, run: false }, { chaseKind: 'starcoin', max: 600 }, { until: 'stern2da', max: 300 }, { star: 2 }], shot: 'stern2' },
      { name: 'Sternfackeln nicht ohne Feuer (Anfassen und Anspringen zünden nicht)', star: 2, expectNot: true, from: [-3, FY, -219], heroes: ['lotti'],
        legs: [{ to: [-4.6, -220.4], within: 0.3, run: false, max: 200 }, { hop: 30 }, { to: [4.4, -219.6], within: 0.3, run: false }, { hop: 30 }, { wait: 30 }, { expect: 'kanoneFehlt' }] },
      { name: 'Stempel: bei der Reitfahrt rechts halten (Seitenarm des Sternenbachs)', stamp: true, from: 'cp1',
        legs: [{ ride: [[-108, 0], [-135, 0], [-140, 2.5], [-143, 0, 'arm'], [-172, 0, 'arm'], [-176, 0], [-200, 0]] }], shot: 'stempel' },
      { name: 'Stempel nicht auf dem Hauptarm', stamp: true, expectNot: true, from: 'cp1', heroes: ['lotti'],
        legs: [{ ride: [[-108, 0], [-200, -1]] }] },
    ],
    extra: [
      { name: 'versteckter ?-Block über dem Sternenbach: Hüpfer auf Pflaume gibt die Funkenblüte', from: 'cp1', heroes: ['lotti', 'greta'],
        legs: [{ ride: [[-108, 0], [-118, -1.2], [-130, -1.2], [-140, 0], [-200, 0]], jump: [[-123.4, -125.6]] }, { expect: 'fire' }],
        mech: (r) => r.mech.flussblock, mechText: (r) => `Block ${r.mech.flussblock ? 'gefunden' : 'nicht gefunden'}` },
      { name: 'ohne Hüpfer bleibt der ?-Block versteckt', from: 'cp1', heroes: ['lotti'],
        legs: [{ ride: [[-108, 0], [-118, -1.2], [-130, -1.2], [-140, 0], [-200, 0]] }],
        mech: (r) => !r.mech.flussblock && r.power !== 'funken', mechText: (r) => `Block ${r.mech.flussblock ? 'gefunden' : 'versteckt'}` },
      { name: 'Extraleben: unsichtbarer Block am Startplatz', from: [-4.4, Y, 8], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-4.4, 6.2], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900, ids: undefined }] },
      { name: 'Extraleben: Ende des Wolkenhimmels', from: [3, HY, -279], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [2.4, -284], jump: 20, jumpAt: 3.1, within: 0.6, run: false }, { to: [3.6, -287.6], within: 0.3, run: false }] },
      { name: 'Extraleben: hinter der Sternblock-Mauer am Ende der Strecke (nur als Riese)', from: [0, FY, -287], heroes: ['lotti'], expectLives: 1, place: { power: 'riese' },
        legs: [{ to: [6.4, -294], within: 0.5 }, { until: '=(L.named.get(\'mauer_kaefig\')?.broken ?? 0) > 0', max: 240 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Druckknopf im Finale: Münzregen', from: [0, FY, -305], heroes: ['lotti'], expectCoins: 15,
        legs: [{ pound: [0, -309] }, { until: '=L.named.get(\'regen\').landed >= 40', max: 900 }, { sweep: [[-5, -312], [5, -312], [5, -318], [-5, -318], [-5, -324], [5, -324], [5, -329], [-5, -329]] }],
        mech: (r) => r.mech.regen >= 40, mechText: (r) => `gelandet ${r.mech.regen}` },
      { name: 'Kontrollpunkt im Sternenbach: nach einem Sturz geht es auf Pflaume weiter', from: 'bach', heroes: ['lotti'],
        legs: [{ ride: [[-108, 0], [-118, 0]], partial: true, untilZ: -118 }, { die: 'hit' }, { expect: '=P().riding && P().pos.z < -95 && P().pos.z > -112' }] },
      { name: 'Hüpfmaus springt mit, wenn die Heldin springt', from: [0, Y, -32.6], heroes: ['lotti'],
        legs: [{ wait: 30 }, { hop: 20 }, { wait: 50 }, { hop: 20 }, { wait: 50 }, { hop: 20 }, { wait: 40 }],
        mech: (r) => r.mech.mausSprung > 0, mechText: (r) => `Mitsprünge ${r.mech.mausSprung}` },
    ],
    shots: [
      ['start', [0, Y, 6]],
      ['ziegel', [0, Y, -8]],
      ['sims', [-1.2, SIMS_TOP(), -13.6]],
      ['kugelraum', [120, Y, -9]],
      ['trapez1', [0, Y, -21]],
      ['kette', [0, Y, -42]],
      ['p3', [0, Y, -64]],
      ['steg', [0, Y, -83]],
      ['bach', 'cp1', 30],
      ['bach2', [0, -1.4, -140], 30],
      ['arm', [11, -1.5, -154], 20],
      ['fackel', [0, FY, -210]],
      ['himmel', [14, HY, -246]],
      ['riese', [-3, FY, -246]],
      ['farbraum', [-124, FY, -266]],
      ['finale', [0, FY, -306]],
      ['ziel', [0, 3, -337]],
    ],
  },
};
function SIMS_TOP() { return 9.8; }

const PORT = 4935;
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
  const wrapHurt = () => {
    const p = P();
    if (p.__hurtWrapped) return;
    p.__hurtWrapped = true;
    p.hurtTries = 0;
    const orig = p.hurt.bind(p);
    p.hurt = (src) => { p.hurtTries++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const ent = (id) => L.named.get(id);
  const at = (x0, x1, y0, z0, z1) => { const q = P().pos; return q.x > x0 && q.x < x1 && q.y > y0 && q.z < z0 && q.z > z1 && !P().dead; };
  const starDa = (i) => L.entities.some((e) => e.kind === 'star' && e.index === i && !e.hidden && e.alive);
  const COND = {
    // S-1
    krallen: () => P().power === 'krallen',
    fire: () => P().power === 'funken',
    giant: () => P().power === 'riese',
    inKugelraum: () => P().pos.x > 100,
    inFarbraum: () => P().pos.x < -100,
    aufZiegel: () => P().pos.y > 3.2 && P().pos.y < 3.8 && P().mode === 'ground',
    nichtAufSims: () => !(P().pos.y > 9.5),
    onFackel: () => at(-9, 9, -1.5, -204, -236),
    imHimmel: () => P().pos.y > 16,
    kanoneDa: () => !!ent('wolkenkanone')?.shown,
    kanoneFehlt: () => !ent('wolkenkanone')?.shown && !ent('fackel_l')?.lit && !ent('fackel_r')?.lit,
    nischeOffen: () => (ent('mauer_nische')?.broken ?? 0) > 0,
    nischeZu: () => (ent('mauer_nische')?.broken ?? 0) === 0,
    stern0da: () => starDa(0),
    stern1da: () => starDa(1),
    stern2da: () => starDa(2),
  };
  /** Bedingung: Name aus COND oder Ausdruck '=…' (Variablen P, L, ent, at). */
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', 'Y', `return (${k.slice(1)});`)(P, L, ent, at, 0) : COND[k]());
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
      const mech = { hurts: 0, ride: 0, pipes: 0, warps: 0, rides: 0, stomped: [], hurtList: [], trapezes: 0, tiles: 0, mausSprung: 0, dismounted: false, flussblock: false, regen: 0 };
      const mice0 = L.entities.filter((e) => e.kind === 'huepfmaus').reduce((a, e) => a + (e.jumps ?? 0), 0);
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      let stickInScript = null;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.riding) mech.ride++;
        if ((p.hurtTries ?? 0) > lastHurts) { lastHurts = p.hurtTries; mech.hurtList.push(`${p.lastHurt}@${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}`); }
        if (p.mode === 'ground' && !p.dead && !p.riding) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7 || Math.abs(p.pos.y - t[1]) > 2) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power, p.ground?.tag ?? '']);
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !p.riding && p.script?.type !== 'mount' && p.script?.type !== 'dismount' && !p.trapeze && !o.keepScript) {
          let n = 0;
          const kind = p.script?.kind ?? p.script?.type ?? p.scriptKind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && !p.riding) { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput(stickInScript ?? {}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          mech.rides++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && p.mode !== 'ground' && !p.dead; k++) tick({}); };
      const goTo = (tx, tz, within = 0.25, max = 900) => {
        let i = 0;
        for (; i < max; i++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run: false });
        }
        return i < max;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.power) { p.setPower(Lg.power); log.push(['power gesetzt', Lg.power]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Rückwärtssalto (Ducken + Sprung im Stand)
        if (Lg.backflip) {
          for (let k = 0; k < 90 && (p.mode !== 'ground' || p.hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < 8; k++) tick({ crouch: true });
          for (let k = 0; k < 30; k++) tick({ crouch: k < 4, jump: true });
          let top = p.pos.y;
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) { tick({}); top = Math.max(top, p.pos.y); }
          log.push(['rückwärtssalto', +top.toFixed(2), p.state, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          mech.flipTop = top;
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ Punkte nacheinander ablaufen (Münzen einsammeln)
        if (Lg.sweep) { for (const [x, z] of Lg.sweep) goTo(x, z, 0.4, 600); log.push(['abgelaufen', Lg.sweep.length]); continue; }
        // ------------------------------------------------ auf eine Warp-Box / Wolkenkanone springen und mitfahren
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
          if (!rode) { log.push(['FEHLER: Warp-Box/Kanone nicht benutzt', Lg.warp]); break; }
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
            if (p.mode === 'air' && !pounded && d < 0.25 && p.vel.y < 1.5) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Feuerbälle (Funkenblüte) auf ein Ziel (Id), bis es getroffen ist
        if (Lg.fire) {
          const e = L.named.get(Lg.fire);
          const done = () => !e || !e.alive || e.removed || e.defeated || e.lit;
          let k = 0, shots = 0;
          for (; k < (Lg.max ?? 1500) && !done() && !p.dead; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            const want = Lg.dist ?? 3.5;
            if (d > want + 0.6 || p.mode !== 'ground') { tick({ ...this.stick(dx, dz, Math.min(1, (d - want) / 1.5 + 0.3)), run: false }); continue; }
            const fv = p.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot < 0.97) { tick({ ...this.stick(dx, dz, 0.12), run: false }); continue; }
            const fire = k % 24 === 0;
            if (fire) shots++;
            tick({ action: fire });
          }
          for (let i = 0; i < 30; i++) tick({});
          log.push(['feuer', Lg.fire, done(), shots, k]);
          if (!done()) log.push(['FEHLER: Ziel nicht getroffen', Lg.fire]);
          continue;
        }
        // ------------------------------------------------ alle Felder einer Schaltfeld-Gruppe betreten
        if (Lg.tiles) {
          const g = L.named.get(Lg.tiles);
          let guard = 0;
          while (g && !g.done && guard++ < 40) {
            const left = g.tiles.filter((t) => !t.on);
            if (!left.length) break;
            left.sort((a, b) => Math.hypot(a.x - p.pos.x, a.z - p.pos.z) - Math.hypot(b.x - p.pos.x, b.z - p.pos.z));
            goTo(left[0].x, left[0].z, 0.3, 600);
          }
          mech.tiles = g ? g.count : 0;
          log.push(['felder', g?.count, g?.done]);
          if (!g?.done) log.push(['FEHLER: Felder nicht alle']);
          continue;
        }
        // ------------------------------------------------ Schiebekugel über Wegpunkte rollen (Figur stellt sich dahinter)
        if (Lg.roll) {
          const ball = L.named.get(Lg.roll);
          let k = 0;
          for (const [wx, wz, near = 0.5] of Lg.via) {
            for (let n = 0; n < 2400 && !p.dead; n++, k++) {
              const bx = ball.pos.x, bz = ball.pos.z;
              const dx = wx - bx, dz = wz - bz, d = Math.hypot(dx, dz);
              if (d < near) break;
              const ux = dx / d, uz = dz / d, R = ball.size / 2 + 0.55;
              const sx = bx - ux * R, sz = bz - uz * R;
              const qx = sx - p.pos.x, qz = sz - p.pos.z, q = Math.hypot(qx, qz);
              const rx = p.pos.x - bx, rz = p.pos.z - bz, along = rx * ux + rz * uz;
              if (q > 0.35 || along > -R + 0.2) {
                let gx = qx, gz = qz;
                const rl = Math.hypot(rx, rz);
                if (rl < R + 0.3 && along > -R + 0.4) { gx = rx / rl; gz = rz / rl; gx += -ux * 0.6; gz += -uz * 0.6; }
                tick({ ...this.stick(gx, gz, Math.min(1, Math.max(0.35, q / 1.2))), run: false });
              } else {
                const sp = Math.min(1, Math.max(0.25, d / 3)) * (Lg.slow ?? 0.6);
                tick({ ...this.stick(ux + (sx - p.pos.x) * 0.8, uz + (sz - p.pos.z) * 0.8, sp), run: false });
              }
            }
          }
          for (let i = 0; i < 120; i++) tick({});
          log.push(['kugel', Lg.roll, k, +ball.pos.x.toFixed(2), +ball.pos.z.toFixed(2), ball.resets ?? 0]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const pw0 = p.power;
          goTo(bx, bz, 0.2);
          for (let k = 0; k < 90 && p.hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          let tries = 0;
          for (; tries < 4 && p.power === pw0 && !p.dead; tries++) {
            // läuft das Power-up weg (Riesentrank, Wachstumsbeere): hinterher
            const pu = L.entities.find((e) => e.kind === 'powerup' && e.alive && !e.removed && Math.hypot(e.pos.x - bx, e.pos.z - bz) < 8);
            if (pu && Math.abs(pu.pos.y - p.pos.y) < 1.2) { this.chase('powerup', { max: 900 }); continue; }
            goTo(back[0], back[1]);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !p.dead; k++) {
              const dx = bx - p.pos.x, dz = bz - p.pos.z;
              if (k > 10 && p.mode === 'ground') break;
              tick({ ...(p.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < 40, run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
          }
          log.push(['power', Lg.grab.join(','), p.power, tries]);
          if (p.power === pw0) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf: zur Wand springen und dagegen drücken
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !p.dead; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (p.pos.y > (Lg.top ?? 99) - 0.1 && p.mode === 'ground') { top = true; break; }
            if (p.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: p.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : p.vel.y > 0 });
          }
          if (Lg.then) for (let n = 0; n < 300 && !p.dead; n++, k++) { const dx = Lg.then[0] - p.pos.x, dz = Lg.then[1] - p.pos.z, d = Math.hypot(dx, dz); if (d < 0.3 && p.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d))), run: false }); }
          log.push(['klettern', `${Lg.climb}`, top, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!top) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ Sturz (Ursache die): Neustart abwarten (Kontrollpunkt)
        if (Lg.die) {
          p.die(Lg.die);
          let k = 0;
          for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), !!p.riding]);
          continue;
        }
        // ------------------------------------------------ Trapez vom Boden aus greifen (Absprung, wenn die Stange heranschwingt)
        if (Lg.trapeze) {
          const t = L.named.get(Lg.trapeze);
          let k = 0, got = false;
          for (; k < 2400 && !got; k++) {
            const b0 = t.bar({});
            const v = t.L * t.omega * Math.cos(t.theta);
            const bx = b0.x + t.dir.x * v * 0.18, bz = b0.z + t.dir.z * v * 0.18;
            const ready = p.mode === 'ground' && Math.hypot(bx - p.pos.x, bz - p.pos.z) < 0.55 && b0.y - (p.pos.y + p.half.y * 2 + 0.26) < 3.2;
            if (!ready) { tick({}); continue; }
            let j = 0;
            for (; j < 160; j++) {
              const b = t.bar({});
              tick({ ...(p.mode === 'air' ? this.airSteer(b.x, b.z, 0, 0, 3, 8) : this.stick(b.x - p.pos.x, b.z - p.pos.z, 1)), jump: j < 30, run: false });
              if (t.rider === p) { got = true; break; }
              if (j > 10 && p.mode === 'ground') break;
            }
            if (p.dead) break;
          }
          log.push(['Trapez gegriffen', Lg.trapeze, got, k, +p.pos.y.toFixed(2)]);
          if (!got) { log.push(['FEHLER: Trapez nicht gegriffen', Lg.trapeze]); break; }
          mech.trapezes++;
          continue;
        }
        // ------------------------------------------------ am Trapez schwingen, abspringen zum nächsten Trapez bzw. auf die Plattform
        if (Lg.swing) {
          const t = L.named.get(Lg.swing), next = Lg.next ? L.named.get(Lg.next) : null;
          const DEG = Math.PI / 180;
          const fwd = this.stick(t.dir.x, t.dir.z, 1);
          let k = 0;
          const lo = next ? 20 : (Lg.lo ?? 12), hi = next ? 30 : (Lg.hi ?? 30);
          for (; k < 8 * 120 && !(t.omega > 0 && t.theta > lo * DEG && t.theta < hi * DEG && k > (Lg.pump ?? 240)); k++) tick(fwd);
          let i = 0, ok = false;
          for (; i < 3 * 120; i++) {
            tick({ ...(next || i > 30 ? fwd : {}), jump: i < 30 });
            if (next && next.rider === p) { ok = true; break; }
            if (!next && p.mode === 'ground') { ok = true; break; }
            if (p.dead) break;
          }
          log.push(['geschwungen', Lg.swing, Lg.next ?? 'Plattform', ok, k, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!ok) { log.push(['FEHLER: Schwung verfehlt', Lg.swing]); break; }
          if (next) mech.trapezes++;
          continue;
        }
        // ------------------------------------------------ vom Steg auf Pflaume springen
        if (Lg.mount) {
          let k = 0;
          for (; k < 600 && !p.riding; k++) {
            const r = p.raftPos;
            const tx = r ? r.x : 0, tz = r ? r.z : p.pos.z - 3;
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, 1)), jump: k % 60 < 24, run: false });
          }
          log.push(['aufgestiegen', !!p.riding, k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!p.riding) log.push(['FEHLER: nicht aufgestiegen']);
          continue;
        }
        // ------------------------------------------------ Pflaume lenken: Seitenlage je z, Sprung in Bereichen, bis zum Absteigen
        if (Lg.ride) {
          const keys = Lg.ride;
          // Schlüssel [z, Seitenlage, Kanal?]: Seitenlage relativ zur Mittellinie des Kanals (Standard Lg.channel bzw. 'bach')
          const latAt = (z) => {
            if (z >= keys[0][0]) return [keys[0][1], keys[0][2]];
            for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= a[0] && z >= b[0]) { const t = (a[0] - z) / (a[0] - b[0]); return [a[1] + (b[1] - a[1]) * t, a[2]]; } }
            const e = keys[keys.length - 1]; return [e[1], e[2]];
          };
          let k = 0;
          for (; k < (Lg.max ?? 9000); k++) {
            if (p.dead) break;
            if (Lg.untilZ !== undefined && p.pos.z < Lg.untilZ) break;
            if (p.dismounted && !p.riding && p.mode === 'ground') break;
            if (!p.riding) { tick({}); continue; }
            const f = L.river.sample(p.pos.x, p.pos.z, {}, p.pos.y);
            const [lat, chId] = latAt(p.pos.z);
            const main = L.river.channel(chId ?? Lg.channel ?? 'bach') ?? f.ch;
            const n = main.nearest(p.pos.x, p.pos.z, {});
            const q = main.at(n.s + 3.5, {});
            const tx = q.x + q.rx * lat, tz = q.z + q.rz * lat;
            const jumpHere = (Lg.jump ?? []).some(([z0, z1]) => p.pos.z <= z0 && p.pos.z >= z1);
            const st = this.stick(tx - p.pos.x, tz - p.pos.z, 1);
            tick({ x: st.x, y: st.y * (Lg.push ?? 0.3), jump: jumpHere });
            void f;
          }
          if (p.dismounted) mech.dismounted = true;
          mech.flussblock = !!L.named.get('flussblock')?.used;
          log.push(['ritt', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, !!p.dismounted]);
          if (!p.dismounted && !Lg.partial) log.push(['FEHLER: Ritt nicht beendet']);
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
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.lives = L.runtime.save?.lives;
      mech.mausSprung = L.entities.filter((e) => e.kind === 'huepfmaus').reduce((a, e) => a + (e.jumps ?? 0), 0) - mice0;
      mech.regen = L.named.get('regen')?.landed ?? 0;
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
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__sa = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__sa[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}sa_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__sa.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length, slots: d.starSlots ?? null, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    const starsOk = meta.stars === R.meta.stars && (R.meta.stamp === false ? !meta.stamp : kinds.stamp === 1);
    check(`${id}: ${R.meta.stars} Sterne${R.meta.stamp === false ? '' : ', Stempel'}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}, Welt ${R.meta.world}`,
      starsOk && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype && meta.world === R.meta.world);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Ziel)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Treffer-Versuche ${res.mech.hurts} ${res.mech.hurtList.slice(0, 8).join(' ')}, Mechanik ${JSON.stringify({ ...res.mech, hurtList: undefined })}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht das Ziel`, reached);
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
      if (t.expectNot && res.log.some((l) => String(l[0]).startsWith('FEHLER: Bedingung'))) ok = false;
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
