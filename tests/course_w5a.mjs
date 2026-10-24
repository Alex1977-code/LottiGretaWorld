// Welt 5, Level 5-1 „Schlüsselsuche am Muschelstrand“ (Strand, fünf Schlüsselmünzen öffnen die Warp-Box, Ritt auf Pflaume
// durch den Höhlenfluss) und 5-2 „Zirkus Schwingeschwung“ (Seilbahnen, Trapeze, Pendel-/Drehplattformen, Riesentrank-Gasse):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne
// und der Stempel mit der echten Mechanik (Sandskulptur zerstampfen, Farbfeld-Raum durch die Röhre im Meeresloch, Krabbelkäfer
// der Wandhöhle besiegen; Stempel über der Holzschanze im Ritt; 5-2: hoher Sims, Blaumünzen-Raum, Sternring, Stempel per
// Pilz-Trampolin), Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus
// der Spielkamera (tests/out/w5a_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5a.mjs [5-1|5-2]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump } ·
// { wait } · { hop } (Sprung auf der Stelle) · { pound: [x, z] } (hinspringen, Stampfattacke) · { crouch } (Röhre) ·
// { star: i } · { chaseKind, filter } · { expect: Bedingung } · { until: Bedingung } ·
// { mount: [x, z] } (zu Pflaume springen) · { ride: [[z, lat, jump?], …] } (Floß lenken: Seitenlage im Kanal je z) ·
// { tiles: id } (alle Schaltfelder betreten) · { stompAll: [ids] } (Gegner nacheinander von oben besiegen)
const Y = 1;
const ROUTES = {
  '5-1': {
    start: [0, Y, 10],
    meta: { stars: 3, time: 500, theme: 'beach', music: 'course_beach', archetype: 'parcours_ride' },
    enemies: { panzerkroete: 10, krabbelkaefer: 22, flatterkaefer: 4, rammbock_bulle: 4, sandtaucher: 4, muenzmarder: 3, schluesselmuenze: 5 },
    main: [
      { name: 'Palmenhain (Schlüssel 2)', to: [16, 8], within: 0.4 },
      { to: [25, 2] },
      { to: [30.4, -7.2], within: 0.4 },
      { name: 'Fels hinter den Bullen (Schlüssel 5)', to: [33, -9], jump: 30, within: 0.45, run: false },
      { to: [30, -1] },
      { to: [20, -1] },
      { to: [-7.6, -1.6], within: 0.4 },
      { name: 'Sandburg hinauf', to: [-12, -2], jump: 34, jumpAt: 3.6, within: 0.6, run: false },
      { name: 'Schlüssel 1 über der Sandburg', hop: 30 },
      { to: [-16.2, -3], jump: 20, within: 0.6, run: false },
      { to: [-24, 9] },
      { to: [-27, 11.6], within: 0.4 },
      { name: 'Rettungsturm (Schlüssel 4)', to: [-27, 3.4], within: 0.5, run: false },
      { to: [-27, 9] },
      { to: [-21, -10] },
      { to: [-21, -19.4], within: 0.4 },
      { name: 'Fels im Flachwasser (Schlüssel 3)', to: [-22, -22], jump: 30, within: 0.45, run: false },
      { expect: 'keys5' },
      { expect: 'warpOpen' },
      { to: [-6, -21.6], jump: 14, within: 0.6, run: true },
      { to: [-2, -23], within: 0.4 },
      { name: 'Warp-Box', to: [1, -23], jump: 30, within: 0.3, run: false, stopIf: 'onIsle' },
      { wait: 30 },
      { expect: 'onIsle' },
      { name: 'Checkpoint', to: [0, -45.5], jump: 12, within: 0.5 },
      { name: 'Röhre zur Grotte', to: [0, -54.6], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { to: [0, -73.6], jump: 12, within: 0.5, run: false },
      { name: 'Steg', to: [0, -79.8], within: 0.4, run: false },
      { name: 'zu Pflaume', mount: [0, -82.6] },
      { name: 'Höhlenfluss', ride: [[-80, 0], [-118, 0], [-128, 0], [-140, 0], [-200, 0]], jump: [[-131, -137]], bridges: ['bruecke_a', 'bruecke_b'] },
      { to: [0, -199.4], within: 0.4, run: false },
      { name: 'Röhre zur Zielinsel', to: [0, -201.5], jump: 30, within: 0.25, run: false },
      { crouch: 4 },
      { expect: 'onGoalIsle' },
      { name: 'Zielmast', to: [0, -236.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'fünf Schlüsselmünzen gesammelt, Warp-Box benutzt', ok: (r) => r.mech.keys === 5 },
      { name: 'auf Pflaume durch den Höhlenfluss geritten', ok: (r) => r.mech.ride > 120 * 20 },
    ],
    targets: [
      { name: 'Stern 0: rechte Sandskulptur zerstampfen', star: 0, from: [13.2, Y, 4],
        legs: [{ to: [13.2, 1.4], within: 0.3, run: false }, { pound: [13.2, -1] }, { wait: 90 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Zerstampfen (Sprung auf die Skulptur)', star: 0, expectNot: true, from: [13.2, Y, 4], heroes: ['lotti'],
        legs: [{ to: [13.2, -1], jump: 30, within: 0.4, run: false }, { wait: 60 }] },
      { name: 'Stern 1: Meeresloch → Röhre → Farbfeld-Raum, alle Felder betreten', star: 1, from: [9, 0.7, -16],
        legs: [{ to: [9, -19.4], within: 0.3, run: false }, { name: 'auf die Röhre im Meeresloch', to: [9, -22.5], jump: 24, within: 0.3, run: false }, { crouch: 4 }, { expect: 'inRoom' },
          { tiles: 'farbfelder' }, { wait: 40 }, { star: 1 }], shot: 'stern1', mech: (r) => r.mech.tiles === 16 },
      { name: 'Stern 2: Wandhöhle – Krabbelkäfer besiegen, Krümel gibt den Stern', star: 2, from: [48, Y, 4],
        legs: [{ to: [48, -1], within: 0.5 }, { stompAll: 'kk_hoehle' }, { until: 'taskDone', max: 240 }, { star: 2 }], shot: 'stern2', mech: (r) => r.mech.stomped.length === 6, mechText: (r) => `besiegt ${r.mech.stomped.length}` },
      { name: 'Stempel: über der Holzschanze im Flussritt (Sprung gehalten)', stamp: true, from: [0, 0.62, -72],
        legs: [{ to: [0, -79.8], within: 0.4, run: false }, { mount: [0, -82.6] }, { ride: [[-80, 0], [-200, 0]], jump: [[-131, -137]] }], shot: 'stempel',
        mechText: (r) => `Scheitel über der Schanze y ${r.mech.maxRampY.toFixed(2)}` },
      { name: 'Stempel nicht ohne Sprung (Schanze nur mitgenommen)', stamp: true, expectNot: true, from: [0, 0.62, -72], heroes: ['lotti'],
        legs: [{ to: [0, -79.8], within: 0.4, run: false }, { mount: [0, -82.6] }, { ride: [[-80, 0], [-200, 0]] }],
        mechText: (r) => `Scheitel y ${r.mech.maxRampY.toFixed(2)}` },
    ],
    extra: [
      { name: 'Mini-Pilzlinge: mittlere Sandskulptur zerstampfen → sechs Mini-Pilzlinge', from: [9.6, Y, 4], heroes: ['lotti'],
        legs: [{ to: [9.6, 1.4], within: 0.3, run: false }, { pound: [9.6, -1] }, { wait: 120 }, { expect: 'minis6' }] },
      { name: 'Extraleben: unsichtbarer Block vor dem roten Strandkorb', from: [-13, Y, 4.5], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-13, 6.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: Schatztruhe hinter dem Leuchtturm', from: [4, Y, -236], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6.4, -240.6], within: 0.4 }, { to: [10.2, -239.6], within: 0.4, run: false }, { wait: 60 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: dritten Münzmarder einholen', from: [21, Y, 12], heroes: ['lotti'], expectLives: 1,
        legs: [{ chaseKind: 'muenzmarder', ids: ['marder3'], run: true, max: 3000 }, { wait: 60 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Warp-Box versteckt, solange Schlüssel fehlen', from: [1, Y, -18], heroes: ['lotti'],
        legs: [{ to: [1, -23], within: 0.3, run: false }, { wait: 60 }, { expect: 'notOnIsle' }] },
    ],
    shots: [
      ['start', [0, Y, 10]],
      ['skulpturen', [9.6, Y, 5]],
      ['burg', [-10, Y, 3]],
      ['turm', [-24, Y, 9]],
      ['flachwasser', [-16, Y, -10]],
      ['sandbank', [1, Y, -16]],
      ['loch', [8, 0.7, -17]],
      ['hain', [16, Y, 13]],
      ['bullen', [30, Y, 4]],
      ['strand_mitte', [20, Y, 5]],
      ['hoehle_vor', [48, Y, 7]],
      ['hoehle', [48, Y, -2], 40],
      ['farbraum', [102, Y, -12], 40],
      ['schwebeinsel', [0, 9, -42]],
      ['steg', [0, 0.62, -71]],
      ['grotte_a', [0, 0.62, -78]],
      ['grottenstrand', [0, 0.62, -197]],
      ['zielinsel', [0, Y, -219]],
      ['ziel', [0, Y, -231]],
    ],
  },
  '5-2': {
    start: [0, Y, 6],
    meta: { stars: 3, time: 400, theme: 'circus', music: 'course_trapeze', archetype: 'parcours' },
    enemies: { schnappblume: 16, riesenschnappblume: 4, funkenling: 4, pilzling: 6, stachelstange: 3 },
    main: [
      { name: 'Startbühne', to: [0, -2.8], within: 0.4 },
      { name: 'Seilbahn 1', gondola: 'gondel1' },
      { name: 'Trapezbühne', to: [0, -30], within: 0.6, jump: 10 },
      { to: [0, -36.6], within: 0.25, run: false },
      { trapeze: 'ta1' },
      { swing: 'ta1', next: 'ta2' },
      { swing: 'ta2', next: 'ta3' },
      { swing: 'ta3', land: true },
      { name: 'Seilbahnbühne', to: [0, -59.4], within: 0.4, run: false },
      { name: 'Seilbahn 2', gondola: 'gondel2' },
      { name: 'Checkpoint', to: [0, -85], within: 0.6, jump: 10 },
      { name: 'Pilz-Trampolin zur Gasse', bounce: [0, -98.5], at: [0, -92] },
      { to: [1, -103], within: 0.4 },
      { name: '?-Block mit Riesentrank', to: [1, -104.5], within: 0.2, run: false },
      { hop: 22 },
      { chaseKind: 'powerup', max: 600 },
      { expect: 'giant' },
      { name: 'als Riese durch die Steinwände', to: [1, -129.5], within: 0.6 },
      { name: 'Glasröhre', to: [0, -136], within: 0.5, stopIf: 'onF' },
      { wait: 20 },
      { expect: 'onF' },
      { to: [0, -146.4], within: 0.3, run: false },
      { name: 'Pendelplattform', pendel: 'pendel1', exitZ: -154.2 },
      { name: 'Bühne G', to: [0, -159.5], jump: 24, within: 0.6, run: false },
      { to: [0, -163.5], within: 0.3, run: false },
      { name: 'Drehscheibe 1', to: [0, -167.6], jump: 24, runUp: 3, within: 0.5, run: false, dodge: true },
      { to: [-1.6, -169.3], within: 0.5, run: false, dodge: true },
      { to: [0, -171.3], within: 0.4, run: false, dodge: true },
      { name: 'Drehscheibe 2', to: [0, -175.8], jump: 24, runUp: 3, within: 0.5, run: false, dodge: true },
      { to: [-1.6, -177.3], within: 0.5, run: false, dodge: true },
      { to: [0, -179.3], within: 0.4, run: false, dodge: true },
      { name: 'Drehscheibe 3', to: [0, -183.8], jump: 24, runUp: 3, within: 0.5, run: false, dodge: true },
      { to: [-1.6, -185.3], within: 0.5, run: false, dodge: true },
      { to: [0, -187.3], within: 0.4, run: false, dodge: true },
      { name: 'Bühne H', to: [0, -192.2], jump: 30, runUp: 3, within: 0.6, run: false },
      { to: [0, -196.2], within: 0.25, run: false },
      { trapeze: 'tb1' },
      { swing: 'tb1', next: 'tb2' },
      { swing: 'tb2', next: 'tb3' },
      { swing: 'tb3', land: true },
      { name: 'Bühne I', to: [0, -217.2], within: 0.25, run: false },
      { trapeze: 'tc1' },
      { swing: 'tc1', land: true },
      { name: 'Zielmast', to: [0, -243.6], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Seilbahnen und Trapeze benutzt (2 Gondeln, 7 Trapeze)', ok: (r) => r.mech.gondola === 2 && r.mech.trapezes === 7 },
      { name: 'Pendelplattform und Pilz-Trampolin benutzt', ok: (r) => r.mech.pendel === 1 && r.mech.bounces >= 1 },
    ],
    targets: [
      { name: 'Stern 0: aus der Seilbahn auf den hohen Sims springen', star: 0, from: [0, Y, -2.8],
        legs: [{ gondola: 'gondel1', leap: { at: -15.4, to: [-4.6, -17.2] } }, { wait: 20 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Seilbahn (Rückwärtssalto auf der Startbühne)', star: 0, expectNot: true, from: [-3.6, Y, -3.4], heroes: ['lotti'],
        legs: [{ to: [-3.6, -3.7], within: 0.2, run: false }, { hop: 40 }, { wait: 60 }] },
      { name: 'Stern 1: von der Drehscheibe zur Ostbühne, Röhre, Blaumünzen-Raum (Druckschalter, 8 blaue Münzen in 10 s)', star: 1, from: [0, 14, -175.8],
        legs: [{ to: [1.6, -177.3], within: 0.5, run: false, dodge: true }, { name: 'zur Ostbühne', to: [7.4, -177.3], jump: 30, jumpAt: 4.3, within: 0.6, run: true },
          { name: 'auf die Röhre', to: [8.2, -177.25], jump: 30, within: 0.25, run: false }, { crouch: 4 }, { expect: 'inBlueRoom' },
          { to: [86.6, -177], within: 0.4, run: false }, { name: 'Druckschalter', pound: [88, -177] }, { wait: 10 }, { chaseKind: 'bluecoin', max: 1300, run: true }, { wait: 40 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Sternring vor dem Ziel – acht Sternmünzen in 10 s', star: 2, from: [0, 14, -224.5],
        legs: [{ to: [0, -229.5], within: 0.5 }, { chaseKind: 'starcoin', max: 1300, run: true }, { wait: 40 }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Pilz-Trampolin auf Bühne H zum Stempel-Sims', stamp: true, from: [0, 14, -191.6],
        legs: [{ bounce: [-9, -193.5], at: [-3.4, -193.5], steerBelow: 30 }, { expect: 'onPerch' }, { to: [-9, -193.5], within: 0.2, run: false }, { wait: 20 }, { hop: 20 }, { wait: 20 }], shot: 'stempel' },
      { name: 'Stempel-Sims nicht ohne Trampolin (Sprung von Bühne H)', stamp: true, expectNot: true, from: [-4.4, 14, -193.5], heroes: ['lotti'],
        legs: [{ to: [-9, -193.5], jump: 40, within: 0.5, max: 300, land: false }, { wait: 90 }] },
    ],
    extra: [
      { name: 'Riesen-Gasse ohne Riesentrank: über den Seitensteg zur Glasröhre (Wände bleiben stehen)', from: [-4.4, 10, -103], heroes: ['lotti', 'greta'],
        legs: [{ to: [-4.5, -110], within: 0.5 }, { to: [-4.5, -129.4], within: 0.5 }, { to: [0, -129.6], within: 0.4, run: false }, { to: [0, -136], within: 0.5, stopIf: 'onF' }, { wait: 20 }, { expect: 'onF' }, { expect: 'wallsStand' }] },
      { name: 'Riesentrank: alle drei Steinwände und beide Riesenschnappblumen zertrümmert, Pilzlinge platt; Extraleben hinter der letzten Wand', from: [1, 10, -103], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [1, -104.5], within: 0.2, run: false }, { hop: 22 }, { chaseKind: 'powerup', max: 600 }, { expect: 'giant' }, { to: [1, -112.5], within: 0.6 },
          { to: [3.5, -115.5], within: 0.6 }, { to: [1, -119.5], within: 0.6 }, { to: [3.5, -122.5], within: 0.6 }, { to: [1, -127], within: 0.6 }, { expect: 'wallsBroken' },
          { chaseKind: 'powerup', max: 900 }, { expect: 'gasseInfo' }, { expect: 'gasseLeer' }] },
      { name: 'Extraleben: unsichtbarer Block über dem hohen Sims', from: [-4.6, 6.6, -16.5], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-4.6, -19.2], within: 0.2, run: false }, { wait: 30 }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Checkpoint 2 nach der Glasröhre: Tod auf den Drehscheiben → Neustart auf Bühne F', from: [0, 14, -144], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [0, -146], within: 0.4 }, { to: [8, -170], within: 0.5, max: 400 }, { wait: 400 }, { expect: 'respawnF' }] },
    ],
    shots: [
      ['start', [0, Y, 8]],
      ['seilbahn', [0, Y, -2]],
      ['sims', [-4.6, 6.6, -15]],
      ['trapezbuehne', [0, 9, -30]],
      ['trapeze', [0, 9, -35.5]],
      ['seilbahn2', [0, 9, -58]],
      ['checkpoint', [0, 5, -84]],
      ['gasse', [0, 10, -99]],
      ['gasse_mitte', [-4.5, 10, -114]],
      ['buehne_f', [0, 14, -142]],
      ['pendel', [0, 14, -145.5]],
      ['scheiben', [0, 14, -161.5]],
      ['ostbuehne', [9.5, 14, -177]],
      ['blauraum', [83, 14, -172], 60],
      ['buehne_h', [0, 14, -193]],
      ['sims_stempel', [-10.4, 20.4, -194]],
      ['trapeze_b', [0, 14, -197]],
      ['finale', [0, 14, -217]],
      ['ziel', [0, 14, -229]],
    ],
  },
};

const PORT = 4470;
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
  const COND = {
    keys5: () => (L.keys?.tor?.n ?? 0) >= 5,
    warpOpen: () => !L.named.get('warp1')?.hidden,
    onIsle: () => P().pos.y > 8 && P().pos.z < -36 && P().pos.z > -60,
    notOnIsle: () => !(P().pos.y > 8 && P().pos.z < -36 && P().pos.z > -60),
    minis6: () => L.entities.filter((e) => e.kind === 'pilzling' && e.mini && !e.removed).length === 6,
    riding: () => !!P().riding,
    dismounted: () => !!P().dismounted && !P().riding,
    inRoom: () => P().pos.x > 90,
    tilesDone: () => !!L.named.get('farbfelder')?.done,
    taskDone: () => L.named.get('aufgabe_hoehle')?.state === 'done',
    onGoalIsle: () => P().pos.z < -210,
    fire: () => P().power === 'funken',
    giant: () => P().power === 'riese',
    onF: () => P().pos.y > 13 && P().pos.z < -138 && P().pos.z > -150,
    wallsBroken: () => ['wand1', 'wand2', 'wand3'].every((id) => (L.named.get(id)?.broken ?? 0) > 0),
    wallsStand: () => ['wand1', 'wand2', 'wand3'].every((id) => (L.named.get(id)?.broken ?? 0) === 0),
    gasseLeer: () => L.entities.filter((e) => e.kind === 'riesenschnappblume' && /^riese_g/.test(e.spec?.id ?? '') && e.alive && !e.defeated && !e.removed).length === 0 && L.entities.filter((e) => e.kind === 'pilzling' && e.alive && !e.defeated && !e.removed).length <= 3,
    inBlueRoom: () => P().pos.x > 70,
    gasseInfo: () => { window.__gasse = L.entities.filter((e) => (e.kind === 'pilzling' || e.kind === 'riesenschnappblume') && e.alive && !e.defeated && !e.removed).map((e) => [e.spec?.id, +e.pos.x.toFixed(1), +e.pos.z.toFixed(1)]); return JSON.stringify(window.__gasse); },
    onPerch: () => P().pos.y > 19 && P().pos.x < -6.5,
    respawnF: () => Math.abs(P().pos.z + 144) < 2 && P().pos.y > 13.5 && !P().dead,
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
      const mech = { hurts: 0, keys: [], ride: 0, maxRampY: -99, bridgeHits: 0, tiles: 0, stomped: [], pipes: 0 };
      const track = [];
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if (p.riding) mech.ride++;
        if (p.mode === 'ground' && !p.dead && !p.riding) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '']); if (hist.length > 40) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !p.riding && p.script?.type !== 'mount' && p.script?.type !== 'dismount' && !p.trapeze && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play' && !p.riding) { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
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
        // ------------------------------------------------ auf einen Punkt springen und dort stampfen (Sandskulptur)
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
        // ------------------------------------------------ zu Pflaume ins Wasser springen (Station)
        if (Lg.mount) {
          let k = 0;
          for (; k < 400 && !p.riding; k++) {
            const r = p.raftPos;
            const tx = r ? r.x : Lg.mount[0], tz = r ? r.z : Lg.mount[1];
            const dx = tx - p.pos.x, dz = tz - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz) : this.stick(dx, dz, 1)), jump: k % 60 < 24, run: false });
          }
          log.push(['aufgestiegen', !!p.riding, k, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!p.riding) log.push(['FEHLER: nicht aufgestiegen']);
          continue;
        }
        // ------------------------------------------------ Floß lenken: Seitenlage je z, Sprung in Bereichen, bis zum Absteigen
        if (Lg.ride) {
          const keys = Lg.ride;
          const latAt = (z) => {
            if (z >= keys[0][0]) return keys[0][1];
            for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= a[0] && z >= b[0]) { const t = (a[0] - z) / (a[0] - b[0]); return a[1] + (b[1] - a[1]) * t; } }
            return keys[keys.length - 1][1];
          };
          let k = 0;
          for (; k < (Lg.max ?? 9000); k++) {
            if (p.dead) break;
            if (p.dismounted && !p.riding && p.mode === 'ground') break;
            if (!p.riding) { tick({}); continue; }
            const f = L.river.sample(p.pos.x, p.pos.z, {}, p.pos.y);
            const lat = latAt(p.pos.z);
            const q = f.ch.at(f.s + 3.5, {});
            const tx = q.x + q.rx * lat, tz = q.z + q.rz * lat;
            const jumpHere = (Lg.jump ?? []).some(([z0, z1]) => p.pos.z <= z0 && p.pos.z >= z1);
            const st = this.stick(tx - p.pos.x, tz - p.pos.z, 1);
            tick({ x: st.x, y: st.y * (Lg.push ?? 0.3), jump: jumpHere });
            if (p.mode === 'air' && p.riding) mech.maxRampY = Math.max(mech.maxRampY, p.pos.y);
          }
          for (const id of Lg.bridges ?? []) mech.bridgeHits += L.named.get(id)?.hits ?? 0;
          log.push(['ritt', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, !!p.dismounted]);
          if (!p.dismounted) log.push(['FEHLER: Ritt nicht beendet']);
          continue;
        }
        // ------------------------------------------------ Seilbahn: Gondel abwarten, einsteigen, mitfahren (optional unterwegs abspringen)
        if (Lg.gondola) {
          const g = L.named.get(Lg.gondola);
          const atStart = () => g.state === 'wait' && g.u <= 0.001 && g.t < 1.2;
          let k = 0;
          for (; k < 3000 && !atStart(); k++) tick({});
          // hinein (Mitte der Gondel; Geländer 0,9 m – hineinspringen)
          let j = 0, inside = false;
          for (; j < 300; j++) {
            const dx = g.pos.x - p.pos.x, dz = g.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            inside = p.mode === 'ground' && p.ground?.tag === 'seilbahn';
            if (inside && d < 0.35) break;
            tick({ ...(p.mode === 'air' ? this.airSteer(g.pos.x, g.pos.z) : this.stick(dx, dz, Math.min(1, d))), jump: !inside && j < 26, run: false });
          }
          log.push(['eingestiegen', Lg.gondola, k, j, inside, +p.pos.y.toFixed(2)]);
          if (!inside) { log.push(['FEHLER: nicht in der Gondel', Lg.gondola]); break; }
          mech.gondola = (mech.gondola ?? 0) + 1;
          // mitfahren bis zum Ziel bzw. bis zum Absprungpunkt
          let r = 0, jumped = false;
          for (; r < 3000; r++) {
            if (p.dead) break;
            if (Lg.leap && !jumped && g.pos.z <= Lg.leap.at) {
              jumped = true;
              let a = 0;
              for (; a < 400; a++) {
                const [tx, tz] = Lg.leap.to;
                tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.6, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 30, run: false });
                if (a > 10 && p.mode === 'ground') break;
              }
              log.push(['aus der Gondel gesprungen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.ground?.tag]);
              break;
            }
            if (g.state === 'wait' && g.u >= 0.999) break;
            const dx = g.pos.x - p.pos.x, dz = g.pos.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.4), run: false } : {});
          }
          log.push(['gefahren', Lg.gondola, r, +g.u.toFixed(2), +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Trapez vom Boden aus greifen (Absprung, wenn die Stange heranschwingt)
        if (Lg.trapeze) {
          const t = L.named.get(Lg.trapeze);
          let k = 0, got = false;
          for (; k < 2400 && !got; k++) {
            // Stange schwingt zur Bühne zurück: springen, wenn sie in ≈ 0,18 s waagerecht über der Figur ist (dann
            // erreichen die Hände beim Steigen ihre Höhe)
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
          mech.trapezes = (mech.trapezes ?? 0) + 1;
          continue;
        }
        // ------------------------------------------------ am Trapez schwingen, abspringen zum nächsten Trapez bzw. auf die Bühne
        if (Lg.swing) {
          const t = L.named.get(Lg.swing), next = Lg.next ? L.named.get(Lg.next) : null;
          const DEG = Math.PI / 180;
          const fwd = this.stick(t.dir.x, t.dir.z, 1);
          let k = 0;
          const lo = next ? 20 : (Lg.lo ?? 12), hi = next ? 30 : (Lg.hi ?? 30);
          for (; k < 8 * 120 && !(t.omega > 0 && t.theta > lo * DEG && t.theta < hi * DEG && k > (Lg.pump ?? 240)); k++) tick(fwd);
          const rel = { th: +(t.theta / DEG).toFixed(1), om: +t.omega.toFixed(2), amp: +t.targetAmp.toFixed(1), aimed0: t.aimed ?? 0 };
          let i = 0, ok = false;
          for (; i < 3 * 120; i++) {
            tick({ ...(next || i > 30 ? fwd : {}), jump: i < 30 });
            if (i === 1) { rel.v = [+p.vel.x.toFixed(2), +p.vel.y.toFixed(2), +p.vel.z.toFixed(2)]; rel.aimed = (t.aimed ?? 0) - rel.aimed0; }
            if (next && next.rider === p) { ok = true; break; }
            if (!next && p.mode === 'ground') { ok = true; break; }
            if (p.dead) break;
          }
          log.push(['geschwungen', Lg.swing, Lg.next ?? 'Bühne', ok, k, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), JSON.stringify(rel)]);
          if (!ok) { log.push(['FEHLER: Schwung verfehlt', Lg.swing]); break; }
          if (next) mech.trapezes = (mech.trapezes ?? 0) + 1;
          continue;
        }
        // ------------------------------------------------ Pendelplattform: aufspringen, mitschwingen, abspringen
        if (Lg.pendel) {
          const h = L.named.get(Lg.pendel);
          const near = () => { const q = h.pos; return Math.hypot(q.x - p.pos.x, q.z - p.pos.z) < (Lg.reach ?? 2.8) && h.theta < (Lg.theta ?? -0.42); };
          let k = 0;
          for (; k < 2400 && !near(); k++) tick({});
          let j = 0, on = false;
          for (; j < 200; j++) {
            const q = h.pos;
            tick({ ...(p.mode === 'air' ? this.airSteer(q.x, q.z, 0, 0, 3.2, 8) : this.stick(q.x - p.pos.x, q.z - p.pos.z, 1)), jump: j < 22, run: false });
            if (j > 8 && p.mode === 'ground') { on = p.ground?.owner === h || p.ground?.tag === 'pendelplattform'; break; }
          }
          if (!on) { log.push(['FEHLER: nicht auf der Pendelplattform', Lg.pendel]); break; }
          mech.pendel = (mech.pendel ?? 0) + 1;
          // mitschwingen, bis die Plattform am anderen Ende ist (z ≤ exitZ), dann abspringen
          let r = 0;
          for (; r < 2400; r++) {
            const q = h.pos;
            if (q.z <= Lg.exitZ) break;
            const dx = q.x - p.pos.x, dz = q.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.25 ? { ...this.stick(dx, dz, 0.5), run: false } : {});
            if (p.mode === 'ground' && p.ground?.owner !== h && p.ground?.tag !== 'pendelplattform') { log.push(['FEHLER: von der Pendelplattform gefallen']); break; }
          }
          log.push(['Pendel', Lg.pendel, k, j, r, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Pilz-Trampolin: hinaufspringen, hochfedern, zum Ziel lenken
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
          log.push(['Trampolin', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed) { log.push(['FEHLER: Trampolin', Lg.at]); break; }
          mech.bounces = (mech.bounces ?? 0) + 1;
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
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({});   // erst landen, dann abspringen
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const done = dist < within && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim'))) && (!Lg.dodge || p.mode === 'ground');
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
          const swimJ = p.mode === 'swim' && (i % 24) < 10;
          // Stachelkugeln ausweichen: kommt eine Kugel auf Fußhöhe heran, drüberspringen
          let dodgeJ = false;
          if (Lg.dodge && p.mode === 'ground') {
            for (const e of L.entities) {
              if (e.kind !== 'stachelstange' || e.removed) continue;
              for (const b of e.balls()) if (Math.hypot(b[0] - p.pos.x, b[2] - p.pos.z) < 1.7 && Math.abs(b[1] - p.pos.y - 0.6) < 1.1) dodgeJ = true;
            }
            if (dodgeJ) mech.dodges = (mech.dodges ?? 0) + 1;
          }
          tick({ ...st, run: Lg.run ?? true, jump: jump || swimJ || dodgeJ });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      mech.keys = L.keys?.tor?.n ?? 0;
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
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
  await page.screenshot({ path: `${OUT}w5a_${name}.png` });
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}`,
      meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
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
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10 });
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
