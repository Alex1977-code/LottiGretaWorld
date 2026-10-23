// Welt 3, Level 3-5 „Leuchtturmriff“ (Lagune, Unterwasser) und 3-7 „Ahornklamm“ (Herbstwald, Schalttafeln):
// Laden ohne Konsolenfehler/-warnungen, Gegnerzahlen, Routen-Bot (Lotti und Greta von Start bis Zielmast,
// deterministisch über __course.setInput/step: Tauchen unter dem Felsbogen, steigendes Wasser, Glasrohre, Glasrohr-
// Kanone; Schalttafeln mit Schaltblock, Weiche nach Neigung, Umstieg), alle Sterne und der Stempel mit der echten
// Mechanik (Flutkammer, Kanonen-Helm sprengt den Wandriss → goldene Röhre, unsichtbare Blöcke über der dritten Säule,
// versteckter Gang; Zeit-Uhren-Plattform → Fallraum, Tafel links kippen und darunter durchducken, Diagonalschiene
// ganz rechts, Sprung auf die tiefere Plattform), Extras (Extraleben-Geheimnisse, Zeit-Uhren, Laubhaufen, Neustart
// setzt das Wasser zurück), Zeit bis zum Ziel, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass,
// Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w3d_*.png).
// Aufruf (nach npm run build): PORT_BASE=5600 node tests/course_w3d.mjs [3-5|3-7]
//   SHOTS_ONLY=1 → nur Bilder/Kennzahlen; ONLY=<Text> → nur Ziele/Extras mit diesem Namensteil (ohne Route/Bilder)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Unter Wasser regelt er
// die Tiefe mit Ducken (abtauchen) und Sprung (Schwimmzug); auf Schalttafeln hält er eine Stellung relativ zur Tafel
// (Neigung an Weichen) und duckt sich an festgelegten Stellen. Die Figur ist während der Fahrt unverwundbar
// (Abpraller zählen weiter), damit nur Geometrie und Mechanik geprüft werden.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max } · { wait } ·
// { hop } (Sprung auf der Stelle) · { stomp } · { crouch } (Röhre) · { action } · { star: i } · { chaseKind } ·
// { dive: [x, z], y, within } (unter Wasser in Tiefe y) · { swimOut: [x, z] } (an der Oberfläche hin und hinausspringen) ·
// { ride: tafel-id, off: [dx, dz], until: 'stopped' | { axis, lt|gt }, crouchZ: [z0, z1], max } ·
// { until: name } (Bedingung, siehe COND) · { aim: [dx, dz] } (Blickrichtung setzen) · { face, fire } (Kanone)
const ROUTES = {
  '3-5': {
    start: [0, 1, 8],
    enemies: { pilzling_reifen: 5, flossling: 12, stachelfisch: 13, muenzmarder: 4 },
    main: [
      { name: 'Strand', to: [-1.6, -3.6] },
      { name: 'Röhre 1', to: [-1.6, -12.4], within: 0.4 },
      { name: 'Röhre 2', to: [0.6, -18], jump: 30, within: 0.5 },
      { to: [0.6, -25.4], within: 0.5 },
      { name: 'Riffkante', to: [0.4, -30], jump: 20 },
      { to: [0, -37.2] },
      { name: 'Tiefwasser', to: [0, -40.5], within: 0.8 },
      { name: 'abtauchen', dive: [0, -60], y: -5.6, within: 1 },
      { dive: [0, -88], y: -6.4, within: 1 },
      { name: 'Felsbogen', dive: [0, -97], y: -6.4, within: 1 },
      { name: 'Flutkammer', until: 'flutOben', max: 1200, dive: [0, -103], y: 6 },
      { name: 'Sims → Glasrohr', swimOut: [0, -111], ride: false },
      { name: 'Bucht', to: [0, -136] },
      { name: 'Holzsteg', to: [0, -146.6], run: false },
      { name: 'Checkpoint', to: [0, -157] },
      { name: 'Stachelwand', to: [0, -164.8], within: 0.6 },
      { to: [0, -166.5], within: 0.8 },
      { name: 'Kanal', dive: [-5.6, -176], y: -0.3, within: 1 },
      { dive: [5.6, -188], y: -0.3, within: 1 },
      { dive: [-5.4, -203], y: -0.3, within: 1 },
      { dive: [3.4, -218], y: -0.3, within: 1 },
      { name: 'Ausgang → Glasrohr-Kanone', swimOut: [0, -228.4] },
      { name: 'Zielmast', to: [0, -245], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 1: Flutkammer – mit steigendem Wasser in die Felsnische', star: 0, from: [0, -2.6, -99],
        legs: [{ until: 'flutOben', max: 1400, dive: [-3, -102.5], y: 6 }, { swimOut: [-6, -102.6] }, { wait: 30 }], shot: 'stern1' },
      { name: 'Stern 2: Kanonen-Helm sprengt den Wandriss → goldene Röhre → Goldraum', star: 1, from: [3.6, 1, -132.6],
        legs: [{ to: [3.6, -134.4], within: 0.3, run: false }, { expect: 'helm' }, { to: [11.5, -146.2], within: 0.3, run: false }, { aim: [0, -1] },
          { fire: 8 }, { wait: 120 }, { expect: 'rissWeg' }, { to: [11.5, -152.6], jump: 24, within: 0.25, run: false }, { crouch: 4 },
          { to: [70.6, -153.4], within: 0.4 }, { to: [72, -153.4], jump: 30, within: 0.3, run: false }, { wait: 30 }], shot: 'stern2' },
      { name: 'Stern 3: von der dritten Säule unsichtbare Blöcke hinauf zum versteckten Raum', star: 2, from: [-1, 1.4, -210.4],
        legs: [{ hop: 26 }, { wait: 30 }, { expect: 'kette1' }, { to: [-1, -211.4], within: 0.25, run: false }, { to: [-1, -210], jump: 40, within: 0.3, run: false },
          { wait: 20 }, { to: [1.6, -211], jump: 40, within: 0.3, run: false }, { wait: 20 }, { to: [4.2, -212], jump: 40, within: 0.3, run: false }, { wait: 20 },
          { to: [8, -214], jump: 30, within: 0.4 }, { to: [12.6, -214.6], within: 0.4 }, { star: 2 }], shot: 'stern3' },
      { name: 'Stempel: versteckter Gang (Glasrohr in der Wrackklippe) nach oben', from: [-5, 1, -161], stamp: true,
        legs: [{ to: [-8.2, -161], within: 0.3 }, { wait: 60 }, { to: [-16, -164], within: 0.3 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über der Sandburg', from: [-6.6, 1, 2.6], heroes: ['lotti'],
        legs: [{ to: [-6.6, 1.2], within: 0.15, run: false }, { hop: 30 }, { wait: 60 }, { chaseKind: 'powerup' }], expectLives: 1 },
      { name: 'Neustart vor dem Checkpoint setzt die Flutkammer zurück', from: [0, -2.6, -99], heroes: ['lotti'],
        legs: [{ until: 'flutOben', max: 1400, dive: [0, -102], y: 6 }, { die: true }, { wait: 400 }, { expect: 'flutUnten' }] },
      { name: 'Münzmarder am Strand einholen', from: [5, 1, 5], heroes: ['lotti'],
        legs: [{ chaseId: 'm1', kind: 'muenzmarder', max: 1500 }, { collectKind: 'muenze_flug', radius: 12, max: 700 }], expectCoins: 5 },
    ],
    shots: [
      ['start', [0, 1, 8]],
      ['strand', [-5, 1, 3], 0, null, Math.PI * 0.75],
      ['roehren', [-1.6, 1.2, -8]],
      ['riff', [0, 1, -33]],
      ['tiefwasser', [0, -4, -56]],
      ['flutkammer', [0, -4, -101]],
      ['bucht', [0, 1, -134]],
      ['riss', [9, 1, -146]],
      ['checkpoint', [0, 1, -158]],
      ['kanal', [0, -0.2, -178]],
      ['saeulen', [2.5, 1.4, -196]],
      ['ausgang', [0, 1, -228]],
      ['ziel', [0, 5, -240]],
      ['goldraum', [70, 1.4, -150]],
      ['stempelklippe', [-13, 8, -160]],
      ['raum', [11, 8.4, -214]],
    ],
  },
  '3-7': {
    start: [0, 1, 8],
    enemies: { brummer: 10, funkenkaefer: 7, funkenlaeufer: 5, muenzmarder: 1 },
    main: [
      { name: 'Holzbrücke', to: [0, -4.4] },
      { name: 'Tafel 1', to: [0, -7.6], within: 0.3, run: false },
      { ride: 't1', off: [0, 0], until: 'stopped', max: 2400 },
      { name: 'Sprung auf Tafel 2', to: [0.5, -30.8], jump: 30, within: 0.4 },
      { wait: 60 },
      { name: 'Schaltblock 1', hop: 22 },
      { wait: 30 },
      { ride: 't2', off: [0, 0], until: 'stopped', max: 2400 },
      { name: 'Insel 1', to: [0, -50.6] },
      { name: 'Tafel 3', to: [0, -58], within: 0.3, run: false },
      { ride: 't3', off: [-0.9, 0], until: 'stopped', max: 3000 },
      { name: 'Schaltblock am Prellbock', to: [0, -90], within: 0.2, run: false },
      { hop: 22 },
      { wait: 20 },
      { name: 'zurück, links in die Schleife', ride: 't3', off: [-1.2, 0], until: 'stopped', max: 4000 },
      { name: 'Checkpoint', to: [-9.5, -106] },
      { name: 'Tafel 4', to: [-9.5, -113.8], within: 0.3, run: false },
      { name: 'hinter dem Wasserfall', ride: 't4', off: [0, 0], until: 'stopped', max: 4000 },
      { name: 'Umstieg', to: [13, -138] },
      { name: 'Tafel 5', to: [13, -144], within: 0.3, run: false },
      { ride: 't5', off: [0, 0], until: { axis: 'z', lt: -149.6 }, max: 2000 },
      { name: 'Funkenläufer rechts ausweichen', ride: 't5', off: [-0.9, 0], until: 'stopped', max: 4000 },
      { name: 'Insel 5', to: [12, -190] },
      { name: 'Tafel 6', to: [12, -197], within: 0.3, run: false },
      { ride: 't6', off: [0, 0], until: 'stopped', max: 3000 },
      { name: 'Zielinsel', to: [8.4, -213.6] },
      { name: 'Zielmast', to: [-2.6, -227], within: 0.2 },
    ],
    targets: [
      { name: 'Stern 1: dritte Fahrt – Sprung auf die Uhren-Plattform, Röhre → Fallraum', star: 0, from: [0, 1, -57.6],
        legs: [{ ride: 't3', off: [1.1, 0], until: { axis: 'z', lt: -76.8 }, max: 2000 }, { to: [5, -79.4], jump: 34, within: 0.5 }, { to: [7.4, -79.4], within: 0.3, run: false },
          { expect: 'uhren3' }, { to: [7.3, -77.4], jump: 20, within: 0.25, run: false }, { crouch: 4 }, { to: [78.2, -80], within: 0.4, land: false, run: false, max: 300 },
          { fall: [80, -80], max: 600 }, { wait: 30 }], shot: 'stern1' },
      { name: 'Stern 2: Tafel links kippen, unter der Felsnase durchducken', star: 1, from: [13, 1, -139],
        legs: [{ to: [13, -144], within: 0.3, run: false }, { ride: 't5', off: [-1.2, 0], until: { axis: 'z', lt: -152 }, max: 2000 }, { ride: 't5', off: [0, 0], until: { axis: 'z', lt: -168 }, crouchZ: [-157, -166.5], max: 3000 }, { wait: 10 }], shot: 'stern2', expectAlive: true },
      { name: 'Ohne Ducken reißt die Felsnase die Figur von der Tafel', star: 1, expectNot: true, from: [13, 1, -139],
        legs: [{ to: [13, -144], within: 0.3, run: false }, { ride: 't5', off: [-1.2, 0], until: { axis: 'z', lt: -152 }, max: 2000 }, { ride: 't5', off: [0, 0], until: { axis: 'z', lt: -168 }, max: 1800 }] },
      { name: 'Stern 3: Diagonalschiene ganz rechts', star: 2, from: [12, 1, -192],
        legs: [{ to: [12, -197], within: 0.3, run: false }, { ride: 't6', off: [1.2, 0], until: 'stopped', max: 3000 }, { to: [26, -213], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }], shot: 'stern3' },
      { name: 'Stempel: nach Stern 3 links auf die tiefere Plattform', from: [12, 1, -192], stamp: true,
        legs: [{ to: [12, -197], within: 0.3, run: false }, { ride: 't6', off: [1.2, 0], until: 'stopped', max: 3000 }, { to: [21, -214.4], jump: 20, within: 0.4 }, { to: [20.6, -214.4], within: 0.3 }, { wait: 20 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: Laubhaufen unter der Eiche stampfen', from: [-6.6, 1, 4.6], heroes: ['lotti'],
        legs: [{ to: [-6.6, 3.8], within: 0.15, run: false }, { poundAt: [-6.6, 2.8] }, { expect: 'laubWeg' }, { wait: 40 }, { chaseKind: 'powerup' }], expectLives: 1 },
      { name: 'Zeit-Uhren: drei Uhren geben +30 s', from: [4, 2.2, -78], heroes: ['lotti'],
        legs: [{ to: [4.4, -79.4], within: 0.3, run: false }, { to: [7.4, -79.4], within: 0.3, run: false }, { expect: 'uhren3' }], expectTime: 520 },
      { name: 'Laubhaufen: Hineinrennen wirbelt das Laub auf, Münzen', from: [-1, 1, 5], heroes: ['lotti'],
        legs: [{ to: [-6.5, 4] }, { to: [-9, 3.4] }], expectCoins: 3 },
      { name: 'Ohne Schaltblock fährt Tafel 2 nicht weiter', from: [0.5, 1.4, -30.6], heroes: ['lotti'],
        legs: [{ wait: 360 }, { expect: 't2steht' }] },
      { name: 'Ohne Neigung fährt Tafel 3 zurück zum Anfang (Schaltblock am Start hilft)', from: [0, 1, -57.6], heroes: ['lotti'],
        legs: [{ to: [0, -58], within: 0.3, run: false }, { ride: 't3', off: [0, 0], until: 'stopped', max: 3000 }, { hop: 22 }, { wait: 20 },
          { ride: 't3', off: [0, 0], until: 'stopped', max: 4000 }, { expect: 't3amStart' }] },
      { name: 'Schaltblock-Netz 5: am Ende umkehren, rückwärts in den Seitenast, Stern 2', from: [13, 1, -139], heroes: ['lotti'], star: 1,
        legs: [{ to: [13, -144], within: 0.3, run: false }, { ride: 't5', off: [0, 0], until: { axis: 'z', lt: -149.6 }, max: 2000 },
          { ride: 't5', off: [-0.9, 0], until: 'stopped', max: 4000 }, { to: [13, -185.9], within: 0.2, run: false }, { hop: 22 }, { wait: 20 },
          { ride: 't5', off: [-1.2, 0], until: { axis: 'z', gt: -171.5 }, max: 3000 }, { ride: 't5', off: [0, 0], until: { axis: 'z', gt: -150 }, crouchZ: [-157, -166.5], max: 4000 }] },
    ],
    shots: [
      ['start', [0, 1, 8]],
      ['wiese', [-4, 1, 4], 0, null, Math.PI * 0.8],
      ['tafel1', [0, 1.05, -7.8], 0, null, Math.PI / 2, 't1', 200],
      ['tafel2', [0.5, 1, -30.6]],
      ['funkenzone', [0, 1, -52]],
      ['uhren', [5, 2.2, -78.4]],
      ['tafel3', [0, 1.05, -58], 0, null, Math.PI / 2, 't3', 300],
      ['checkpoint', [-9.5, 1, -106]],
      ['wasserfall', [-9.5, 1.05, -114], 0, null, Math.PI / 2, 't4', 520],
      ['umstieg', [13, 1, -139]],
      ['weiche', [13, 1.05, -144], 0, null, Math.PI / 2, 't5', 160],
      ['insel5', [12, 1, -191]],
      ['diagonale', [12, 1.05, -197], 0, null, Math.PI / 2, 't6', 160],
      ['ziel', [-2, 1, -214]],
      ['fallraum', [80, 20, -80]],
    ],
  },
};

const PORT = 4384;   // 4371 nutzt tests/course_w3a.mjs
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : ['3-5', '3-7'];
const SHOTS_ONLY = !!process.env.SHOTS_ONLY;
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
// Teile (Rechnerlast: je Lauf höchstens ≈ 10 min): PARTS=route,targets,extra,shots (Standard alle)
const PARTS = new Set((process.env.PARTS ?? 'route,targets,extra,shots').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');

/** Hilfen in der Seite: Figur setzen, Bot-Fahrt, Zustand. */
function install() {
  const c = window.__course;
  c.setManual(true);
  c.level.muted = true;
  window.__game.scene.getScene('CourseUI')?.touchCtl?.setVisible(false);
  const P = () => c.player;
  const L = c.level;
  const COND = {
    flutOben: () => (L.waterLevel?.('flut') ?? 0) > 4.95,
    flutUnten: () => (L.waterLevel?.('flut') ?? 9) < 0.05 && L.named.get('flut_kammer')?.state === 'ruhig',
    helm: () => P().helmet === 'kanone',
    rissWeg: () => !!L.named.get('riss')?.broken,
    rissDa: () => !L.named.get('riss')?.broken,
    kette1: () => (L.named.get('kette')?.shown ?? 0) >= 1,
    uhren3: () => (L.named.get('uhren')?.got ?? 0) === 3,
    t2steht: () => { const b = L.named.get('t2'); return !!b && Math.abs(b.pos.z + 30.6) < 0.2 && b.v < 0.01; },
    laubWeg: () => (L.named.get('laubhaufen')?.gone ?? 0) > 0,
    t3amStart: () => { const b = L.named.get('t3'); return !!b && b.pos.z > -57 && b.stopped; },
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
      return p.info();
    },
    stick(dx, dz, mag = 1) {
      const l = Math.hypot(dx, dz) || 1;
      const wx = dx / l, wz = dz / l;
      const cy = L.controlYaw ?? 0, co = Math.cos(cy), si = Math.sin(cy);
      return { x: (co * wx - si * wz) * mag, y: (-si * wx - co * wz) * mag };
    },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      let rode = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          rode = true;
        }
      };
      const depthCtl = (ty, k) => {
        // unter Wasser: zu hoch → ducken (abtauchen); zu tief → Schwimmzug; nahe → ruhig (getaucht: langsames Sinken)
        if (p.mode !== 'swim') return { crouch: false, jump: false };
        if (p.pos.y > ty + 0.35) return { crouch: true, jump: false };
        if (p.pos.y < ty - 0.4) return { crouch: false, jump: (k % 26) < 3 };
        return { crouch: false, jump: p.vel.y < -0.5 && (k % 40) < 2 };
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        rode = false;
        if (Lg.wait && !Lg.to && !Lg.dive) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.action) { tick({ action: true }); tick({}); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.die) { p.invuln = 0; p.die('fall'); for (let i = 0; i < 30; i++) { c.setInput({}); c.step(1); } continue; }
        if (Lg.aim) { p.yaw = Math.atan2(-Lg.aim[1], Lg.aim[0]); tick({}); continue; }
        if (Lg.fire) { for (let i = 0; i < Lg.fire; i++) { p.yaw = Math.atan2(1, 0); tick({ action: true }); for (let k = 0; k < 30; k++) tick({}); } continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.poundAt) {
          // abspringen, über das Ziel lenken, dort Stampfattacke
          let k = 0, pounding = false;
          for (; k < 300; k++) {
            const dx = Lg.poundAt[0] - p.pos.x, dz = Lg.poundAt[1] - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.3 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...this.stick(dx, dz, Math.min(1, d * 1.2)), jump: k < 26, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: true });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseId) { const n = this.chase(Lg.kind, { max: Lg.max ?? 1500, run: true, jump: false, filter: (e) => e.spec?.id === Lg.chaseId }); const e = L.named.get(Lg.chaseId); log.push(['jagd', Lg.chaseId, n, JSON.stringify(e?.info?.())]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.collectKind) {
          let k = 0;
          for (; k < (Lg.max ?? 600); k++) {
            let e = null, best = Infinity;
            for (const x of L.entities) {
              if (x.kind !== Lg.collectKind || !x.alive || x.removed) continue;
              const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z);
              if (d < best && d < (Lg.radius ?? 12) && Math.abs(x.pos.y - p.pos.y) < 2.5 && c.world.raycastDown(x.pos.x, x.pos.y + 0.5, x.pos.z, 3)) { best = d; e = x; }
            }
            if (!e) break;
            tick({ ...this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z, Math.min(1, 0.35 + best * 0.4)), run: false });
          }
          log.push(['eingesammelt', Lg.collectKind, k]);
          continue;
        }
        if (Lg.ride && !Lg.swimOut) {
          // Auf einer Schalttafel mitfahren: Stellung off (Welt-x/z relativ zur Tafelmitte) halten, an crouchZ ducken
          const b = L.named.get(Lg.ride);
          let k = 0, moved = false, stillN = 0;
          const max = Lg.max ?? 3000;
          for (; k < max; k++) {
            if (p.dead || L.runtime.status !== 'play') break;
            const tx = b.pos.x + Lg.off[0], tz = b.pos.z + Lg.off[1];
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const crouch = !!Lg.crouchZ && p.pos.z < Lg.crouchZ[0] && p.pos.z > Lg.crouchZ[1];
            let jump = false;
            if (Lg.hopNear) { const f = L.named.get(Lg.hopNear); if (f && Math.hypot(f.pos.x - p.pos.x, f.pos.z - p.pos.z) < 1.9 && p.mode === 'ground') jump = true; }
            tick(d > 0.12 && !crouch ? { ...this.stick(dx, dz, Math.min(0.55, d * 1.4)), run: false, jump } : { crouch, jump });
            if (b.v > 0.3) moved = true;
            if (Lg.until === 'stopped') { if (moved && b.v < 0.01) { if (++stillN > 20) break; } else stillN = 0; }
            else if (Lg.until) { const v = Lg.until.axis === 'x' ? p.pos.x : p.pos.z; if ((Lg.until.lt !== undefined && v < Lg.until.lt) || (Lg.until.gt !== undefined && v > Lg.until.gt)) break; }
          }
          log.push([Lg.name ?? `fahrt ${Lg.ride}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, JSON.stringify(b.info())]);
          if (k >= max) log.push(['FEHLER: Fahrt endet nicht', Lg.ride]);
          continue;
        }
        if (Lg.fall) {
          // im freien Fall zum Ziel lenken, bis gelandet
          let k = 0;
          for (; k < (Lg.max ?? 600); k++) {
            // Wunschgeschwindigkeit zum Ziel (bremst davor ab), Stick = Abweichung
            const dx = Lg.fall[0] - p.pos.x, dz = Lg.fall[1] - p.pos.z;
            let vx = dx * 2.2, vz = dz * 2.2; const vl = Math.hypot(vx, vz); if (vl > 5) { vx *= 5 / vl; vz *= 5 / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            tick(el > 0.08 ? { ...this.stick(ex, ez, Math.min(1, el / 2.5)), run: false } : {});
            if (k > 10 && p.mode === 'ground') break;
          }
          log.push(['fall', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.dive) {
          // unter Wasser in Tiefe y zum Ziel schwimmen (until: Bedingung statt Ankunft)
          let k = 0;
          const max = Lg.max ?? 2400;
          for (; k < max; k++) {
            if (p.dead) break;
            const dx = Lg.dive[0] - p.pos.x, dz = Lg.dive[1] - p.pos.z, d = Math.hypot(dx, dz);
            if (Lg.until ? COND[Lg.until]() && k > 10 : d < (Lg.within ?? 1)) break;
            const ty = Lg.until && COND[Lg.until] ? Lg.y : Lg.y;
            const dc = depthCtl(ty, k);
            tick({ ...(d > 0.3 ? this.stick(dx, dz, Math.min(1, d)) : {}), ...dc, run: false });
          }
          log.push([Lg.name ?? `tauchen${li}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, L.waterLevel?.('flut')]);
          if (k >= max) { log.push(['FEHLER: Tauchziel nicht erreicht', li]); break; }
          continue;
        }
        if (Lg.swimOut) {
          // an der Oberfläche zum Rand und hinausspringen (Aussprung), dann auf den Punkt laufen
          let k = 0;
          for (; k < 1500; k++) {
            if (p.dead) break;
            const dx = Lg.swimOut[0] - p.pos.x, dz = Lg.swimOut[1] - p.pos.z, d = Math.hypot(dx, dz);
            if (p.mode === 'ground' && d < 0.6) break;
            if (rode) break;
            if (p.mode === 'swim') {
              const head = (p.water?.top ?? 0) - (p.pos.y + p.half.y * 2);
              const near = d < 4.5;
              tick({ ...this.stick(dx, dz, 1), crouch: false, jump: near ? (k % 30) < 22 : (head > 0.2 && (k % 26) < 3), run: false });
            } else tick({ ...this.stick(dx, dz, Math.min(1, d)), jump: p.mode === 'air' && p.vel.y > 0, run: false });
          }
          log.push([Lg.name ?? `hinaus${li}`, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          if (k >= 1500) { log.push(['FEHLER: nicht aus dem Wasser', li]); break; }
          continue;
        }
        if (Lg.until && !Lg.to) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          if (rode) break;
          const dx = Lg.to[0] - p.pos.x, dz = Lg.to[1] - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) {
            let vx = dx * 2.6, vz = dz * 2.6;
            const vl = Math.hypot(vx, vz);
            if (vl > 11) { vx *= 11 / vl; vz *= 11 / vl; }
            const ex = vx - p.vel.x, ez = vz - p.vel.z, el = Math.hypot(ex, ez);
            st = el > 0.05 ? this.stick(ex, ez, Math.min(1, el / 2.5)) : { x: 0, y: 0 };
          } else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          // im Wasser: Schwimmzüge bzw. Aussprung zum Ziel
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, info: p.info(), rt: L.runtime.info() };
    },
    chase(kind, o = {}) {
      const p = P();
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.escaped && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        p.invuln = Math.max(p.invuln, 5);
        c.setInput({ ...this.stick(dx, dz), run: dist > 1.5 || o.run, jump });
        c.step(1);
        if (p.mode === 'script') { let k = 0; while (p.mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    /** Figur auf eine Tafel stellen, Tafel ein Stück fahren lassen (Bilder). */
    rideFor(id, steps) { const b = L.named.get(id); for (let i = 0; i < steps; i++) { P().invuln = 5; const p = P(); const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z; c.setInput(Math.hypot(dx, dz) > 0.2 ? { ...this.stick(dx, dz, 0.4) } : {}); c.step(1); } c.setInput({}); return b.info(); },
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
    await page.goto(`http://localhost:${port}/?course=${id}&scale=2&adapt=0`, { waitUntil: 'load', timeout: 120000 });
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

const W = (name, ...args) => sc(([n, a]) => window.__w3[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 8, f0, { timeout: 90000 });
  // Unterwasser-Stimmung des vorigen Bildes abklingen lassen (außer die Figur ist selbst unter Wasser)
  await page.waitForFunction(() => { const c = window.__course; return c.player.mode === 'swim' || (c.view.mood?.info?.().water ?? 0) < 0.02; }, null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w3d_${name}.png` });
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, stars: d.stars.length }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  check(`${id}: 3 Sterne, Stempel, 500 s`, meta.stars === 3 && kinds.stamp === 1 && meta.timeLimit === 500);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  for (const hero of SHOTS_ONLY || ONLY || !PARTS.has('route') ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of SHOTS_ONLY || !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.expectAlive && res.dead) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero})`, !!ok);
      if (t.shot && hero === 'lotti') await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of SHOTS_ONLY || !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10 });
      const res = await W('drive', t.legs, {});
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectTime !== undefined) ok = ok && res.rt.time >= t.expectTime;
      if (t.star !== undefined) ok = ok && !!res.rt.stars[t.star];
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Zeit ${res.rt.time})`, ok);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2, ride = null, rideSteps = 150] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (ride) await W('rideFor', ride, rideSteps);
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
