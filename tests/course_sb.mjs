// Bonuswelt Stern, Level S-3 „Walzenritt im Holzsternenhimmel“ (Schienenwalzen mit Hürden, Walzentrio mit Wurfsichel,
// Walzenraum per Rätselbox, Hackvögel, Kurbelwalze, Walzenaufstieg, große Walze mit Seitenweg, Figurenschalter, Zeit-Uhren,
// Doppel-Lift), S-4 „Flügelmast-Jagd über dem Wolkenmeer“ (fliegender Zielmast, Boost-Pfeile, Glotzfische, Donut-Felder und
// Donut-Treppe, 100 s ohne Zeitboni, Weitsprung-Fang am Start) und S-5 „Riesenblock-Wiese“ (Retro-Blockland: Grasinseln,
// Laufbomben, Gleitblätter, wachsende Riesen-?-Türme, versteckter Riesentrank, Warp-Box, Felsblock, Schlüsselmünzen):
// Laden ohne Konsolenfehler/-warnungen, Daten (Thema, Musik, Zeit, Sterne, Stempel, Gegnerzahlen), Routen-Bot (Lotti und Greta
// von Start bis Zielmast, deterministisch über __course.setInput/step, echte Eingaben – kein Teleport auf der Route), alle
// Sterne, der Stempel und die Geheimnisse mit der echten Mechanik samt Gegenproben, Extraleben, Kennzahlen je Abschnitt
// (Zeichenaufrufe < 120 inkl. Schattenpass, Dreiecke < 300 k) und Bilder aus der Spielkamera (tests/out/sb_*.png).
// Aufruf (nach npm run build): PORT_BASE=0 node tests/course_sb.mjs [S-3|S-4|S-5]
//   PARTS=load,route,sweep,targets,extra,shots (Standard alle; je Lauf ≤ 10 min) · HEROES=lotti,greta · ONLY=<Text>
//   (nur Ziele/Extras mit diesem Namensteil) · VERBOSE=1 (Protokoll der Beine) · SHOTS=<Name|Name> (nur diese Bilder) ·
//   DETAIL=1 (Zeichenaufrufe je Objekt bei den Bildern) · TRACE=1 (Spur der Figur)
//
// Der Bot lenkt je Schritt zum nächsten Wegpunkt (Stick relativ zur Kamera-Gier wie im Spiel). Die Figur ist auf der Route
// unverwundbar (Abpraller zählen weiter), damit Geometrie und Mechanik geprüft werden; Trefferversuche werden gezählt.
// Gegenproben laufen verwundbar.
import { startServer, launchBrowser, makeChecker, OUT } from './helpers.mjs';

// ------------------------------------------------------------------ Routen
// Beine (legs): { to: [x, z], jump: Schritte (Sprungtaste gehalten), jumpAt, within, run, slow, max, land, autoJump, stopIf } ·
// { wait } · { hop } · { crouch } · { star: i } · { stamp: true } · { chaseKind, ids } · { expect } · { until } (Name aus COND
// oder Ausdruck '=…') · { warp: [x, z] } · { stompAll: Id-Anfang } · { pound: [x, z] } · { climb: [x, z], top } · { grab: [x, z] }
// (Power-up aus ?-Block) · { long: [x, z], runup } · { throwAt: [x, z] } · { upOnto: [x, z, top] } · { die } ·
// { walze: Id, board: [x, z], lane: x | [[z, x] …], off: [x, z] | null, early, hold, stopAt: 'ende' | 'z<…', noJump } (Schienenwalze besteigen, mitlaufen,
// über Hürden springen, am Ende abspringen) · { press: Id } (Druckknopf: draufspringen) · { hero: 'greta' } (Pause → Figur) ·
// { lift: Id, board: [x, z], exit: [x, z] } (Mehrfigur-Lift: alle Figuren drauf, oben aussteigen)
const Y8 = 8;
const RX3 = 90;
const ROUTES = {
  'S-3': {
    start: [0, 0, 5],
    meta: { stars: 3, time: 400, theme: 'woodspace', music: 'course_rollingride', archetype: 'parcours', world: 9 },
    enemies: { hackvogel: 4 },
    main: [
      { name: 'Startdeck', to: [0, -10.6], within: 0.4, run: false },
      { name: 'erste Schienenwalze (76 m, Hürden)', walze: 'walze1', board: [0, -10.8], lane: [[-14, 0], [-28, 1.4], [-40, 1.4], [-43, -1.6], [-54, -1.6], [-58, 0], [-90, 0]], off: [0, -94.5] },
      { expect: '=at(-6, 6, -0.5, -92, -100)' },
      { name: 'Trio-Walze 1', to: [0, -99.4], within: 0.4, run: false },
      { walze: 'trio1', board: [0, -99.4], lane: 0, off: [0, -119.9] },
      { name: 'Trio-Walze 2', to: [0, -121.4], within: 0.4, run: false },
      { walze: 'trio2', board: [0, -121.4], lane: 0, off: [0, -141.9] },
      { name: 'Trio-Walze 3', to: [0, -143.4], within: 0.4, run: false },
      { walze: 'trio3', board: [0, -143.4], lane: 0, off: [0, -165] },
      { expect: '=at(-6, 6, -0.5, -162, -172)' },
      { name: 'zweite Walze (Hackvögel)', to: [0, -171.6], within: 0.4, run: false },
      { walze: 'walze2', board: [0, -171.6], lane: 0, off: [2.4, -236.4] },
      { expect: '=at(-7, 7, -0.5, -234, -256)' },
      { name: 'Kontrollpunkt', to: [1, -246], within: 0.6 },
      { name: 'Walzenaufstieg 1', to: [0, -255.6], within: 0.4, run: false },
      { walze: 'auf1', board: [0, -255.6], lane: 0, off: [0, -269.2] },
      { to: [0, -270.2], within: 0.3, run: false },
      { name: 'Walzenaufstieg 2', walze: 'auf2', board: [0, -270.2], lane: 0, off: [0, -283.8] },
      { to: [0, -284.8], within: 0.3, run: false },
      { name: 'Walzenaufstieg 3', walze: 'auf3', board: [0, -284.8], lane: 0, off: [0, -299.6] },
      { expect: '=at(-6, 6, 7.5, -297, -302.6)' },
      { name: 'große Schienenwalze (Hürden)', to: [0, -302.2], within: 0.4, run: false },
      { walze: 'gross', board: [0, -302.2], lane: [[-305, 0], [-328, 2.4], [-342, 2.4], [-366, -2.6], [-398, -2.6]], off: [-2, -404.6] },
      { expect: '=at(-12, 12, 7.5, -401, -424)' },
      { name: 'Zielmast', to: [-7.6, -416], within: 0.2 },
    ],
    routeChecks: [
      { name: 'neun Schienenwalzen geritten, Hürden übersprungen', ok: (r) => r.mech.walzen >= 9 && r.mech.huerden >= 2 },
    ],
    targets: [
      { name: 'Stern 0: Rätselbox nach der dritten Walze, im Walzenraum zweimal den Knopf drücken, die Regale werden zur Treppe', star: 0, from: [0, 0, -165],
        legs: [{ warp: [3.4, -168] }, { until: '=P().pos.x > 60', max: 600 }, { to: [RX3, -146.4], within: 0.3, run: false },
          { press: 'raumknopf' }, { until: '=!ent(\'raum\').turning && ent(\'raum\').turn === 1', max: 600 }, { wait: 260 },
          { press: 'raumknopf' }, { until: '=!ent(\'raum\').turning && ent(\'raum\').turn === 2', max: 600 },
          { to: [RX3 - 1.8, -153.4], within: 0.3, run: false }, { wait: 20 },
          { to: [RX3 - 3.6, -153.4], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [RX3 - 1.4, -153.4], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [RX3, -153.4], jump: 30, jumpAt: 9, within: 0.4, run: false, land: false }, { wait: 60 }], shot: 'stern0' },
      { name: 'Stern 0 nicht ohne Drehen (vom Boden zu hoch)', star: 0, expectNot: true, from: [RX3, 0.52, -151], heroes: ['lotti', 'greta'],
        legs: [{ to: [RX3, -153.4], within: 0.3, run: false }, { hop: 40 }, { hop: 40 }] },
      { name: 'Stern 1: Kurbelwalze am Kontrollpunkt bis zum Prellbock rollen, Sternbühne unter dem Ende der großen Walze', star: 1, from: [-6.4, 0, -240.6],
        legs: [{ walze: 'kurbel', board: [-6.6, -240.6], lane: -9.8, off: [-9.8, -251.6], stopAt: 'ende' },
          { expect: '=ent(\'sternbuehne\') && L.entities.some((e) => e.kind === \'star\' && e.index === 1 && !e.hidden)' },
          { to: [-6.4, -251.6], jump: 20, jumpAt: 9, within: 0.5, run: false }, { to: [0, -255.6], within: 0.4, run: false },
          { walze: 'auf1', board: [0, -255.6], lane: 0, off: [0, -269.2] }, { to: [0, -270.2], within: 0.3, run: false },
          { walze: 'auf2', board: [0, -270.2], lane: 0, off: [0, -283.8] }, { to: [0, -284.8], within: 0.3, run: false },
          { walze: 'auf3', board: [0, -284.8], lane: 0, off: [0, -299.6] }, { to: [0, -302.2], within: 0.4, run: false },
          { walze: 'gross', board: [0, -302.2], lane: [[-305, 0], [-328, 2.4], [-342, 2.4], [-366, -3.4], [-398, -3.4]], stopAt: 'z<-393.6', off: [-7.6, -395.4], hold: 6 },
          { star: 1 }, { to: [-10.6, -397.6], jump: 30, jumpAt: 9, within: 0.4, run: false }, { to: [-10.6, -399.8], jump: 30, jumpAt: 9, within: 0.4, run: false },
          { to: [-9, -403], jump: 30, jumpAt: 9, within: 0.5, run: false }, { expect: '=at(-12, 12, 7.5, -401, -424)' }], shot: 'stern1' },
      { name: 'Stern 1 nicht ohne Kurbelwalze (keine Bühne, Absturz)', star: 1, expectNot: true, from: [-8, Y8, -403.2], heroes: ['lotti'], invuln: false,
        legs: [{ to: [-8, -398], within: 0.5, max: 200 }, { wait: 200 }] },
      { name: 'Stern 2: Spiegelfrucht aus dem ?-Block, beide Figuren auf den Doppel-Lift, oben auf der Endwand', star: 2, from: [0, Y8, -405],
        legs: [{ grab: [-2, -409], back: [-2, -406.4] }, { expect: '=L.players.length >= 2' }, { lift: 'doppellift', board: [7, -416.9], gather: [1, -0.3], exit: [6, -421.4] },
          { star: 2 }], shot: 'stern2' },
      { name: 'Stern 2 mit dem Krallen-Anzug die Endwand hinauf', star: 2, from: [0, Y8, -406], place: { power: 'krallen' },
        legs: [{ to: [1, -417.6], within: 0.3, run: false }, { climb: [1, -420], top: Y8 + 10, then: [1.6, -421.2] }, { star: 2 }] },
      { name: 'Doppel-Lift fährt nicht mit einer Figur', star: 2, expectNot: true, from: [0, Y8, -412], heroes: ['lotti'],
        legs: [{ to: [7, -415.2], within: 0.3, run: false }, { to: [7, -416.9], jump: 16, jumpAt: 9, within: 0.3, run: false }, { wait: 360 }], mech: (r) => r.pos[1] < Y8 + 1, mechText: (r) => `y ${r.pos[1].toFixed(1)}` },
      { name: 'Stempel: Seitenweg der großen Walze, mit Greta auf den Figurenschalter, Blocktreppe zum Stempel', stamp: true, from: [9.6, Y8, -321], heroes: ['greta'],
        legs: [{ to: [10.4, -323.2], within: 0.3, run: false }, { to: [10.8, -330], jump: 24, jumpAt: 9, within: 0.5 }, { to: [10.8, -332.6], within: 0.3, run: false },
          { to: [11, -339.6], jump: 24, jumpAt: 9, within: 0.5 }, { to: [11, -343.6], within: 0.3, run: false }, { to: [11, -350], jump: 24, jumpAt: 9, within: 0.5 },
          { to: [10.6, -352.4], within: 0.2, run: false }, { wait: 90 },
          { to: [13.4, -349.6], jump: 30, jumpAt: 9, within: 0.35, run: false }, { to: [13.4, -352.4], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [11.4, -355.2], jump: 30, jumpAt: 9, within: 0.4, run: false, land: false }, { wait: 60 }], shot: 'stempel' },
      { name: 'Stempel: Lotti wechselt am Figurenschalter zu Greta (Pause → Figur)', stamp: true, from: [10.6, Y8, -350.2], heroes: ['lotti'],
        legs: [{ to: [10.6, -352.4], within: 0.2, run: false }, { wait: 60 }, { expect: '=!ent(\'stempeltreppe\')?.shown' }, { hero: 'greta' },
          { to: [10.6, -350.4], within: 0.3, run: false }, { to: [10.6, -352.4], within: 0.2, run: false }, { wait: 90 },
          { to: [13.4, -349.6], jump: 30, jumpAt: 9, within: 0.35, run: false }, { to: [13.4, -352.4], jump: 30, jumpAt: 9, within: 0.35, run: false },
          { to: [11.4, -355.2], jump: 30, jumpAt: 9, within: 0.4, run: false, land: false }, { wait: 60 }] },
      { name: 'Stempel nicht mit Lotti (Schalter nur für Greta)', stamp: true, expectNot: true, from: [10.6, Y8, -350.2], heroes: ['lotti'],
        legs: [{ to: [10.6, -352.4], within: 0.2, run: false }, { wait: 120 }, { to: [13.4, -349.6], jump: 30, jumpAt: 9, within: 0.35, run: false, max: 200 }, { wait: 60 }],
        mech: (r) => r.pos[1] < Y8 + 1, mechText: (r) => `keine Treppe, y ${r.pos[1].toFixed(1)}` },
    ],
    extra: [
      { name: 'Steg: versteckte Bitcoins erscheinen beim Betreten und lassen sich einsammeln', from: [3, 0, -4], heroes: ['lotti'], expectCoins: 9,
        legs: [{ to: [7, -4], within: 0.3, run: false }, { wait: 90 }, { to: [16.6, -4], within: 0.4, run: false }, { to: [19.4, -2.8], within: 0.4, run: false },
          { to: [20.4, -4], within: 0.4, run: false }, { to: [19.4, -5.2], within: 0.4, run: false }, { to: [18.4, -4], within: 0.4, run: false }],
        mech: (r) => r.mech.revealed >= 11, mechText: (r) => `aufgetaucht ${r.mech.revealed}` },
      { name: 'Extraleben: unsichtbarer Block am Steg-Ende', from: [19.4, 0, -2.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [19.4, -4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block im Vorraum des Walzenraums', from: [RX3 + 4.4, 0.5, -138.6], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [RX3 + 4.4, -140.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Extraleben: unsichtbarer Block oben auf der Endwand', from: [6, Y8 + 10, -420], heroes: ['lotti'], expectLives: 1,
        legs: [{ to: [6, -421.4], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
      { name: 'Wurfsichel aus dem ?-Block, Bitcoins neben der zweiten Trio-Walze angeln', from: [0, 0, -95], heroes: ['lotti'], expectCoins: 3,
        legs: [{ grab: [0, -96], back: [0, -93.6] }, { expect: 'sichel' }, { to: [0, -99.4], within: 0.4, run: false }, { walze: 'trio1', board: [0, -99.4], lane: 0, off: [0, -119.9] },
          { to: [0, -121.4], within: 0.4, run: false }, { walze: 'trio2', board: [0, -121.4], lane: 0, off: [0, -141.9], act: { at: -128.8, dir: [1, -0.03] } }],
        mech: (r) => r.mech.side === 0, mechText: (r) => `neben der Walze übrig ${r.mech.side}` },
      { name: 'Schienenwalze: wer stehen bleibt, rutscht nach hinten herunter', from: [0, 0, -10.8], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ walze: 'walze1', board: [0, -10.8], lane: 0, off: null, idle: true, max: 900 }, { wait: 200 }],
        mech: (r) => r.dead, mechText: (r) => (r.dead ? 'abgestürzt' : `z ${r.pos[2].toFixed(1)}`) },
      { name: 'Hürde: wer nicht springt, wird von der Walze geschoben', from: [0, 0, -10.8], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
        legs: [{ walze: 'walze1', board: [0, -10.8], lane: 0, off: null, noJump: true, max: 3600 }, { wait: 200 }],
        mech: (r) => r.dead, mechText: (r) => (r.dead ? 'von der Hürde abgestreift' : `z ${r.pos[2].toFixed(1)}`) },
      { name: 'Hackvogel hackt in die Randspur der zweiten Walze', from: [0, 0, -171.6], heroes: ['lotti'], invuln: false, allowFail: true, expectAlive: false,
        legs: [{ walze: 'walze2', board: [0, -171.6], lane: -2.1, off: null, stopAt: 'z<-221', max: 3000 }],
        mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}, Hiebe ${r.mech.pecks}` },
      { name: 'Zeit-Uhren am Seitenweg: +10 Sekunden', from: [9.6, Y8, -321], heroes: ['lotti'],
        legs: [{ to: [10.4, -323.2], within: 0.3, run: false }, { to: [10.8, -330], jump: 24, jumpAt: 9, within: 0.5 }],
        mech: (r) => r.mech.clocks >= 1 && r.rt.time > 400, mechText: (r) => `Uhren ${r.mech.clocks}` },
    ],
    shots: [
      ['start', [0, 0, 5]],
      ['steg', [12, 0, -4], 0, null, Math.PI / 2],
      ['walze1', [0, 0, -11], 0],
      ['huerden', [0, 0, -24]],
      ['trio', [0, 0, -97]],
      ['rätselbox', [0, 0, -164]],
      ['walze2', [0, 0, -172]],
      ['hackvogel', [0, 0, -196]],
      ['cp', [0, 0, -240]],
      ['kurbel', [-6.4, 0, -243]],
      ['aufstieg', [0, 0, -254]],
      ['aufstieg2', [0, 2.6, -269]],
      ['gross', [0, Y8, -300]],
      ['seitenweg', [10.6, Y8, -340]],
      ['schalter', [11, Y8, -350]],
      ['ende', [0, Y8, -404]],
      ['wand', [4, Y8, -412]],
      ['raum', [RX3, 0.5, -141]],
      ['raum2', [RX3, 0.52, -149]],
    ],
  },
};

ROUTES['S-4'] = {
  start: [0, 0, 6],
  meta: { stars: 3, time: 100, theme: 'skyway', music: 'course_goalpole', archetype: 'verfolgung', world: 9, maxTime: 100 },
  enemies: { glotzfisch: 3, fliegender_zielmast: 1 },
  main: [
    { name: 'Startwolke: der Zielmast fliegt davon', to: [0, -12.8], within: 0.5 },
    { expect: '=ent(\'flugmast\').state !== \'wartet\'' },
    { name: 'Sprung auf die Boost-Wolke', to: [0, -21], jump: 24, jumpAt: 7.6, within: 0.6 },
    { name: 'Boost-Pfeil über die 13-m-Lücke', boostGap: -34, to: [0, -50] },
    { expect: '=at(-6, 6, -0.5, -47, -64)' },
    { name: 'Glotzfisch 1', fish: 'fisch1', at: [1.8, -51.6], to: [1.8, -60] },
    { to: [0, -62.2], within: 0.4 },
    { name: 'Sprung auf die Wolkenbahn', to: [0, -71], jump: 24, jumpAt: 7.2, within: 0.6 },
    { name: 'Wolkenbahn mit zwei Boost-Pfeilen, 12-m-Lücke', boostGap: -96, to: [0, -112] },
    { expect: '=at(-7, 7, -0.5, -108, -132)' },
    { name: 'Glotzfisch 2', fish: 'fisch2', at: [2.2, -119.4], to: [2.2, -129.6] },
    { to: [0, -130.6], within: 0.4 },
    { name: 'Sprung auf die schmale Wolke', to: [0, -139.4], jump: 24, jumpAt: 7.0, within: 0.6 },
    { name: 'Boost-Pfeil über die dritte Lücke', boostGap: -150, to: [0, -166] },
    { expect: '=at(-6, 6, -0.5, -163, -184)' },
    { name: 'Glotzfisch 3 (springt zur Figur)', fish: 'fisch3', at: [-1.8, -168.6], to: [-1.8, -182.2], need: 1.0 },
    { to: [0, -183.2], within: 0.4 },
    { name: 'Donut-Band', to: [0, -199.2], within: 0.6 },
    { to: [0, -203.6], jump: 16, jumpAt: 4.6, within: 0.6 },
    { name: 'Donut-Rautenfeld', to: [0, -226], within: 0.6 },
    { to: [0, -230], jump: 14, jumpAt: 4.2, within: 0.6 },
    { name: 'Donut-Band unten (neben der Treppe)', to: [3.2, -233.6], within: 0.4 },
    { to: [3.2, -260.2], within: 0.6 },
    { to: [2.4, -265], jump: 16, jumpAt: 4.6, within: 0.8 },
    { name: 'Zielmast fangen', mast: 'flugmast', area: [-7, 7, -263, -289] },
  ],
  routeChecks: [
    { name: 'drei Boost-Lücken mit Boost-Tempo, drei Glotzfische abgepasst, Mast gefangen', ok: (r) => (r.mech.boosts ?? 0) >= 3 && (r.mech.fish ?? 0) === 3 && r.status !== 'play' },
  ],
  targets: [
    { name: 'Stern 0: erste Donut-Blöcke im Bogen rechts der Boost-Lücke', star: 0, from: [0, 0, -22],
      legs: [{ to: [4.2, -26.2], within: 0.4, run: false }, { path: [[5.9, -26.6], [7.97, -28.85], [9.69, -31.34], [10.91, -34.13], [11.38, -37.14], [11.0, -40.15], [9.88, -42.97], [8.21, -45.54], [7.25, -46.7], [5.2, -48.4]] },
        { expect: '=at(-6, 6, -0.5, -47, -64)' }], shot: 'stern0' },
    { name: 'Stern 0 nicht vom Hauptweg (Boost-Lücke)', star: 0, expectNot: true, from: [0, 0, -22], heroes: ['lotti'],
      legs: [{ boostGap: -34, to: [0, -50] }] },
    { name: 'Stern 1: vor dem zweiten Glotzfisch ganz links über das Donut-Feld zur Sternwolke', star: 1, from: [0, 0, -110],
      legs: [{ to: [-6.4, -114.7], within: 0.4, run: false }, { path: [[-8, -114.7], [-11, -114.7], [-14, -114.7], [-16.8, -114.7]] }, { star: 1 },
        { wait: 400 }, { path: [[-14, -114.7], [-11, -114.7], [-8, -114.7], [-5.6, -114.7]] }, { expect: '=at(-7, 7, -0.5, -108, -132)' }], shot: 'stern1' },
    { name: 'Stern 2: Donut-Treppe hoch, oberer Weg', star: 2, from: [0, 0, -230],
      legs: [{ to: [0, -233.4], within: 0.3, run: false }, { to: [0, -235.6], jump: 20, jumpAt: 9, within: 0.4, run: false, land: true },
        { to: [0, -237.6], jump: 20, jumpAt: 9, within: 0.4, run: false }, { to: [0, -239.6], jump: 20, jumpAt: 9, within: 0.4, run: false },
        { to: [0, -241.6], jump: 20, jumpAt: 9, within: 0.4, run: false }, { to: [0, -243.6], jump: 20, jumpAt: 9, within: 0.4, run: false },
        { to: [0, -248.6], within: 0.4 }, { star: 2 }, { expect: '=at(-3, 3, 5.5, -246.6, -252)' }], shot: 'stern2' },
    { name: 'Stern 2 nicht vom unteren Band', star: 2, expectNot: true, from: [0, 0, -230], heroes: ['lotti'],
      legs: [{ to: [3.2, -233.6], within: 0.4 }, { to: [3.2, -258], within: 0.6 }] },
    { name: 'Stempel: hinter dem ersten Glotzfisch auf der Nebenwolke rechts', stamp: true, from: [0, 0, -50],
      legs: [{ fish: 'fisch1', at: [2.2, -51.6], to: [5.2, -58.6] }, { to: [8, -59], within: 0.4, run: false }], shot: 'stempel' },
    { name: 'Geheimnis: getimter Weitsprung – der Zielmast wird schon beim Abheben gefangen', stamp: false, star: undefined, secret: true, from: [0, 0, 6],
      legs: [{ longAt: [-4.0, 0, -12.5] }, { wait: 30 }], mech: (r) => r.status !== 'play' && r.rt.time > 95, mechText: (r) => `Status ${r.status}, Restzeit ${Math.round(r.rt.time)} s` },
    { name: 'Geheimnis-Gegenprobe: gemütlich hingehen und erst springen, wenn er abhebt, ist zu spät', secret: true, expectNot: true, from: [0, 0, 6], heroes: ['lotti'],
      legs: [{ to: [0, -2.6], within: 0.4, run: false, slow: 0.6 }, { to: [0, -10], jump: 40, jumpAt: 99, within: 0.5, run: false, max: 150 }, { wait: 60 }],
      mech: (r) => r.status === 'play', mechText: (r) => `Status ${r.status}` },
  ],
  extra: [
    { name: 'Glotzfisch 2 springt zur Figur und verletzt sie am Teich', from: [0, 0, -121], heroes: ['lotti'], invuln: false, allowFail: true,
      legs: [{ to: [0, -124], within: 0.2, run: false }, { wait: 700 }],
      mech: (r) => r.mech.hurts >= 1, mechText: (r) => `Treffer ${r.mech.hurts}` },
    { name: 'Der Zielmast wartet, wenn man zurückfällt (schwebt in Sichtweite)', from: [0, 0, 6], heroes: ['lotti'],
      legs: [{ to: [0, -4], within: 0.4 }, { wait: 900 }, { expect: '=ent(\'flugmast\').state === \'schwebt\' && ent(\'flugmast\').dist < 26 && ent(\'flugmast\').s > 4' }] },
    { name: 'Extraleben: unsichtbarer Block auf der Wolke des zweiten Glotzfischs', from: [-4.4, 0, -125.6], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [-4.4, -127.6], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    { name: 'Extraleben: unsichtbarer Block auf der Zielwolke', from: [5, 0, -278], heroes: ['lotti'], expectLives: 1,
      legs: [{ to: [5, -280], within: 0.2, run: false }, { hop: 30 }, { wait: 30 }, { chaseKind: 'powerup', max: 1200 }] },
    { name: '100 s ohne Zeitboni: danach ist die Zeit um', from: [0, 0, 6], heroes: ['lotti'], invuln: false, expectAlive: false, allowFail: true,
      legs: [{ wait: 101 * 120 }], mech: (r) => r.dead && r.cause === 'time', mechText: (r) => `Ursache ${r.cause}` },
  ],
  shots: [
    ['start', [0, 0, 6]],
    ['abflug', [0, 0, 6], 140, { y: 1, run: true }],
    ['boost', [0, 0, -22]],
    ['fisch1', [0, 0, -49]],
    ['bahn', [0, 0, -70]],
    ['links', [-8, 0, -110]],
    ['fisch2', [0, 0, -116]],
    ['fisch3', [0, 0, -166]],
    ['band', [0, 0, -183]],
    ['raute', [0, 0, -206]],
    ['treppe', [0, 0, -230]],
    ['oben', [0, 6, -249]],
    ['ziel', [0, 0, -266]],
  ],
};

const PORT = 4945;
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
  const COND = {
    krallen: () => P().power === 'krallen',
    sichel: () => P().power === 'sichel',
    gleitblatt: () => P().power === 'gleitblatt',
    riese: () => P().power === 'riese',
  };
  const cond = (k) => (typeof k === 'string' && k.startsWith('=') ? new Function('P', 'L', 'ent', 'at', `return (${k.slice(1)});`)(P, L, ent, at) : COND[k]());
  const hurdles = [];
  L.world.forEach?.((s) => { if (s.tag === 'huerde') hurdles.push({ x0: s.x0, x1: s.x1, z0: s.z0, z1: s.z1, y0: s.bot ?? s.y0, y1: s.top ?? s.y1 }); });
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
      const mech = { hurts: 0, warps: 0, rides: 0, walzen: 0, huerden: 0, stomped: [], hurtList: [], clocks0: ent('uhren')?.got ?? 0 };
      const track = [];
      let lastHurts = p.hurtTries ?? 0;
      const tick = (inp) => {
        const q = P();
        if (hold) for (const f of L.players ?? [q]) f.invuln = Math.max(f.invuln, 5);
        c.setInput(inp); c.step(1); steps++;
        if ((q.hurtTries ?? 0) > lastHurts) { lastHurts = q.hurtTries; mech.hurtList.push(`${q.lastHurt}@${q.pos.x.toFixed(0)},${q.pos.y.toFixed(0)},${q.pos.z.toFixed(0)}`); }
        if (q.mode === 'ground' && !q.dead) {
          const t = track[track.length - 1];
          if (!t || Math.hypot(q.pos.x - t[0], q.pos.z - t[2]) > 7 || Math.abs(q.pos.y - t[1]) > 2) track.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2)]);
        }
        if (steps % 6 === 0) { hist.push([+q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.ground?.tag ?? '']); if (hist.length > 30) hist.shift(); }
        if (window.__trace && steps % 10 === 0) log.push(['spur', +q.pos.x.toFixed(2), +q.pos.y.toFixed(2), +q.pos.z.toFixed(2), q.mode, q.state, q.power, q.ground?.tag ?? '', ...(L.players ?? []).slice(1).map((f) => `${f.pos.x.toFixed(1)},${f.pos.y.toFixed(1)},${f.pos.z.toFixed(1)},${f.mode},${f.ground?.tag ?? ''}`)]);
        if (q.dead && !deadLogged) { deadLogged = true; log.push(['TOD', q.deathCause, JSON.stringify(hist)]); }
        if (q.mode === 'script' && L.runtime.status === 'play' && !q.dead && !o.keepScript) {
          let n = 0;
          const kind = q.script?.kind ?? q.script?.type ?? '?';
          while (P().mode === 'script' && n++ < 2400 && !P().dead && L.runtime.status === 'play') { if (hold) P().invuln = Math.max(P().invuln, 5); c.setInput({}); c.step(1); steps++; }
          mech.rides++;
          log.push(['fahrt', kind, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
        }
      };
      const settle = () => { for (let k = 0; k < 300 && P().mode !== 'ground' && !P().dead; k++) tick({}); };
      const goTo = (x, z, r = 0.25, mag = 1) => { for (let n = 0; n < 500 && !P().dead; n++) { const q = P(); const dx = x - q.pos.x, dz = z - q.pos.z, d = Math.hypot(dx, dz); if (d < r && q.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(mag, Math.max(0.25, d / 1.2))), run: false }); } };
      for (let li = 0; li < legs.length; li++) {
        const Lg = legs[li];
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        if (Lg.wait && !Lg.to) { for (let i = 0; i < Lg.wait; i++) tick({}); continue; }
        if (Lg.place) { this.place(Lg.place, { hero: p.hero, settle: 10, power: p.power !== 'none' ? p.power : undefined }); log.push(['gesetzt', ...Lg.place]); continue; }
        if (Lg.hero) { c.setHero(Lg.hero); for (let i = 0; i < 20; i++) tick({}); log.push(['figur', Lg.hero, P().hero]); continue; }
        if (Lg.crouch) { for (let i = 0; i < Lg.crouch; i++) tick({ crouch: true }); for (let i = 0; i < 30; i++) tick({}); settle(); continue; }
        if (Lg.expect) { const ok = cond(Lg.expect); log.push(['erwartet', Lg.expect, ok]); if (!ok) log.push(['FEHLER: Bedingung', Lg.expect, +p.pos.x.toFixed(2), +p.pos.y.toFixed(2), +p.pos.z.toFixed(2)]); continue; }
        if (Lg.until) { let k = 0; for (; k < (Lg.max ?? 1200) && !cond(Lg.until); k++) tick({}); log.push(['bis', Lg.until, k]); if (!cond(Lg.until)) log.push(['FEHLER: bis', Lg.until]); continue; }
        if (Lg.hop) {
          for (let k = 0; k < 90 && (P().mode !== 'ground' || P().hSpeed() > 0.2); k++) tick({});
          for (let k = 0; k < Lg.hop; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          log.push(['hüpfer', +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        if (Lg.star !== undefined) { const n = this.chase('star', { filter: (e) => e.index === Lg.star, max: 900 }); log.push(['stern', Lg.star, n, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]); continue; }
        if (Lg.chaseKind) { const n = this.chase(Lg.chaseKind, { max: Lg.max ?? 2400, run: Lg.run, walk: Lg.walk, jump: Lg.jump, filter: Lg.ids ? (e) => Lg.ids.includes(e.spec?.id) : null }); log.push(['jagd', Lg.chaseKind, n]); continue; }
        // ------------------------------------------------ auf eine Warp-Box springen und mitfahren
        if (Lg.warp) {
          const [tx, tz] = Lg.warp;
          let k = 0, rode = false;
          const r0 = mech.rides;
          for (; k < 900 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            const jump = q.mode === 'ground' ? d < 2.0 : q.vel.y > 0;
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(dx, dz, Math.min(1, Math.max(0.35, d / 1.5)))), jump, run: false });
            if (mech.rides > r0) { rode = true; break; }
          }
          settle();
          for (let q = 0; q < 30; q++) tick({});
          if (rode) mech.warps++;
          log.push(['warp', `${Lg.warp}`, rode, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (!rode) { log.push(['FEHLER: Warp-Box nicht benutzt', Lg.warp]); break; }
          continue;
        }
        // ------------------------------------------------ Druckknopf: draufspringen (von oben landen)
        if (Lg.press) {
          const b = L.entities.find((e) => e.spec?.id === Lg.press) ?? ent(Lg.press);
          const n0 = b.presses ?? 0;
          let k = 0;
          for (; k < 600 && (b.presses ?? 0) === n0 && !P().dead; k++) {
            const q = P();
            const dx = b.pos.x - q.pos.x, dz = b.pos.z - q.pos.z, d = Math.hypot(dx, dz);
            if (q.mode === 'ground' && d > 1.4) { tick({ ...this.stick(dx, dz, Math.min(1, d / 1.5)), run: false }); continue; }
            tick({ ...(q.mode === 'air' ? this.airSteer(b.pos.x, b.pos.z, 0, 0, 4, 5) : this.stick(dx, dz, 0.4)), jump: q.mode === 'ground' || q.vel.y > 0, run: false });
          }
          for (let i = 0; i < 20; i++) tick({});
          log.push(['knopf', Lg.press, (b.presses ?? 0) > n0, k]);
          if ((b.presses ?? 0) === n0) log.push(['FEHLER: Knopf nicht gedrückt', Lg.press]);
          continue;
        }
        // ------------------------------------------------ Schienenwalze: besteigen, mitlaufen (Hürden überspringen), am Ende abspringen
        if (Lg.walze) {
          const w = ent(Lg.walze);
          const laneAt = (z) => {
            const t = Lg.lane;
            if (!Array.isArray(t)) return t ?? 0;
            for (let i = 0; i < t.length - 1; i++) { const a = t[i], b = t[i + 1]; if (z <= a[0] && z >= b[0]) return a[1] + (b[1] - a[1]) * ((a[0] - z) / (a[0] - b[0])); }
            return z > t[0][0] ? t[0][1] : t[t.length - 1][1];
          };
          const [bx, bz] = Lg.board;
          goTo(bx, bz, 0.3);
          // warten, bis die Walze am Anfang ruht
          let k = 0;
          for (; k < 2400 && !(w.state === 'ruhe' && w.s < 0.01); k++) tick({});
          // aufspringen (Scheitel der Walze)
          let on = false;
          for (let n = 0; n < 300 && !P().dead; n++, k++) {
            const q = P();
            const tx = laneAt(w.pos.z), tz = w.pos.z;
            if (q.mode === 'ground' && q.ground?.tag === 'schienenwalze') { on = true; break; }
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 3.4, 6) : this.stick(tx - q.pos.x, tz - q.pos.z, 1)), jump: n < 14, run: false });
          }
          // mitlaufen: Achs-Scheitel halten, Hürden in der Spur überspringen
          const L0 = w.length;
          let jumps = 0, acted = false;
          const done = () => (Lg.stopAt === 'ende' ? w.state === 'ende' : Lg.stopAt?.startsWith?.('z<') ? P().pos.z < +Lg.stopAt.slice(2) : (w.s >= L0 - (Lg.early ?? 0.9) || w.state === 'faellt' || w.state === 'ende'));
          for (let n = 0; n < (Lg.max ?? 6000) && !P().dead && !done(); n++, k++) {
            const q = P();
            if (Lg.idle) { tick({}); continue; }
            const tx = laneAt(q.pos.z), tz = w.pos.z + (Lg.lead ?? 0.15) * Math.sign(w.pos.tz || -1);
            if (q.mode === 'air') { tick(this.airSteer(tx, tz, 0, 0, 3.4, 6)); continue; }
            if (Lg.act && !acted && q.pos.z < Lg.act.at) {
              // zur Seite drehen (kleiner Stick), dann Aktion (Wurfsichel)
              const [ax, az] = Lg.act.dir;
              for (let j = 0; j < 40; j++) { const fv = P().facingVec(); if ((fv.x * ax + fv.z * az) / Math.hypot(ax, az) > 0.97) break; tick({ ...this.stick(ax, az, 0.12), run: false }); }
              tick({ action: true }); tick({});
              acted = true; mech.thrown = (mech.thrown ?? 0) + 1;
              continue;
            }
            const hd = Lg.noJump ? null : hurdles.find((h) => q.pos.z - h.z1 < 1.5 && q.pos.z - h.z1 > 0.15 && q.pos.x + 0.5 > h.x0 && q.pos.x - 0.5 < h.x1 && Math.abs(h.y0 - q.pos.y) < 1.2);
            if (hd) { jumps++; for (let j = 0; j < 14 && !P().dead; j++) tick({ ...this.stick(tx - P().pos.x, tz - P().pos.z, 0.4), jump: true }); continue; }
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            tick(d > 0.06 ? { ...this.stick(dx, dz, Math.min(1, Math.max(0.12, d * 1.4))), run: false } : {});
          }
          mech.huerden += jumps;
          // abspringen
          if (Lg.off) {
            const [ox, oz] = Lg.off;
            for (let n = 0; n < 300 && !P().dead; n++, k++) {
              const q = P();
              if (n > 8 && q.mode === 'ground') break;
              tick({ ...(q.mode === 'air' ? this.airSteer(ox, oz, 0, 0, 2.8, 8) : this.stick(ox - q.pos.x, oz - q.pos.z, 1)), jump: n < (Lg.hold ?? 26), run: true });
            }
            goTo(ox, oz, 0.5);
          }
          if (on) mech.walzen++;
          log.push(['walze', Lg.walze, on, w.state, +w.s.toFixed(1), jumps, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (!on) log.push(['FEHLER: Walze nicht bestiegen', Lg.walze]);
          continue;
        }
        // ------------------------------------------------ Mehrfigur-Lift: alle Figuren auf die Plattform, mitfahren, oben aussteigen
        if (Lg.lift) {
          const h = ent(Lg.lift);
          const [bx, bz] = Lg.board, [ex, ez] = Lg.exit;
          let k = 0;
          for (; k < 1200 && !P().dead; k++) {
            if (h.count >= h.need && h.state !== 'wait') break;
            // Bezug: eine Figur, die noch nicht auf dem Lift steht (alle bekommen dieselbe Eingabe; die Ecke hält die anderen fest)
            const figs = (L.players ?? [P()]).filter((f) => !f.dead && !f.hidden);
            const q = figs.find((f) => f.ground?.owner !== h) ?? P();
            const dx = bx - q.pos.x, dz = bz - q.pos.z, d = Math.hypot(dx, dz);
            if (q.ground?.owner === h && Lg.gather) { tick({ ...this.stick(Lg.gather[0], Lg.gather[1], 0.7), run: false }); continue; }
            const hopNow = q.mode === 'ground' && q.pos.y < h.shape.max[1] - 0.2 && d < 2.6;
            tick(hopNow ? { ...this.stick(dx, dz, 0.7), jump: true } : q.mode === 'air' ? { ...this.stick(dx, dz, 0.8), jump: q.vel.y > 0 } : { ...(d > 0.15 ? this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))) : {}), run: false });
          }
          for (let n = 0; n < 2400 && h.state !== 'top' && !P().dead; n++, k++) tick({});
          for (let n = 0; n < 400 && !P().dead; n++, k++) {
            const q = P(); const dx = ex - q.pos.x, dz = ez - q.pos.z, d = Math.hypot(dx, dz);
            if (d < 0.4 && q.mode === 'ground') break;
            tick({ ...this.stick(dx, dz, 1), run: false, jump: n < 16 });
          }
          log.push(['lift', Lg.lift, h.state, h.count, k, JSON.stringify(L.squad?.log?.slice(-4) ?? []), +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Power-up aus einem ?-Block holen: darunter hüpfen, zurücktreten, auf den Block springen
        if (Lg.grab) {
          const [bx, bz] = Lg.grab;
          const back = Lg.back ?? [bx, bz + 2.2];
          const pw0 = P().power, n0 = (L.players ?? []).length;
          goTo(bx, bz, 0.2);
          for (let k = 0; k < 90 && P().hSpeed() > 0.2; k++) tick({});
          for (let k = 0; k < 20; k++) tick({ jump: true });
          for (let k = 0; k < 240 && P().mode !== 'ground'; k++) tick({});
          for (let k = 0; k < 60; k++) tick({});
          const got = () => P().power !== pw0 || (L.players ?? []).length > n0;
          let tries = 0;
          for (; tries < 4 && !got() && !P().dead; tries++) {
            goTo(back[0], back[1], 0.2);
            for (let k = 0; k < 40; k++) tick({});
            for (let k = 0; k < 240 && !P().dead; k++) {
              const q = P(); const dx = bx - q.pos.x, dz = bz - q.pos.z;
              if (k > 10 && q.mode === 'ground') break;
              tick({ ...(q.mode === 'air' ? this.airSteer(bx, bz, 0, 0, 3, 4) : this.stick(dx, dz, 0.5)), jump: k < 40, run: false });
            }
            for (let k = 0; k < 30; k++) tick({});
            if (!got()) { const pu = L.entities.find((e) => e.kind === 'powerup' && e.alive && !e.removed); if (pu) this.chase('powerup', { max: 600 }); }
          }
          log.push(['power', Lg.grab.join(','), P().power, (L.players ?? []).length, tries, JSON.stringify(L.squad?.log?.slice(-4) ?? [])]);
          if (!got()) log.push(['FEHLER: Power-up nicht geholt', Lg.grab]);
          goTo(back[0], back[1], 0.4);
          continue;
        }
        // ------------------------------------------------ mit dem Krallen-Anzug an einer Wand hinauf
        if (Lg.climb) {
          const [tx, tz] = Lg.climb;
          let k = 0, top = false;
          for (; k < 900 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            if (q.pos.y > (Lg.top ?? 99) - 0.1 && q.mode === 'ground') { top = true; break; }
            if (q.mode === 'wall') { tick({ ...this.stick(dx, dz, 1), run: false }); continue; }
            tick({ ...this.stick(dx, dz, 1), run: false, jump: q.mode === 'ground' ? d < (Lg.jumpAt ?? 1.6) : q.vel.y > 0 });
          }
          if (Lg.then) goTo(Lg.then[0], Lg.then[1], 0.3);
          log.push(['klettern', `${Lg.climb}`, top, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (!top) log.push(['FEHLER: Wand nicht erklommen', Lg.climb]);
          continue;
        }
        // ------------------------------------------------ Sprung auf [x, z] mit Stampfattacke über dem Ziel
        if (Lg.pound) {
          const [tx, tz] = Lg.pound;
          let k = 0, pounded = false;
          for (; k < 400 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            if (q.mode === 'ground' && k > 4 && (pounded || q.state === 'groundpound')) break;
            if (q.mode === 'air' && !pounded && d < 0.25 && q.vel.y < 1.5) pounded = true;
            if (pounded) { tick({ crouch: true }); continue; }
            tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 4, 6) : this.stick(dx, dz, 1)), jump: k < (Lg.hold ?? 30), run: false });
          }
          for (let i = 0; i < 40; i++) tick({});
          log.push(['stampfen', `${Lg.pound}`, pounded, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Gegner (Id-Anfang) nacheinander von oben besiegen
        if (Lg.stompAll) {
          let guard = 0;
          for (; guard < 60; guard++) {
            const list = L.entities.filter((e) => e.enemy && e.alive && !e.removed && !e.defeated && String(e.spec?.id ?? '').startsWith(Lg.stompAll));
            if (!list.length) break;
            const q0 = P();
            list.sort((a, b) => Math.hypot(a.pos.x - q0.pos.x, a.pos.z - q0.pos.z) - Math.hypot(b.pos.x - q0.pos.x, b.pos.z - q0.pos.z));
            const e = list[0];
            for (let k = 0; k < 900 && e.alive && !e.defeated && !e.removed; k++) {
              const q = P();
              const dx = e.pos.x - q.pos.x, dz = e.pos.z - q.pos.z, d = Math.hypot(dx, dz);
              if (q.mode === 'ground' && d < 2.0) { tick({ ...this.stick(dx, dz, 0.5), jump: true, run: false }); continue; }
              if (q.mode === 'air') { const ev = e.vel ?? { x: 0, z: 0 }; tick({ ...this.airSteer(e.pos.x + ev.x * 0.2, e.pos.z + ev.z * 0.2, ev.x, ev.z, 3.6, 7), jump: q.vel.y > 0 }); continue; }
              tick({ ...this.stick(dx, dz, Math.min(1, d / 2)), run: false });
            }
            if (!e.alive || e.defeated || e.removed) mech.stomped.push(e.spec?.id);
          }
          for (let i = 0; i < 60; i++) tick({});
          log.push(['besiegt', mech.stomped.length, mech.stomped.join(' ')]);
          continue;
        }
        // ------------------------------------------------ Weitsprung: Anlauf, ducken, springen; in der Luft zum Ziel lenken
        if (Lg.long) {
          const [tx, tz] = Lg.long;
          let k = 0, longed = false;
          const ru = Lg.runup ?? 10;
          for (; k < 400 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z;
            if (k > ru + 20 && q.mode === 'ground') break;
            if (q.state === 'longjump') longed = true;
            if (q.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            const crouch = k >= ru && k < ru + 3, jump = k >= ru + 2 && k < ru + 6;
            tick({ ...this.stick(dx, dz, 1), run: true, crouch, jump });
          }
          log.push(['weitsprung', `${Lg.long}`, longed, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Wurfsichel auf einen Punkt werfen
        if (Lg.throwAt) {
          const [tx, tz] = Lg.throwAt;
          let k = 0;
          for (; k < 200 && !P().dead; k++) {
            const q = P();
            const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz);
            const fv = q.facingVec(), dot = (fv.x * dx + fv.z * dz) / (d || 1);
            if (dot > 0.995) break;
            tick({ ...this.stick(dx, dz, 0.12), run: false });
          }
          tick({ action: true }); tick({});
          for (let n = 0; n < (Lg.wait ?? 240); n++) tick({});
          log.push(['sichel', `${Lg.throwAt}`, k, P().power]);
          continue;
        }
        // ------------------------------------------------ senkrecht neben einem Block hochspringen, erst über seiner Oberkante hinüberlenken
        if (Lg.upOnto) {
          const [tx, tz, top] = Lg.upOnto;
          for (let q = 0; q < 120 && (P().mode !== 'ground' || P().hSpeed() > 0.08); q++) tick({});
          let k = 0, air = false;
          for (; k < 300 && !P().dead; k++) {
            const q = P();
            if (air && q.mode === 'ground') break;
            if (q.mode === 'air') air = true;
            tick({ ...(q.pos.y > top + 0.15 ? this.airSteer(tx, tz, 0, 0, 4, 5) : { x: 0, y: 0 }), jump: k < 40 });
          }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['hinauf', `${Lg.upOnto}`, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          if (P().pos.y < top - 0.2) log.push(['FEHLER: nicht oben', Lg.upOnto]);
          continue;
        }
        // ------------------------------------------------ Sturz: Neustart abwarten
        if (Lg.die) {
          P().die(Lg.die);
          let k = 0;
          for (; k < 2400 && (P().dead || L.runtime.status !== 'play'); k++) { c.setInput({}); c.step(1); steps++; }
          for (let q = 0; q < 30; q++) tick({});
          log.push(['neustart', k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Pfad: Punkte nacheinander im Lauf abfahren (ohne Anhalten), z. B. über Donut-Blöcke
        if (Lg.path) {
          let k = 0;
          for (const [px, pz] of Lg.path) {
            for (let n = 0; n < 400 && !P().dead; n++, k++) {
              const q = P(); const dx = px - q.pos.x, dz = pz - q.pos.z, d = Math.hypot(dx, dz);
              if (d < (Lg.within ?? 0.7)) break;
              tick({ ...(q.mode === 'air' ? this.airSteer(px, pz, 0, 0, 3, 9) : this.stick(dx, dz, 1)), run: Lg.run ?? true, jump: !!Lg.hopAll && q.mode === 'ground' });
            }
          }
          settle();
          log.push(['pfad', Lg.path.length, k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Weitsprung ab einer z-Marke im Anlauf (longAt: [z, Ziel-x, Ziel-z])
        if (Lg.longAt) {
          const [az, tx, tz] = Lg.longAt;
          let k = 0, t0 = -1, longed = false;
          for (; k < 600 && !P().dead && L.runtime.status === 'play'; k++) {
            const q = P();
            if (t0 < 0 && q.mode === 'ground' && q.pos.z <= az) t0 = k;
            if (q.state === 'longjump') longed = true;
            if (t0 >= 0 && k - t0 > 12 && q.mode === 'ground') break;
            const dt0 = t0 < 0 ? -1 : k - t0;
            if (q.mode === 'air') { tick({ ...this.airSteer(tx, tz, 0, 0, 2.5, 14) }); continue; }
            tick({ ...this.stick(tx - q.pos.x, tz - q.pos.z, 1), run: true, crouch: dt0 >= 0 && dt0 < 3, jump: dt0 >= 2 && dt0 < 6 });
          }
          log.push(['weitsprung', az, longed, L.runtime.status, +(L.runtime.pole ?? 0).toFixed(2), +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Boost-Lücke: über den Boost-Pfeil rennen, an der Kante (edge = z) abspringen
        if (Lg.boostGap !== undefined) {
          const [tx, tz] = Lg.to;
          let k = 0, jumped = false, boosted = 0;
          for (; k < 900 && !P().dead; k++) {
            const q = P();
            if (jumped && q.mode === 'ground') break;
            const sp = Math.hypot(q.vel.x, q.vel.z);
            boosted = Math.max(boosted, sp);
            if (!jumped && q.mode === 'ground' && q.pos.z < Lg.boostGap + (Lg.margin ?? 0.9)) jumped = true;
            if (jumped) { tick({ ...(q.mode === 'air' ? this.airSteer(tx, tz, 0, 0, 2.2, 18) : this.stick(tx - q.pos.x, tz - q.pos.z, 1)), jump: true, run: true }); continue; }
            tick({ ...this.stick((Lg.lane ?? tx) - q.pos.x + 0.0001, (Lg.boostGap - 3) - q.pos.z, 1), run: true });
          }
          for (let i = 0; i < 400 && !P().dead; i++) { const q = P(); const dx = tx - q.pos.x, dz = tz - q.pos.z, d = Math.hypot(dx, dz); if (d < (Lg.within ?? 0.6) && q.mode === 'ground') break; tick({ ...this.stick(dx, dz, Math.min(1, Math.max(0.3, d / 1.2))), run: false }); }
          mech.boosts = (mech.boosts ?? 0) + (boosted > 13 ? 1 : 0);
          log.push(['boost-lücke', Lg.boostGap, jumped, +boosted.toFixed(1), k, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ Glotzfisch: an at warten, bis er gerade eingetaucht ist (Zeitfenster), dann hinüber
        if (Lg.fish) {
          const f = L.entities.find((e) => e.spec?.id === Lg.fish);
          const [ax, az] = Lg.at, [bx, bz] = Lg.to;
          goTo(ax, az, 0.3);
          const left = () => (f.state === 'jump' || f.removed || f.defeated ? -1 : (f.every - f.flight) - f.timer);
          let k = 0;
          for (; k < 1200 && f.alive && !f.defeated && left() < (Lg.need ?? 0.75); k++) tick({});
          let j = 0;
          for (; j < 400 && !P().dead; j++) { const q = P(); const dx = bx - q.pos.x, dz = bz - q.pos.z, d = Math.hypot(dx, dz); if (d < (Lg.within ?? 0.5) && q.mode === 'ground') break; tick({ ...this.stick(dx, dz, 1), run: true }); }
          mech.fish = (mech.fish ?? 0) + 1;
          log.push(['glotzfisch', Lg.fish, k, j, f.jumps, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2)]);
          continue;
        }
        // ------------------------------------------------ fliegenden Zielmast fangen: hinlaufen, hineinspringen
        if (Lg.mast) {
          const m = ent(Lg.mast);
          let k = 0;
          for (; k < (Lg.max ?? 2400) && L.runtime.status === 'play' && !P().dead; k++) {
            const q = P();
            // zu hoch (fliegt noch): auf der Wolke warten, bis er tief genug kommt (bzw. gelandet ist)
            if (m.pos.y + 1 - q.pos.y > (Lg.reach ?? 3.4) && q.mode === 'ground') { tick({}); continue; }
            const [ax, az] = Lg.area ? [Math.max(Lg.area[0], Math.min(Lg.area[1], m.pos.x)), Math.max(Lg.area[3], Math.min(Lg.area[2], m.pos.z))] : [m.pos.x, m.pos.z];
            const dx = ax - q.pos.x, dz = az - q.pos.z, d = Math.hypot(dx, dz);
            tick({ ...(q.mode === 'air' ? this.airSteer(ax, az, 0, 0, 4, 8) : this.stick(dx, dz, 1)), run: d > 3, jump: q.mode === 'ground' ? d < (Lg.jumpAt ?? 2.2) : q.vel.y > 0 });
          }
          log.push(['zielmast', Lg.mast, L.runtime.status, +(L.runtime.pole ?? 0).toFixed(2), m.state, k]);
          continue;
        }
        // ------------------------------------------------ Wegpunkt (optional mit Sprung)
        const max = Lg.max ?? 900;
        const within = Lg.within ?? 0.6;
        const holdJ = Lg.jump === true ? 40 : (Lg.jump ?? 0);
        const tx = Lg.to[0] ?? p.pos.x, tz = Lg.to[1];
        let i = 0, airborne = false, landed = false;
        let best = Infinity, still = 0, auto = 0, j0 = Lg.jumpAt ? null : 0;
        if (holdJ) for (let w = 0; w < 240 && P().mode === 'air'; w++) tick({});
        for (; i < max; i++) {
          const q = P();
          if (q.dead || L.runtime.status !== 'play') break;
          const dx = tx - q.pos.x, dz = tz - q.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < best - 0.05) { best = dist; still = 0; } else if (q.mode === 'ground') still++;
          if (still > 45 && auto <= 0 && Lg.autoJump !== false) { auto = 26; still = 0; autoJumps++; }
          const doneL = dist < within && (!holdJ || Lg.land === false || (landed && (q.mode === 'ground' || q.mode === 'swim')));
          if (doneL && i > 0) break;
          let mag = Lg.slow ?? 1;
          let st;
          if (q.mode === 'air' && holdJ && j0 !== null) st = this.airSteer(tx, tz, 0, 0, 2.6, 11);
          else {
            if (dist < 1.2 && !holdJ) mag = Math.max(0.2, Math.min(mag, dist / 1.2));
            st = dist > 0.05 ? this.stick(dx, dz, mag) : { x: 0, y: 0 };
          }
          if (Lg.stopIf && cond(Lg.stopIf)) break;
          if (j0 === null && Lg.jumpAt && dist <= Lg.jumpAt) j0 = i;
          const jump = (holdJ && j0 !== null ? (i - j0 < holdJ) : false) || auto > 0;
          if (auto > 0) auto--;
          tick({ ...st, run: Lg.run ?? true, jump });
          if (P().mode === 'air') airborne = true;
          else if (airborne) landed = true;
        }
        log.push([Lg.name ?? `leg${li}`, i, +P().pos.x.toFixed(2), +P().pos.y.toFixed(2), +P().pos.z.toFixed(2), P().mode, P().state]);
        if (i >= max) { log.push(['FEHLER: Wegpunkt nicht erreicht', li, Lg.to]); break; }
      }
      c.setInput({});
      const q = P();
      mech.hurts = (L.players ?? [q]).reduce((a, f) => a + (f.hurtTries ?? 0), 0);
      mech.lives = L.runtime.save?.lives;
      mech.revealed = L.revealedCoins ?? 0;
      mech.clocks = (ent('uhren')?.got ?? 0) - mech.clocks0;
      mech.figures = (L.players ?? []).length;
      mech.side = L.entities.filter((e) => e.kind === 'coin' && e.alive && !e.removed && e.pos.x > 4 && e.pos.x < 6.5 && Math.abs(e.pos.z + 130) < 0.3).length;
      mech.pecks = L.entities.filter((e) => e.kind === 'hackvogel').map((e) => `${e.spec?.id}:${e.pecks ?? 0}`).join(' ');
      return { log, autoJumps, steps, time: steps / 120, pos: [q.pos.x, q.pos.y, q.pos.z], dead: q.dead, cause: q.deathCause ?? null, status: L.runtime.status, info: q.info(), rt: L.runtime.info(), mech, power: q.power, track };
    },
    chase(kind, o = {}) {
      let n = 0;
      const max = o.max ?? 3600;
      const match = (x) => x.kind === kind && x.alive && !x.removed && !x.defeated && !x.hidden && (!o.filter || o.filter(x));
      for (; n < max; n++) {
        const p = P();
        if (p.dead || L.runtime.status !== 'play') break;
        let e = null, best = Infinity;
        for (const x of L.entities) { if (!match(x)) continue; const d = Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z); if (d < best) { best = d; e = x; } }
        if (!e) break;
        const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dist = Math.hypot(dx, dz);
        const dy = e.pos.y - p.pos.y;
        const jump = (o.jump !== false && (n % 48) < 20 && dist < 1.6) || (dy > 0.8 && (n % 48) < 30);
        for (const f of L.players ?? [p]) f.invuln = Math.max(f.invuln, 5);
        c.setInput({ ...this.stick(dx, dz, Math.min(1, 0.3 + dist)), run: !o.walk && (dist > 1.5 || o.run), jump });
        c.step(1);
        if (P().mode === 'script') { let k = 0; while (P().mode === 'script' && k++ < 1200) { c.setInput({}); c.step(1); } }
      }
      c.setInput({});
      return n;
    },
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
    named: (id) => { const e = L.named.get(id); return e?.info?.() ?? (e ? { ...e } : null); },
    cond: (k) => cond(k),
  };
  window.__sb = W;
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

const W = (name, ...args) => sc(([n, a]) => window.__sb[n](...a), [name, args]);
const stats = [];
async function shot(name, wait = 600) {
  await sc(() => window.__course.snapCamera());
  const f0 = await sc(() => window.__course.view.frame);
  await page.waitForFunction((f) => window.__course.view.frame >= f + 10, f0, { timeout: 90000 });
  await page.waitForTimeout(wait);
  const s = await sc(() => window.__course.stats());
  stats.push([name, s.calls, s.triangles]);
  await page.screenshot({ path: `${OUT}sb_${name}.png` });
  if (process.env.DETAIL) {
    const d = await sc(() => window.__sb.detail());
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
    const meta = await sc(() => { const d = window.__course.level.data; return { title: d.title, world: d.world, timeLimit: d.timeLimit, theme: d.theme, music: d.music, archetype: d.archetype, stars: d.stars.length }; });
    const kinds = await W('kinds');
    console.log(`  „${meta.title}“, Welt ${meta.world}, Thema ${meta.theme}, Musik ${meta.music}, Zeitlimit ${meta.timeLimit} s, Entitäten: ${JSON.stringify(kinds)}`);
    check(`${id}: lädt ohne Konsolenfehler/-warnungen`, loadErrors.length === 0);
    for (const e of loadErrors.slice(0, 8)) console.log('     ', e);
    check(`${id}: ${R.meta.stars} Sterne, Stempel, ${R.meta.time} s, Thema ${R.meta.theme}, Musik ${R.meta.music}, Archetyp ${R.meta.archetype}, Welt ${R.meta.world}`,
      meta.stars === R.meta.stars && kinds.stamp === 1 && meta.timeLimit === R.meta.time && meta.theme === R.meta.theme && meta.music === R.meta.music && meta.archetype === R.meta.archetype && meta.world === R.meta.world);
    for (const [kind, n] of Object.entries(R.enemies ?? {})) check(`${id}: ${n}× ${kind} (${kinds[kind] ?? 0})`, (kinds[kind] ?? 0) === n);
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
    check(`${id}: ${hero} Zeit bis zum Ziel < ${R.meta.maxTime ?? 240} s (${res.time.toFixed(1)} s)`, reached && res.time < (R.meta.maxTime ?? 240));
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
      let ok = t.secret ? true : t.star !== undefined ? rt.stars[t.star] : rt.stamp;
      if (t.expectNot && !t.secret) ok = !ok;
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
      if (!t.allowFail && res.log.some((l) => String(l[0]).startsWith('FEHLER'))) ok = false;
      if (!ok || process.env.VERBOSE) for (const l of res.log) console.log('     ', JSON.stringify(l));
      check(`${id}: ${t.name} (${hero}, Münzen +${res.rt.coins - coins0}, Leben ${lives1 - lives0 >= 0 ? '+' : ''}${lives1 - lives0}${t.mechText ? `, ${t.mechText(res)}` : ''})`, ok);
      if (t.shot && hero === HEROES[0]) await shot(`${id}_${t.shot}`);
    }
  }

  // ------------------------------------------------ Bilder je Abschnitt aus der Spielkamera (Kennzahlen je Abschnitt)
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

console.log('\n  Kennzahlen je Abschnitt (Bild aus der Spielkamera; Zeichenaufrufe inkl. Schattenpass, Dreiecke):');
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
