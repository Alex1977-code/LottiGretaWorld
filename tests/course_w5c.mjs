// Welt 5, Level 5-5 „Kawumm im Kristallstollen“ (Mine: Zündköpfe, POW-Blöcke, lila Ziegelwände, Loren), Arena 5-B
// „Wackelturm am Glutsee“ (Werferturm aus 9 Pilzlingen mit Feuer-Werfer, zwei steigende Steinsäulen, 100 s) und 5-6
// „Flipp-Flapp-Tortenland“ (Rot-Blau-Flipper wechseln bei jedem Sprung, Feuerringe, Spiegelfrüchte):
// Laden ohne Konsolenfehler/-warnungen, Meta (Thema, Musik, Zeitlimit, Sterne), Gegnerzahlen, Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step), alle Sterne und der Stempel mit der echten
// Mechanik (POW zerbricht das lila Tor, Loren tragen, Zündkopf werfen gegen lila Ziegel bzw. rissige Wand, Hase fangen,
// Wolkenkanone + Farbfeld; Werfer von der Steinsäule aus besiegen, Turm abtragen; jeder Sprung wechselt die Flipper-
// Farbe, Kugel auf das P-Feld, Sternring, 2er-Lift mit Spiegelfrucht-Klon), Extras (Extraleben-Geheimnisse), Zeit bis
// zum Ziel, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der
// Spielkamera (tests/out/w5c_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w5c.mjs [5-5|5-B|5-6]
//   PARTS=route,sweep,targets,extra,shots,arena (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist während der
// Fahrt unverwundbar (Treffer-Versuche werden gezählt), damit Geometrie und Mechanik geprüft werden.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

const Y1 = 1, Y2 = -4, Y3 = -7, Y4 = -8, YG = 3;   // 5-5
// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land } · { wait } ·
// { hop } (Sprung auf der Stelle) · { stomp } · { crouch } (Röhre) · { star: i } · { chaseKind } · { expect } (COND) ·
// { until } · { mover: id, when, until } (Lore: abwarten, aufspringen, mitfahren) · { pickup: kind } (nächstes Objekt
// aufheben) · { throwAt: [x, z] } (Gehaltenes werfen) · { face: [x, z] } · { tile: [x, z] } (ein Flipper-Hüpfer auf ein
// Feld) · { clone } (Spiegelfrucht-Klon abwarten)
const ROUTES = {
  '5-5': {
    start: [0, Y1, 6],
    meta: { stars: 3, time: 400, theme: 'mine', music: 'course_mine' },
    enemies: { zuendkopf: 3, zuendkopf_quelle: 2, pilzlingsturm: 4, schnappblume: 5, feuer_schnappblume: 2, pow: 5 },
    main: [
      { name: 'Stolleneingang', to: [0, -14] },
      { name: 'auf den POW', to: [0, -24], jump: 22, jumpAt: 1.6, within: 0.5, run: false },
      { wait: 30 }, { expect: 'torOffen' },
      { name: 'durchs Tor', to: [0, -32] },
      { name: 'Schluchtkante', to: [0, -43.5], within: 0.3, run: false },
      { name: 'Lore 1', mover: 'lore1', when: { axis: 'z', gt: -47.5 }, until: { axis: 'z', lt: -56.4 }, run: false },
      { name: 'Mittelinsel', to: [0, -61.2], jump: 26, within: 0.5, run: false },
      { name: 'Lore 2', mover: 'lore2', runup: [0, -62.4], when: { axis: 'x', gt: -5.0, lt: -4.0, dir: 1 }, jumpAt: 5.6, lead: 0.9, until: { axis: 'x', gt: -100 }, run: false, jump: 30 },
      { name: 'Sims B', to: [null, -75.6], jump: 30, jumpAt: 5.4, within: 0.6, run: false },
      { to: [5, -80.4], within: 0.3, run: false },
      { name: 'Glasröhre zur Halle', enter: [5, -85] },
      { expect: 'inHalle' },
      { name: 'Checkpoint', to: [0, -108] },
      { name: 'Halle', to: [0, -138] },
      { name: 'Boost-Feld', to: [0, -176], jump: 30, jumpAt: 18.3, within: 0.8 },
      { expect: 'gelandet' },
      { name: 'Ausgangsröhre', to: [0, -191.6], within: 0.3, run: false },
      { to: [0, -193.4], jump: 30, within: 0.3, run: false },
      { crouch: 4 },
      { expect: 'amAusgang' },
      { name: 'Zielmast', to: [0, -220.3], within: 0.2 },
    ],
    mainMech: [
      [(m) => `POW öffnet das lila Tor, zwei Loren tragen über die Schlucht (${m.rides} Loren, ${m.carried} Schritte auf Loren)`, (m) => m.rides >= 2 && m.carried > 300],
      [(m) => `Glasröhre in die Halle und Röhre zum Ausgang benutzt (${m.pipes} Fahrten)`, (m) => m.pipes >= 2],
    ],
    targets: [
      { name: 'Stern 0: POW zerbricht die lila Wand, Glasröhre hinauf auf den Kristallbalkon', star: 0, from: [0, Y1, -75.4],
        legs: [{ to: [0, -77], jump: 22, jumpAt: 1.5, within: 0.4, run: false }, { wait: 30 }, { expect: 'wandSternOffen' },
          { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { expect: 'aufBalkon' }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 0: Zündkopf aus der Nachschub-Röhre gegen die lila Wand werfen', star: 0, from: [-1, Y1, -81.4],
        legs: [{ pickup: 'zuendkopf', near: [0, -83.2], r: 4 }, { throwAt: [-5, -79.4], from: [-3.2, -77.4] }, { expect: 'wandSternLoch' },
          { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { expect: 'aufBalkon' }, { star: 0 }], mech: { thrown: true } },
      { name: 'Stern 0: Tatzenhieb (Krallen-Anzug) zerbricht die lila Ziegel', star: 0, from: [-5, Y1, -78.1], power: 'krallen', heroes: ['lotti'],
        legs: [{ face: [-5, -80] }, { claw: 2 }, { expect: 'wandSternLoch' }, { to: [-5, -78.4], within: 0.3, run: false }, { enter: [-5, -82] }, { star: 0 }] },
      { name: 'Stern 0 nicht ohne Sprengen: Röhre hinter der Wand versperrt', star: 0, expectNot: true, from: [-5, Y1, -77], heroes: ['lotti'],
        legs: [{ to: [-5, -82], within: 0.3, run: false, max: 240, noFail: true }, { wait: 60 }, { expect: 'nichtHinterWand' }] },
      { name: 'Stern 1: Hase auf der Glühpilz-Wiese fangen', star: 1, from: [0, Y2, -118],
        legs: [{ to: [-1.2, -118], within: 0.4, run: false }, { chaseId: 'hase_stern', max: 2400 }, { wait: 40 }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Wolkenkanone auf die Empore, Farbfeld 3 × 3 färben', star: 2, from: [7, Y2, -106.4],
        legs: [{ to: [7, -107.4], within: 0.3, run: false }, { cannon: [7, -110] }, { expect: 'aufEmpore' },
          { to: [5.2, -120.2], within: 0.3, run: false }, { to: [5.2, -121.8], within: 0.3, run: false }, { to: [5.2, -123.4], within: 0.3, run: false },
          { to: [6.8, -123.4], within: 0.3, run: false }, { to: [6.8, -121.8], within: 0.3, run: false }, { to: [6.8, -120.2], within: 0.3, run: false },
          { to: [8.4, -120.2], within: 0.3, run: false }, { to: [8.4, -121.8], within: 0.3, run: false }, { to: [8.4, -123.4], within: 0.3, run: false },
          { wait: 40 }, { expect: 'farbfeldFertig' }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Zündkopf gegen die rissige Wand werfen, Geheimgang zur Kammer', stamp: true, from: [-6, Y2, -124],
        legs: [{ pickup: 'zuendkopf', near: [-7.8, -129], r: 7 }, { throwAt: [-10.5, -131.5], from: [-7.6, -131.5] }, { expect: 'rissOffen' },
          { to: [-15, -131.5], within: 0.4, run: false }, { to: [-25.4, -131.5], within: 0.3, run: false }, { wait: 20 }], shot: 'stempel', mech: { thrown: true } },
      { name: 'Stempel nicht ohne Sprengung: Stampfen und Kopfstoß lassen die rissige Wand stehen', stamp: true, expectNot: true, from: [-7.8, Y2, -131.5], heroes: ['lotti'],
        legs: [{ to: [-8.85, -131.5], within: 0.25, run: false }, { hop: 30 }, { stomp: true }, { to: [-12, -131.5], within: 0.3, run: false, max: 200, noFail: true }, { wait: 30 }, { expect: 'rissZu' }] },
    ],
    extra: [
      { name: 'Extraleben: versteckter Block über der Mittelinsel', from: [-1.4, Y1, -61.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-1.4, -62.6], within: 0.15, run: false, slow: 0.4 }, { hop: 30 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: zweiter Hase auf der Wiese', from: [0, Y2, -118], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-1.2, -118], within: 0.4, run: false }, { chaseId: 'hase_leben', max: 2400 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Ohne Boost zu kurz: weich in der Grube, Treppe wieder hinauf', from: [0, Y3, -152.6], heroes: ['lotti'], expectAlive: true,
        legs: [{ to: [0, -170], jump: 30, jumpAt: 12.2, within: 0.8, run: true, max: 300, land: false }, { wait: 30 }, { expect: 'inGrube' },
          { to: [3.4, -163.4], within: 0.4, run: false }, { to: [3.4, -157.4], within: 0.4, run: false }, { expect: 'ausGrube' }] },
      { name: 'POW wirft beide Pilzlingstürme auf dem Landesims um', from: [0, Y4, -176.4], heroes: ['lotti'], expectAlive: true,
        legs: [{ wait: 120 }, { to: [0, -179.6], jump: 22, jumpAt: 1.4, within: 0.4, run: false }, { wait: 60 }, { expect: 'tuermeUm' }] },
    ],
    shots: [
      ['start', [0, Y1, 6]],
      ['start_rueck', [0, Y1, 2], 0, null, -Math.PI / 2],
      ['tor', [0, Y1, -18]],
      ['sims', [0, Y1, -33]],
      ['loren', [0, Y1, -42]],
      ['insel', [0, Y1, -62]],
      ['simsB', [0, Y1, -76]],
      ['balkon', [-11, Y1 + 9, -84]],
      ['halle', [0, Y2, -106]],
      ['empore', [6.8, Y2 + 13, -120]],
      ['wiese', [-4, Y2, -114]],
      ['risswand', [-7, Y2, -129]],
      ['kammer', [-24, Y2, -130]],
      ['boost', [0, Y2, -140]],
      ['grube', [0, Y3 - 4, -164]],
      ['lande', [0, Y4, -175]],
      ['ausgang', [0, Y4, -189]],
      ['ziel', [0, YG, -210]],
    ],
  },
  '5-B': {
    arena: true,
    start: [0, 2, 8.4],
    meta: { stars: 0, slots: 1, time: 100, theme: 'lava', music: 'course_arena' },
    enemies: { werferturm: 1, feuer_werfer: 1 },
    shots: [
      ['start', [0, 2, 8.4], 60],
      ['links', [-6, 2, -2], 30],
      ['rechts', [6, 2, -3], 30],
    ],
  },
  '5-6': {
    start: [0, 1, 5],
    meta: { stars: 3, time: 400, theme: 'cake', music: 'course_cake' },
    enemies: { feuerring: 4, schnappblume: 3, pilzling: 7 },
    main: [
      { name: 'Übungsfeld Reihe 1 (rot)', to: [0, -5], within: 0.4, run: false },
      { name: 'Reihe 2 (blau)', tile: [0, -7] }, { name: 'Reihe 3 (rot)', tile: [0, -9] },
      { name: 'Rastplatte', to: [0, -11.6], jump: 14, within: 0.5, run: false },
      { to: [0, -13.2], within: 0.3, run: false },
      { name: 'Feld 1', tile: [0, -15.2] }, { tile: [0, -17.2] }, { tile: [0, -19.2] }, { tile: [0, -21.2] }, { tile: [0, -23.2] }, { tile: [0, -25.2] },
      { name: 'Rastplatte 2', to: [0, -27.6], jump: 14, within: 0.5, run: false },
      { to: [1, -31.6], within: 0.3, run: false },
      { name: 'Feld 2', tile: [1, -34] }, { tile: [1, -36] }, { tile: [1, -38] }, { tile: [1, -40] }, { tile: [1, -42] }, { tile: [1, -44] },
      { name: '?-Block-Insel', to: [1, -46.8], jump: 14, within: 0.5, run: false },
      { to: [0, -53.4], within: 0.3, run: false },
      { name: 'Wechselplattformen I', tile: [0, -56] }, { tile: [1.6, -59.6], hold: 24 }, { tile: [-0.6, -63.2], hold: 24 }, { tile: [1.4, -66.8], hold: 24 }, { tile: [-1.0, -70.4], hold: 24 }, { tile: [0.6, -74], hold: 24 },
      { name: 'Hangfuß', to: [0, -77.6], jump: 24, within: 0.6, run: false },
      { name: 'Steigung', to: [0, -106] },
      { name: 'Checkpoint', to: [0, -113] },
      { name: 'Feuerring-Platz', to: [0, -156] }, { to: [0, -159], within: 0.3, run: false },
      { name: 'Wechselplattformen II', tile: [0, -162.6] }, { tile: [2.8, -165.8], hold: 22 }, { tile: [2.8, -169.4], hold: 22 }, { tile: [0, -172.6], hold: 22 },
      { name: 'Sternring-Torte', to: [0, -176], jump: 24, within: 0.6, run: false },
      { to: [-3, -177.6], within: 0.4, run: false }, { to: [-3, -182], within: 0.3, run: false },
      { tile: [-2.2, -185.6], hold: 22 }, { tile: [0, -188.8], hold: 22 }, { tile: [2.2, -192], hold: 22 },
      { name: 'Zieltorte', to: [2, -195.6], jump: 24, within: 0.6, run: false },
      { name: 'Zielmast', to: [0, -208.4], within: 0.2 },
    ],
    mainMech: [[(m) => `jeder Sprung wechselt die Farbe (${m.jumps} Sprünge, ${m.flipsAll} Farbwechsel, ${m.tiles} Landungen auf Flippern)`, (m) => m.jumps >= 30 && m.flipsAll === m.jumps && m.tiles >= 25]],
    targets: [
      { name: 'Stern 0: blaues Feld in der hinteren linken Ecke von Feld 2', star: 0, from: [-5, 1, -31.6],
        legs: [{ tile: [-5, -34] }, { tile: [-5, -36] }, { tile: [-5, -38] }, { tile: [-5, -40] }, { tile: [-5, -42] }, { tile: [-5, -44] }, { wait: 10 }, { star: 0 }], shot: 'stern0' },
      { name: 'Stern 1: Schnappblume auf der Röhre besiegen, Kugel auf das P-Feld bugsieren', star: 1, from: [-2, 9, -114],
        legs: [{ stompOn: 'sb_roehre' }, { expect: 'blumeWeg' }, { wait: 40 }, { to: [-5, -116.4], within: 0.3, run: false }, { wait: 20 }, { crouch: 6 }, { expect: 'imKugelraum' },
          { to: [76, -114], within: 0.4, run: false }, { to: [76, -121.4], within: 0.4, run: false }, { to: [70, -125.6], within: 0.4, run: false },
          { push: 'kugel', path: [[75.6, -123.4], [75.8, -113], [67.6, -112.6]], within: 0.6 }, { wait: 30 }, { expect: 'kugelAufFeld' }, { star: 1 }], shot: 'stern1' },
      { name: 'Stern 2: Sternring – acht Sternmünzen in 10 s, drei über den Wechselplattformen', star: 2, from: [0, 10.5, -175.9],
        legs: [{ to: [0, -177.6], within: 0.4, run: false }, { wait: 6 }, { to: [-3, -178.4], within: 0.35, run: false }, { to: [-3, -181.4], within: 0.35, run: false },
          { to: [0, -182.1], within: 0.35, run: false }, { to: [3, -181.4], within: 0.35, run: false }, { to: [3, -178.4], within: 0.35, run: false },
          { to: [-2.2, -182.4], within: 0.35, run: false }, { tile: [-2.2, -185.6], hold: 22 }, { tile: [0, -188.8], hold: 22 }, { tile: [2.2, -192], hold: 22 },
          { wait: 30 }, { expect: 'ringFertig' }, { tile: [0, -188.8], hold: 22 }, { tile: [-2.2, -185.6], hold: 22 }, { to: [-2.6, -181.2], jump: 24, within: 0.5, run: false }, { star: 2 }], shot: 'stern2' },
      { name: 'Stempel: Spiegelfrucht, mit dem Klon auf den 2er-Lift, oben zur Stempel-Etage', stamp: true, from: [1.4, 12, -197.6],
        legs: [{ to: [1.4, -201], within: 0.2, run: false, slow: 0.5 }, { wait: 40 }, { expect: 'klon' },
          { to: [4.4, -203.4], jump: 14, jumpAt: 2.2, within: 0.3, run: false, slow: 0.6 }, { wait: 30 }, { expect: 'zweiAufLift' }, { until: 'liftOben', max: 900 }, { expect: 'liftOben' },
          { to: [5, -208], jump: 24, within: 0.5, run: false }, { wait: 20 }], shot: 'stempel' },
      { name: 'Stempel nicht allein: der 2er-Lift fährt mit einer Figur nicht', stamp: true, expectNot: true, from: [5, 12, -200.6], heroes: ['lotti'],
        legs: [{ to: [5, -203.6], jump: 14, jumpAt: 2.2, within: 0.3, run: false }, { wait: 600 }, { expect: 'liftUnten' }] },
    ],
    extra: [
      { name: 'Hüpfer auf der Stelle: das eigene Feld klappt weg (durchfallen)', from: [0, 1, -21.2], heroes: ['lotti'], expectAlive: false,
        legs: [{ setColorOf: [0, -21.2] }, { wait: 20 }, { hop: 12 }, { wait: 120 }, { expect: 'durchgefallen' }] },
      { name: 'Extraleben: versteckter Block über der Startplatte', from: [0, 1, 0.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [0, -1], within: 0.15, run: false, slow: 0.4 }, { hop: 30 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: Ziegel über der Zuckerwürfel-Mauer im Kugel-Raum', from: [74.4, 9, -116.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [73.9, -118], within: 0.15, run: false, slow: 0.4 }, { hop: 30 }, { wait: 40 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Puls-Feuerring: rechtzeitig über die Flammen springen bleibt heil', from: [0, 9, -138.6], heroes: ['lotti'], expectAlive: true,
        legs: [{ ringJump: 'fr2' }, { expect: 'keinRingTreffer' }] },
    ],
    shots: [
      ['start', [0, 1, 5]],
      ['uebung', [0, 1, -2]],
      ['feld1', [0, 1, -12]],
      ['feld2', [0, 1, -30.5]],
      ['bloecke', [0, 1, -48]],
      ['wechsel1', [0, 1, -53]],
      ['hang', [0, 4, -78.5]],
      ['checkpoint', [0, 9, -110]],
      ['ringe', [0, 9, -122]],
      ['rad', [0, 9, -147]],
      ['wechsel2', [0, 9, -158.5]],
      ['sternring', [0, 10.5, -176]],
      ['ziel', [0, 12, -197]],
      ['lift', [3, 12, -201]],
      ['kugelraum', [70, 9, -114]],
    ],
  },
};

const PORT = 4490;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => t.name.includes(ONLY)) : list);
const PARTS = new Set((process.env.PARTS ?? 'route,sweep,targets,extra,shots,arena').split(','));
const HEROES = (process.env.HEROES ?? 'lotti,greta').split(',');

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
  const COND = {
    // 5-5
    torOffen: () => (ent('tor')?.left ?? 1) === 0,
    inHalle: () => P().pos.y < -2 && P().pos.z < -100,
    gelandet: () => P().pos.z < -170 && P().pos.y > -9,
    amAusgang: () => P().pos.z < -204 && P().pos.y > 2,
    wandSternOffen: () => (ent('wand_stern')?.left ?? 1) === 0,
    wandSternLoch: () => (ent('wand_stern')?.broken ?? 0) >= 1,
    nichtHinterWand: () => P().pos.z > -79.9 || P().pos.y > 3,
    aufBalkon: () => P().pos.y > 9.5 && P().pos.x < -8,
    aufEmpore: () => P().pos.y > 8.5 && P().pos.x > 3,
    farbfeldFertig: () => !!ent('farbfeld')?.done,
    rissOffen: () => !!ent('risswand')?.broken,
    rissZu: () => !ent('risswand')?.broken && P().pos.x > -11.1,
    inGrube: () => P().pos.y < -10 && P().pos.z < -158,
    ausGrube: () => P().pos.y > -7.5 && P().pos.z > -159,
    tuermeUm: () => ['t3', 't4'].every((id) => ent(id)?.defeated),
    // 5-6
    blumeWeg: () => !!ent('sb_roehre')?.defeated,
    imKugelraum: () => P().pos.x > 60,
    kugelAufFeld: () => !!ent('kugel')?.onField,
    ringFertig: () => ent('sternring')?.state === 'done',
    klon: () => (L.players?.length ?? 1) >= 2,
    liftOben: () => (ent('zweierlift')?.state === 'top'),
    zweiAufLift: () => (ent('zweierlift')?.count ?? 0) >= 2,
    liftUnten: () => (ent('zweierlift')?.state ?? 'wait') !== 'top' && P().pos.y < 13,
    durchgefallen: () => P().dead || P().pos.y < -2,
    keinRingTreffer: () => (P().hurtTries ?? 0) === 0,
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
    face(x, z) { const p = P(); p.yaw = Math.atan2(-(z - p.pos.z), x - p.pos.x); },
    drive(legs, o = {}) {
      const p = P();
      const log = [];
      let steps = 0, autoJumps = 0;
      const hold = o.invuln !== false;
      const hist = [];
      let deadLogged = false;
      const mech = { carried: 0, rides: 0, hurts: 0, thrown: 0, pipes: 0, flips: 0, tiles: 0 };
      const track = [];
      const hurtAt = new Map();
      let lastHurts = p.hurtTries ?? 0;
      const jumps0 = L.jumps ?? 0, flips0 = L.flipper?.flips ?? 0;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((p.hurtTries ?? 0) > lastHurts) {
          lastHurts = p.hurtTries;
          const k = `${p.lastHurt}@${Math.round(p.pos.x)},${Math.round(p.pos.z)}`;
          hurtAt.set(k, (hurtAt.get(k) ?? 0) + 1);
        }
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.ground?.tag === 'lore') mech.carried++;
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]); if (hist.length > 12) hist.shift(); }
        if (p.dead && !deadLogged) { deadLogged = true; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
          let n = 0;
          mech.pipes++;
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          log.push(['fahrt', n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      const goTo = (tx, tz, within = 0.25, max = 900, run = false) => {
        let i = 0;
        for (; i < max; i++) {
          const dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (d < within && p.mode === 'ground') break;
          tick({ ...this.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run });
        }
        return i < max;
      };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.face) { this.face(Lg.face[0], Lg.face[1]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.stomp) {
          for (let k = 0; k < 14; k++) tick({ jump: true });
          for (let k = 0; k < 90 && p.mode !== 'ground'; k++) tick({ crouch: p.vel.y < 2 });
          log.push(['stampfen', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
          continue;
        }
        if (Lg.claw) {
          for (let k = 0; k < Lg.claw; k++) { tick({ action: true }); for (let q = 0; q < 40; q++) tick({}); }
          log.push(['tatzenhieb', Lg.claw, p.power]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.chaseId) {
          const tgt = ent(Lg.chaseId);
          const caught = () => tgt?.state === 'caught' || tgt?.removed;
          const n = this.chase(tgt?.kind ?? 'bunny', { filter: (e) => e === tgt && !caught(), max: Lg.max ?? 2400, run: true });
          log.push(['jagd', Lg.chaseId, n, caught(), +p.pos.x.toFixed(1), +p.pos.z.toFixed(1)]);
          if (!caught()) log.push(['FEHLER: nicht gefangen', Lg.chaseId]);
          continue;
        }
        if (Lg.until && !Lg.to && !Lg.mover) {
          let k = 0;
          for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({});
          log.push(['bis', Lg.until, k]);
          continue;
        }
        // ------------------------------------------------ Rot-Blau-Flipper: ein Hüpfer auf das Feld bei (x, z)
        if (Lg.tile) {
          const sys = L.flipper;
          const [tx, tz] = Lg.tile;
          const t = sys?.tiles.find((q) => Math.abs(tx - q.x) <= q.w / 2 && Math.abs(tz - q.z) <= q.d / 2);
          if (!t) { log.push(['FEHLER: kein Feld bei', tx, tz]); break; }
          // Die Zielfarbe muss vor dem Sprung durchlässig sein (der Sprung macht sie fest): sonst erst auf festem Boden hüpfen
          if (sys.color === t.color) {
            const onFlip = p.ground?.tag === 'flipper';
            if (onFlip) { log.push(['FEHLER: Farbe passt nicht, Figur steht auf einem Flipper', t.color]); break; }
            for (let k = 0; k < 60 && Math.hypot(p.vel.x, p.vel.z) > 0.2; k++) tick({});
            for (let k = 0; k < 8; k++) tick({ jump: true });
            for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
            for (let k = 0; k < 6; k++) tick({});
            log.push(['Farbe abwarten (Hüpfer)', sys.color]);
          }
          const f0 = sys.flips;
          for (let k = 0; k < 60 && p.mode === 'ground' && Math.hypot(p.vel.x, p.vel.z) > 2.5; k++) tick({});
          let k = 0, left = false;
          const holdJ = Lg.hold ?? 12;
          for (; k < 400; k++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(t.x, t.z, 0, 0, 3.4, 8) : this.stick(t.x - p.pos.x, t.z - p.pos.z, 0.6)), jump: k < holdJ, run: false });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') break;
            if (p.dead) break;
          }
          for (let q = 0; q < 4; q++) tick({});
          const on = p.mode === 'ground' && p.ground?.tag === 'flipper' && Math.abs(p.pos.x - t.x) <= t.w / 2 + 0.3 && Math.abs(p.pos.z - t.z) <= t.d / 2 + 0.3;
          mech.flips += sys.flips - f0;
          if (on) mech.tiles++;
          log.push([Lg.name ?? 'feld', t.color, sys.color, on, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) { log.push(['FEHLER: nicht auf dem Feld gelandet', tx, tz]); break; }
          continue;
        }
        if (Lg.setColorOf) {
          // Figur steht schon auf dem Feld: dessen Farbe fest schalten (Testaufbau)
          const t = L.flipper.tiles.find((q) => Math.abs(Lg.setColorOf[0] - q.x) <= q.w / 2 && Math.abs(Lg.setColorOf[1] - q.z) <= q.d / 2);
          L.flipper.set(t.color);
          p.reset([t.x, t.y + 0.05, t.z], Math.PI / 2);
          continue;
        }
        // ------------------------------------------------ Gegner von oben treffen (Kopf) – z. B. Schnappblume auf der Röhre
        if (Lg.stompOn) {
          const e = ent(Lg.stompOn);
          let k = 0, left = false;
          for (; k < 600 && e && !e.defeated; k++) {
            const above = p.pos.y > e.pos.y + 1.0;
            const st = p.mode === 'air' ? (above ? this.airSteer(e.pos.x, e.pos.z, 0, 0, 3.6, 7) : { x: 0, y: 0 }) : this.stick(e.pos.x - p.pos.x, e.pos.z - p.pos.z, 0.25);
            tick({ ...st, jump: (k % 140) < 30, run: false });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground' && !e.defeated) { left = false; for (let q = 0; q < 20; q++) tick({}); }
          }
          for (let q = 0; q < 60; q++) tick({});
          log.push(['getroffen', Lg.stompOn, !!e?.defeated, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Schiebekugel über Wegpunkte schieben (von hinten anlaufen)
        if (Lg.push) {
          const b = ent(Lg.push);
          const R = (b.spec?.size ?? 1.6) / 2;
          let k = 0;
          for (const [wx, wz] of Lg.path) {
            for (; k < 9000; k++) {
              const bx = b.pos.x, bz = b.pos.z, dx = wx - bx, dz = wz - bz, d = Math.hypot(dx, dz);
              if (d < (Lg.within ?? 0.6)) break;
              const sp = b.speed?.() ?? 0;
              if (sp > 1.2) { tick({}); continue; }   // rollt noch: abwarten
              const ux = dx / d, uz = dz / d;
              const px = bx - ux * (R + 0.5), pz = bz - uz * (R + 0.5);
              const rx = p.pos.x - bx, rz = p.pos.z - bz;
              const along = rx * ux + rz * uz, across = rx * uz - rz * ux;
              const dp = Math.hypot(p.pos.x - px, p.pos.z - pz);
              let gx, gz, mag;
              if (dp > 0.35) {
                if (along > -R * 0.5) {
                  // vor oder neben der Kugel: seitlich um sie herum
                  const side = across >= 0 ? 1 : -1;
                  gx = bx + uz * side * (R + 1.1) - ux * (R + 0.4); gz = bz - ux * side * (R + 1.1) - uz * (R + 0.4);
                } else { gx = px; gz = pz; }
                mag = 0.7;
              } else {
                // hinter der Kugel: durch die Kugelmitte in Schieberichtung laufen
                gx = bx + ux * 1.2; gz = bz + uz * 1.2; mag = d < 2 ? 0.45 : 0.7;
              }
              const ddx = gx - p.pos.x, ddz = gz - p.pos.z, dd = Math.hypot(ddx, ddz);
              tick(dd > 0.08 ? { ...this.stick(ddx, ddz, Math.min(mag, Math.max(0.25, dd / 1.2))), run: false } : {});
            }
            log.push(['kugel', wx, wz, k, +b.pos.x.toFixed(2), +b.pos.z.toFixed(2), b.resets ?? 0]);
          }
          if (k >= 9000) log.push(['FEHLER: Kugel nicht ans Ziel']);
          continue;
        }
        // ------------------------------------------------ Puls-Feuerring: warten, bis die Welle naht, dann drüberspringen
        if (Lg.ringJump) {
          const e = ent(Lg.ringJump);
          const h0 = p.hurtTries ?? 0;
          let k = 0, jumped = 0, prev = e.ring ?? 0;
          for (; k < 1200 && jumped < 2; k++) {
            const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
            const r = e.ring ?? 0, growing = r > prev;
            prev = r;
            const lead = 0.55;
            if (p.mode === 'ground' && growing && r > d - lead - 0.2 && r < d - 0.1 && (e.flameH ?? 0) > 0.1) { for (let q = 0; q < 26; q++) tick({ jump: true }); jumped++; continue; }
            tick({});
          }
          for (let q = 0; q < 120; q++) tick({});
          log.push(['feuerring', jumped, k, (p.hurtTries ?? 0) - h0]);
          continue;
        }
        // ------------------------------------------------ in eine Glasröhre hineinlaufen und mitfahren
        if (Lg.enter) {
          let k = 0;
          for (; k < (Lg.max ?? 600) && p.mode !== 'script'; k++) {
            const dx = Lg.enter[0] - p.pos.x, dz = Lg.enter[1] - p.pos.z;
            const st = this.stick(dx, dz, 0.8);
            c.setInput({ ...st, run: false });
            if (hold) p.invuln = Math.max(p.invuln, 5);
            c.step(1); steps++;
          }
          if (p.mode === 'script') tick({});
          for (let q = 0; q < 240 && p.mode !== 'ground'; q++) tick({});
          log.push([Lg.name ?? 'röhre', k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode]);
          if (k >= (Lg.max ?? 600)) log.push(['FEHLER: nicht in die Röhre']);
          continue;
        }
        // ------------------------------------------------ Wolkenkanone: auf die Öffnung springen, Flug abwarten
        if (Lg.cannon) {
          let k = 0, fired = false;
          for (; k < 400 && !fired; k++) {
            const dx = Lg.cannon[0] - p.pos.x, dz = Lg.cannon[1] - p.pos.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(Lg.cannon[0], Lg.cannon[1], 0, 0, 3.6, 6) : this.stick(dx, dz, 0.5)), jump: k < 30, run: false });
            if (p.mode === 'script' || mech.pipes > 0) fired = true;
          }
          for (let q = 0; q < 400 && p.mode !== 'ground'; q++) tick({});
          log.push(['kanone', fired, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Zündkopf (o. ä.) aufheben
        if (Lg.pickup) {
          let k = 0, got = false;
          for (; k < (Lg.max ?? 2400) && !got; k++) {
            let e = null, best = Infinity;
            for (const x of L.entities) {
              if (x.kind !== Lg.pickup || !x.alive || x.removed || x.exploded || x.carrier || x.lit || x.state === 'air') continue;
              const dn = Math.hypot(x.pos.x - Lg.near[0], x.pos.z - Lg.near[1]);
              if (dn > (Lg.r ?? 6) || !x.grounded) continue;
              const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z);
              if (d < best) { best = d; e = x; }
            }
            if (!e) { tick({}); continue; }
            const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            if (d > 1.2) { tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.25, (d - 1.1) / 1.2))), run: false }); continue; }
            this.face(e.pos.x, e.pos.z);
            tick({ action: true }); tick({});
            got = p.holding === e;
            if (!got) for (let q = 0; q < 6; q++) tick({ ...this.stick(-dx, -dz, 0.5) });
          }
          log.push(['aufgehoben', Lg.pickup, got, k, p.holding?.kind ?? null]);
          if (!got) log.push(['FEHLER: nichts aufgehoben']);
          continue;
        }
        // ------------------------------------------------ Gehaltenes von from aus auf throwAt werfen, Explosion abwarten
        if (Lg.throwAt) {
          const held = p.holding;
          if (Lg.from) goTo(Lg.from[0], Lg.from[1], 0.35, 600, true);
          const fuse = held?.fuse ?? null;
          this.face(Lg.throwAt[0], Lg.throwAt[1]);
          tick({ action: true }); tick({});
          mech.thrown++;
          let k = 0, how = null, at = null;
          for (; k < 480 && held && !held.exploded && !held.removed; k++) { how = held.state; at = [+held.pos.x.toFixed(2), +held.pos.y.toFixed(2), +held.pos.z.toFixed(2)]; tick({}); }
          log.push(['geworfen', !!held, held?.exploded ?? null, k, 'Lunte', fuse === null ? null : +fuse.toFixed(2), 'zuletzt', how, at, +p.pos.x.toFixed(2), +p.pos.z.toFixed(2)]);
          if (held && (how === 'carried' || k < 3)) log.push(['FEHLER: nicht geworfen (explodiert in der Hand)']);
          for (let q = 0; q < 30; q++) tick({});
          continue;
        }
        // ------------------------------------------------ bewegliche Plattform (Lore): abwarten, aufspringen, mitfahren
        if (Lg.mover) {
          const m = ent(Lg.mover);
          const ok = () => { const v = Lg.when.axis === 'x' ? m.pm.pos.x : m.pm.pos.z; return (Lg.when.lt === undefined || v < Lg.when.lt) && (Lg.when.gt === undefined || v > Lg.when.gt) && (Lg.when.dir === undefined || Math.sign(m.mover.vx + m.mover.vz) === Lg.when.dir); };
          if (Lg.runup) goTo(Lg.runup[0], Lg.runup[1], 0.3);
          let k = 0;
          for (; k < 3000 && !ok(); k++) tick({});
          let j = 0, on = false, left = false, j0 = Lg.jumpAt ? null : 0;
          for (; j < 400; j++) {
            const mv = m.mover ?? { vx: 0, vz: 0 };
            const tx = m.pm.pos.x, tz = m.pm.pos.z;
            const lead = Lg.lead ?? 0;
            const st = p.mode === 'air' ? this.airSteer(tx, tz, mv.vx ?? 0, mv.vz ?? 0, 2.8, 9) : this.stick(tx + (mv.vx ?? 0) * lead - p.pos.x, tz + (mv.vz ?? 0) * lead - p.pos.z);
            if (j0 === null && Math.hypot(tx - p.pos.x, tz - p.pos.z) <= Lg.jumpAt) j0 = j;
            tick({ ...st, jump: j0 !== null && j - j0 < (Lg.jump ?? 26), run: Lg.run ?? true });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') { on = p.ground?.mover === m.mover || p.ground === m.shape; break; }
          }
          log.push([Lg.name ?? `auf ${Lg.mover}`, k, j, on, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!on) { log.push(['FEHLER: nicht auf der Plattform', Lg.mover]); break; }
          mech.rides++;
          if (Lg.until) {
            const done = () => { const v = Lg.until.axis === 'x' ? m.pm.pos.x : m.pm.pos.z; return (Lg.until.lt === undefined || v < Lg.until.lt) && (Lg.until.gt === undefined || v > Lg.until.gt); };
            let r = 0;
            for (; r < 3000 && !done() && !p.dead; r++) {
              const dx = m.pm.pos.x - p.pos.x, dz = m.pm.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              tick(d > 0.2 ? { ...this.stick(dx, dz, Math.min(0.5, d)), run: false } : {});
              if (p.mode === 'ground' && p.ground !== m.shape && p.ground?.mover !== m.mover) { log.push(['FEHLER: von der Plattform gefallen', Lg.mover]); break; }
            }
          }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
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
          if (j0 === null && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state]);
        if (i >= max && Lg.land !== false && !Lg.noFail) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      mech.jumps = (L.jumps ?? 0) - jumps0;
      mech.flipsAll = (L.flipper?.flips ?? 0) - flips0;
      mech.hurts = p.hurtTries ?? 0;
      mech.hurtAt = [...hurtAt.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, n]) => `${k}×${n}`);
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
    rt: () => L.runtime.info(),
    info: () => P().info(),
    kinds: () => { const m = {}; for (const e of L.entities) m[e.kind] = (m[e.kind] ?? 0) + 1; return m; },
    lives: () => L.runtime.save.lives,
    named: (id) => L.named.get(id)?.info?.() ?? null,
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
  await page.screenshot({ path: `${OUT}w5c_${name}.png` });
  if (process.env.DETAIL) {
    // größte Posten eines Bildes (Objektname bzw. Entitätsart → Aufrufe/Dreiecke; „S:“ = Schattenpass)
    const d = await sc(() => new Promise((res) => {
      const c = window.__course, v = c.view, r = v.renderer;
      for (const e of c.level.entities) e.model?.root?.traverse((o) => { o.userData.__perf = `E:${e.kind}`; });
      const label = (o) => { if (o.userData.__perf) return o.userData.__perf; for (let q = o; q; q = q.parent) if (q.name) return q.name.replace(/:\d+$/, ''); return o.type; };
      const acc = new Map(), orig = r.renderBufferDirect;
      r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
        const t0 = r.info.render.triangles;
        orig.call(this, camera, scene, geometry, material, object, group);
        const key = `${scene ? '' : 'S:'}${label(object)}`;
        const a = acc.get(key) ?? { calls: 0, tris: 0 }; a.calls++; a.tris += r.info.render.triangles - t0; acc.set(key, a);
      };
      const f0 = v.frame;
      const wait = () => { if (v.frame < f0 + 1) { requestAnimationFrame(wait); return; } r.renderBufferDirect = orig; res([...acc.entries()].map(([k, a]) => [k, a.calls, a.tris]).sort((x, y) => y[1] - x[1])); };
      requestAnimationFrame(wait);
    }));
    for (const [k, n, t] of d.slice(0, 18)) console.log(`        ${k.padEnd(36)} ${String(n).padStart(3)} ${String(Math.round(t / 1000)).padStart(4)} k`);
  }
  return s;
}

for (const id of LEVELS) {
  const R = ROUTES[id];
  console.log(`\nLevel ${id}`);
  if (!(await load(id))) { check(`${id} lädt`, false); continue; }
  const loadErrors = errors.slice();
  const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, timeLimit: d.timeLimit, theme: d.theme, music: d.music, stars: d.stars.length, arch: d.archetype, slots: d.starSlots ?? null }; });
  const kinds = await W('kinds');
  console.log(`  „${meta.title}“, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
  check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
  for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
  if (R.arena) check(`${id}: Arena, ${R.meta.slots} Stern, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music} (${meta.arch}, ${meta.slots})`, meta.arch === 'arena' && meta.slots === R.meta.slots && meta.stars === 0 && !kinds.stamp && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music);
  else check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}`, meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music);
  for (const [kind, n] of Object.entries(R.enemies ?? {})) if (n > 0) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);

  // ------------------------------------------------ Routen-Bot je Heldin (Start → Zielmast)
  let sweepTrack = null;
  for (const hero of ONLY || !PARTS.has('route') || !R.main?.length ? [] : HEROES) {
    await load(id);
    await W('place', R.start, { hero, settle: 2 });
    const res = await W('drive', R.main, {});
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Ende bei ${res.pos.map((v) => v.toFixed(1)).join(', ')}, Nachsprünge ${res.autoJumps}, Mechanik ${JSON.stringify(res.mech)}`);
    const failed = res.log.some((l) => String(l[0]).startsWith('FEHLER'));
    if (!reached || failed || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached && !failed);
    check(`${id}: ${hero} Zeit bis zum Ziel < 240 s (${res.time.toFixed(1)} s)`, reached && res.time < 240);
    if (hero === HEROES[0] && PARTS.has('sweep')) sweepTrack = res.track;
    if (R.mainMech) for (const [label, fn] of R.mainMech) check(`${id}: ${hero} – ${label(res.mech)}`, fn(res.mech));
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
      await W('place', t.from, { hero, settle: 10, power: t.power });
      const res = await W('drive', t.legs, {});
      const rt = await W('rt');
      let ok = t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot) ok = !ok;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech?.thrown && !(res.mech.thrown > 0)) ok = false;
      if (t.mech?.flips && !(res.mech.flips >= t.mech.flips)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, ${res.time.toFixed(1)} s)`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      await W('place', t.from, { hero, settle: 10, power: t.power });
      const res = await W('drive', t.legs, {});
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectCoins !== undefined) ok = ok && res.rt.coins - coins0 >= t.expectCoins;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive !== false) ok = ok && !res.dead;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}, Ende y ${res.pos[1].toFixed(1)})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Arena 5-B: Steinsäulen, Werfer von oben, Turm abtragen, Stern
  if (R.arena && PARTS.has('arena') && !ONLY) {
    await load(id);
    let r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      const tw = L.named.get('wturm'), w = L.named.get('werfer');
      const out = { count: tw.count, height: +tw.height.toFixed(2), riding: w?.riding === tw, riderY: w ? +(w.pos.y - tw.pos.y).toFixed(2) : null, left: c.state().archetype?.left, total: c.state().archetype?.total };
      // Säulen: im Wechsel (eine oben, während die andere unten ist)
      const A = L.named.get('saeule_l'), B = L.named.get('saeule_r');
      let both = 0, opposite = 0, maxY = 0, minY = 99;
      p.invuln = 1e9;
      for (let i = 0; i < 1300; i++) {
        c.setInput({}); c.step(1);
        if (A.state === 'high' && B.state === 'high') both++;
        if ((A.state === 'high' && B.state === 'low') || (A.state === 'low' && B.state === 'high')) opposite++;
        maxY = Math.max(maxY, A.y); minY = Math.min(minY, A.y);
      }
      out.saeulen = { both, opposite, maxY: +maxY.toFixed(2), minY: +minY.toFixed(2), cycles: A.cycles };
      out.throws = w?.throws ?? 0;
      return out;
    });
    console.log(`  5-B Start: ${JSON.stringify(r)}`);
    check(`5-B: Werferturm aus 9 Pilzlingen (${r.height} m), Feuer-Werfer obenauf (${r.riderY} m), Arena zählt 2 Gegner`, r.count === 9 && r.riding && Math.abs(r.riderY - r.height) < 0.05 && r.total === 2 && r.left === 2);
    check(`5-B: zwei Steinsäulen steigen im Wechsel (unten ${r.saeulen.minY} m, oben ${r.saeulen.maxY} m; nie beide oben)`, r.saeulen.both === 0 && r.saeulen.opposite > 200 && r.saeulen.maxY > 9 && r.saeulen.minY < 2);
    check(`5-B: der Werfer wirft von oben (${r.throws} Würfe in 11 s)`, r.throws >= 2);
    for (const hero of HEROES) {
      await load(id);
      r = await sc((heroName) => {
        const c = window.__course, L = c.level, p = c.player;
        p.setHero(heroName);
        const W5 = window.__w5;
        const stick = (dx, dz, mag = 1) => W5.stick(dx, dz, mag);
        const out = { log: [], hurts: 0 };
        const hurt = p.hurt.bind(p);
        p.hurt = (src) => { out.hurts++; return hurt(src); };
        const start = L.time;
        const step = (inp) => { p.invuln = Math.max(p.invuln, 3); c.setInput(inp); c.step(1); };
        const tower = () => L.entities.find((e) => e.kind === 'werferturm' && !e.removed && !e.defeated) ?? null;
        const rider = () => { const t = L.named.get('werfer'); return t && !t.defeated && !t.removed ? t : null; };
        const pillars = [L.named.get('saeule_l'), L.named.get('saeule_r')];
        const pc = (pl) => ({ x: (pl.box.shape.min[0] + pl.box.shape.max[0]) / 2, z: (pl.box.shape.min[2] + pl.box.shape.max[2]) / 2 });
        const goTo = (x, z, r = 0.3, max = 900) => { let i = 0; for (; i < max; i++) { const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz); if (d < r && p.mode === 'ground') break; step({ ...stick(dx, dz, Math.min(1, Math.max(0.25, d / 1.2))) }); } return i; };
        let guard = 0;
        while (L.time - start < 95 && guard++ < 40 && (tower() || rider())) {
          // 1) eine Säule wählen, die gerade unten ist (bzw. bald), am Inselrand davor warten
          const pl = pillars.find((q) => q.state === 'low') ?? pillars.find((q) => q.state === 'down') ?? pillars[0];
          const ctr = pc(pl), a = Math.atan2(ctr.z, ctr.x);
          const wx = ctr.x - Math.cos(a) * 2.8, wz = ctr.z - Math.sin(a) * 2.8;
          goTo(wx, wz, 0.4);
          let k = 0;
          for (; k < 1400 && pl.state !== 'low'; k++) step({});
          // 2) auf die Säule hüpfen
          let left = false;
          for (k = 0; k < 200; k++) {
            step({ ...(p.mode === 'air' ? W5.airSteer(ctr.x, ctr.z, 0, 0, 3, 7) : stick(ctr.x - p.pos.x, ctr.z - p.pos.z, 0.8)), jump: k < 18 });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') break;
          }
          const onP = p.ground?.tag === 'steinsaeule';
          out.log.push(['auf Säule', pillars.indexOf(pl), onP, +p.pos.y.toFixed(2)]);
          if (!onP) continue;
          // 3) mitfahren bis oben; Ziel in Reichweite abwarten, dann draufspringen (Werfer zuerst, sonst Turmspitze)
          let target = null;
          for (k = 0; k < 1600; k++) {
            const dx = ctr.x - p.pos.x, dz = ctr.z - p.pos.z;
            step(Math.hypot(dx, dz) > 0.3 ? { ...stick(dx, dz, 0.4) } : {});
            if (p.ground?.tag !== 'steinsaeule') break;
            if (pl.state === 'down' && pl.y < 6) break;
            const tg = rider() ?? tower();
            if (!tg) break;
            const top = rider() ? tg.pos.y + 1.1 : tg.pos.y + tg.height;
            const d = Math.hypot(tg.pos.x - p.pos.x, tg.pos.z - p.pos.z);
            if (p.pos.y > top + 0.6 && d < 5.2) { target = tg; break; }
          }
          if (!target) { out.log.push(['kein Ziel', pl.state, +p.pos.y.toFixed(2)]); continue; }
          // 4) Sprung auf das Ziel, bei Turm-Abprall weiter auf den Turm steuern (Taste gehalten → hoher Abprall)
          const isRider = target === rider();
          const before = isRider ? 1 : target.count;
          let hits = 0;
          left = false;
          for (k = 0; k < 2400; k++) {
            const tg = isRider ? rider() : tower();
            if (!tg) break;
            const top = isRider ? tg.pos.y + 1.1 : tg.pos.y + tg.height;
            const above = p.pos.y > top + 0.15;
            step({ ...(p.mode === 'air' && (above || p.vel.y > 0) ? W5.airSteer(tg.pos.x, tg.pos.z, tg.vel?.x ?? 0, tg.vel?.z ?? 0, 3.6, 8) : {}), jump: k < 20 || p.vel.y > 0 });
            if (p.mode === 'air') left = true;
            if (left && p.mode === 'ground') break;
          }
          const tw = tower();
          hits = isRider ? (rider() ? 0 : 1) : before - (tw?.count ?? 0);
          out.log.push([isRider ? 'Werfer' : 'Turm', hits, tw?.count ?? 0, +p.pos.y.toFixed(2), +(L.time - start).toFixed(1)]);
          // 5) am Boden: niedrigen Turm direkt anspringen
          for (let q = 0; q < 12 && !rider() && tower() && tower().height < 3.3 && p.mode === 'ground'; q++) {
            const c0 = tower().count;
            let lf = false;
            for (k = 0; k < 600; k++) {
              const t3 = tower();
              if (!t3) break;
              const dx = t3.pos.x - p.pos.x, dz = t3.pos.z - p.pos.z, d = Math.hypot(dx, dz);
              const top = t3.pos.y + t3.height;
              let inp;
              if (p.mode === 'air') inp = { ...((p.pos.y > top + 0.15 || p.vel.y > 0) ? W5.airSteer(t3.pos.x, t3.pos.z, t3.vel?.x ?? 0, t3.vel?.z ?? 0, 3.6, 8) : {}), jump: p.vel.y > 0 };
              else inp = { ...stick(dx, dz, 1), jump: d < 2.2 };
              step(inp);
              if (p.mode === 'air') lf = true;
              if (lf && p.mode === 'ground') break;
            }
            out.log.push(['Turm vom Boden', c0 - (tower()?.count ?? 0), tower()?.count ?? 0]);
          }
        }
        const arch = () => c.state().archetype;
        out.left = arch().left;
        for (let i = 0; i < 500 && !arch().starTouch; i++) step({});
        const star = L.entities.find((x) => x.kind === 'star' && x.alive);
        if (star) goTo(star.pos.x, star.pos.z, 0.2, 900);
        for (let i = 0; i < 900 && !c.finished; i++) step({});
        out.time = +(L.time - start).toFixed(1);
        out.finished = !!c.finished;
        out.got = L.runtime.stars[0];
        out.save = JSON.parse(localStorage.getItem('lotti-greta-course-v1') ?? '{}').levels?.['5-B'] ?? null;
        return out;
      }, hero);
      console.log(`  5-B Kampf (${hero}): ${JSON.stringify(r)}`);
      const riderHit = r.log.some((l) => l[0] === 'Werfer' && l[1] === 1);
      check(`5-B: ${hero} – von der Steinsäule auf den Werfer gesprungen (besiegt)`, riderHit);
      check(`5-B: ${hero} – Turm Stufe für Stufe abgetragen, Stern eingesammelt, Ziel nach ${r.time} s (< 100 s), gespeichert`, r.left === 0 && r.got && r.finished && r.time < 100 && r.save?.done === true);
      if (hero === HEROES[0]) await shot('5-B_ergebnis');
    }
    // Tod → Arena neu: Turm mit Werfer obenauf, kein doppelter Werfer
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      const w = L.named.get('werfer');
      p.invuln = 1e9;
      w.onHit('fire', p);
      for (let i = 0; i < 120; i++) c.step(1);
      const before = c.state().archetype.left;
      p.invuln = 0;
      p.die('hit');
      for (let i = 0; i < 900 && (p.dead || L.runtime.status !== 'play'); i++) c.step(1);
      c.step(30);
      const tw = L.entities.filter((e) => e.kind === 'werferturm' && !e.removed);
      const ws = L.entities.filter((e) => e.kind === 'feuer_werfer' && !e.removed && !e.defeated);
      return { before, left: c.state().archetype.left, resets: c.state().archetype.resets, towers: tw.length, count: tw[0]?.count, werfer: ws.length, riding: ws[0]?.riding === tw[0] };
    });
    console.log(`  5-B Neustart: ${JSON.stringify(r)}`);
    check(`5-B: Tod setzt die Arena zurück (vorher noch ${r.before}, danach ${r.left}): ein Turm mit ${r.count} Pilzlingen, genau ein Werfer obenauf`, r.before === 1 && r.left === 2 && r.towers === 1 && r.count === 9 && r.werfer === 1 && r.riding);
    // Zeitlimit 100 s
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player;
      p.hurt = () => false;
      let dead = false, cause = null;
      for (let i = 0; i < 101 * 120 && !dead; i++) { c.step(1); if (p.dead) { dead = true; cause = p.deathCause; } }
      return { dead, cause, t: +L.time.toFixed(1) };
    });
    check(`5-B: nach 100 s ist die Zeit um (${r.cause} bei ${r.t} s)`, r.dead && r.cause === 'time');
    // Funkenblüte: jeder Feuerball nimmt eine Stufe
    await load(id);
    r = await sc(() => {
      const c = window.__course, L = c.level, p = c.player, W5 = window.__w5;
      p.invuln = 1e9;
      const tw = L.named.get('wturm');
      const c0 = tw.count;
      p.reset([0, 2, 4], Math.PI / 2);
      p.setPower('funken');
      for (let i = 0; i < 1200 && tw.count > c0 - 3; i++) {
        W5.face(tw.pos.x, tw.pos.z);
        c.setInput({ action: i % 40 === 0 }); c.step(1);
      }
      return { c0, count: tw.count };
    });
    check(`5-B: Funkenblüte – Feuerbälle nehmen die Turmstufen einzeln (${r.c0} → ${r.count})`, r.count <= r.c0 - 3);
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera
  if (ONLY || !PARTS.has('shots')) continue;
  loaded = null;
  await load(id);
  for (const [name, pos, steps = 0, input = null, yaw = Math.PI / 2] of R.shots) {
    await W('place', pos, { settle: 10, yaw });
    if (steps) await sc(([n, inp]) => { const c = window.__course; c.player.invuln = 99; c.setInput(inp); c.step(n); c.player.invuln = 0; c.setInput(null); }, [steps, input ?? {}]);
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
