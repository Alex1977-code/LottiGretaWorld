// Welt 3, Level 3-1 „Flockenwiese“ und 3-4 „Marzipangarten“: Laden ohne Konsolenfehler, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel mit der echten
// Mechanik (Wandloch hinter den Flatterkäfern, Hasen fangen, Schneebaum + Gleitblatt / Propeller-Helm / Krallen-Anzug,
// schmaler Eissteg; unsichtbarer Wolkenlift, Wolkenkanone in den Münzhimmel, Figurenschalter Lotti/Greta),
// Mechanik-Prüfungen (Schneebälle zerschellen und kegeln, Eisläufer mitfahren + Schlittschuh, Stachelstreifen mit
// Schlittschuh, Eiszapfen, Extraleben-Geheimnisse, Endlos-Münzblock, Zeitlimit), Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Screenshots je Abschnitt (tests/out/w3a_*.png).
// Aufruf (nach npm run build): PORT_BASE=5000 node tests/course_w3a.mjs [3-1|3-4]
//   SHOTS_ONLY=1 → nur Screenshots/Kennzahlen · ONLY=<Text> → nur passende Ziele/Prüfungen · VERBOSE=1 → Protokolle
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel), rennt, springt an
// festgelegten Stellen (Taste gehalten), wartet Röhrenfahrten ab. Gegner bleiben aktiv; die Figur ist für die Fahrt
// unverwundbar (Abpraller zählen weiter), damit die Geometrie geprüft wird.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Wegpunkte [x, z]; jump = Schritte mit gehaltener Sprungtaste (40 ≈ volle Höhe, länger = Gleiten mit Gleitblatt);
// jumpAt = erst ab diesem Abstand springen; hold = zusätzliche Eingabe je Schritt (z. B. { action: true } = Propeller
// sinkt langsam); press = Aktion beim Beginn des Abschnitts; toNamed = bewegtes Ziel; wait = Schritte ohne Eingabe;
// crouch = ducken (Röhre); push = Schritte nur drücken (Klettern); mount = auf eine Entität springen und mitfahren.
const ROUTES = {
  '3-1': {
    start: [0, 1, 5],
    timeLimit: 400,
    enemies: { schneesaeule: 6, flatterkaefer: 9, pilzling_eis: 4, krabbelkaefer: 7, pilzling: 4 },
    main: [
      { name: 'Start', to: [0, -8] },
      { to: [0.6, -24] },
      { name: 'Frosttor', to: [0, -46] },
      { name: 'Abgrund', to: [0, -68.5], jump: 30, jumpAt: 5.6 },
      { to: [2, -90] },
      { name: 'Checkpoint', to: [0, -102] },
      { name: 'Eisbahn 1', to: [0, -128], run: false },
      { to: [0, -139.2], run: false, within: 0.5 },
      { name: 'Eissteg A', to: [0, -148.5], run: false, slow: 0.55, within: 0.5 },
      { name: 'Eissteg B', to: [9, -148.5], run: false, slow: 0.55, within: 0.5 },
      { name: 'Eissteg C', to: [9, -159], run: false, slow: 0.55, within: 0.6 },
      { name: 'Eisbahn 2', to: [5, -172], run: false },
      { name: 'Zielplateau', to: [3, -193.4] },
      { name: 'Zielröhre', to: [3, -196], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { name: 'Baumhain', to: [0, -240] },
      { name: 'Zielmast', to: [0, -253.7], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 0: Wandloch hinter den neun Flatterkäfern', star: 0, from: [6.4, 1, -77.5],
        legs: [{ to: [9.6, -77.5], within: 0.3, run: false }, { to: [10.2, -77.5], jump: 30, within: 0.3, run: false }, { wait: 20 },
          { to: [13.6, -77.5], jump: 40, within: 0.4, run: false }], shot: 'stern0' },
      { name: 'Stern 1: Hasen auf der Hasenwiese fangen', star: 1, from: [-13, 1, -108],
        legs: [{ chaseKind: 'bunny', max: 3000, noJump: true }, { wait: 60 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Schneebaum hinauf, mit dem Gleitblatt in die Nische', star: 2, from: [12.4, 1, -184.4], power: 'gleitblatt', heroes: ['lotti', 'greta'],
        legs: [{ to: [10.0, -184.9], jump: 30, jumpAt: 2.4, within: 0.3, run: false }, { wait: 10 },
          { to: [9.45, -188.06], jump: 30, jumpAt: 2.3, within: 0.3, run: false }, { wait: 10 },
          { to: [6.44, -189.15], jump: 30, jumpAt: 2.3, within: 0.3, run: false }, { wait: 10 },
          { to: [3.71, -187.2], jump: 30, jumpAt: 2.3, within: 0.3, run: false }, { wait: 10 },
          { to: [5.4, -186.5], jump: 30, within: 0.4, run: false }, { wait: 10 },
          { to: [8.8, -186], within: 0.3, run: false }, { to: [-10.8, -184.8], jump: 900, jumpAt: 15.6, within: 0.7, run: false }], shot: 'stern2', expectPower: 'gleitblatt' },
      { name: 'Stern 2: mit dem Propeller-Helm hinauf', star: 2, from: [3, 1, -177.6],
        legs: [{ to: [1.2, -177.6], within: 0.3, run: false }, { wait: 10 }, { to: [-7, -184.8], within: 0.3, run: false }, { press: true, to: [-10.4, -184.8], hold: { action: true }, holdJump: 0, within: 0.6, run: false, airOnly: true }] },
      { name: 'Stern 2: mit dem Krallen-Anzug die Wand hinauf', star: 2, from: [-5, 1, -176.6],
        legs: [{ to: [-5, -178.6], within: 0.25, run: false }, { hop: 20 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }, { wait: 20 },
          { to: [-8.2, -184.8], within: 0.3, run: false }, { push: 200, jump: 12, dir: [-1, 0] }, { to: [-10.6, -184.8], within: 0.4, run: false }], expectPower: 'krallen' },
      { name: 'Stern 2 nicht ohne Hilfsmittel (Sprung von der Krone)', star: 2, expectNot: true, from: [7, 8.6, -186], heroes: ['lotti', 'greta'],
        legs: [{ to: [8.8, -186], within: 0.3, run: false }, { to: [-10.4, -184.8], jump: 40, jumpAt: 14.8, within: 0.6, max: 400, land: true }, { wait: 60 }] },
      { name: 'Stempel: schmaler Eissteg hinter der Hasenwiese', from: [-19.5, 1, -116.4], stamp: true,
        legs: [{ to: [-19.5, -131], run: false, slow: 0.6, within: 0.4 }, { to: [-19.6, -132.6], run: false, within: 0.3 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Schneeball am Felsriegel: zerschellt, 5 Münzen', from: [-7.4, 1, -6.8], heroes: ['lotti'],
        legs: [{ to: [-7.4, -19.4], run: false, within: 0.4, max: 900 }, { wait: 60 }, { chaseKind: 'coin', max: 600 }], expectBroken: 'ball_riegel', expectCoins: 5 },
      { name: 'Schneeball kegelt die Krabbelkäfer um', from: [6.8, 1, -16.2], heroes: ['lotti'],
        legs: [{ to: [6.8, -22], run: true, within: 0.5, max: 900 }, { wait: 300 }, { logNamed: 'ball_kegel' }], expectInfo: ['ball_kegel', 'defeats', 2] },
      { name: 'Eisläufer: mitfahren, stampfen → Schlittschuh', from: [-6, 1, -78.8], heroes: ['lotti', 'greta'],
        legs: [{ mount: 'eis_reit' }, { rideOn: 'eis_reit', steps: 240 }, { stomp: true }, { wait: 40 }, { chaseKind: 'schlittschuh', max: 600 }], expectSkate: true },
      { name: 'Stachelstreifen: mit Schlittschuh sicher, Münzen', from: [8.2, 1, -115.6], heroes: ['lotti'], skate: true, vulnerable: true,
        legs: [{ to: [8.2, -136.5], run: true, within: 0.6, max: 900 }], expectCoins: 5, expectNotHurt: true },
      { name: 'Eiszapfen im Frosttor fallen', from: [-2.6, 1, -38], heroes: ['lotti'],
        legs: [{ to: [-2.6, -42.4], run: false, within: 0.4 }, { wait: 50 }], expectNamedState: ['ez1', ['shake', 'fall', 'gone']] },
      { name: 'Extraleben im unsichtbaren Block über der Iglu-Kuppel', from: [-5.6, 1, 3.5], heroes: ['lotti'],
        legs: [{ to: [-7.0, 3.5], jump: 20, within: 0.3, run: false }, { to: [-8.5, 3.5], jump: 24, within: 0.25, run: false }, { wait: 20 }, { hop: 40 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }], expectLives: 1 },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['iglu', [-4, 1, 1]],
      ['schneebaelle', [0, 1, -12]],
      ['frosttor', [0, 1, -34]],
      ['abgrund', [0, 1, -57]],
      ['wandloch', [7, 1, -72]],
      ['teich', [-3, 1, -80]],
      ['checkpoint', [0, 1, -98]],
      ['hasenwiese', [-16, 1, -103]],
      ['stempelsteg', [-19.5, 1, -121]],
      ['eisbahn1', [0, 1, -118]],
      ['eisstege', [0, 1, -141]],
      ['eisbahn2', [9, 1, -160]],
      ['zielplateau', [3, 1, -177]],
      ['nische', [-6, 1, -182]],
      ['baumkrone', [7, 8.6, -186]],
      ['baumhain', [0, 1, -232]],
      ['ziel', [0, 1, -244]],
    ],
  },
};

const YH = 25, YT = 5.2;
ROUTES['3-4'] = {
  start: [0, 1, 4],
  timeLimit: 100,
  enemies: { pilzling: 16, schnappblume: 3 },
  minis: 5,
  main: [
    { name: 'Start', to: [0, -5.6], within: 0.4, run: false },
    { untilNamed: 'mA', axis: 'x', gt: -1.4 },
    { name: 'Schwebeplattform A', toNamed: 'mA', jump: 30, within: 0.7 },
    { untilClose: ['mA', 'mB'], d: 1.0, ride: 'mA' },
    { name: 'Schwebeplattform B', toNamed: 'mB', jump: 30, within: 0.7 },
    { name: 'Insel 2', to: [0, -19], jump: 30, within: 0.6 },
    { to: [0, -28] },
    { name: 'Hasenplattform', to: [0, -50] },
    { name: 'Glasröhre', to: [0, -54.4], within: 0.3 },
    { to: [0, -71.4], within: 0.4, run: false },
    { name: 'Schnappblume 1', untilNamed: 'm1', axis: 'x', near: -0.6, d: 0.5, max: 1600 },
    { toNamed: 'm1', jump: 30, within: 0.7, run: false },
    { toNamed: 'm1', within: 0.4, run: false, max: 300 },
    { untilClose: ['m1', 'm2'], d: 1.0, ride: 'm1' },
    { name: 'Schnappblume 2', toNamed: 'm2', jump: 30, within: 0.7, run: false },
    { toNamed: 'm2', within: 0.4, run: false, max: 300 },
    { untilClose: ['m2', 'm3'], d: 1.0, ride: 'm2' },
    { name: 'Schnappblume 3', toNamed: 'm3', jump: 30, within: 0.7, run: false },
    { toNamed: 'm3', within: 0.4, run: false, max: 300 },
    { name: 'Insel D', to: [0, -90.4], jump: 30, within: 0.6 },
    { to: [0, -95.6], within: 0.4 },
    { name: 'Treppe', to: [0, -97.2], jump: 16, within: 0.4, run: false },
    { to: [0, -98.8], jump: 16, within: 0.4, run: false },
    { to: [0, -100.4], jump: 16, within: 0.4, run: false },
    { to: [0, -102], jump: 16, within: 0.4, run: false },
    { to: [0, -103.6], jump: 16, within: 0.4, run: false },
    { to: [0, -105.2], jump: 16, within: 0.4, run: false },
    { name: 'Zielmast', to: [0, -112.3], within: 0.2 },
  ],
  targets: [
    { name: 'Stern 0: unsichtbarer Wolkenlift direkt hinter dem Start', star: 0, from: [0, 1, 6],
      legs: [{ to: [0, 8.95], run: false, within: 0.3 }, { untilNamed: 'wl_start', axis: 'y', gt: 9.8, ride: true, max: 1200 }, { wait: 60 }], shot: 'stern0' },
    { name: 'Stern 1: Hasen fangen', star: 1, from: [-2, 1, -36],
      legs: [{ chaseKind: 'bunny', max: 3000, noJump: true }, { wait: 60 }, { star: 1 }], shot: 'stern1' },
    { name: 'Stern 2: Wolkenkanone in den Münzhimmel', star: 2, from: [4.6, 1, -68.2],
      legs: [{ to: [10.6, -68.2], jump: 30, jumpAt: 4.6, within: 0.5 }, { to: [11.5, -68.4], jump: 36, jumpAt: 1.2, within: 0.3, run: false }, { wait: 30 },
        { to: [0, -78.6], within: 0.4, run: false }, { to: [0, -83.5], jump: 34, within: 0.5 }, { to: [3, -89.5], jump: 34, within: 0.5 },
        { to: [0, -95.5], jump: 34, within: 0.5 }, { to: [-2.6, -101.5], jump: 34, within: 0.5 }, { wait: 20 }], shot: 'stern2' },
    { name: 'Stempel: Lotti-Schalter lässt die Wolkenstufen erscheinen', from: [-6, 1, -41.2], stamp: true, heroes: ['lotti'],
      legs: [{ to: [-8.2, -41.2], within: 0.25, run: false }, { wait: 90 }, { to: [-12.4, -43.2], jump: 30, jumpAt: 2.6, within: 0.4, run: false },
        { to: [-14.8, -45.4], jump: 30, within: 0.4, run: false }, { to: [-17.2, -47.6], jump: 30, within: 0.4, run: false },
        { to: [-18.6, -50.6], jump: 34, within: 0.4, run: false }, { wait: 20 }], shot: 'stempel' },
    { name: 'Stempel: Greta-Schalter (Greta)', from: [-6, 1, -43.8], stamp: true, heroes: ['greta'],
      legs: [{ to: [-8.2, -43.8], within: 0.25, run: false }, { wait: 90 }, { to: [-12.4, -43.2], jump: 30, jumpAt: 2.6, within: 0.4, run: false },
        { to: [-14.8, -45.4], jump: 30, within: 0.4, run: false }, { to: [-17.2, -47.6], jump: 30, within: 0.4, run: false },
        { to: [-18.6, -50.6], jump: 34, within: 0.4, run: false }, { wait: 20 }] },
  ],
  extra: [
    { name: 'Lotti-Schalter reagiert nicht auf Greta', from: [-6, 1, -41.2], heroes: ['greta'],
      legs: [{ to: [-8.2, -41.2], within: 0.25, run: false }, { wait: 120 }], expectNamed: ['stempelweg', 'want', false] },
    { name: 'Extraleben im unsichtbaren Block über der Brunnenschale', from: [-3.6, 1, -35.4], heroes: ['lotti'],
      legs: [{ to: [-4.0, -35.4], within: 0.3, run: false }, { to: [-6.4, -35.4], jump: 40, within: 0.3, run: false }, { wait: 10 }, { hop: 40 }, { wait: 60 }, { chaseKind: 'powerup', max: 900 }], expectLives: 1 },
    { name: 'Endlos-Münzblock auf der Treppe: Münzen in Folge', from: [-2.2, 3.1, -100], heroes: ['lotti'],
      legs: [{ hop: 26 }, { hop: 26 }, { hop: 26 }, { hop: 26 }, { hop: 26 }, { wait: 90 }], expectCoins: 4 },
    { name: 'Zeitlimit 100 s: Zeit um → Tod', from: [0, 1, 4], heroes: ['lotti'], timeout: true,
      legs: [{ wait: 12200 }], expectDead: true },
  ],
  shots: [
    ['start', [0, 1, 4]],
    ['hinter_start', [0, 1, 7.4]],
    ['schwebe', [0, 1, -5]],
    ['insel2', [0, 1, -18]],
    ['hasenplatz', [0, 1, -32]],
    ['brunnen', [-3, 1, -38]],
    ['schalter', [-7, 1, -44]],
    ['pavillon', [-2, 1, -46]],
    ['roehre', [0, 1, -51]],
    ['schnappblumen', [0, 1, -70]],
    ['kanone', [8, 1, -66]],
    ['muenzhimmel', [0, YH, -78]],
    ['treppe', [0, 1, -92]],
    ['ziel', [0, YT, -107]],
  ],
};

const PORT = 4371;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['3-1', '3-4'].filter((id) => ROUTES[id]);
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((k) => t.name.includes(k))) : list);

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
      p.setHero(o.hero ?? 'lotti');
      p.dead = false;
      p.big = true;
      p.power = 'none';
      p.powerTime = 0;
      p.reset(pos, o.yaw ?? Math.PI / 2);
      p.invuln = o.invuln ?? 0;
      if (o.power) p.setPower(o.power);
      if (o.skate) p.collectPowerup('schlittschuh');
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
    namedPos(id) {
      const m = c.level.named.get(id);
      const q = m?.box?.pos ?? m?.pm?.pos ?? m?.pos;
      return q ? [q.x, q.z, q.y] : null;
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [], jumps = [], track = [];
      let steps = 0, autoJumps = 0, hurt = 0;
      const hold = o.invuln !== false;
      let rode = false;
      const hist = [];
      let deadLogged = false;
      const inv0 = p.invuln;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        const before = p.invuln;
        c.setInput(inp); c.step(1); steps++;
        if (!hold && p.invuln > before + 0.5) hurt++;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (steps % 24 === 0 && p.mode !== 'script') track.push([p.pos.x, p.pos.y, p.pos.z]);
        if (p.mode === 'script' && c.level.runtime.status === 'play' && !p.dead && !p.statue) {
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
        if (L.wait) { for (let i = 0; i < L.wait; i++) tick(L.hold ?? {}); continue; }
        if (L.crouch) { for (let i = 0; i < L.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.action) { tick({ action: true }); tick({}); continue; }
        if (L.logNamed) { const e = c.level.named.get(L.logNamed); log.push(['info', L.logNamed, e ? JSON.stringify({ x: +e.pos?.x?.toFixed(2), z: +e.pos?.z?.toFixed(2), ...(e.info?.() ?? {}) }) : null]); const ks = c.level.entities.filter((x) => x.kind === 'krabbelkaefer').slice(0, 3).map((x) => [+x.pos.x.toFixed(1), +x.pos.z.toFixed(1), x.state]); log.push(['käfer', JSON.stringify(ks)]); continue; }
        if (L.hop) {
          for (let k = 0; k < L.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          continue;
        }
        if (L.stomp) {
          for (let k = 0; k < 24; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.mount) {
          // auf eine Entität (Reit-Oberseite) springen: hinlaufen, abspringen, in der Luft zu ihr lenken
          const e = c.level.named.get(L.mount);
          let n = 0, on = false, still = 0, lx = p.pos.x, lz = p.pos.z;
          for (; n < 2400 && !on && e && !e.defeated; n++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (Math.hypot(p.pos.x - lx, p.pos.z - lz) < 0.01) still++; else still = 0;
            lx = p.pos.x; lz = p.pos.z;
            const jump = p.mode === 'ground' && ((d < 2.2 && p.pos.y < e.pos.y + 0.6) || still > 30);
            let st;
            if (p.mode === 'air') {
              let vx = dx * 3 + (e.vel?.x ?? 0), vz = dz * 3 + (e.vel?.z ?? 0);
              const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
              st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
            } else st = d > 0.1 ? this.stick(dx, dz, Math.min(1, d)) : { x: 0, y: 0 };
            tick({ ...st, jump: jump || (p.mode === 'air' && p.vel.y > 0), run: false });
            on = p.mode === 'ground' && p.ground?.owner === e;
          }
          log.push(['aufgesprungen', L.mount, on, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: nicht aufgesprungen', L.mount]);
          continue;
        }
        if (L.rideOn) {
          // mitfahren: zur Mitte der Entität lenken
          const e = c.level.named.get(L.rideOn);
          let onSteps = 0;
          const x0 = p.pos.x, z0 = p.pos.z;
          for (let k = 0; k < L.steps; k++) {
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.15 ? { ...this.stick(dx, dz, Math.min(1, d * 0.8)), run: false } : {});
            if (p.ground?.owner === e) onSteps++;
          }
          log.push(['mitgefahren', L.rideOn, onSteps, +Math.hypot(p.pos.x - x0, p.pos.z - z0).toFixed(2)]);
          if (onSteps < L.steps * 0.8) log.push(['FEHLER: abgerutscht', onSteps]);
          continue;
        }
        if (L.star !== undefined) {
          const n = this.chase('star', { filter: (e) => e.index === L.star, max: 900 });
          log.push(['stern', L.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (L.chaseKind) { const n = this.chase(L.chaseKind, { max: L.max ?? 2400, run: L.run, radius: L.radius, jump: L.noJump ? false : undefined }); log.push(['jagd', L.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (L.untilClose) {
          // warten (auf einer Plattform mitfahren), bis zwei bewegte Objekte in x nah beieinander sind
          const [a, b] = L.untilClose;
          let k = 0;
          for (; k < (L.max ?? 1600); k++) {
            const qa = this.namedPos(a), qb = this.namedPos(b);
            if (Math.abs(qa[0] - qb[0]) < (L.d ?? 1.2) && k > 2) break;
            const r = L.ride ? this.namedPos(L.ride) : null;
            if (r) { const dx = r[0] - p.pos.x, dz = r[1] - p.pos.z, d = Math.hypot(dx, dz); tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {}); } else tick({});
          }
          log.push(['warte nah', a, b, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= (L.max ?? 1600)) log.push(['FEHLER: nicht nah', a, b]);
          continue;
        }
        if (L.untilNamed) {
          let k = 0;
          for (; k < (L.max ?? 1500); k++) {
            const q = this.namedPos(L.untilNamed);
            const v = L.axis === 'x' ? q[0] : L.axis === 'y' ? q[2] : q[1];
            if ((L.lt !== undefined && v < L.lt) || (L.gt !== undefined && v > L.gt) || (L.near !== undefined && Math.abs(v - L.near) < (L.d ?? 0.6) && k > 2)) break;
            if (L.ride) { const r = this.namedPos(L.ride === true ? L.untilNamed : L.ride); const dx = r[0] - p.pos.x, dz = r[1] - p.pos.z, d = Math.hypot(dx, dz); tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(1, d)), run: false } : {}); }
            else tick(L.hold ?? {});
          }
          log.push(['warte', L.untilNamed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= (L.max ?? 1500)) log.push(['FEHLER: Lage nicht erreicht', L.untilNamed]);
          continue;
        }
        const max = L.max ?? 900;
        const within = L.within ?? 0.6;
        const holdJ = L.jump === true ? 40 : (L.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        if (holdJ && L.to && !L.push && !L.toNamed) jumps.push([L.name ?? `leg${li}`, this.landingVisible(L.to[0], L.to[1])]);
        if (L.push) {
          for (let k = 0; k < L.push; k++) {
            const d = L.dir ? this.stick(L.dir[0], L.dir[1]) : L.to ? this.stick(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : { x: 0, y: 1 };
            tick({ ...d, run: false, jump: k < holdJ });
          }
          log.push([L.name ?? `push${li}`, L.push, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (L.press) { tick({ action: true }); }
        let best = Infinity, still = 0, auto = 0, j0 = L.jumpAt ? null : 0;
        const target = () => {
          if (L.toNamed) { const q = this.namedPos(L.toNamed); if (q) return [q[0] + (L.off?.[0] ?? 0), q[1] + (L.off?.[1] ?? 0)]; }
          return L.to;
        };
        for (; i < max; i++) {
          if (p.dead || c.level.runtime.status !== 'play') break;
          if (rode && L.endOnRide !== false) break;
          const T = target();
          const dx = T[0] - p.pos.x, dz = T[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          const fd = L.to ? Math.hypot(L.to[0] - p.pos.x, L.to[1] - p.pos.z) : dist;
          if (fd < best - 0.05) { best = fd; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && L.autoJump !== false && !L.airOnly) { auto = 26; still = 0; autoJumps++; }
          const done = fd < within && (!holdJ || L.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0 && (!L.airOnly || p.mode === 'ground')) break;
          let mag = L.slow ?? 1;
          let st;
          if (p.mode === 'air' && (holdJ || L.airOnly) && j0 !== null) {
            const k = 2.6, vmax = L.vmax ?? 11;
            let vx = dx * k, vz = dz * k;
            const vl = Math.hypot(vx, vz);
            if (vl > vmax) { vx *= vmax / vl; vz *= vmax / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= L.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: L.run ?? true, jump, ...(L.hold ?? {}) });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([L.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, p.power]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, L.to ?? L.toNamed]); break; }
      }
      c.setInput({});
      p.invuln = hold ? 0 : p.invuln;
      return { log, jumps, autoJumps, track, steps, hurt, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: c.level.runtime.status, info: p.info(), rt: c.level.runtime.info(), skate: !!p.skate, inv0 };
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
      return !hit || hit.t > 0.97;
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.escaped && !x.hidden && !x.caught && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || c.level.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of c.level.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best && d < (o.radius ?? 40)) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const st = this.stick(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 2.4 && dy > -0.5) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...st, run: dist > 1.5 || o.run, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => c.level.runtime.info(),
    info: () => P().info(),
    named: (id) => { const e = c.level.named.get(id); return e ? { kind: e.kind, alive: e.alive, defeated: !!e.defeated, state: e.state, broken: !!e.broken, info: e.info?.() } : null; },
    kinds: () => { const m = {}; for (const e of c.level.entities) m[e.kind] = (m[e.kind] ?? 0) + (e.count > 1 && e.members ? 0 : 1); return m; },
    minis: () => c.level.entities.filter((e) => e.kind === 'pilzling' && e.mini).length,
    defeated: (kind) => c.level.entities.filter((e) => e.kind === kind && e.defeated).length,
    lives: () => c.level.runtime.save.lives,
  };
  window.__w3 = W;
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
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
        await page.waitForFunction(() => window.__course && window.__course.level && window.__game.scene.isActive('CourseUI'), null, { timeout: 90000 });
        break;
      } catch (err) {
        if (attempt === 1) {
          console.log(`Level ${id} startet nicht. Konsole:`);
          for (const x of errors) console.log('  ', x);
          return false;
        }
      }
    }
    loaded = id;
  }
  await page.waitForTimeout(300);
  await sc(install);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w3[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 3, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w3a_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: Zeitlimit ${R.timeLimit} s`, meta.timeLimit === R.timeLimit);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  if (R.minis !== undefined) { const m = await W('minis'); check(`${id}: davon ${R.minis} Mini-Pilzlinge (${m})`, m === R.minis); }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of SHOTS_ONLY || (ONLY && !process.env.ROUTE) ? [] : ['lotti', 'greta']) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    if (hero === 'lotti') {
      const hidden = res.jumps.filter((j) => !j[1]).map((j) => j[0]);
      check(`${id}: alle ${res.jumps.length} Pflichtsprünge mit sichtbarem Landepunkt${hidden.length ? ' – verdeckt: ' + hidden.join(', ') : ''}`, hidden.length === 0);
    }
    const lim = Math.min(180, R.timeLimit * 0.6);
    check(`${id}: ${hero} Zeit bis zum Ziel < ${lim} s (${res.time.toFixed(1)} s)`, reached && res.time < lim);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of SHOTS_ONLY ? [] : pick(R.targets)) {
    for (const hero of t.heroes ?? ['lotti']) {
      await load(id);
      await W('place', t.from, { hero, power: t.power, settle: 10 });
      let res = null;
      if (t.legs) res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (t.expectPower && res && res.log.every((l) => l[7] !== t.expectPower)) ok = false;
      if ((!ok || process.env.VERBOSE) && res) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot && ok) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY ? [] : pick(R.extra ?? [])) {
    for (const hero of t.heroes ?? ['lotti', 'greta']) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, power: t.power, skate: t.skate, settle: 10 });
      const res = await W('drive', t.legs, { invuln: t.vulnerable ? false : undefined });
      const inR = (v, r) => (r === undefined ? true : Array.isArray(r) ? v >= r[0] && v <= r[1] : v >= r);
      const lives1 = await W('lives');
      let ok = inR(res.info.x, t.expectX) && inR(res.info.y, t.expectY) && inR(res.info.z, t.expectZ) && !res.dead;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectSkate) ok = ok && res.skate;
      if (t.expectNotHurt) ok = ok && res.hurt === 0;
      if (t.expectBroken) { const nm = await W('named', t.expectBroken); res.log.push(['zerbrochen?', t.expectBroken, JSON.stringify(nm)]); ok = ok && (!!nm?.broken || nm?.alive === false); }
      if (t.expectDefeated) { const nm = await W('named', t.expectDefeated); res.log.push(['besiegt?', t.expectDefeated, JSON.stringify(nm)]); ok = ok && !!nm?.defeated; }
      if (t.expectDefeatedKind) { const n = await W('defeated', t.expectDefeatedKind[0]); res.log.push(['besiegt', t.expectDefeatedKind[0], n]); ok = ok && n >= t.expectDefeatedKind[1]; }
      if (t.expectNamedState) { const nm = await W('named', t.expectNamedState[0]); res.log.push(['zustand', JSON.stringify(nm)]); ok = ok && t.expectNamedState[1].includes(nm?.state); }
      if (t.expectInfo) { const v = await sc(([id, k]) => window.__course.level.named.get(id)?.info?.()?.[k], [t.expectInfo[0], t.expectInfo[1]]); res.log.push(['info', ...t.expectInfo, v]); ok = ok && v >= t.expectInfo[2]; }
      if (t.expectNamed) { const v = await sc(([id, k]) => window.__course.level.named.get(id)?.[k], [t.expectNamed[0], t.expectNamed[1]]); res.log.push(['benannt', ...t.expectNamed, v]); ok = ok && v === t.expectNamed[2]; }
      if (t.expectDead) ok = res.log.some((l) => l[0] === 'TOD' && l[1] === 'time');
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, bei ${res.info.x.toFixed(1)}, ${res.info.y.toFixed(1)}, ${res.info.z.toFixed(1)}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0})`, ok);
    }
  }

  // ------------------------------------------------ Screenshots je Abschnitt aus der Spielkamera
  if (ONLY) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null] of R.shots) {
    await W('place', pos, { settle: 10 });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.setInput(inp); c.step(n); }, [steps, input ?? {}]);
    await shot(`${id}_${name}`);
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
