// Welt 5, Level 5-7 „Auf Zehenspitzen durch die Glutfestung“ (Schleich-Festung: Suchscheinwerfer, entdeckt → Suchkopf-Welle,
// Hackbeil-Pilze), 5-Zug „Bimmelbahn voller Bitcoins“ (Bonus-Autoscroller: Goldzug voller Münzen, geheime Röhre, goldener
// Schalter in der Felsspalte, Glückshaus am Ende) und 5-Burg „Rumpeltempel des Kippquader-Königs“ (Ruinen-Tempel mit
// Kippquadern, Boss Kippquader-König): Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel,
// Gegnerzahlen), Routen-Bot (Lotti und Greta von Start bis Zielmast, deterministisch über __course.setInput/step, echte
// Eingaben – kein Teleport auf der Route), alle Sterne und der Stempel mit der echten Mechanik samt Gegenproben, Extras,
// Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera
// (tests/out/w5d_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5d.mjs [5-7|5-Zug|5-Burg]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } (hinspringen, Stampfattacke) · { crouch } (Röhre) ·
// { star: i } · { chaseKind, ids } · { expect: Bedingung } · { until: Bedingung, max } ·
// { bounce: [x, z], at: [x, z], steerBelow } (Sprungfeder) · { lure: { at: [x, z], until, jumpDist } } (im Licht warten, bis
// ein Suchkopf kommt; kurz vor ihm hochspringen) · { warp: [x, z] } (in eine Warp-/Rätselbox springen) ·
// { stompAll: Id-Anfang } · { car: [Fahrzeug, dc, dx], … } (Wegpunkt relativ zu einem fahrenden Wagen) · { boss: true } (Kampf)
const Y = 2;
const ROUTES = {
  '5-7': {
    start: [0, Y, 9],
    meta: { stars: 3, stamp: true, time: 400, theme: 'sneak', music: 'course_sneak', archetype: 'parcours' },
    enemies: { hackbeil_pilz: 8, kanone_turm: 13, suchkopf_welle: 8 },
    lights: 11,
    main: [
      { to: [0, 1], within: 0.6 },
      { name: 'Zugbrücke', to: [0, -12.6], within: 0.6 },
      { name: 'Arkaden links', to: [-8.3, -14.6], within: 0.6 },
      { to: [-8.3, -32], within: 0.6 },
      { name: 'Tor', to: [-0.3, -34.6], within: 0.5 },
      { to: [0, -38.6], within: 0.5 },
      { name: 'Wachhaus', to: [0, -49], within: 0.6 },
      { to: [0, -61.6], within: 0.6 },
      { name: 'Bastion (Checkpoint)', to: [0, -70.6], within: 0.6 },
      { to: [-2, -81], within: 0.6 },
      { name: 'Torhaus-Brücke', to: [0, -86], within: 0.6 },
      { name: 'Hof der rissigen Mauer', to: [0, -100], within: 0.6 },
      { to: [-4.6, -116.5], within: 0.6 },
      { name: 'Steg 1', to: [-5, -128.6], within: 0.4 },
      { to: [5, -133.4], within: 0.4 },
      { name: 'Steg 2', to: [5, -140.6], within: 0.4 },
      { to: [0, -145.4], within: 0.5 },
      { name: 'Treppe 1', to: [0, -157], within: 0.6 },
      { name: 'Treppe 2', to: [-2.4, -160.2], within: 0.6 },
      { to: [-2.4, -169.4], within: 0.6 },
      { name: 'Absatz 2', to: [0, -172.4], within: 0.6 },
      { name: 'Treppe 3', to: [0, -186], within: 0.6 },
      { name: 'Zielmast', to: [0, -196.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Treppe 15 m hinauf (Turmterrasse y 17,3)', ok: (r) => r.mech.maxY > 17 },
    ],
    targets: [
      { name: 'Stern 0: Sprungfeder vor dem Torturm (Sprung gehalten) → Turmdach', star: 0, from: [4.2, Y, -27],
        legs: [{ bounce: [4.2, -37.6], at: [4.2, -31.8], steerBelow: 99 }, { wait: 20 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Sprungfeder (Sprung vom Hof aus)', star: 0, expectNot: true, from: [4.2, Y, -33.4], heroes: ['lotti'],
        legs: [{ to: [4.2, -37.6], jump: 40, within: 0.4, max: 200, land: false }, { wait: 60 }] },
      { name: 'Stern 1: Suchkopf gegen die rissige Mauer lenken → Rätselbox → Kletterraum, Steinblock-Treppe hinauf', star: 1, from: [-5, Y, -93],
        legs: [{ lure: { at: [-6.4, -96.4], until: 'rissOffen', max: 3000 } }, { expect: 'rissOffen' }, { to: [-9.2, -96], within: 0.4, run: false },
          { warp: [-10.6, -96] }, { expect: 'imRaum' },
          { to: [66.4, -104], within: 0.35, run: true }, { to: [67.5, -104], jump: 14, within: 0.35, run: false }, { to: [68.5, -104], jump: 16, within: 0.35, run: false },
          { to: [69.5, -104], jump: 16, within: 0.35, run: false }, { to: [70.5, -104], jump: 16, within: 0.35, run: false }, { to: [71.5, -104], jump: 16, within: 0.35, run: false },
          { wait: 20 }, { star: 1 }], shot: 'stern1', mechText: (r) => `Mauer: ${r.mech.lure ?? '-'}` },
      { name: 'Rätselbox nicht erreichbar, solange die Mauer steht', star: 1, expectNot: true, from: [-6.4, Y, -96], heroes: ['lotti'],
        legs: [{ to: [-10.6, -96], jump: 40, within: 0.4, max: 300, land: false }, { wait: 90 }, { expect: 'nichtImRaum' }] },
      { name: 'Stern 2: im Licht der Turmterrasse warten – der Suchkopf zertrümmert die Steinblock-Mauer', star: 2, from: [-5.5, 17.3, -186.4],
        legs: [{ lure: { at: [-5.5, -188.2], until: 'steinOffen', max: 3000, jumpDist: 0 } }, { wait: 60 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 nicht durch Stampfen auf die Steinblöcke', star: 2, expectNot: true, from: [-5.5, 17.3, -188.4], heroes: ['lotti'], place: { yaw: Math.PI / 2 },
        legs: [{ pound: [-5.5, -190.5] }, { wait: 30 }, { pound: [-5.5, -190.5] }, { wait: 60 }] },
      { name: 'Stempel: über den ?-Blöcken im Lichtkegel', stamp: true, from: [0, Y, -71.5],
        legs: [{ to: [0, -74.6], within: 0.3, run: false }, { to: [0, -77], jump: 30, within: 0.35, run: false }, { hop: 24 }, { wait: 20 }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über der Zugbrücke', from: [0, Y, -7.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [0, -9], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: Kiste auf der Lavainsel im Graben (Sprung hinüber, Stampfattacke)', from: [8.6, Y, -131], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [13, -131], jump: 30, within: 0.6, run: true }, { to: [12.8, -131], within: 0.25, run: false }, { pound: [14, -131] }, { wait: 40 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Schleichen: unter den Arkaden bleibt Licht 1 blind (Lob-Ansage)', from: [-8.3, Y, -13.2], heroes: ['lotti'],
        legs: [{ to: [-8.3, -32], within: 0.6, run: false }, { to: [-0.3, -34.6], within: 0.5, run: false }, { to: [0, -38.6], within: 0.5, run: false }, { wait: 20 }],
        mech: (r) => r.mech.alarms.licht1 === undefined && r.mech.praised.length >= 1, mechText: (r) => `Alarme ${JSON.stringify(r.mech.alarms)}, Lob ${JSON.stringify(r.mech.praised)}` },
      { name: 'Entdeckt: mitten im Licht → Alarmlampen, Suchkopf-Welle aus beiden Kanonen', from: [0, Y, -16], heroes: ['lotti'],
        legs: [{ to: [0, -16], within: 0.3, run: false }, { until: 'alarm1', max: 1600 }, { wait: 360 }],
        mech: (r) => (r.mech.alarms.licht1 ?? 0) >= 1 && r.mech.waves.welle1 >= 1 && r.mech.heads >= 2, mechText: (r) => `Alarme ${JSON.stringify(r.mech.alarms)}, Wellen ${JSON.stringify(r.mech.waves)}, Köpfe ${r.mech.heads}` },
      { name: 'Verfolger-Licht: entdeckt folgt der Fleck, unter dem Säulengang verliert er die Figur', from: [-3.6, Y, -104.4], heroes: ['lotti'],
        legs: [{ until: 'gesehen6', max: 900 }, { to: [8, -106], within: 0.5, run: true }, { wait: 120 }, { expect: 'blind6' }] },
      { name: 'Kletterraum: Suchköpfe zertrümmern die Steinblöcke; wieder betreten → Treppe wieder heil', from: [70, Y, -99.5], heroes: ['lotti'],
        legs: [{ to: [64.6, -100], within: 0.5 }, { wait: 1200 }, { expect: 'raumKaputt' }, { to: [72, -99], within: 0.5 }, { warp: [77, -98.8] }, { wait: 60 }, { expect: 'nichtImRaum' },
          { to: [-8.4, -96], within: 0.4, run: false }, { wait: 20 }, { warp: [-10.6, -96] }, { wait: 30 }, { expect: 'imRaum' }, { expect: 'raumHeil' }],
        place: {}, pre: 'rissAuf', mechText: (r) => `zertrümmert zuvor ${r.log.find((l) => l[0] === 'erwartet' && l[1] === 'raumKaputt') ? 'ja' : 'nein'}` },
      { name: 'Checkpoint 2 auf dem Treppenabsatz: Sturz in die Lava → Neustart dort', from: [0, 7.1, -157], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, -157.5], within: 0.4 }, { to: [8, -158], within: 0.4, max: 300 }, { wait: 400 }, { expect: 'respawnAbsatz' }] },
    ],
    shots: [
      ['start', [0, Y, 9]],
      ['zugbruecke', [0, Y, -4]],
      ['arkaden', [-8.3, Y, -16]],
      ['hof1', [0, Y, -16]],
      ['feder', [4.2, Y, -28]],
      ['torturm', [4.2, 9.2, -37.5]],
      ['wachhaus', [0, Y, -44]],
      ['bastion', [0, Y, -70]],
      ['stempel', [0, Y, -74]],
      ['riss', [-5, Y, -92]],
      ['saeulen', [3, Y, -104]],
      ['graben', [-5, Y, -119]],
      ['treppe', [0, Y, -143]],
      ['absatz2', [0, 12.2, -171]],
      ['terrasse', [0, 17.3, -186]],
      ['ziel', [0, 17.3, -192]],
      ['kletterraum', [66, Y, -100], 30],
    ],
  },
};

const Y3 = 4, AZ = -200;
ROUTES['5-Burg'] = {
  start: [0, Y, 8],
  meta: { stars: 3, stamp: true, time: 400, theme: 'temple', music: 'course_temple', archetype: 'boss' },
  enemies: { rammbock_bulle: 4, kippquader_koenig: 1, bruchplatte: 4, warpbox: 4, starring: 1 },
  loadChecks: [
    { name: 'Kippquader (Bausteine): 10, davon 2 Würfel im Ring und 1 Rahmen mit Loch', fn: () => { const L = window.__course.level; const ids = ['kq_vorhof', 'kq_rand', 'kq_spalte1', 'kq_spalte2', 'kq_spalte3', 'kq_loch', 'wuerfel1', 'wuerfel2', 'kq_l', 'kq_r']; return ids.filter((id) => L.named.get(id)?.tip).length; }, ok: (n) => n === 10 },
    { name: 'Boss: Kippquader-König mit Bruchplatten-Ecken und zwei Begleit-Kippquadern', fn: () => { const b = window.__course.level.named.get('koenig'); return { state: b?.state, hp: b?.hp, boss: window.__course.level.data.boss?.name }; }, ok: (v) => v.state === 'wait' && v.hp === 3 && v.boss === 'Kippquader-König' },
  ],
  main: [
    { name: 'Vorhof (am Übungs-Kippquader vorbei)', to: [4.6, 3], within: 0.6 },
    { to: [4.6, -14], within: 0.6 },
    { name: 'Tempeltor', to: [0, -18], within: 0.5 },
    { to: [0, -26.6], within: 0.6 },
    { name: 'Bullenplatz', to: [0, -40], within: 0.6 },
    { to: [0, -43.2], within: 0.3, run: false },
    { name: 'bewegliche Plattform', mover: 'plattform', board: -46.2, leave: -57.6, off: [0, -61] },
    { name: 'Warp-Box 1', warp: [0, -78.6] },
    { name: 'Galerie (Checkpoint)', to: [0, -101.6], within: 0.6 },
    { name: 'Gang der Wandspalten', to: [2.8, -108], within: 0.6 },
    { to: [3, -114], within: 0.6 },
    { to: [-3, -120.5], within: 0.6 },
    { to: [2.5, -126], within: 0.6 },
    { to: [0, -131], within: 0.6 },
    { name: 'Platz der Mutprobe', to: [-1.5, -140], within: 0.6 },
    { to: [-1.5, -152], within: 0.6 },
    { name: 'Warp-Box 2', warp: [2.4, -167.4] },
    { name: 'Kampf gegen den Kippquader-König', boss: 'koenig' },
    { expect: 'baronFort' },
    { name: 'Warp-Box nach dem Sieg', warp: [0, AZ - 7.5] },
    { name: 'Zielmast', to: [0, AZ - 46.6], within: 0.2 },
  ],
  routeChecks: [
    { name: 'Boss: 3 Treffer nur per Sprung auf den Rücken (Rückenfeld), Ecken brechen weg', ok: (r) => r.mech.boss?.hits === 3 && r.mech.boss?.corners === 4 },
    { name: 'Warp-Boxen (1, 2, Sieg) und die bewegliche Plattform benutzt', ok: (r) => r.mech.warps === 3 && r.mech.movers === 1 },
  ],
  targets: [
    { name: 'Stern 0: Sternring – acht Sternmünzen in 10 s (zwei auf den Säulenstümpfen)', star: 0, from: [0, Y, -61],
      legs: [{ to: [0, -63.6], within: 0.5 }, { chaseKind: 'starcoin', max: 1300, run: true }, { wait: 40 }, { star: 0 }], shot: 'stern0' },
    { name: 'Stern 1: Mutprobe – im Loch des Rahmen-Kippquaders stehen, er fällt über die Figur', star: 1, from: [-7, Y3, -131],
      legs: [{ to: [-4.4, -132], within: 0.4, run: false }, { until: 'lochSteht', max: 900 }, { to: [-4.4, -135.5], within: 0.3, run: false }, { to: [-7, -135.5], within: 0.15, run: false }, { until: 'lochStern', max: 1400 }, { wait: 30 }], shot: 'stern1',
      mech: (r) => r.mech.kqHurts === 0, mechText: (r) => `Treffer durch den Kippquader ${r.mech.kqHurts}` },
    { name: 'Stern 1 nicht ohne Loch (neben dem Stern: der Rahmen trifft)', star: 1, expectNot: true, from: [-7, Y3, -131], heroes: ['lotti'],
      legs: [{ to: [-4.4, -132], within: 0.4, run: false }, { until: 'lochSteht', max: 900 }, { to: [-4.4, -135.5], within: 0.3, run: false }, { to: [-5.9, -135.5], within: 0.15, run: false }, { until: 'lochGelandet', max: 1400 }, { wait: 30 }],
      mech: (r) => r.mech.kqHurts >= 1, mechText: (r) => `Treffer durch den Kippquader ${r.mech.kqHurts}` },
    { name: 'Stern 2: Krallen-Anzug aus dem ?-Block, Kletterwand neben Warp-Box 2 hinauf', star: 2, from: [3, Y3, -154.4],
      legs: [{ to: [3, -156], within: 0.2, run: false }, { hop: 22 }, { wait: 30 }, { chaseKind: 'powerup', max: 600 }, { expect: 'krallen' },
        { to: [-5, -165.2], within: 0.3, run: false }, { climb: [0, -1], top: 10.8 }, { to: [-5, -168], within: 0.4, run: false }, { star: 2 }], shot: 'stern2' },
    { name: 'Stern 2 nicht ohne Krallen-Anzug', star: 2, expectNot: true, from: [-5, Y3, -164.6], heroes: ['lotti'],
      legs: [{ climb: [0, -1], top: 10.8, max: 420 }, { wait: 30 }] },
    { name: 'Stempel: auf einen Würfel des Rings, mitrollen, auf den Wandsims springen', stamp: true, from: [9.5, Y3, -136.5],
      legs: [{ cube: 'wuerfel', sims: [10.2, -141] }, { to: [10.2, -141], within: 0.3, run: false }, { wait: 30 }], shot: 'stempel' },
    { name: 'Stempel nicht vom Boden aus (Sprung zum Sims)', stamp: true, expectNot: true, from: [9.8, Y3, -137.5], heroes: ['lotti'],
      legs: [{ to: [10.2, -141], jump: 40, within: 0.4, max: 260, land: false }, { wait: 60 }] },
  ],
  extra: [
    { name: 'Extraleben: unsichtbarer Block rechts neben den ?-Blöcken', from: [4, Y, 5], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [4, 2.5], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    { name: 'Extraleben: Kiste auf dem Mittelpfeiler des Würfel-Rings (vom Würfel aus)', from: [9.5, Y3, -136.5], heroes: ['lotti'], expectLives: 1,
      legs: [{ cube: 'wuerfel', pillar: [6, -141] }, { pound: [6, -141] }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }] },
    { name: 'Kippquader trifft: im roten Landefeld des Übungs-Quaders stehen bleiben → Treffer, hinausgeschoben', from: [-2, Y, -8], heroes: ['lotti'], invuln: false,
      legs: [{ until: 'vorhofGekippt', max: 1400 }, { wait: 30 }], mech: (r) => r.mech.kqHurts >= 1 && r.info.big === false, mechText: (r) => `Treffer ${r.mech.kqHurts}, klein ${!r.info.big}` },
    { name: 'Kampf allein (Fehlersuche)', from: [0, Y, AZ + 14], heroes: ['lotti'], legs: [{ boss: 'koenig' }] },
    { name: 'Tod im Kampf: Neustart am Steg, König wieder 3/3', from: [0, Y, AZ + 18.4], heroes: ['lotti'], invuln: false, expectAlive: false,
      legs: [{ to: [0, AZ + 6], within: 0.6 }, { until: 'kampf', max: 600 }, { die: true }, { wait: 400 }, { expect: 'respawnSteg' }, { expect: 'koenigVoll' }] },
  ],
  shots: [
    ['start', [0, Y, 8]],
    ['vorhof', [3, Y, -4]],
    ['bullen', [0, Y, -30]],
    ['plattform', [0, Y, -43.5]],
    ['sternring', [0, Y, -62]],
    ['galerie', [0, Y3, -100]],
    ['gang', [0, Y3, -109]],
    ['mutprobe', [-5, Y3, -131]],
    ['wuerfel', [3, Y3, -134.5]],
    ['turm', [0, Y3, -158]],
    ['steg', [0, Y, AZ + 14]],
    ['arena', [0, Y, AZ + 6], 240, { x: 0, y: 0.3 }],
    ['ziel', [0, Y, AZ - 38]],
  ],
};

const PORT = 4500;
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
    p.kqHurts = 0;
    p.hurt = (src) => { p.hurtTries++; if (src?.kippquader) p.kqHurts++; p.lastHurt = src?.kind ?? String(src); return orig(src); };
  };
  wrapHurt();
  const alive = (id) => { const e = L.named.get(id); return !!e && e.alive && !e.removed; };
  const COND = {
    rissOffen: () => (L.named.get('risswand')?.broken ?? 0) > 0,
    steinOffen: () => !alive('stein_stern'),
    imRaum: () => P().pos.x > 60,
    nichtImRaum: () => P().pos.x < 40,
    alarm1: () => (L.named.get('licht1')?.alarms ?? 0) > 0,
    gesehen6: () => !!L.named.get('licht6')?.seen,
    blind6: () => !L.named.get('licht6')?.seen,
    raumKaputt: () => (L._kletterRaum?.alive?.() ?? 30) < 30,
    raumHeil: () => L._kletterRaum?.alive?.() === 30 && L._kletterRaum.resets >= 1,
    respawnAbsatz: () => Math.abs(P().pos.z + 157) < 2 && P().pos.y > 6.5 && !P().dead,
    giant: () => P().power === 'riese',
    krallen: () => P().power === 'krallen',
    baronFort: () => { const b = L._baron; return !b || ['away', 'gone'].includes(b.state) || b.state === 'stop'; },
    lochStern: () => !!L._lochStern?.given,
    lochGelandet: () => (L.named.get('kq_loch')?.tips ?? 0) >= 1 && L.named.get('kq_loch').box.y1 < 5,
    lochSteht: () => { const q = L.named.get('kq_loch'); return q && q.state === 'wait' && q.t < 0.2 && q.box.y1 > 6.5; },
    vorhofGekippt: () => (L.named.get('kq_vorhof')?.tips ?? 0) >= 1,
    kampf: () => !!c.arch?.started,
    respawnSteg: () => Math.abs(P().pos.z + 183.5) < 2.5 && !P().dead,
    koenigVoll: () => { const b = L.named.get('koenig'); return b?.hp === 3 && !c.arch?.started; },
  };
  const PRE = {
    rissAuf: () => { const w = L.named.get('risswand'); for (const col of w?.columns ?? []) col.onHit?.('bomb', null); },
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
      p.kqHurts = 0;
      return p.info();
    },
    pre(name) { PRE[name]?.(); c.step(30); },
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
      const mech = { hurts: 0, maxY: -99, stomped: [], pipes: 0, warps: 0 };
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.mode === 'ground' && !p.dead) {
          mech.maxY = Math.max(mech.maxY, p.pos.y);
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript && !p.trapeze) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
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
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounding = false;
          for (; k < 400; k++) {
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            if (k > 5 && p.mode === 'ground') break;
            if (!pounding && k > 8 && d < 0.4 && p.vel.y < 3) pounding = true;
            tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 34, run: false });
          }
          log.push(['stampfen auf', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, pounding]);
          continue;
        }
        // ------------------------------------------------ in eine Warp-/Rätselbox springen (Landen auf der Öffnung)
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          const x0 = p.pos.x;
          let k = 0;
          for (; k < 400; k++) {
            if (p.mode === 'script') break;
            const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
            const bx = p.pos.x, bz = p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.2, 6) : this.stick(dx, dz, Math.min(1, d))), jump: p.mode === 'ground' ? (k % 70) < 26 : p.vel.y > 0, run: false });
            if (Math.hypot(p.pos.x - bx, p.pos.z - bz) > 4) break;     // versetzt (Warp im Fahrt-Schritt erledigt)
          }
          for (let w = 0; w < 600 && (p.mode === 'script' || p.mode === 'air'); w++) tick({});
          mech.warps++;
          log.push(['warp', k, +x0.toFixed(1), '→', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ im Licht warten, bis ein Suchkopf kommt; kurz vor ihm hochspringen
        if (Lg.lure) {
          const { at: [sx, sz], until, max = 2400, jumpDist = 1.4 } = Lg.lure;
          goTo(sx, sz, 0.3);
          let k = 0, j = 0, jumps = 0;
          for (; k < max && !COND[until](); k++) {
            let near = Infinity;
            for (const e of L.entities) if (e.kind === 'suchkopf' && e.alive && !e.removed && e.state === 'fly') near = Math.min(near, Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z));
            if (j > 0) { j--; tick({ jump: true }); continue; }
            if (near < jumpDist && p.mode === 'ground') { j = 18; jumps++; tick({ jump: true }); continue; }
            const dx = sx - p.pos.x, dz = sz - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.3 && p.mode === 'ground' ? this.stick(dx, dz, Math.min(1, d)) : {});
          }
          mech.lure = `${COND[until]() ? 'offen' : 'zu'} nach ${(k / 120).toFixed(1)} s, ${jumps} Ausweichsprünge`;
          log.push(['köder', until, k, jumps, COND[until]()]);
          if (!COND[until]()) log.push(['FEHLER: Köder', until]);
          continue;
        }
        // ------------------------------------------------ Sprungfeder: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          let k = 0, bounced = false, landed = false;
          for (; k < 900; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 2.2) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') bounced = true;
              continue;
            }
            const steer = p.vel.y < (Lg.steerBelow ?? 9);
            tick({ ...(steer ? this.airSteer(tx, tz, 0, 0, 2.6, 8) : {}), jump: true });
            if (p.mode === 'ground') { landed = true; break; }
          }
          log.push(['Sprungfeder', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed) { log.push(['FEHLER: Sprungfeder', Lg.at]); break; }
          mech.bounces = (mech.bounces ?? 0) + 1;
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
        // ------------------------------------------------ Tod (Gegenprobe Neustart)
        if (Lg.die) { p.die('hit'); for (let i = 0; i < 2400 && (p.dead || L.runtime.status !== 'play'); i++) { c.setInput({}); c.step(1); steps++; } log.push(['neustart', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        // ------------------------------------------------ bewegliche Plattform (mover): abwarten, aufspringen, mitfahren, absteigen
        if (Lg.mover) {
          const m = L.named.get(Lg.mover);
          const top = () => { const q = m.shape; return { x: (q.x0 + q.x1) / 2, y: q.y1, z: (q.z0 + q.z1) / 2 }; };
          let k = 0;
          for (; k < 2400 && !(Math.abs(top().z - Lg.board) < 0.25); k++) tick({});
          let j = 0, on = false;
          for (; j < 300; j++) {
            const q = top();
            on = p.mode === 'ground' && !!p.ground?.mover && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 1.4;
            if (on && Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < 0.5) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(q.x, q.z, 0, 0, 3, 6) : this.stick(q.x - p.pos.x, q.z - p.pos.z, 1)), jump: !on && p.mode === 'ground' && j < 30, run: false });
          }
          if (!on) { log.push(['FEHLER: nicht auf der Plattform', Lg.mover]); break; }
          let r = 0;
          for (; r < 2400 && Math.abs(top().z - Lg.leave) > 0.25; r++) { const q = top(); const dx = q.x - p.pos.x, dz = q.z - p.pos.z; tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.4), run: false } : {}); }
          goTo(Lg.off[0], Lg.off[1], 0.5, 400);
          mech.movers = (mech.movers ?? 0) + 1;
          log.push(['plattform', Lg.mover, k, j, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Krallen-Kletterwand: zur Wand drücken, springen, hinauf
        if (Lg.climb) {
          const [dx, dz] = Lg.climb;
          let k = 0, topped = false;
          for (; k < (Lg.max ?? 600); k++) {
            tick({ ...this.stick(dx, dz, 1), jump: k < 10 || (!!Lg.max && k % 60 < 20), run: false });
            if (p.pos.y > Lg.top - 0.2 && p.mode === 'ground') { topped = true; break; }
          }
          log.push(['klettern', topped, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.power]);
          continue;
        }
        // ------------------------------------------------ Würfel-Ring: auf einen Würfel springen, mitrollen, auf Sims/Pfeiler springen
        if (Lg.cube) {
          const cubes = [1, 2].map((i) => L.named.get(`${Lg.cube}${i}`));
          const target = Lg.sims ?? Lg.pillar;
          const onCube = () => p.mode === 'ground' && cubes.includes(p.ground?.owner);
          let k = 0;
          for (; k < 3000 && !onCube(); k++) {
            const ready = cubes.map((q) => ({ q, b: q.box })).filter(({ q, b }) => q.state === 'wait' && q.t < 0.3 && b.y1 < 4 + 2.2);
            ready.sort((u, v) => Math.hypot((u.b.x0 + u.b.x1) / 2 - p.pos.x, (u.b.z0 + u.b.z1) / 2 - p.pos.z) - Math.hypot((v.b.x0 + v.b.x1) / 2 - p.pos.x, (v.b.z0 + v.b.z1) / 2 - p.pos.z));
            const t = ready[0];
            if (!t || Math.hypot((t.b.x0 + t.b.x1) / 2 - p.pos.x, (t.b.z0 + t.b.z1) / 2 - p.pos.z) > 4.5) { tick({}); continue; }
            const cx = (t.b.x0 + t.b.x1) / 2, cz = (t.b.z0 + t.b.z1) / 2;
            for (let j = 0; j < 200 && !onCube(); j++) tick({ ...(p.mode === 'air' ? this.airSteer(cx, cz, 0, 0, 3, 6) : this.stick(cx - p.pos.x, cz - p.pos.z, 1)), jump: p.mode === 'ground' ? j < 26 : p.vel.y > 0, run: false });
          }
          if (!onCube()) { log.push(['FEHLER: nicht auf einem Würfel']); break; }
          const cube = p.ground.owner;
          let r = 0, done = false;
          for (; r < 4000 && !done; r++) {
            const b = cube.box, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
            const near = Math.hypot(target[0] - cx, target[1] - cz) < 3.2;
            if (cube.state === 'wait' && cube.t > 0.15 && cube.t < 0.6 && near && p.mode === 'ground') {
              for (let j = 0; j < 200; j++) {
                // erst hoch über die Kante (Sims/Pfeiler y 9), dann hinüber lenken
                const steer = p.mode === 'air' && p.pos.y > 4 + 5.2 ? this.airSteer(target[0], target[1], 0, 0, 2.8, 6) : {};
                tick({ ...steer, jump: j < 30, run: false });
                if (j > 8 && p.mode === 'ground') break;
              }
              done = p.pos.y > 4 + 4.4;
              if (!done && !onCube()) break;
              continue;
            }
            const dx = cx - p.pos.x, dz = cz - p.pos.z;
            tick(p.mode === 'ground' && Math.hypot(dx, dz) > 0.35 ? { ...this.stick(dx, dz, 0.5), run: false } : {});
          }
          log.push(['würfel', done, k, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!done) log.push(['FEHLER: Ziel vom Würfel nicht erreicht']);
          continue;
        }
        // ------------------------------------------------ Kampf gegen den Kippquader-König (nur Sprünge auf das Rückenfeld)
        if (Lg.boss) {
          const b = L.named.get(Lg.boss);
          const AZ0 = -200;
          const DIRS = [[1, 0], [0, -1], [-1, 0], [0, 1]];
          const hits0 = b.hits ?? 0;
          let k = 0, jumpsOnBack = 0, waveJumps = 0;
          goTo(0, AZ0 + 9.2, 0.6, 600);
          goTo(0, AZ0 + 6, 0.6, 600);
          const inRect = (r, m = 0) => p.pos.x > r.x0 - m && p.pos.x < r.x1 + m && p.pos.z > r.z0 - m && p.pos.z < r.z1 + m;
          for (; k < 120 * 140 && b.state !== 'gone' && !p.dead; k++) {
            const s = b.state;
            const wv = (b.waves ?? []).find((w) => Math.abs(Math.hypot(p.pos.x - w.x, p.pos.z - w.z) - w.r) < 1.1);
            if (wv && p.mode === 'ground') { waveJumps++; for (let j = 0; j < 16; j++) tick({ jump: true }); continue; }
            if (s === 'lie' && b.stateT > 0.15) {
              const f = b.backField();
              const D = DIRS[b.facing], Pp = [-D[1], D[0]];
              const side = (p.pos.x - f.x) * Pp[0] + (p.pos.z - f.z) * Pp[1] >= 0 ? 1 : -1;
              const ax = f.x + Pp[0] * side * 2.7, az = f.z + Pp[1] * side * 2.7;
              const da = Math.hypot(ax - p.pos.x, az - p.pos.z);
              if (p.mode === 'ground' && p.ground?.owner !== b && (da > 0.4 || Math.hypot(p.vel.x, p.vel.z) > 1.5)) { tick(da > 0.4 ? { ...this.stick(ax - p.pos.x, az - p.pos.z, Math.min(1, da / 1.5)), run: da > 3 } : {}); continue; }
              const hp0 = b.hp;
              for (let j = 0; j < 160; j++) {
                // erst senkrecht hoch (über die Kante), dann zur Feldmitte lenken
                const steer = p.mode === 'air' && p.pos.y > b.pos.y + 1.9 ? this.airSteer(f.x, f.z, 0, 0, 3.4, 7) : {};
                tick({ ...steer, jump: j < 26, run: false });
                if (b.hp < hp0 || (j > 8 && p.mode === 'ground')) break;
              }
              jumpsOnBack++;
              if (jumpsOnBack <= 12) log.push(['rücken', +(p.pos.x - f.x).toFixed(2), +(p.pos.z - f.z).toFixed(2), +p.pos.y.toFixed(2), b.hp < hp0, p.ground?.owner === b, b.facing, s, +b.stateT.toFixed(2)]);
              for (let j = 0; j < 40 && b.state === 'hit'; j++) tick({});
              continue;
            }
            const r = s === 'warn' || s === 'tilt' ? b.lieRect() : null;
            if (r && inRect(r, 0.9)) {
              const D = DIRS[b.facing], Pp = [-D[1], D[0]];
              const side = (p.pos.x - b.pos.x) * Pp[0] + (p.pos.z - b.pos.z) * Pp[1] >= 0 ? 1 : -1;
              let tx = p.pos.x + Pp[0] * side * 3, tz = p.pos.z + Pp[1] * side * 3;
              if (Math.abs(tx) > 7.5 || Math.abs(tz - AZ0) > 7.5) { tx = p.pos.x - Pp[0] * side * 3; tz = p.pos.z - Pp[1] * side * 3; }
              tick({ ...this.stick(tx - p.pos.x, tz - p.pos.z, 1), run: true });
              continue;
            }
            const hx = 0, hz = AZ0 + 3.5;
            const dx = hx - p.pos.x, dz = hz - p.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.8 ? { ...this.stick(dx, dz, Math.min(1, d / 2)), run: false } : {});
          }
          for (let i = 0; i < 240; i++) tick({});
          const corners = ['ecke_vl', 'ecke_vr', 'ecke_hl', 'ecke_hr'].filter((id) => L.named.get(id)?.state !== 'solid').length;
          mech.boss = { hits: (b.hits ?? 0) - hits0, state: b.state, jumpsOnBack, waveJumps, misses: b.misses, corners, time: +(k / 120).toFixed(1) };
          log.push(['kampf', JSON.stringify(mech.boss)]);
          if (b.state !== 'gone') log.push(['FEHLER: König nicht besiegt', b.state, b.hp]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});   // erst landen, dann abspringen
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && p.mode === 'ground'));
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
          if (j0 === null && Lg.runUp && p.mode === 'ground' && ((p.vel.x * dx + p.vel.z * dz) / Math.max(0.01, dist) > Lg.runUp || i > 40)) j0 = i;
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
      mech.kqHurts = p.kqHurts ?? 0;
      const sl = L._schleich;
      if (sl) { mech.alarms = { ...sl.byLight }; mech.praised = sl.praised.slice(); mech.heads = sl.heads; }
      mech.waves = Object.fromEntries(L.entities.filter((e) => e.kind === 'suchkopf_welle').map((e) => [e.spec.id, e.waves]));
      if (L._kletterRaum) mech.raumKaputt = 30 - L._kletterRaum.alive();
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
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q && q.parent; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return `${o.type}/${o.material?.type ?? ''}/${o.geometry?.type ?? ''}/${o.geometry?.attributes?.position?.count ?? 0}`; };
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
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; m.__lights = (L.searchlights ?? []).length; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => COND[k](),
  };
  window.__w5 = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__w5[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w5d_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w5.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  if (PARTS.has('load')) {
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars?.length ?? 0, stamp: !!d.stamp }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne${R.meta.stamp ? ', Stempel' : ''}, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.stars === R.meta.stars && meta.stamp === R.meta.stamp && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
    if (R.lights) check(`${id}: ${R.lights} Suchscheinwerfer (${kinds.__lights})`, kinds.__lights === R.lights);
    if (R.loadChecks) for (const lc of R.loadChecks) { const v = await sc(lc.fn); check(`${id}: ${lc.name} (${JSON.stringify(v)})`, lc.ok(v)); }
  }

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Kennzahlen entlang der ganzen Route (alle ~7 m ein Messpunkt)
  if (sweepTrack?.length && !R.noSweep) {
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
      if (t.pre) await W('pre', t.pre);
      await W('place', t.from, { hero, settle: 10, ...(t.place ?? {}) });
      const res = await W('drive', t.legs, {});
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
      if (t.pre) await W('pre', t.pre);
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
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
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
