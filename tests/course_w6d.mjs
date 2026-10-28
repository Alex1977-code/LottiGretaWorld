// Welt 6, Level 6-7 „Wuschelflucht im Glitzerschacht“ (senkrechter Autoscroller: Mine nach oben, Wuschel-Horde jagt von
// unten, Quetschblöcke, danach Wippen-Galerie), 6-Panzer „Kawumm-Kolonne über den Wolken“ (zweite Panzerkolonne als
// Autoscroller, Zündköpfe, große ?-Blöcke wachsen zu Türmen; Boss Wirbelbrocken mit Attrappen) und 6-C „Glibber-Gala im
// Wolkenzirkus“ (Spiegelfrucht-Platz, Seilbahn, Zirkuszelt-Arena mit Boss Würfelblase):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle Sterne
// und der Stempel mit der echten Mechanik samt Gegenproben, Extras, Kennzahlen je Abschnitt (Zeichenaufrufe < 120 inkl.
// Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/w6d_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_w6d.mjs [6-7|6-Panzer|6-C]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text> (nur Ziele/
//   Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) · DETAIL=1
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt. Im
// Autoscroller wartet der Bot vor Sprüngen, bis das Bildfenster das Ziel erreicht hat (vorne bremst die Bildgrenze).
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], y (Mindesthöhe beim Landen), jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow,
//   max, land, need (m Höhe, die das Bildfenster vor dem Absprung frei haben muss) } · { wait } · { hop } (Sprung auf der
//   Stelle) · { bounce: [x, z] (Landeziel), at: [x, z] (Sprungfeld), y } · { crusher: id } (warten, bis der Quetschblock
//   gerade hochgefahren ist) · { mover: id, on: [x, z] | null, off: [x, z], y, until: cond } (fahrende Plattform/Wolke) ·
//   { star: i } · { chaseKind } · { expect: cond } · { until: cond } · { pound: [x, z] } · { wippeStern } (6-7)
const ZL = -1;
const ROUTES = {
  '6-7': {
    start: [0.5, 0, ZL],
    meta: { stars: 3, time: 400, theme: 'fuzzymine', music: 'course_fuzzymine', archetype: 'autoscroller' },
    enemies: { wuschel_horde: 2, wuschel: 4 },
    main: [
      { name: 'Sprungfeld auf der Sohle', bounce: [5.6, ZL], at: [4.4, ZL], y: 4.4 },
      { expect: 'scrollRuns' },
      { name: 'Bretter L2', to: [0, ZL], y: 7, jump: 30, jumpAt: 2.8 },
      { name: 'Wolke c3', to: [3.2, ZL], y: 9.6, jump: 30, jumpAt: 2.2 },
      { name: 'Bretter R4', to: [4.3, ZL], y: 12.2, jump: 30, jumpAt: 3 },
      { name: 'Bretter L5', to: [-0.6, ZL], y: 14.8, jump: 30, jumpAt: 4.4 },
      { name: 'Puffwolke 1', to: [-5.6, ZL], y: 17.4, jump: 30, jumpAt: 2.4 },
      { name: 'Puffwolke 2', to: [-2.2, ZL], y: 20.0, jump: 30, jumpAt: 3.0, win: 22.8 },
      { name: 'Puffwolke 3', to: [1.6, ZL], y: 22.6, jump: 30, jumpAt: 3.4 },
      { name: 'Mittelstation', to: [2.6, ZL], y: 25.2, jump: 30 },
      { name: 'Kontrollpunkt 1', to: [-5.4, -2.0], within: 0.5 },
      { to: [4.8, ZL], within: 0.4 },
      { name: 'Sprungfeld Mittelstation → R6', bounce: [5.4, ZL], at: [6.2, ZL], y: 30.8 },
      { name: 'Sprungfeld R6 → L8', bounce: [3.6, ZL], at: [6.6, ZL], y: 35.2 },
      { name: 'Wolke c9', to: [-1.6, ZL], y: 37.8, jump: 30, jumpAt: 3.4 },
      { name: 'Bretter R10', to: [2.6, ZL], y: 40.4, jump: 30, jumpAt: 3.2 },
      { name: 'Sprungfeld R10 → L11', bounce: [3.4, ZL], at: [4.2, ZL], y: 44.8 },
      { name: 'Goldwolke', mover: 'goldwolke', on: 'right', stand: [3.2, ZL], off: [-5.6, ZL], y: 50.0, rideUntil: 'goldLeft' },
      { name: 'Puffwolke c13', to: [-1.4, ZL], y: 52.6, jump: 30, jumpAt: 3.0 },
      { name: 'Puffwolke c14', to: [0.6, ZL], y: 55.2, jump: 30, jumpAt: 3.0, win: 58 },
      { name: 'Felssims', to: [3.8, ZL], y: 57.8, jump: 36, jumpAt: 4 },
      { crusher: 'q6' },
      { name: 'Sprungfeld am Felssims → R16', bounce: [5.6, ZL], at: [7.3, ZL], y: 63.6, keepX: 6.9 },
      { name: 'Wolke c17', to: [0.6, ZL], y: 66.2, jump: 30, jumpAt: 2.9 },
      { name: 'Bretter L18', to: [-3.4, ZL], y: 68.8, jump: 30, jumpAt: 3.4 },
      { name: 'schwebende Wolke', mover: 'c_fahrt', on: 'low', stand: [-3.0, ZL], at: [0.2, ZL], off: [3.6, ZL], y: 75.2, rideUntil: 'cloudHigh' },
      { name: 'Schachtkrone', to: [2.2, ZL], y: 77.8, jump: 30 },
      { until: 'scrollDone', max: 2400 },
      { name: 'Kontrollpunkt 2', to: [0, -9.4], within: 0.5 },
      { name: 'Wippe 1', to: [0, -13.8], within: 0.4, run: false },
      { to: [0, -20.4], within: 0.4, run: false },
      { name: 'Fels 1', to: [0, -22.6], y: 77.8, jump: 30, jumpAt: 2.4 },
      { name: 'Wippe 2', to: [0, -25.8], within: 0.4, run: false },
      { to: [0, -32.4], within: 0.4, run: false },
      { name: 'Fels 2', to: [0, -34.2], y: 77.8, jump: 30, jumpAt: 2.0 },
      { crusher: 'q7' },
      { to: [0, -38.2], within: 0.4, run: false },
      { name: 'Wippe 3', to: [0, -40.0], within: 0.4, run: false },
      { crusher: 'q8' },
      { to: [0, -48.4], within: 0.5, run: true },
      { name: 'Fels 3', to: [0, -50.6], y: 77.8, jump: 30, jumpAt: 2.4 },
      { name: 'Wolkenbrücke', to: [0, -55], within: 0.6, run: false },
      { to: [0, -61], within: 0.6, run: true },
      { name: 'Grubentor', to: [0, -66.5], within: 0.6 },
      { name: 'Zielmast', to: [0, -74], within: 0.2 },
    ],
    routeChecks: [
      { name: 'Fahrt beendet, Horde folgte dem Bild (keine Absturz-Tode)', ok: (r) => r.mech.scrollDone && !r.dead },
      { name: 'Grubentor geöffnet', ok: (r) => r.mech.gate },
    ],
    targets: [
      { name: 'Stempel: in der Nische hinter dem Quetschblock (unter ihm durch, wenn er oben ist)', stamp: true, from: [0.5, 0, ZL],
        legs: [{ to: [-3.0, ZL], within: 0.3 }, { crusher: 'q0' }, { to: [-7.0, ZL], within: 0.4 }, { wait: 30 }, { crusher: 'q0' }, { to: [-1, ZL], within: 0.4 }],
        shot: 'stempel', mech: (r) => !r.dead },
      { name: 'Stern 1: unter dem grauen Wolkenbausch (Felssporn links, gleich nach dem Stempel)', star: 0, from: [0.5, 0, ZL],
        legs: [{ bounce: [5.6, ZL], at: [4.4, ZL], y: 4.4 }, { to: [0, ZL], y: 7, jump: 30, jumpAt: 2.8 }, { name: 'auf den grauen Bausch', to: [-4.6, ZL], y: 10.6, jump: 30, jumpAt: 3.6 },
          { name: 'links hinunter auf den Felssporn', to: [-7.2, ZL], y: 8.2, within: 0.4 }, { wait: 30 }],
        shot: 'stern1' },
      { name: 'Stern 1 auch mit kurzem Hüpfer vom Brett', star: 0, from: [-2.6, 7.2, ZL], scroll: 4, heroes: ['lotti'],
        legs: [{ to: [-7.0, ZL], y: 8.2, jump: 7, jumpAt: 4.3 }, { wait: 20 }] },
      { name: 'Stern 1 nicht von der Sohle aus (Sprung unter dem Felssporn)', star: 0, expectNot: true, from: [-7.0, 0, ZL], heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 30 }] },
      { name: 'Stern 3: Felsrille hinter der Quetschblock-Wand (unter drei Quetschblöcken hindurch)', star: 2, from: [4.8, 25.4, ZL], scroll: 22.4,
        legs: [{ bounce: [5.4, ZL], at: [6.2, ZL], y: 30.8 }, { to: [1.4, ZL], within: 0.15 }, { crusher: 'qg3', fresh: false }, { to: [-1.65, ZL], within: 0.12 },
          { crusher: 'qg2', fresh: false }, { to: [-4.55, ZL], within: 0.12 }, { crusher: 'qg1', fresh: false }, { to: [-9.3, -1.6], within: 0.4 }, { wait: 20 },
          { to: [-8.7, -1.2], within: 0.2 }, { crusher: 'qg1', fresh: false }, { to: [-4.55, ZL], within: 0.12 }, { crusher: 'qg2', fresh: false }, { to: [-1.65, ZL], within: 0.12 },
          { crusher: 'qg3', fresh: false }, { to: [1.6, ZL], within: 0.4 }, { name: 'zurück auf den Weg', bounce: [3.6, ZL], at: [6.6, ZL], y: 35.2 }],
        shot: 'stern3', mech: (r) => !r.dead },
      { name: 'Stern 2: über Wippe 3 – Quetschblock drückt das ferne Ende, das nahe schnellt hoch', star: 1, from: [0, 78, -34], scroll: 77,
        legs: [{ crusher: 'q7' }, { to: [0, -38.2], within: 0.4 }, { to: [0, -41.0], within: 0.3, run: false }, { wippeStern: 'wippe3', minAngle: 25 }, { wait: 30 }],
        shot: 'stern2', mechText: (r) => `Wippe ${r.mech.wippeAngle?.toFixed(1)}°, Scheitel y ${r.mech.maxY.toFixed(2)}` },
      { name: 'Stern 2 nicht vom Felsen davor (Sprung und Rückwärtssalto)', star: 1, expectNot: true, from: [0, 78, -38.4], scroll: 77, heroes: ['lotti'],
        legs: [{ hop: 40 }, { wait: 20 }, { backflip: [0, 1] }, { wait: 60 }] },
      { name: 'Stern 2 nicht von der Wippe ohne Quetschblock (gleich nach dem Betreten gesprungen)', star: 1, expectNot: true, from: [0, 78, -38.2], scroll: 77, heroes: ['lotti', 'greta'],
        legs: [{ to: [0, -41.0], within: 0.3, run: false }, { wait: 12 }, { hop: 40 }, { wait: 20 }],
        mechText: (r) => `Scheitel y ${r.mech.maxY.toFixed(2)}` },
    ],
    extra: [
      { name: 'Extraleben: unsichtbarer Block über der Sohle links vom Start', from: [-2.6, 0, ZL], heroes: ['lotti'], expectLives: 1,
        legs: [{ hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: Kiste in der Felsrille (Stampfattacke)', from: [-7.4, 31, -0.2], scroll: 26, heroes: ['lotti'], expectLives: 1,
        legs: [{ pound: [-9.6, -0.2] }, { pound: [-9.6, -0.2] }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Fahrt beginnt erst, wenn die Heldin die Sohle verlässt', from: [0.5, 0, ZL], heroes: ['lotti'],
        legs: [{ wait: 600 }, { expect: 'scrollWaits' }, { bounce: [5.6, ZL], at: [4.4, ZL], y: 4.4 }, { wait: 60 }, { expect: 'scrollRuns' }] },
      { name: 'Wer unten bleibt: die Horde beißt (Rückstoß nach oben), dann fällt man aus dem Bild', from: [5.6, 4.6, ZL], scroll: 1, invuln: false, expectAlive: false, heroes: ['lotti'],
        legs: [{ wait: 1500 }], mech: (r) => r.mech.died && r.mech.deathCause === 'fall' && r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}, Tod ${r.mech.deathCause}` },
      { name: 'Quetschblock: wer darunter steht, wird zerquetscht', from: [-4.6, 0, ZL], invuln: false, expectAlive: false, heroes: ['lotti'],
        legs: [{ wait: 600 }], mech: (r) => r.mech.died && r.mech.deathCause === 'crush', mechText: (r) => `Tod ${r.mech.deathCause}` },
      { name: 'Kontrollpunkt Mittelstation: Neustart dort, Bild am Kontrollpunkt', from: [4.8, 25.4, ZL], scroll: 22.4, heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [-5.4, -2.0], within: 0.5 }, { die: true }, { expect: 'where' }, { expect: 'respawnMittel' }, { wait: 240 }, { expect: 'alive' }], mech: (r) => r.log.some((l) => l[0] === 'erwartet' && l[1] === 'respawnMittel' && l[2]) },
      { name: 'Grubentor zu, bis man davor steht; Galerie-Horde rollt los', from: [0, 78, -61], scroll: 77, heroes: ['lotti'],
        legs: [{ expect: 'gateClosed' }, { to: [0, -63.4], within: 0.4 }, { wait: 60 }, { expect: 'gateOpen' }] },
      { name: 'Galerie-Horde: startet beim Kontrollpunkt und rollt hinterher', from: [0, 78, -6], scroll: 77, heroes: ['lotti'],
        legs: [{ expect: 'hordeWaits' }, { to: [0, -11.4], within: 0.4 }, { wait: 900 }, { expect: 'hordeRolls' }] },
    ],
    shots: [
      ['start', [0.5, 0, ZL], 0],
      ['nische', [-3.0, 0, ZL], 0],
      ['bretter', [3.2, 9.8, ZL], 6],
      ['puffwolken', [-5.6, 17.6, ZL], 15],
      ['mittelstation', [0, 25.4, ZL], 22.4],
      ['quetschgang', [1.4, 31, ZL], 28],
      ['rille', [-6.0, 31, ZL], 28],
      ['sprungfelder', [2.4, 40.6, ZL], 38],
      ['goldwolke', [3.2, 45, ZL], 43],
      ['felssims', [3.6, 58, ZL], 55],
      ['krone', [2.4, 75.4, ZL], 73],
      ['galerie', [0, 78, -9.4], 77],
      ['wippen', [0, 78, -22.6], 77],
      ['wippe3', [0, 78, -34], 77],
      ['tor', [0, 78, -61], 77],
      ['deck', [0, 78, -69], 77],
    ],
  },
  // ================================================================ 6-C (Boss-Archetyp: Vorplatz, Spiegelbühne, Seilbahn, Manege)
  '6-C': {
    start: [0, 0, 13.5],
    meta: { stars: 2, time: 400, theme: 'circus', music: 'course_bossblob', archetype: 'boss' },
    enemies: { wuerfelblase: 1, gelee_brocken: 5 },
    main: [
      { name: 'Vorplatz', to: [1.6, -2], within: 0.6 },
      { name: 'Spiegelbühne', to: [1.6, -20], within: 0.6 },
      { to: [0.4, -35.5], within: 0.5 },
      { name: 'Prachttreppe', to: [0, -46.2], y: 4.3, within: 0.6 },
      { name: 'Talstation', to: [0, -52.2], within: 0.3 },
      { name: 'in die Gondel', to: [0, -54.6], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
      { until: 'gondelOben', max: 2400 },
      { name: 'aufs Zeltplateau', to: [0, -86.4], y: 7.8, jump: 30, jumpAt: 3.2, within: 0.8 },
      { name: 'Kontrollpunkt Zeltplateau', to: [0, -88.0], within: 0.6 },
      { name: 'in die Manege', to: [0, -100], within: 0.8 },
      { name: 'Würfelblase', blase: true },
      { star: 2 },
      { name: 'Warp-Box', warp: 'warp_sieg' },
      { name: 'Zielmast', to: [56, -118], within: 0.4 },
    ],
    routeChecks: [
      { name: 'Würfelblase: 3 Riesen mit Sprüngen und Schockwellen, 3 Hut-Treffer in der Flucht, Stern 3', ok: (r) => r.mech.blase?.hits === 3 && r.mech.blase.giants >= 3 && r.mech.blase.waves >= 9 && r.rt.stars[2] },
      { name: 'Zelt aufgeschnitten (Blick in die Manege)', ok: (r) => r.mech.zelt },
    ],
    targets: [
      { name: 'Stern 1: Spiegelfrucht holen, mit dem Klon zu zweit aufs Feld', star: 0, from: [0, 0, -5],
        legs: [{ to: [0, -8.6], within: 0.2, slow: 0.5 }, { wait: 30 }, { hop: 30 }, { wait: 60 }, { to: [0, -6.8], within: 0.3 }, { name: 'auf den ?-Block (Spiegelfrucht)', to: [0, -8.6], y: 3.2, jump: 30, jumpAt: 1.4, within: 0.5 }, { wait: 20 }, { expect: 'zwei' },
          { to: [-2.6, -27.0], within: 0.25, slow: 0.6 }, { wait: 90 }, { expect: 'stern1Sichtbar' }, { star: 0 }],
        shot: 'stern1' },
      { name: 'Stern 1 nicht allein (Feld braucht zwei Figuren)', star: 0, expectNot: true, from: [-2.6, 0, -23.6], heroes: ['lotti'],
        legs: [{ to: [-2.6, -27.0], within: 0.25 }, { wait: 180 }, { to: [-2.6, -29.8], within: 0.4 }, { hop: 30 }, { wait: 60 }] },
      { name: 'Stern 2: aus der fahrenden Gondel auf die Sternschaukel, über drei Wolken zum Zelt', star: 1, from: [0, 4.5, -50.0],
        legs: [{ to: [0, -52.2], within: 0.3 }, { name: 'in die Gondel', to: [0, -54.6], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
          { gondelSprung: [-4.6, -67.0], atZ: -66.6, y: 6.0 }, { star: 1, walk: true, jump: false }, { wait: 30 },
          { name: 'Wolke 1', to: [-5.0, -71.4], y: 6.2, jump: 30, jumpAt: 3.6, edgeJump: true }, { name: 'Wolke 2', to: [-3.8, -75.6], y: 6.8, jump: 30, jumpAt: 2.6, edgeJump: true },
          { name: 'Wolke 3', to: [-2.6, -80.4], y: 7.4, jump: 30, jumpAt: 2.6, edgeJump: true }, { name: 'Zeltplateau', to: [-1.6, -85.6], y: 7.8, jump: 30, jumpAt: 4.6, within: 0.8, edgeJump: true }],
        shot: 'stern2', mech: (r) => !r.dead },
      { name: 'Stempel: Sprungtrommel hinauf aufs Artistenpodest', stamp: true, from: [9.0, 0, 7.6],
        legs: [{ bounce: [8.6, 0.8], at: [10.6, 4.2], y: 5.6 }, { wait: 30 }], shot: 'stempel' },
      { name: 'Stempel nicht ohne Sprungtrommel (Sprung vom Boden)', stamp: true, expectNot: true, from: [8.6, 0, 2.6], heroes: ['lotti'],
        legs: [{ to: [8.6, 2.0], within: 0.3 }, { hop: 40 }, { wait: 40 }] },
    ],
    extra: [
      { name: 'Extraleben: verborgener Block über der blauen Trommel', from: [-6.4, 0, 6.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-6.4, 4.2], y: 0.85, jump: 30, jumpAt: 1.4, within: 0.35 }, { hop: 34 }, { wait: 30 }, { chaseKind: 'powerup', max: 900 }] },
      { name: 'Extraleben: verborgener Block über der mittleren Wolke', from: [-5.0, 7.2, -71.4], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [-3.8, -75.6], y: 6.8, jump: 30, jumpAt: 2.6 }, { hop: 34 }, { wait: 30 }, { chaseKind: 'powerup', max: 600 }] },
      { name: 'Kontrollpunkt Talstation: Neustart dort, die Gondel kommt zurück', from: [0, 4.5, -50.0], heroes: ['lotti'], invuln: false, expectAlive: true,
        legs: [{ to: [0, -48.6], within: 0.4 }, { wait: 20 }, { to: [0, -52.2], within: 0.3 }, { name: 'in die Gondel', to: [0, -54.6], y: 4.4, jump: 30, jumpAt: 1.6, within: 0.6 },
          { until: 'gondelOben', max: 2400 }, { die: true }, { expect: 'anTalstation' }, { until: 'gondelUnten', max: 2400 }] },
      { name: 'Gelee-Brocken: Draufspringen besiegt ihn (1 Bitcoin)', from: [2.6, 0, -9.6], heroes: ['lotti'], expectCoins: 1,
        legs: [{ chaseKind: 'gelee_brocken', ids: ['gb1'], max: 900 }, { wait: 30 }] },
      { name: 'Wer von der Bühne fällt, stürzt in die Wolken', from: [4.6, 0, -16], heroes: ['lotti'], invuln: false, expectAlive: false,
        legs: [{ to: [8.6, -16], within: 0.3, max: 300, autoJump: false }, { wait: 300 }], mech: (r) => r.mech.died && r.mech.deathCause === 'fall', mechText: (r) => `Tod ${r.mech.deathCause}` },
    ],
    shots: [
      ['start', [0, 0, 13.5], undefined],
      ['vorplatz', [6.6, 0, 4.8], undefined],
      ['spiegelbuehne', [0, 0, -12], undefined],
      ['feld', [-2.6, 0, -23.6], undefined],
      ['treppe', [0, 0, -36.6], undefined],
      ['talstation', [0, 4.5, -49.0], undefined],
      ['seilbahn', [0, 4.6, -54.6], undefined, 400, {}],
      ['sternschaukel', [-4.6, 6.2, -67], undefined],
      ['zeltplateau', [0, 8, -86.4], undefined],
      ['manege', [0, 8, -97], undefined, 240, {}],
      ['hof', [52, 8, -98], undefined],
    ],
  },
  // ================================================================ 6-Panzer (Kolonne): Konvoi-Koordinaten [c, x]
  // (c = Meter entlang der Kolonne nach vorn, x = Weltlage x; der Bot rechnet je Schritt in die aktuelle Weltlage um)
  '6-Panzer': {
    konvoi: true,
    meta: { stars: 3, time: 400, theme: 'skyway', music: 'course_tank', archetype: 'autoscroller' },
    enemies: { wirbelbrocken: 1, feuer_werfer: 4, zuendkopf_quelle: 6, marschblock: 15, riesenfrageblock: 4, vehicle: 14 },
    // freie Spur über alle Panzer (an Marschblöcken, Werfern, Steinblöcken und großen ?-Blöcken vorbei)
    // (über den Lücken bleibt x gleich – seitwärts erst nach der Landung)
    lane: [[0, -1.4], [16.5, -1.4], [20, 0.5], [33.5, 0.5], [36, 1.6], [51, 1.6], [54.5, 1.4], [126.5, 1.4], [129, 2.3], [140, 2.3], [142.5, 1.4], [200, 1.4]],
    main: [
      { name: 'Kolonne bis zum Kommandopanzer', konvoi: 'lane', to: 189, done: true },
      { name: 'Luke in die Wolkenburg', luke: true },
      { name: 'Wirbelbrocken mit Attrappen', boss: true },
      { name: 'Warp-Box', warp: true },
      { name: 'Zielmast', goal: true },
    ],
    routeChecks: [
      { name: 'alle 14 Panzer betreten (Lücken übersprungen), Halt erreicht, Luke → Arena', ok: (r) => r.mech.tankCount >= 12 && r.mech.arena },
      { name: 'Wirbelbrocken: 3 Treffer am Original, Teleport mit 1 und 2 Attrappen', ok: (r) => r.mech.boss?.hits === 3 && r.mech.boss.teleports >= 2 && r.mech.boss.decoysMade >= 3 },
    ],
    targets: [
      { name: 'Stern 1: drei große ?-Blöcke mit Zündköpfen sprengen, über die Turmtreppe hinauf', star: 0, ride: 40.6,
        put: [37.6, 1.8], plan: [
          { bomb: 'turm_a', tank: 'T3', at: [38.4, 1.8] }, { bomb: 'turm_b', tank: 'T3', at: [42.4, 1.8] }, { bomb: 'turm_c', tank: 'T3', at: [46.4, 1.8] },
          { until: 'stern1', max: 600 },
          { name: 'auf Turm A', hop: [38.4, -2.0], y: 5.0, jumpAt: 1.6 }, { name: 'auf Turm B', hop: [42.4, -2.0], y: 7.6, jumpAt: 3.3 },
          { name: 'auf Turm C', hop: [46.4, -2.0], y: 10.2, jumpAt: 3.3 }, { star: 0 }],
        shot: 'stern1' },
      { name: 'Stern 1: Stampfen lässt die großen ?-Blöcke auf T3 kalt (nur Explosion)', expect: 'turmABereit', ride: 40.6,
        put: [36.0, -2.0], heroes: ['lotti'], plan: [{ pound: [38.4, -2.0] }, { wait: 60 }] },
      { name: 'Stern 2: Steinblock auf dem Goldsockel sprengen', star: 1, ride: 112.2,
        put: [111.4, 1.8], plan: [{ bomb: 'sternstein', tank: 'T8', at: [115.6, 0] }, { star: 1 }], shot: 'stern2' },
      { name: 'Stern 2: Stampfen auf den Steinblock bricht ihn nicht', expect: 'sternsteinHeil', ride: 112.2,
        put: [116.0, 0], heroes: ['lotti'], plan: [{ pound: [118.4, 0] }, { wait: 60 }] },
      { name: 'Stern 3: großen ?-Block stampfen – er fährt die Heldin hinauf', star: 2, ride: 130.6,
        put: [129.6, -1.4], plan: [{ pound: [133.5, 0.4] }, { until: 'turm9', max: 600 }, { star: 2 }], shot: 'stern3' },
      { name: 'Stern 3: ein Zündkopf lässt den Stampf-Turm kalt', expect: 'turm9Bereit', ride: 130.6,
        put: [128.6, -1.4], heroes: ['lotti'], plan: [{ bomb: 'turm9', tank: 'T9', at: [130.6, -1.4], spawn: true }, { wait: 60 }] },
      { name: 'Stempel: Baron-Holzwand hinter der Luke sprengen', stamp: true, ride: 'done',
        put: [190.0, 1.6], plan: [{ bomb: 'stempelwand', tank: 'TK', standby: [189.0, 1.6], via: [[191.2, 1.9], [195.6, 1.9]], at: [197.4, 1.2] }, { stamp: true }], shot: 'stempel' },
    ],
    extra: [
      { name: 'Extraleben: oberster Steinblock der Pyramide (T6)', ride: 87.2, put: [86.4, 1.3], heroes: ['lotti'], expectLives: 1,
        plan: [{ bomb: 'stein_1up', tank: 'T6', at: [88.0, -0.4] }, { chaseKind: 'powerup' }] },
      { name: 'Extraleben: verborgener Block über T12', ride: 170.6, put: [173.0, 1.4], heroes: ['lotti'], expectLives: 1,
        plan: [{ go: [174.4, 1.4], within: 0.2 }, { name: 'Kopfstoß', hop: [174.4, 1.4], y: 2, jumpAt: 0.3, within: 0.5 }, { wait: 20 }, { chaseKind: 'powerup' }] },
      { name: 'Kontrollpunkt auf T5: Neustart auf dem fahrenden Panzer', ride: 70.0, put: [70.4, 1.4], heroes: ['lotti'], invuln: false, expectAlive: true,
        plan: [{ go: [71.6, 1.6], within: 0.4 }, { wait: 30 }, { die: true }, { expect: 'aufT5' }] },
      { name: 'Wer zwischen die Panzer fällt, plumpst durch die Wolken', ride: 26, put: [28.6, 0.5], heroes: ['lotti'], invuln: false, expectAlive: false,
        plan: [{ go: [32.2, 0.5], within: 0.3, noJump: true, max: 240 }, { wait: 240 }], mech: (r) => r.mech.deaths >= 1 && r.mech.deathCause === 'fall', mechText: (r) => `Tod ${r.mech.deathCause}` },
      { name: 'Zündkopf: wer ihn nicht wegwirft, den erwischt die Explosion', ride: 40.6, put: [47.6, 1.6], heroes: ['lotti'], invuln: false,
        plan: [{ wait: 1200 }], mech: (r) => r.mech.hurts >= 1 && r.mech.hurtBy.zuendkopf >= 1, mechText: (r) => `Treffer ${JSON.stringify(r.mech.hurtBy)}` },
      { name: 'Bildfenster fährt an den Rätsel-Panzern mit der Kolonne (T3 18 s, T8 8 s, T9 7 s)', ride: 0, put: null, heroes: ['lotti'],
        plan: [{ holds: true }], mech: (r) => r.mech.holds?.length === 3 && r.mech.holds[0] > 17.5 && r.mech.holds[1] > 7.5 && r.mech.holds[2] > 6.5, mechText: (r) => `Halte ${JSON.stringify(r.mech.holds)}` },
      { name: 'Werfer tänzeln auf dem fahrenden Panzer (Platz fährt mit)', ride: 100.5, put: [104.2, 1.4], heroes: ['lotti'], expectAlive: true,
        plan: [{ wait: 240 }, { expect: 'werferAufT7' }] },
    ],
    // Bilder: [Name, Fenstermitte (fahren bis), Figur [c, x] | null, Schritte, Vorbereitung]
    shots: [
      ['start', null, [3, -0.6], 20],
      ['zuendkopf', 21, [22.4, 0.5], 60],
      ['tuerme', 40.6, [36.8, 1.8], 30, 'tuerme'],
      ['doppelreihe', 56, [55.6, -2.2], 30],
      ['kontrollpunkt', 72, [70.4, 1.4], 30],
      ['pyramide', 87, [86.0, 1.3], 30],
      ['hammer', 100, [98.4, 1.4], 30],
      ['schatz', 113, [111.6, 1.8], 30],
      ['stampfturm', 131, [129.6, -1.4], 30, 'stampf'],
      ['podest', 158, [157.0, 1.4], 30],
      ['kommandopanzer', 'done', [189.0, 0], 60],
      ['arena', 'arena', null, 200],
    ],
  },
};

const PORT = 4670;
const stop = await startServer(PORT);
const { browser, page, errors } = await launchBrowser();
const { check, summary } = makeChecker();
const port = PORT + Number(process.env.PORT_BASE ?? 0);
const sc = (fn, arg) => page.evaluate(fn, arg);
const only = process.argv[2];
const LEVELS = only ? [only] : Object.keys(ROUTES);
const ONLY = process.env.ONLY ?? null;
const pick = (list) => (ONLY ? list.filter((t) => ONLY.split('|').some((o) => t.name.includes(o))) : list);
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
    scrollRuns: () => L.scroll && L.scroll.state !== 'wait',
    scrollDone: () => L.scroll?.state === 'done',
    goldLeft: () => { const m = named('goldwolke'); return m && m.mb.pos.x < -2.6; },
    cloudHigh: () => { const w = named('c_fahrt'); return w && w.mb.pos.y > 71.9; },
    gateOpen: () => !!named('grubentor')?.open,
    gateClosed: () => !named('grubentor')?.open,
    scrollWaits: () => L.scroll?.state === 'wait',
    respawnMittel: () => !P().dead && Math.hypot(P().pos.x + 5.6, P().pos.z + 2) < 1.2 && Math.abs(P().pos.y - 25.4) < 0.3 && Math.abs(L.scroll.center.y - 25.4) < 4,
    alive: () => !P().dead && L.runtime.status === 'play',
    where: () => JSON.stringify({ pos: [P().pos.x, P().pos.y, P().pos.z].map((v) => +v.toFixed(2)), dead: P().dead, center: L.scroll?.center?.y, rp: L.runtime.respawnPoint?.() }),
    hordeWaits: () => named('horde_galerie')?.state === 'wait',
    hordeRolls: () => { const h = named('horde_galerie'); return h?.state === 'run' && h.info().front < -6; },
    // 6-C
    gondelOben: () => { const g = named('gondel'); return !!g && g.u >= 0.999 && g.state === 'wait'; },
    gondelUnten: () => { const g = named('gondel'); return !!g && g.u <= 0.001 && g.state === 'wait'; },
    stern1Sichtbar: () => !!named('stern1') && !named('stern1').hidden,
    zwei: () => (L.players?.length ?? 1) >= 2,
    anTalstation: () => { const p = P(); return !p.dead && L.runtime.status === 'play' && Math.abs(p.pos.z + 48.6) < 1.2 && Math.abs(p.pos.y - 4.5) < 0.4; },
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
      if (o.scroll !== undefined && L.scroll) {
        // Bildfenster auf Pfadlänge s (laufend), damit die Figur im Bild steht
        L.scroll.restore({ s: o.scroll, speed: 0, clock: 10, waitT: 9, triggered: true, state: o.scroll >= L.scroll.s1 ? 'done' : 'run' });
        if (L.archetype?.onRespawn && o.scroll >= L.scroll.s1) { L.archetype.ended = true; L.archetype.camK = 0; }
      }
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
      const mech = { hurts: 0, pipes: 0, bounces: 0, waits: 0, scrollDone: false, gate: false, maxY: -99 };
      const track = [];
      let lastJump = false;
      const tick = (inp) => {
        if (hold) p.invuln = Math.max(p.invuln, 5);
        lastJump = !!inp?.jump;
        c.setInput(inp); c.step(1); steps++;
        mech.maxY = Math.max(mech.maxY, p.pos.y);
        if (L.scroll?.state === 'done') mech.scrollDone = true;
        if (named('grubentor')?.open) mech.gate = true;
        if ((L._zirkus?.tent?.k ?? 0) > 0.95) mech.zelt = true;
        if (p.mode === 'ground' && !p.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(p.pos.x - t[0], p.pos.y - t[1], p.pos.z - t[2]) > 7) track.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +(L.scroll?.s ?? 0).toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.ground?.tag ?? '', +(L.scroll?.center?.y ?? 0).toFixed(1)]); if (hist.length > 40) hist.shift(); }
        if (window.__trace && window.__trace(p, steps)) log.push(['T', steps, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), p.mode, p.state, p.jumpKind, p.ground?.tag ?? '', +p.vel.y.toFixed(2), JSON.stringify(inp)]);
        if (p.dead && !deadLogged) { deadLogged = true; mech.died = true; mech.deathCause = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist)]); }
        if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead && !o.keepScript) {
          let n = 0;
          const kind = p.script?.type ?? p.script?.kind ?? '?';
          while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
          if (kind === 'pipe') mech.pipes++;
          log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        }
      };
      /** Im Autoscroller: warten, bis die vordere Bildgrenze über der Höhe y liegt (Landeplatz), höchstens max Schritte. */
      const gate = (y, max = 2400) => {
        const w = L.scroll, arch = L.archetype;
        if (y === undefined || !w || w.state === 'done' || !arch?.frame || w.dir.y < 0.5) return 0;
        let k = 0;
        while (k < max && w.state !== 'done' && y + 0.5 > w.center.y + arch.frame.front) { tick({}); k++; }
        if (k) mech.waits += k;
        return k;
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
        // gehaltene Sprungtaste vom vorigen Bein loslassen (ein neuer Sprung braucht einen neuen Druck)
        if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); log.push(['röhre', li, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1)]); continue; }
        if (Lg.expect) { const ok = COND[Lg.expect](Lg.arg); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](Lg.arg); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until](Lg.arg)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900, walk: Lg.walk, jump: Lg.jump }); log.push(['stern', Lg.star, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n, +p.pos.x.toFixed(1), +p.pos.y.toFixed(1), +p.pos.z.toFixed(1), p.power]); continue; }
        if (Lg.die) { p.invuln = 0; p.die('hit'); let k = 0; for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) tick({}); log.push(['gestorben, Neustart nach', k]); continue; }
        // ------------------------------------------------ Rückwärtssalto: kurz in Blickrichtung tippen, ducken, springen
        if (Lg.backflip) {
          const [fx, fz] = Lg.backflip;
          for (let k = 0; k < 4; k++) tick({ ...this.stick(fx, fz, 0.35) });
          for (let k = 0; k < 20 && Math.hypot(p.vel.x, p.vel.z) > 0.05; k++) tick({});
          for (let k = 0; k < 12; k++) tick({ crouch: true });
          for (let k = 0; k < 36; k++) tick({ crouch: k < 4, jump: true });
          for (let k = 0; k < 300 && p.mode !== 'ground'; k++) tick({});
          log.push(['Rückwärtssalto', p.jumpKind, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), +mech.maxY.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Stern über der Wippe: warten, bis das Ende oben ist, dann springen
        if (Lg.wippeStern) {
          const w = named(Lg.wippeStern);
          const sgn = Lg.sign ?? 1;
          let k = 0;
          for (; k < 2400 && !(sgn * w.angle >= Lg.minAngle && p.mode === 'ground'); k++) tick({});
          mech.wippeAngle = sgn * w.angle;
          const y0 = p.pos.y;
          for (let j = 0; j < 40; j++) tick({ jump: true });
          for (let j = 0; j < 300 && p.mode !== 'ground'; j++) tick({});
          log.push(['Wippen-Stern', k, +mech.wippeAngle.toFixed(1), +y0.toFixed(2), +mech.maxY.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Quetschblock: warten, bis er gerade wieder oben ist
        if (Lg.crusher) {
          const q = named(Lg.crusher);
          let k = 0, seenBack = q.state === 'zurueck' || (Lg.fresh === false);
          for (; k < 1600; k++) {
            if (q.state === 'zurueck') seenBack = true;
            if ((seenBack || Lg.fresh === false) && q.state === 'ruhe') break;
            tick({});
          }
          log.push(['quetschblock', Lg.crusher, k, q.state]);
          continue;
        }
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
        // ------------------------------------------------ Sprungfeld: hinaufspringen, hochfedern, zum Ziel lenken
        if (Lg.bounce) {
          const [ax, az] = Lg.at, [tx, tz] = Lg.bounce;
          gate(Lg.win ?? Lg.y);
          let k = 0, bounced = false, landed = false;
          for (; k < 900; k++) {
            if (p.dead) break;
            if (!bounced) {
              const dx = ax - p.pos.x, dz = az - p.pos.z;
              tick({ ...(p.mode === 'air' ? this.airSteer(ax, az, 0, 0, 3, 6) : this.stick(dx, dz, Math.min(1, Math.hypot(dx, dz)))), jump: (p.mode === 'ground' && Math.hypot(dx, dz) < 1.6 && (k % 16) < 8) || (p.mode === 'air' && p.vel.y > 0), run: false });
              if (p.jumpKind === 'bounce' && p.mode === 'air') { bounced = true; mech.bounces++; }
              continue;
            }
            // zuerst senkrecht (an Gehäusen/Brettern vorbei), dann zum Ziel
            const steer = p.vel.y < (Lg.steerBelow ?? 6) || Lg.keepX === undefined;
            const gx = Lg.keepX !== undefined && p.vel.y >= (Lg.steerBelow ?? 6) ? Lg.keepX : tx;
            tick({ ...(steer || Lg.keepX !== undefined ? this.airSteer(gx, tz, 0, 0, 2.6, 7) : {}), jump: true });
            if (p.mode === 'ground') { landed = true; break; }
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['Sprungfeld', bounced, landed, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!bounced || !landed || !okY) { log.push(['FEHLER: Sprungfeld', Lg.name ?? Lg.at, JSON.stringify(hist.slice(-25))]); break; }
          continue;
        }
        // ------------------------------------------------ fahrende Plattform/Wolke: abwarten, aufspringen, mitfahren, abspringen
        if (Lg.mover) {
          const m = named(Lg.mover);
          const mpos = () => (m.pm ? m.pm.pos : m.mb.pos);
          const ready = () => {
            if (Lg.on === 'right') return m.mb.pos.x > 3.1 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            if (Lg.on === 'low') return m.mb.pos.y < 70.8 && Math.abs(p.pos.x - Lg.stand[0]) < 0.4;
            return true;
          };
          let k = 0;
          for (; k < 2400 && !ready(); k++) {
            const sp = Lg.stand ?? null;
            if (sp) { const dx = sp[0] - p.pos.x, dz = sp[1] - p.pos.z; tick(Math.hypot(dx, dz) > 0.3 ? { ...this.stick(dx, dz, 0.5), run: false } : {}); }
            else tick({});
          }
          // aufspringen
          let j = 0, on = false;
          for (; j < 300; j++) {
            const q = mpos();
            const tx = q.x, tz = Lg.at?.[1] ?? q.z;
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, (m.pm ? m.mover : m.mb.mover)?.vx ?? 0, 0, 3.2, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: j < 26, run: false });
            if (j > 8 && p.mode === 'ground') { on = p.pos.y > (Lg.onY ?? (m.pm ? q.y + 0.2 : q.y + 0.3)); break; }
          }
          if (!on) { log.push(['FEHLER: nicht auf', Lg.mover, j, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2)]); break; }
          // mitfahren, bis rideUntil gilt und das Bildfenster das Ziel zeigt
          const winOk = () => { const w = L.scroll, fr = L.archetype?.frame, y = Lg.win ?? Lg.y; return y === undefined || !w || w.state === 'done' || !fr || y + 0.5 <= w.center.y + fr.front; };
          let r = 0;
          for (; r < 3600 && !(COND[Lg.rideUntil]() && winOk()); r++) {
            const q = mpos();
            const dx = q.x - p.pos.x;
            tick(Math.abs(dx) > 0.3 ? { ...this.stick(dx, 0, 0.5), run: false } : {});
          }
          // abspringen zum Ziel
          const [tx, tz] = Lg.off;
          let a = 0;
          for (; a < 400; a++) {
            tick({ ...(p.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.8, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 30, run: false });
            if (a > 10 && p.mode === 'ground') break;
          }
          const okY = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          log.push(['gefahren', Lg.mover, k, j, r, a, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (!okY) { log.push(['FEHLER: Abprung von', Lg.mover]); break; }
          continue;
        }
        // ------------------------------------------------ 6-C: aus der fahrenden Gondel seitlich abspringen (Sternschaukel)
        if (Lg.gondelSprung) {
          const g = named(Lg.gondel ?? 'gondel');
          const [tx, tz] = Lg.gondelSprung;
          let k = 0;
          // in der Gondel an der Seite zum Ziel stehen (0,55 m vor dem Geländer), bis sie auf Höhe atZ ist
          const side = Math.sign(tx - g.pos.x) || -1;
          for (; k < 3600 && !(g.state === 'move' && g.pos.z <= Lg.atZ); k++) {
            const dx = g.pos.x + side * 0.5 - p.pos.x, dz = g.pos.z - p.pos.z;
            tick(Math.hypot(dx, dz) > 0.15 ? { ...this.stick(dx, dz, Math.min(0.5, Math.hypot(dx, dz) * 2)), run: false } : {});
          }
          let a = 0;
          for (; a < 400; a++) {
            tick({ ...(p.mode === 'air' && a > 6 ? this.airSteer(tx, tz, 0, 0, 2.8, 8) : this.stick(tx - p.pos.x, tz - p.pos.z, 1)), jump: a < 32, run: false });
            if (a > 10 && p.mode === 'ground') break;
          }
          log.push(['Gondel-Absprung', k, a, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (p.pos.y < Lg.y - 0.3) { log.push(['FEHLER: Absprung zu kurz']); break; }
          continue;
        }
        // ------------------------------------------------ 6-C: Würfelblase – ausweichen, über Wellen springen, im Fliehen auf den Hut
        if (Lg.blase) {
          const b = named(Lg.blase === true ? 'blase' : Lg.blase);
          const A = b.arena;
          const sub = L.archetype;
          let k = 0;
          for (; k < 600 && !sub?.started && b.state === 'wait'; k++) tick({ ...this.stick(A.x - p.pos.x, A.z + 4 - p.pos.z, 0.8) });
          let j0 = -1, stomps = 0, jumps = 0, n = 0;
          const maxK = Lg.max ?? 120 * 300;
          for (; n < maxK && b.state !== 'gone' && !p.dead && L.runtime.status === 'play'; n++) {
            const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            let inp;
            if (b.vulnerable || (b.state === 'flee' && b.grace > 0)) {
              // fliehende Würfelblase: hin und auf den Hut springen
              if (p.mode === 'ground' && j0 < 0 && d < 2.2 && b.vulnerable) { j0 = n; stomps++; }
              const jump = j0 >= 0 && n - j0 < 20;
              inp = p.mode === 'air' ? { ...this.airSteer(b.pos.x, b.pos.z, b.vel.x, b.vel.z, 4, 9), jump } : { ...this.stick(dx, dz, 1), run: d > 2.5, jump };
              if (p.mode === 'ground' && j0 >= 0 && n - j0 > 26) j0 = -1;
            } else {
              j0 = -1;
              // ausweichen: weg vom Riesen, von der Landemarke und von Brocken, sonst im Kreis um die Mitte
              const rx = p.pos.x - A.x, rz = p.pos.z - A.z, rr = Math.hypot(rx, rz) || 1;
              let ax = -rz / rr * 0.6, az = rx / rr * 0.6;              // tangential (gegen den Uhrzeigersinn)
              ax += (6.5 - rr) / rr * rx * 0.35; az += (6.5 - rr) / rr * rz * 0.35;   // Kreis r ≈ 6,5
              const push = (x, z, R, w = 1) => { const ex = p.pos.x - x, ez = p.pos.z - z, ed = Math.max(0.3, Math.hypot(ex, ez)); if (ed < R) { ax += (ex / ed) * w * (R - ed) / R * 3; az += (ez / ed) * w * (R - ed) / R * 3; } };
              const giant = /^g/.test(b.state) || b.state === 'form';
              if (giant) push(b.pos.x, b.pos.z, (b.S ?? 3) / 2 + 3.2, 1.5);
              if (b.jump && (b.state === 'gcrouch' || b.state === 'gair')) push(b.jump.x1, b.jump.z1, (b.S ?? 3) / 2 + 2.6, 2);
              for (const e of b.bits ?? []) if (!e.removed && !e.defeated && e.alive) push(e.pos.x, e.pos.z, 1.6, 0.8);
              inp = { ...this.stick(ax, az, Math.min(1, Math.hypot(ax, az))), run: false };
              // Schockwelle: kurz vor dem Ring springen
              for (const w of b.waves ?? []) {
                const wd = Math.hypot(p.pos.x - w.x, p.pos.z - w.z);
                if (p.mode === 'ground' && w.r < wd && wd - w.r < 1.3) { inp.jump = true; jumps++; }
              }
              if (p.mode === 'air' && p.vel.y > 0) inp.jump = true;
            }
            tick(inp);
          }
          mech.blase = { started: !!sub?.started, hits: b.hits, hp: b.hp, giants: b.giants, sizes: b.sizes, waves: b.wavesN, bitsDown: b.bitsDown, flees: b.flees, stomps, jumps, steps: n, state: b.state };
          for (let i = 0; i < 300 && b.state !== 'gone'; i++) tick({});
          for (let i = 0; i < 90; i++) tick({});
          mech.blase.won = !!sub?.won;
          log.push(['Würfelblase', JSON.stringify(mech.blase)]);
          if (!sub?.won) { log.push(['FEHLER: Würfelblase nicht besiegt']); break; }
          continue;
        }
        // ------------------------------------------------ Warp-Box anspringen (hineinfallen)
        if (Lg.warp) {
          const wb = named(Lg.warp);
          let k = 0;
          const x0 = p.pos.x, z0 = p.pos.z;
          for (; k < 900 && Math.hypot(p.pos.x - x0, p.pos.z - z0) < 25; k++) {
            const dx = wb.pos.x - p.pos.x, dz = wb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(p.mode === 'air' ? this.airSteer(wb.pos.x, wb.pos.z, 0, 0, 3, 6) : this.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 1.8 && (k % 40) < 16 : p.vel.y > 0 });
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['Warp-Box', !wb.hidden, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
          if (k >= 900) { log.push(['FEHLER: Warp-Box']); break; }
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        if (holdJ) { for (let w = 0; w < 240 && p.mode === 'air'; w++) tick({}); gate(Lg.win ?? Lg.y); }
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt || Lg.runUp ? null : 0;
        const y0 = p.pos.y;
        for (; i < max; i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const dx = tx - p.pos.x, dz = tz - p.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (p.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const highEnough = Lg.y === undefined || p.pos.y > Lg.y - 0.3;
          const done = dist < within && highEnough && (Lg.y === undefined || p.mode === 'ground') && (!holdJ || Lg.land === false || (landed && (p.mode === 'ground' || p.mode === 'swim')));
          if (done && i > 0) break;
          // Sprung misslungen (wieder unten gelandet): neu anlaufen
          if (holdJ && landed && p.mode === 'ground' && !highEnough && i > 20) { landed = false; airborne = false; j0 = i + 1; gate(Lg.win ?? Lg.y); }
          let mag = Lg.slow ?? 1;
          let st;
          if (p.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 8);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          // spätestens an der Kante abspringen (sonst fiele der Bot von Wolke/Bühne, bevor jumpAt erreicht ist)
          if (j0 === null && Lg.jumpAt && Lg.edgeJump && p.mode === 'ground' && dist > 0.6) {
            const ux = dx / dist, uz = dz / dist, h = c.world.raycastDown(p.pos.x + ux * 0.45, p.pos.y + 0.6, p.pos.z + uz * 0.45, 1.2);
            if (!h || h.y < p.pos.y - 0.4) j0 = i;
          }
          const jump = (holdJ && j0 !== null ? (i - j0 >= 0 && i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? false, jump });
          if (p.mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2), p.mode, p.state, +(L.scroll?.center?.y ?? 0).toFixed(1)]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to, Lg.y, y0]); break; }
      }
      c.setInput({});
      mech.hurts = p.hurtTries ?? 0;
      return { log, autoJumps, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, deathCause: p.deathCause ?? null, status: L.runtime.status, info: p.info(), rt: L.runtime.info(), mech, power: p.power, track };
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
  window.__w6 = W;
  return Object.keys(W);
}

/**
 * Hilfen für 6-Panzer (in der Seite, nach install()): Konvoi-Koordinaten, Kolonne fahren lassen (Figur geparkt), Figur auf
 * einen Panzer setzen, Bot über die fahrende Kolonne (Spur, Lücken springen), Zündköpfe holen und werfen, Stampfen,
 * Luke, Bosskampf mit echten Eingaben, Warp-Box, Zielmast.
 */
function installKonvoi() {
  const c = window.__course, L = c.level, W = window.__w6;
  const P = () => c.player;
  const named = (id) => L.named.get(id);
  const CV = L.data.convoy, PL = L.data.plan;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const K = window.__k = {};
  K.dz = () => named('T1').pos.z + CV.T1.c;
  K.cOf = (z) => -(z - K.dz());
  K.wz = (cc) => -cc + K.dz();
  K.cw = () => K.cOf(L.scroll.center.z);
  K.vel = () => { const m = named('T1').mover; return [m?.vx ?? 0, m?.vz ?? 0]; };
  K.park = () => { const p = P(); p.invuln = 1e9; p.mode = 'script'; p.script = { type: 'test', t: 0 }; };
  /** Kolonne fahren lassen, bis die Fenstermitte bei cc steht ('done': bis zum Halt), Figur geparkt. */
  K.ride = (cc, max = 120 * 200) => {
    K.park();
    let k = 0;
    while ((cc === 'done' ? L.scroll.state !== 'done' : K.cw() < cc && L.scroll.state !== 'done') && k < max) { c.step(1); k++; }
    return k;
  };
  /** Figur auf Konvoi-Koordinate (cc, x) setzen (Höhe: Deck darunter). */
  K.put = (cc, x, o = {}) => {
    const p = P();
    c.setInput(null);
    p.setHero(o.hero ?? 'lotti');
    p.dead = false; p.big = true; p.power = 'none'; p.powerTime = 0;
    if (p.holding) { const e = p.holding; p.holding = null; e.carrier = null; }
    const Z = K.wz(cc);
    const hit = c.world.raycastDown(x, o.from ?? 14, Z, 30);
    p.mode = 'ground'; p.script = null;
    p.reset([x, (hit?.y ?? 2) + 0.05, Z], o.yaw ?? Math.PI / 2);
    p.invuln = o.invuln ?? 0;
    L.runtime.status = 'play';
    L.controlYaw = c.view.rig.controlYaw(p.pos);
    c.step(o.settle ?? 4);
    c.snapCamera();
    p.hurtTries = 0;
    return p.info();
  };
  const laneAt = (lane, cc) => {
    if (cc <= lane[0][0]) return lane[0][1];
    for (let i = 1; i < lane.length; i++) if (cc <= lane[i][0]) { const [c0, x0] = lane[i - 1], [c1, x1] = lane[i]; return x0 + (x1 - x0) * ((cc - c0) / (c1 - c0)); }
    return lane[lane.length - 1][1];
  };
  const SOLID = (s) => s.solid !== false && !s.oneWay && !s.trigger && !s.quicksand && !s.water && !s.kill;
  const groundAhead = (p, d, x = p.pos.x) => { const h = c.world.raycastDown(x, p.pos.y + 0.6, p.pos.z - d, 4.5); return !!h && !h.shape.kill && h.y > p.pos.y - 2.5; };
  const wallAhead = (p, d) => c.world.overlapAABB({ x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z - d }, { x: 0.22, y: 0.32, z: 0.12 }, { filter: SOLID }).length > 0;
  const farSide = (p, x2) => { for (let d = 1.0; d < 6.5; d += 0.25) if (groundAhead(p, d) || (x2 !== undefined && groundAhead(p, d, x2))) return d; return Infinity; };
  const COND = {
    stern1: () => named('stern1') && !named('stern1').hidden,
    turm9: () => named('turm9')?.state === 'turm',
    turmABereit: () => named('turm_a')?.state === 'bereit',
    sternsteinHeil: () => { const s = named('sternstein'); return !!s && !s.removed && s.alive !== false; },
    turm9Bereit: () => named('turm9')?.state === 'bereit',
    aufT5: () => { const p = P(); return !p.dead && p.ground?.mover?.vehicle?.spec?.id === 'T5' && Math.abs(K.cOf(p.pos.z) - 71.4) < 1.5 && Math.abs(p.pos.x - 1.6) < 0.8; },
    werferAufT7: () => { const e = named('hw7'), v = named('T7'); return !!e && !e.removed && Math.abs(e.pos.z - v.pos.z) < 4.5 && Math.abs(e.pos.y - (v.pos.y + 2)) < 1.6 && Math.abs(e.home.z - v.pos.z + 1.6) < 0.6; },
  };
  K.cond = (k) => COND[k]();

  K.run = (plan, o = {}) => {
    const p = P(), w = L.scroll;
    const log = [];
    const mech = { hurts: 0, deaths: 0, jumps: 0, climbs: 0, tanks: [], tankCount: 0, maxC: -1e9, bombs: 0, arena: false, boss: null };
    const hold = o.invuln !== false;
    let steps = 0, lastJump = false, deadLogged = false;
    const hist = [];
    const tankId = () => p.ground?.mover?.vehicle?.spec?.id ?? null;
    const hurtBy = {};
    mech.hurtBy = hurtBy;
    let hurt0 = p.hurtTries ?? 0;
    const tick = (inp) => {
      if (hold) p.invuln = Math.max(p.invuln, 5);
      lastJump = !!inp?.jump;
      c.setInput(inp); c.step(1); steps++;
      if ((p.hurtTries ?? 0) > hurt0) { hurtBy[p.lastHurt] = (hurtBy[p.lastHurt] ?? 0) + (p.hurtTries - hurt0); hurt0 = p.hurtTries; }
      const id = tankId();
      if (id && !mech.tanks.includes(id)) mech.tanks.push(id);
      if (L.scroll.state !== 'done' || p.pos.z > PL.az + 15) mech.maxC = Math.max(mech.maxC, K.cOf(p.pos.z));
      if (steps % 6 === 0) { hist.push([+p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +K.cOf(p.pos.z).toFixed(2), p.mode, id ?? p.ground?.tag ?? '', +K.cw().toFixed(1)]); if (hist.length > 30) hist.shift(); }
      if (p.dead && !deadLogged) { deadLogged = true; mech.deaths++; mech.deathCause = p.deathCause; log.push(['TOD', p.deathCause, JSON.stringify(hist.slice(-14))]); }
      if (p.mode === 'script' && L.runtime.status === 'play' && !p.dead) {
        let n = 0;
        const kind = p.script?.type ?? p.script?.kind ?? '?';
        while (p.mode === 'script' && n++ < 2400 && !p.dead && L.runtime.status === 'play') { if (hold) p.invuln = Math.max(p.invuln, 5); c.setInput({}); c.step(1); steps++; }
        log.push(['fahrt', kind, n, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
      }
    };
    const here = (tag) => [tag, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +K.cOf(p.pos.z).toFixed(2), p.mode, tankId() ?? p.ground?.tag ?? ''];
    /** zu Konvoi-Punkt gehen (Weltlage je Schritt neu). */
    const goC = (cc, x, within = 0.3, max = 900, run = false) => {
      let i = 0;
      for (; i < max; i++) {
        if (p.dead) break;
        const dx = x - p.pos.x, dz = K.wz(cc) - p.pos.z, d = Math.hypot(dx, dz);
        if (d < within && p.mode === 'ground') break;
        tick({ ...W.stick(dx, dz, Math.max(0.2, Math.min(1, d / 1.2))), run });
      }
      return i < max;
    };
    /** zum Weltpunkt eines Objekts drehen (kurz antippen). */
    const faceTo = (x, z, max = 30) => {
      for (let i = 0; i < max; i++) {
        const want = Math.atan2(-(z - p.pos.z), x - p.pos.x);
        const dy = Math.atan2(Math.sin(want - p.yaw), Math.cos(want - p.yaw));
        if (Math.abs(dy) < 0.1) break;
        tick({ ...W.stick(x - p.pos.x, z - p.pos.z, 0.25) });
      }
      for (let i = 0; i < 2; i++) tick({});
    };

    for (let li = 0; li < plan.length; li++) {
      const Lg = plan[li];
      if (p.dead || L.runtime.status !== 'play') break;
      if (lastJump) tick(p.mode === 'air' ? { jump: false } : {});
      if (Lg.wait) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
      if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !COND[Lg.until](); k++) tick({}); log.push(['bis', Lg.until, k]); if (!COND[Lg.until]()) log.push(['FEHLER: bis', Lg.until]); continue; }
      if (Lg.expect) { const ok = COND[Lg.expect](); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect]); continue; }
      if (Lg.die) { p.invuln = 0; p.die('hit'); let k = 0; for (; k < 2400 && (p.dead || L.runtime.status !== 'play'); k++) tick({}); for (let i = 0; i < 30; i++) tick({}); log.push(['gestorben, Neustart nach', k, ...here('')]); continue; }
      if (Lg.jumpHere) { for (let k = 0; k < Lg.jumpHere; k++) tick({ jump: true }); for (let k = 0; k < 240 && p.mode !== 'ground'; k++) tick({}); log.push(here('hüpfer')); continue; }
      if (Lg.star !== undefined) { const n = W.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, ...here('')]); continue; }
      if (Lg.stamp) { const n = W.chase('stamp', { max: 900, walk: true }); log.push(['stempel', n, ...here('')]); continue; }
      if (Lg.chaseKind) { const n = W.chase(Lg.chaseKind, { max: Lg.max ?? 1200 }); log.push(['jagd', Lg.chaseKind, n, ...here('')]); continue; }
      // ------------------------------------------------ Halte des Bildfensters messen (Figur geparkt)
      if (Lg.holds) {
        K.park();
        const holds = [];
        let t0 = null, k = 0;
        const v = () => L.scroll.speedNow ?? L.scroll.speed;
        for (; k < 120 * 160 && L.scroll.state !== 'done'; k++) {
          c.step(1);
          const slow = Math.abs(v() - PL.vt) < 0.05 && L.scroll.state === 'run';
          if (slow && t0 === null) t0 = L.time;
          if (!slow && t0 !== null) { holds.push(+(L.time - t0).toFixed(2)); t0 = null; }
        }
        mech.holds = holds.filter((h) => h > 2);
        log.push(['Halte', JSON.stringify(mech.holds)]);
        continue;
      }
      // ------------------------------------------------ zu Fuß zu einem Konvoi-Punkt
      if (Lg.go) {
        const ok = goC(Lg.go[0], Lg.go[1], Lg.within ?? 0.3, Lg.max ?? 900, !!Lg.run);
        log.push(here(Lg.name ?? 'gehe'));
        if (!ok && !Lg.noJump) log.push(['FEHLER: nicht erreicht', JSON.stringify(Lg.go)]);
        continue;
      }
      // ------------------------------------------------ Sprung auf einen Konvoi-Punkt (Landung mindestens auf y)
      if (Lg.hop) {
        const [cc, x] = Lg.hop;
        let i = 0, j0 = null, airborne = false, landed = false, tries = 0;
        for (; i < (Lg.max ?? 900); i++) {
          if (p.dead) break;
          const tx = x, tz = K.wz(cc), dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          const high = p.pos.y > Lg.y - 0.3;
          if (landed && p.mode === 'ground') {
            if (high && d < (Lg.within ?? 0.9)) break;
            if (!high) { landed = false; airborne = false; j0 = null; tries++; }
            else if (d >= (Lg.within ?? 0.9)) { landed = false; airborne = false; j0 = null; }
          }
          // abspringen: im Abstand jumpAt – oder spätestens an der Kante (sonst fiele der Bot hinab)
          const ux = dx / (d || 1), uz = dz / (d || 1);
          const hEdge = p.mode === 'ground' ? c.world.raycastDown(p.pos.x + ux * 0.45, p.pos.y + 0.6, p.pos.z + uz * 0.45, 1.2) : null;
          const atEdge = p.mode === 'ground' && (!hEdge || hEdge.y < p.pos.y - 0.4);
          if (j0 === null && p.mode === 'ground' && (d <= (Lg.jumpAt ?? 1.8) || atEdge)) { j0 = i; mech.jumps++; }
          const jump = j0 !== null && i - j0 < (Lg.hold ?? 36);
          let st;
          if (p.mode === 'air' && j0 !== null) { const [vx, vz] = K.vel(); st = W.airSteer(tx, tz, vx, vz, 2.8, 7); }
          else st = W.stick(dx, dz, Math.max(0.25, Math.min(1, d / 1.4)));
          tick({ ...st, jump, run: false });
          if (p.mode === 'air') airborne = true; else if (airborne) landed = true;
        }
        log.push([...here(Lg.name ?? 'sprung'), i, tries]);
        if (p.pos.y < Lg.y - 0.3) log.push(['FEHLER: Sprung zu kurz', Lg.name ?? JSON.stringify(Lg.hop)]);
        continue;
      }
      // ------------------------------------------------ Stampfen auf einen Konvoi-Punkt (aufspringen, in der Luft ducken)
      if (Lg.pound) {
        const [cc, x] = Lg.pound;
        goC(cc - 1.6, x, 0.3, 600);
        let k = 0, pounding = false;
        const y0 = p.pos.y;
        for (; k < 400; k++) {
          const tx = x, tz = K.wz(cc), dx = tx - p.pos.x, dz = tz - p.pos.z, d = Math.hypot(dx, dz);
          if (k > 5 && p.mode === 'ground') break;
          if (!pounding && k > 8 && d < 0.35 && p.vel.y < 2 && p.pos.y > y0 + 2.2) pounding = true;
          const [vx, vz] = K.vel();
          tick(pounding ? { crouch: true } : { ...(p.mode === 'air' ? W.airSteer(tx, tz, vx, vz, 3.2, 6) : W.stick(dx, dz, Math.min(1, d * 1.2))), jump: k < 34, run: false });
        }
        for (let i = 0; i < 20; i++) tick({});
        log.push([...here('stampfen'), pounding, k]);
        continue;
      }
      // ------------------------------------------------ Zündkopf holen (bzw. nehmen, was kommt) und auf ein Ziel werfen
      if (Lg.bomb) {
        const target = named(Lg.bomb);
        const tpos = () => target.pos;
        let z = null;
        if (Lg.spawn) { z = L.spawn('zuendkopf', { pos: [p.pos.x, p.pos.y + 0.1, p.pos.z - 0.7], attach: Lg.tank, trigger: 0, speed: 0.001, behavior: 'walk', wake: 999 }); tick({}); }
        // nur Zündköpfe sicher auf dem Deck (nicht an der Kante – sonst läuft der Bot hinterher ins Leere)
        const tank = named(Lg.tank), tw = () => tank.size.w / 2 - 0.7, tl = () => tank.size.d / 2 - 0.9;
        const onDeck = (e) => Math.abs(e.pos.x - tank.pos.x) < tw() && Math.abs(e.pos.z - tank.pos.z) < tl();
        const free = (e) => e.kind === 'zuendkopf' && !e.removed && e.alive && !e.exploded && !e.defeated && !e.carrier && e.state !== 'thrown' && e.state !== 'explode' && e.spec?.attach === Lg.tank && e.pos.y > 1 && onDeck(e);
        let k = 0, got = false, tries = 0;
        for (; k < 1800; k++) {
          if (p.dead) break;
          if (p.holding?.kind === 'zuendkopf') { got = true; break; }
          let best = null, bd = Infinity;
          for (const e of L.entities) { if (!free(e)) continue; const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z); if (d < bd) { bd = d; best = e; } }
          if (!best) { const [cc, x] = Lg.standby ?? Lg.at; const dx = x - p.pos.x, dz = K.wz(cc) - p.pos.z; tick(Math.hypot(dx, dz) > 0.4 ? W.stick(dx, dz, 0.6) : {}); continue; }
          z = best;
          const dx = z.pos.x - p.pos.x, dz = z.pos.z - p.pos.z;
          if (bd < 0.7) { tries++; faceTo(z.pos.x, z.pos.z, 12); tick({ action: true }); tick({}); continue; }
          tick({ ...W.stick(dx, dz, Math.max(0.35, Math.min(1, bd / 1.2))), run: false });
        }
        if (!got) { log.push(['FEHLER: kein Zündkopf', Lg.bomb, k, ...here('')]); continue; }
        z = p.holding;
        mech.bombs++;
        const [cc, x] = Lg.at;
        for (const v of Lg.via ?? []) goC(v[0], v[1], 0.4, 300);
        goC(cc, x, 0.3, 400);
        faceTo(tpos().x, tpos().z);
        tick({ action: true }); tick({});
        const thrown = z.state;
        let e = 0, ex = null;
        for (; e < 400 && !z.exploded && !z.removed; e++) tick({});
        if (z.exploded) ex = [+(z.pos.x - tpos().x).toFixed(2), +(z.pos.y - tpos().y).toFixed(2), +(z.pos.z - tpos().z).toFixed(2)];
        for (let i = 0; i < 30; i++) tick({});
        log.push(['Zündkopf', Lg.bomb, k, tries, thrown, z.exploded, ex, target.state ?? target.broken ?? (target.removed ? 'weg' : 'da'), ...here('')]);
        continue;
      }
      // ------------------------------------------------ Luke: hingehen, ducken → Arena
      if (Lg.luke) {
        const lk = named('luke');
        let k = 0;
        for (; k < 900; k++) {
          const dx = lk.pos.x - p.pos.x, dz = lk.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (p.mode === 'ground' && p.pos.y > lk.pos.y + lk.H - 0.2 && d < 0.4) break;
          tick({ ...(p.mode === 'air' ? W.airSteer(lk.pos.x, lk.pos.z, 0, 0, 3, 6) : W.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' && d < 1.4 && (k % 30) < 14 });
        }
        for (let i = 0; i < 200 && p.pos.z > PL.az + 15; i++) tick({ crouch: true });
        for (let i = 0; i < 60; i++) tick({});
        mech.arena = p.pos.z < PL.az + 15 && p.pos.y > 5.5;
        log.push(['Luke', lk.open, k, mech.arena, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        if (!mech.arena) log.push(['FEHLER: nicht in der Arena']);
        continue;
      }
      // ------------------------------------------------ Bosskampf: ausweichen, im Schwindel auf das Original springen
      if (Lg.boss) {
        const b = named('wirbel');
        const A = { x: 0, z: PL.az, r: 10.1 };
        const sub = c.arch.sub;
        let k = 0;
        for (; k < 600 && !sub.started; k++) tick({ ...W.stick(A.x - p.pos.x, A.z + 3 - p.pos.z, 0.8) });
        let attack = false, j0 = -1, stomps = 0, k2 = 0;
        const maxK = 120 * 240;
        for (; k2 < maxK && b.state !== 'gone' && !b.defeated && !p.dead; k2++) {
          const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          if (b.state === 'stunned' && !attack) { attack = true; j0 = -1; }
          if (attack && b.state !== 'stunned' && p.mode === 'ground') attack = false;
          let inp;
          if (attack) {
            if (p.mode === 'ground' && j0 < 0 && d < 2.3) { j0 = k2; stomps++; }
            const jump = j0 >= 0 && k2 - j0 < 22;
            if (p.mode === 'air') inp = { ...W.airSteer(b.pos.x, b.pos.z, 0, 0, 4, 8), jump };
            else inp = { ...W.stick(dx, dz, 1), run: d > 3, jump };
            if (p.mode === 'ground' && j0 >= 0 && k2 - j0 > 30) j0 = -1;
          } else {
            // ausweichen: weg vom Brocken und von den Attrappen (Abstoßung ~ 1/d²), an der Arenagrenze tangential
            const rx = p.pos.x - A.x, rz = p.pos.z - A.z, rr = Math.hypot(rx, rz) || 1;
            let ax = 0, az = 0;
            for (const e of L.entities) {
              if (e.removed || !(e === b || (e.kind === 'wirbelbrocken_attrappe' && e.alive))) continue;
              const ex = p.pos.x - e.pos.x, ez = p.pos.z - e.pos.z, ed = Math.max(0.5, Math.hypot(ex, ez));
              ax += ex / (ed * ed * ed); az += ez / (ed * ed * ed);
            }
            const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
            if (rr > 6.8) { const tx = -rz / rr, tz = rx / rr, s = tx * ax + tz * az >= 0 ? 1 : -1; ax = s * tx - rx / rr * 0.35; az = s * tz - rz / rr * 0.35; }
            const want = d < 6.5 ? 1 : 0.15;
            inp = { ...W.stick(ax, az, want), run: d < 4 };
          }
          tick(inp);
        }
        mech.boss = { hits: b.hits ?? (b.maxHp - b.hp), hp: b.hp, teleports: b.teleports ?? 0, decoysMade: b.decoysMade ?? 0, decoysPopped: b.decoysPopped ?? 0, stomps, steps: k2, state: b.state };
        for (let i = 0; i < 900 && b.state !== 'gone'; i++) tick({});
        for (let i = 0; i < 60; i++) tick({});
        mech.boss.won = !!sub.won;
        log.push(['Boss', JSON.stringify(mech.boss)]);
        if (!sub.won) log.push(['FEHLER: Boss nicht besiegt']);
        continue;
      }
      // ------------------------------------------------ Warp-Box nach dem Sieg → Regenbogeninsel
      if (Lg.warp) {
        const wb = named('warp_sieg');
        let k = 0;
        for (; k < 900 && p.pos.x < PL.gx - 20; k++) {
          const dx = wb.pos.x - p.pos.x, dz = wb.pos.z - p.pos.z, d = Math.hypot(dx, dz);
          tick({ ...(p.mode === 'air' ? W.airSteer(wb.pos.x, wb.pos.z, 0, 0, 3, 6) : W.stick(dx, dz, Math.max(0.3, Math.min(1, d)))), jump: p.mode === 'ground' ? d < 1.8 && (k % 40) < 16 : p.vel.y > 0 });
        }
        for (let i = 0; i < 60; i++) tick({});
        log.push(['Warp-Box', !wb.hidden, k, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]);
        continue;
      }
      if (Lg.goal) {
        const g = L.data.goal.pos;
        let k = 0;
        for (; k < 1200 && L.runtime.status === 'play'; k++) tick({ ...W.stick(g[0] - p.pos.x, g[2] - p.pos.z, 1), jump: Math.hypot(g[0] - p.pos.x, g[2] - p.pos.z) < 2.2 && (k % 40) < 20 });
        for (let i = 0; i < 600 && L.runtime.status !== 'goal' && L.runtime.status !== 'done'; i++) tick({});
        log.push(['Zielmast', L.runtime.status, k]);
        continue;
      }
      // ------------------------------------------------ über die fahrende Kolonne (Spur, Lücken springen)
      if (Lg.konvoi) {
        const lane = o.lanes?.[Lg.konvoi] ?? Lg.konvoi;
        let jumpHold = 0, prevJump = false, commit = false, longGap = false, i = 0, ok = false;
        for (; i < (Lg.max ?? 120 * 170); i++) {
          if (p.dead || L.runtime.status !== 'play') break;
          const cp = K.cOf(p.pos.z), cw = K.cw();
          if (p.mode === 'ground' && cp >= Lg.to && (!Lg.done || w.state === 'done')) { ok = true; break; }
          const lx = laneAt(lane, cp + 0.8);
          let ix = clamp((lx - p.pos.x) * 1.6, -1, 1), iy = 0, run = false;
          const ahead = cw + (Lg.lead ?? 1.6);
          let jump = false;
          if (p.mode === 'ground') {
            commit = false;
            let edge = Infinity;
            for (let d = 0.5; d < 3.4; d += 0.25) if (!groundAhead(p, d)) { edge = d; break; }
            let far = Infinity;
            if (edge < Infinity) { const pz = p.pos.z; p.pos.z -= edge - 0.25; far = farSide(p, laneAt(lane, cp + edge + 2.5)) + edge - 0.25; p.pos.z = pz; }
            const ready = far < 7.5 && cp + far + 1.4 < cw + 7.2;
            longGap = edge < Infinity && far - edge > 3.4;
            run = longGap && ready;
            if (edge <= 0.75) {
              if (ready && p.gs > 4.2) { jump = true; iy = 1; commit = true; mech.jumps++; }
              else iy = -0.6;
            } else if (wallAhead(p, 0.55) && cp < ahead + 4) { jump = true; iy = 1; commit = true; mech.climbs++; }
            else if (edge < 1.4) iy = ready ? 1 : 0;
            else if (edge < 3.4) iy = ready ? 1 : (cp < ahead ? 0.5 : 0);
            else if (cp < ahead) iy = 1;
            if (cp >= Lg.to && edge > 0.75) iy = 0;
          } else if (commit) { iy = 1; run = longGap; }
          if (jump && !prevJump) jumpHold = 40;
          const jumpNow = jumpHold > 0;
          if (jumpHold > 0) jumpHold--;
          prevJump = jumpNow;
          const mag = Math.min(1, Math.hypot(ix, iy));
          tick({ ...(mag > 0.02 ? W.stick(ix, -iy, mag) : { x: 0, y: 0 }), run, jump: jumpNow });
        }
        mech.tankCount = mech.tanks.length;
        log.push([...here(Lg.name ?? 'Kolonne'), i, ok, JSON.stringify(mech.tanks)]);
        if (!ok) log.push(['FEHLER: Kolonne nicht geschafft', JSON.stringify(hist.slice(-20))]);
        continue;
      }
    }
    c.setInput({});
    mech.hurts = p.hurtTries ?? 0;
    return { log, steps, time: steps / 120, pos: [p.pos.x, p.pos.y, p.pos.z], dead: p.dead, status: L.runtime.status, rt: L.runtime.info(), mech };
  };
  return Object.keys(K);
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
  // TRACE='<Bedingung über p, s>' protokolliert jeden Schritt, für den sie gilt (Fehlersuche)
  if (process.env.TRACE) await sc((src) => { window.__trace = new Function('p', 's', `return (${src});`); }, process.env.TRACE);
  return true;
}

const W = (name, ...args) => sc(([n, a]) => window.__w6[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}w6d_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__w6.detail());
    for (const [n, c, t] of d) console.log(`        ${n.slice(0, 40).padEnd(40)} ${String(c).padStart(4)} ${String(Math.round(t / 1000)).padStart(5)}k`);
  }
  return s;
}

// ------------------------------------------------------------------ 6-Panzer: Ablauf (Route, Messgang, Ziele, Extras, Bilder)
const laneX = (lane, cc) => {
  if (cc <= lane[0][0]) return lane[0][1];
  for (let i = 1; i < lane.length; i++) if (cc <= lane[i][0]) { const [c0, x0] = lane[i - 1], [c1, x1] = lane[i]; return x0 + (x1 - x0) * ((cc - c0) / (c1 - c0)); }
  return lane[lane.length - 1][1];
};
const K = (name, ...args) => sc(([n, a]) => window.__k[n](...a), [name, args]);
async function loadKonvoi(id) {
  if (!(await load(id))) return false;
  await sc(installKonvoi);
  return true;
}
async function konvoiLevel(id, R) {
  const lanes = { lane: R.lane };
  // ------------------------------------------------ Routen-Bot je Heldin: ganze Fahrt, Luke, Boss, Warp-Box, Zielmast
  const sweep = [];
  for (const hero of ONLY || !PARTS.has('route') ? [] : HEROES) {
    await loadKonvoi(id);
    await K('put', 3, -1.4, { hero, settle: 2 });
    // bis zur Warp-Box (dann ein Bild der Regenbogeninsel), danach zum Zielmast
    const res = await K('run', R.main.slice(0, -1), { lanes });
    if (hero === HEROES[0] && PARTS.has('shots') && res.status === 'play') await shot(`${id}_insel`);
    const res2 = await K('run', R.main.slice(-1), { lanes });
    res.log.push(...res2.log); res.status = res2.status; res.time += res2.time; res.mech.hurts = res2.mech.hurts;
    const reached = res.status === 'goal' || res.status === 'done';
    console.log(`  ${hero}: ${res.time.toFixed(1)} s Spielzeit, Status ${res.status}, Treffer ${res.mech.hurts} ${JSON.stringify(res.mech.hurtBy)}, Sprünge ${res.mech.jumps}, Kletter ${res.mech.climbs}, Panzer ${res.mech.tanks.join(',')}, Boss ${JSON.stringify(res.mech.boss)}`);
    if (!reached || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
    check(`${id}: Routen-Bot ${hero} erreicht den Zielmast`, reached);
    check(`${id}: ${hero} Zeit bis zum Ziel < 300 s (${res.time.toFixed(1)} s)`, reached && res.time < 300);
    for (const m of R.routeChecks ?? []) check(`${id}: ${hero} – ${m.name}`, m.ok(res));
  }

  // ------------------------------------------------ Messgang: Kolonne fahren, alle ~12 m Kennzahlen aus der Spielkamera
  if (!ONLY && PARTS.has('sweep')) {
    await loadKonvoi(id);
    let worst = { calls: 0, tris: 0, at: null, atT: null };
    for (let cc = 8; cc <= 200; cc += 12) {
      const cwNow = await K('cw');
      const target = cc > 192 ? 'done' : cc;
      if (target === 'done' || cwNow < cc) await K('ride', target);
      const pc = Math.min(cc - 1.5, 192);
      await K('put', pc, laneX(R.lane, pc), { settle: 2, invuln: 99 });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      sweep.push([pc, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pc; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pc; }
      if (target === 'done') break;
    }
    if (process.env.VERBOSE) for (const [pc, cl, tr] of sweep) console.log(`      c ${String(pc).padEnd(8)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${sweep.length} Punkte der Kolonne – Zeichenaufrufe < 120 (max ${worst.calls} bei c ${worst.at})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei c ${worst.atT})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne, Stempel und Gegenproben
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await loadKonvoi(id);
      if (t.ride !== null && t.ride !== undefined) await K('ride', t.ride);
      if (t.put) await K('put', t.put[0], t.put[1], { hero, settle: 4 });
      const res = await K('run', t.plan, { invuln: t.invuln, lanes });
      let ok;
      if (t.expect) ok = await K('cond', t.expect);
      else ok = t.star !== undefined ? res.rt.stars[t.star] : res.rt.stamp;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (t.mech && !t.mech(res)) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Treffer ${res.mech.hurts})`, !!ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Extras
  for (const t of !PARTS.has('extra') ? [] : pick(R.extra ?? [])) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await loadKonvoi(id);
      if (t.ride) await K('ride', t.ride);
      const lives0 = await W('lives');
      const coins0 = (await W('rt')).coins;
      if (t.put) await K('put', t.put[0], t.put[1], { hero, settle: 4 });
      const res = await K('run', t.plan, { invuln: t.invuln, lanes });
      const lives1 = await W('lives');
      let ok = true;
      if (t.expectLives !== undefined) ok = ok && lives1 - lives0 >= t.expectLives;
      if (t.expectAlive === true) ok = ok && !res.dead;
      if (t.mech && !t.mech(res)) ok = false;
      if (res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
    }
  }

  // ------------------------------------------------ Bilder aus der Spielkamera (eine Fahrt, der Reihe nach)
  if (ONLY || !PARTS.has('shots')) return;
  loaded = null;
  await loadKonvoi(id);
  for (const [name, cwin, put, steps = 0, prep = null] of R.shots) {
    if (SHOTS && !SHOTS.has(name)) { if (cwin !== null && typeof cwin === 'number') await K('ride', cwin); continue; }
    if (cwin === 'arena' || cwin === 'insel') {
      await sc(([what, n]) => {
        const c = window.__course, L = c.level, k = window.__k, PL = L.data.plan, p = c.player;
        if (L.scroll.state !== 'done') k.ride('done');
        p.mode = 'ground'; p.script = null; p.invuln = 99;
        if (what === 'arena') {
          p.reset([2.5, PL.az ? 6.05 : 6, PL.az + 6.5], Math.PI / 2);
          for (let i = 0; i < n; i++) { c.setInput({ y: i < 40 ? 0.6 : 0 }); c.step(1); }
        } else {
          p.reset([PL.gx, 5.05, PL.gz + 9], Math.PI / 2);
          c.step(n);
        }
        c.setInput(null);
        L.controlYaw = c.view.rig.controlYaw(p.pos);
      }, [cwin, steps]);
    } else {
      if (cwin !== null) await K('ride', cwin);
      if (put) await K('put', put[0], put[1], { settle: 4, invuln: 99 });
      if (prep === 'tuerme') await sc(() => { const L = window.__course.level; for (const id of ['turm_a', 'turm_b', 'turm_c']) L.named.get(id).grow('bomb'); });
      if (prep === 'stampf') await sc(() => { window.__course.level.named.get('turm9').grow('pound'); });
      if (steps) await sc((n) => { const c = window.__course; c.player.invuln = 99; c.step(n); c.player.invuln = 0; }, steps);
    }
    await shot(`${id}_${name}`);
  }
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
    for (const [kind, n] of Object.entries(R.enemies ?? {})) if (n) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
  }
  if (R.konvoi) { await konvoiLevel(id, R); continue; }

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
      await W('place', pt.slice(0, 3), { settle: 6, scroll: pt[3] });
      const f0 = await sc(() => { window.__course.snapCamera(); return window.__course.view.frame; });
      await page.waitForFunction((f) => window.__course.view.frame >= f + 6, f0, { timeout: 90000 });
      const st = await sc(() => window.__course.stats());
      per.push([pt, st.calls, st.triangles]);
      if (st.calls > worst.calls) { worst.calls = st.calls; worst.at = pt; }
      if (st.triangles > worst.tris) { worst.tris = st.triangles; worst.atT = pt; }
    }
    if (process.env.VERBOSE) for (const [pt, cl, tr] of per) console.log(`      ${pt.join(', ').padEnd(30)} ${cl} Aufrufe ${Math.round(tr / 1000)} k`);
    check(`${id}: Messgang über ${per.length} Punkte der Route – Zeichenaufrufe < 120 (max ${worst.calls} bei ${worst.at?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.calls < 120);
    check(`${id}: Messgang – Dreiecke < 300 k (max ${Math.round(worst.tris / 1000)} k bei ${worst.atT?.slice(0, 3).map((v) => v.toFixed(0)).join(', ')})`, worst.tris < 300000);
  }

  // ------------------------------------------------ Sterne und Stempel
  for (const t of !PARTS.has('targets') ? [] : pick(R.targets)) {
    for (const hero of (t.heroes ?? HEROES).filter((h) => HEROES.includes(h))) {
      await load(id);
      await W('place', t.from, { hero, settle: 10, scroll: t.scroll });
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
      await W('place', t.from, { hero, settle: 10, scroll: t.scroll, ...(t.place ?? {}) });
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
  for (const [name, pos, scroll, steps = 0, input = null] of R.shots) {
    if (SHOTS && !SHOTS.has(name)) continue;
    await W('place', pos, { settle: 10, scroll });
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
