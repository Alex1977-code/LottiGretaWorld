// 7-1 „Werferburg am Blauglutsee“ (Bauplan 7-1: Parcours, 400 s, ca. 220 m, 4 Abschnitte – Werfer-Festung an blauer Lava,
// viele Glasröhren). Thema bluelava, Musik course_fortfire.
//
// Eine Festung aus blaugrauem Stein mitten im Blauglutsee; Feuer-Werfer verteidigen sie. Abschnitte (nach −Z, Boden y 1,
// Lava y −0,6):
//   1. Startinsel (z 9 … −17): Burghof mit Pilzlingsturm, ?-Block mit der Wurfsichel; die **H-Röhre** quert den Lavagraben
//      (zwei Röhren mit einem Quersteg; im Quersteg leuchtet Stern 0 – nur wer an der Kreuzung abbiegt, fährt hindurch).
//   2. Glasröhren-Netz (z −31 … −92): Werfer-Hof (Feuer-Werfer bewirft die Röhren), Röhrengabel hoch über der Lava zu zwei
//      Werfer-Inseln, Röhrenstern zurück zur Mitte, Hubinsel mit Sternenring (Stern 2: acht Sternmünzen rund um die
//      erste Feuerstab-Plattform).
//   3. Feuerstab-Plattformen (z −92 … −140): zwei Feuerstäbe (der zweite mit ?-Block: Stampfen hebt ihn → Stempel hoch
//      darüber), Werferturm (Feuer-Werfer auf einem Pilzlingsturm) – besiegt erscheint die Warp-Box über den Glutsee.
//   4. Stampfstein-Passage (z −156 … −248): Kontrollpunkt; gleich dahinter unsichtbare Blöcke hinauf zum Turm mit der grünen
//      Röhre in den Kugelsaal (Stern 1: Kugel in die Mulde rollen); Gang zwischen Zinnenmauern mit drei Stampfsteinen und
//      drei Marschblock-Kolonnen; der letzte Feuer-Werfer am Torplatz – fällt er, senkt sich die Zugbrücke zum Zielmast.
// Gegner (Bauplan): Feuer-Werfer 6, Lavablase 22, Pilzlingsturm 4 (einer davon trägt den Werfer), Feuerstab 2,
// Stampfstein 3, Marschblock 12.

import { isl, line, ring, arc, sign, blase, sternImRohr, kugelZiel, festung71 } from './_helpers_a.js';
import { blueLavaSea, sparksUp, blueFalls, bats } from '../w5/_helpers_b.js';

const Y = 1;            // Festungsboden
const LAVA = -0.6;      // Blauglut
const P = 1.05;         // Röhrenmitte über dem Boden
const RX = 72;          // Kugelsaal (abseits)
const PI = Math.PI;

const werfer = (id, x, z, o = {}) => ({ kind: 'feuer_werfer', id, pos: [x, o.y ?? Y, z], axis: o.axis ?? [1, 0], pace: o.pace ?? 1.4, sight: o.sight ?? 11, interval: o.interval ?? 2.4, fireColor: 'blau', ...o });
const stab = (id, z, o = {}) => ({ type: 'feuerstab', id, pos: [0, Y, z], ...o });

function build(level) {
  blueLavaSea(level, { x0: -70, x1: 110, z0: 34, z1: -290, y: LAVA, scale: 5.5 });
  festung71(level, { Y, LAVA, RX });
  sparksUp(level, { x0: -26, x1: 26, z0: 14, z1: -250, y: LAVA, n: 140, h: 10 });
  // Blauglut stürzt aus den Fenstern der fernen Türme in den See
  blueFalls(level, [
    { pos: [27, LAVA, -37.4], width: 1.6, height: 9.5, face: '+z' }, { pos: [-27, LAVA, -137.2], width: 1.8, height: 11, face: '+z' },
    { pos: [30, LAVA, -172.6], width: 1.6, height: 9, face: '+z' }, { pos: [-30, LAVA, -67.6], width: 1.6, height: 9.5, face: '+z' },
  ]);
}

function setup(level) {
  bats(level, { spots: [[-14, 9, -20, 4], [16, 10, -100, 5], [-15, 9.5, -190, 4]], n: 2 });
  // der Werfer auf dem Pilzlingsturm wirft – wie alle Werfer der Burg – blaue Feuerkugeln
  const w4 = level.named.get('werfer4');
  if (w4) w4.fireColor = 'blau';
  sternImRohr(level, 0);
  kugelZiel(level, { id: 'mulde', ball: 'kugel', pos: [RX + 4.5, Y, -171.5], r: 1.15, onDone: { reveal: 'stern1' } });
}

export const LEVEL = {
  id: '7-1',
  world: 7,
  title: 'Werferburg am Blauglutsee',
  archetype: 'parcours',
  theme: 'bluelava',
  music: 'course_fortfire',
  timeLimit: 400,
  killY: -10,
  farHide: 60,
  instances: { coin: { farHide: 44, shadow: false } },
  build,
  setup,
  start: { pos: [0, Y, 5], yaw: PI / 2 },
  camera: [
    { from: 16, to: -30, pitch: 44, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-30, 30] },
    { from: -30, to: -92, pitch: 45, dist: 14, fov: 40, x: 0, xLock: 0.3, area: [-30, 30] },
    { from: -92, to: -150, pitch: 46, dist: 13.5, fov: 40, x: 0, xLock: 0.3, area: [-30, 30] },
    { from: -150, to: -212, pitch: 46, dist: 13, fov: 40, x: 0, xLock: 0.4, area: [-30, 30] },
    { from: -212, to: -252, pitch: 42, dist: 13.5, fov: 40, x: 0, xLock: 0.4, area: [-30, 30] },
    // Kugelsaal (abseits)
    { from: -146, to: -182, pitch: 50, dist: 14, fov: 40, x: RX, xLock: 0.5, area: [RX - 20, RX + 20] },
  ],
  segments: [
    // ================================================================ 1 Startinsel
    isl(-9, 9, 9, -17, Y, 6),
    sign(-6.2, Y, 2.6, 'Werferburg', { yaw: 0.2 }),
    { type: 'glasnetz', id: 'hroehre', radius: 1,
      nodes: { A: [-3.5, Y + P, -15.6], B: [3.5, Y + P, -15.6], K1: [-3.5, Y + P, -24], K2: [3.5, Y + P, -24], C: [-3.5, Y + P, -32.4], D: [3.5, Y + P, -32.4] },
      pipes: [
        { from: 'A', to: 'K1', coins: 2 }, { from: 'K1', to: 'C', coins: 2 },
        { from: 'B', to: 'K2', coins: 2 }, { from: 'K2', to: 'D', coins: 2 },
        { from: 'K1', to: 'K2', coins: 2 },
      ],
      weichen: { K1: { to: 'C', toggle: ['C', 'K2'] }, K2: { to: 'D', toggle: ['D', 'K1'] } } },

    // ================================================================ 2 Glasröhren-Netz
    isl(-9, 9, -31.5, -44, Y, 6),                                   // Werfer-Hof
    { type: 'glasnetz', id: 'gabel', radius: 1,
      nodes: { E: [0, Y + P, -43.2], J: [0, Y + 4.4, -52], L: [-7, Y + P, -60.6], R: [7, Y + P, -60.6] },
      pipes: [
        { from: 'E', to: 'J', via: [[0, Y + P, -44.6], [0, Y + 3.6, -48.6]], coins: 3 },
        { from: 'J', to: 'L', via: [[-3.4, Y + 4.2, -54.4], [-7, Y + 2.4, -58.4]], coins: 2 },
        { from: 'J', to: 'R', via: [[3.4, Y + 4.2, -54.4], [7, Y + 2.4, -58.4]], coins: 2 },
      ],
      weichen: { J: { to: 'R', toggle: ['L', 'R'] } } },
    isl(-11, -3, -59.5, -70, Y, 6),                                 // Werfer-Insel links
    isl(3, 11, -59.5, -70, Y, 6),                                   // Werfer-Insel rechts
    { type: 'glasnetz', id: 'stern3', radius: 1,
      nodes: { PL: [-7, Y + P, -69.2], PR: [7, Y + P, -69.2], M: [0, Y + 3.6, -75], G: [0, Y + P, -80.8] },
      pipes: [
        { from: 'PL', to: 'M', via: [[-7, Y + P, -70.6], [-4, Y + 3.2, -73.4]], coins: 2 },
        { from: 'PR', to: 'M', via: [[7, Y + P, -70.6], [4, Y + 3.2, -73.4]], coins: 2 },
        { from: 'M', to: 'G', via: [[0, Y + 3.2, -77.4], [0, Y + P + 0.3, -79.4]], coins: 2 },
      ],
      weichen: { M: { to: 'G' } } },
    isl(-9, 9, -79.8, -92, Y, 6),                                   // Hubinsel (Sternenring)

    // ================================================================ 3 Feuerstab-Plattformen
    isl(-1.3, 1.3, -92, -97, Y, 5),
    isl(-4.5, 4.5, -97, -106, Y, 6),                                // Plattform 1
    stab('stab1', -101.5, { block: 'stein', length: 6, speed: 1.4 }),
    isl(-1.3, 1.3, -106, -110, Y, 5),
    isl(-4.5, 4.5, -110, -119, Y, 6),                               // Plattform 2 (?-Block hebt an)
    stab('stab2', -114.5, { block: 'frage', length: 5, arms: 2, speed: -1.25, content: 'coins:3', lift: 4.2 }),
    isl(-1.1, 1.1, -120.6, -122.6, Y, 5),                           // Trittstein
    isl(-8, 8, -124, -140, Y, 6),                                   // Werferturm-Platz

    // ================================================================ 4 Stampfstein-Passage
    isl(-8, 8, -156, -166, Y, 6),                                   // Kontrollpunkt
    isl(-12.5, -7.5, -159.5, -166, Y + 6.4, 13, { top: 'rock' }),   // Turm mit der grünen Röhre
    { type: 'hiddenchain', id: 'geheim', blocks: [[-4, Y + 2.2, -163.2], [-6.2, Y + 4.0, -163.4]] },
    { type: 'pipe', id: 'saal_hin', pos: [-10, Y + 6.4, -162.6], height: 1.2, target: 'saal_ein' },
    isl(-4.5, 4.5, -166, -212, Y, 6),                               // Gang
    isl(-7, 7, -212, -220, Y, 6),                                   // Torplatz
    { type: 'zugbruecke', id: 'tor', pos: [0, Y, -220], length: 8.4, width: 3, dir: [0, -1], style: 'eisen' },
    isl(-9, 9, -228.4, -248, Y, 6),                                 // Zielinsel

    // ================================================================ Kugelsaal (abseits)
    isl(RX - 8, RX + 8, -150, -162.5, Y, 6),
    isl(RX - 1.6, RX + 1.6, -162.5, -166.5, Y, 6),                  // Kugelbahn über die Glutrinne (Bordsteine halten die Kugel)
    isl(RX - 1.6, RX - 1.3, -162.5, -166.5, Y + 0.45, 2, { tag: 'bord' }), isl(RX + 1.3, RX + 1.6, -162.5, -166.5, Y + 0.45, 2, { tag: 'bord' }),
    isl(RX - 8, RX + 8, -166.5, -178, Y, 6),
    { type: 'pipe', id: 'saal_ein', pos: [RX - 5.5, Y, -153], height: 1.2 },
    { type: 'pipe', id: 'saal_aus', pos: [RX + 5.5, Y, -153.5], height: 1.2, target: [2.5, Y, -162], color: 0x3a8aff },
    sign(RX - 1.6, Y, -151.4, 'Kugel in die Mulde!', { size: [2.6, 0.8] }),

    // ================================================================ Kulisse (Banner, Fackeln, Ketten, Knochen)
    { type: 'deco_w7', items: [
      // Burghof
      { kind: 'fahne', hang: true, pos: [-8.28, Y + 2.1, 1], yaw: 0, length: 1.9, width: 1.2 },
      { kind: 'fahne', hang: true, pos: [8.28, Y + 2.1, -4], yaw: PI, length: 1.9, width: 1.2 },
      { kind: 'fackel', pos: [-7.6, Y, -15.6], mount: 'stand' }, { kind: 'fackel', pos: [7.6, Y, -15.6], mount: 'stand' },
      { kind: 'knochen', pos: [-7.4, Y, -6.5], n: 4 },
      // Werfer-Hof
      { kind: 'fahne', hang: true, pos: [-8.28, Y + 2.1, -39], yaw: 0, length: 1.9, width: 1.2 },
      { kind: 'fahne', hang: true, pos: [8.28, Y + 2.1, -39], yaw: PI, length: 1.9, width: 1.2 },
      { kind: 'fackel', pos: [-7.8, Y, -33], mount: 'stand' }, { kind: 'fackel', pos: [7.8, Y, -33], mount: 'stand' },
      { kind: 'fahne', pos: [-9.2, Y, -62], height: 4.2 }, { kind: 'fahne', pos: [9.2, Y, -62], height: 4.2, color: 'lila' },
      // Hubinsel
      { kind: 'fahne', hang: true, pos: [-8.28, Y + 2.1, -87], yaw: 0, length: 1.9, width: 1.2 },
      { kind: 'fahne', hang: true, pos: [8.28, Y + 2.1, -87], yaw: PI, length: 1.9, width: 1.2 },
      { kind: 'fackel', pos: [-7.6, Y, -81], mount: 'stand' }, { kind: 'fackel', pos: [7.6, Y, -81], mount: 'stand' },
      { kind: 'knochen', pos: [6.8, Y, -90.6], n: 3 },
      // Feuerstab-Plattformen, Werferturm-Platz
      { kind: 'fackel', pos: [-3.9, Y, -97.6], mount: 'stand' }, { kind: 'fackel', pos: [3.9, Y, -110.6], mount: 'stand' },
      { kind: 'fahne', hang: true, pos: [-7.28, Y + 2.1, -133], yaw: 0, length: 1.9, width: 1.2 },
      { kind: 'fahne', hang: true, pos: [7.28, Y + 2.1, -133], yaw: PI, length: 1.9, width: 1.2 },
      { kind: 'fackel', pos: [-7, Y, -125], mount: 'stand' }, { kind: 'fackel', pos: [7, Y, -125], mount: 'stand' },
      // Kontrollpunkt, Gang, Torhaus
      { kind: 'fahne', hang: true, pos: [-9.6, Y + 5.6, -159.4], length: 3, width: 1.5 },
      { kind: 'fackel', pos: [6.8, Y, -157], mount: 'stand' },
      { kind: 'fackel', pos: [-3.75, Y + 1.6, -178], yaw: 0 }, { kind: 'fackel', pos: [3.75, Y + 1.6, -184], yaw: PI },
      { kind: 'fackel', pos: [-3.75, Y + 1.6, -196], yaw: 0 }, { kind: 'fackel', pos: [3.75, Y + 1.6, -202], yaw: PI },
      { kind: 'fahne', hang: true, pos: [-3.78, Y + 2.4, -189], yaw: 0, length: 1.8, width: 1.1 },
      { kind: 'fahne', hang: true, pos: [3.78, Y + 2.4, -172], yaw: PI, length: 1.8, width: 1.1, color: 'lila' },
      { kind: 'fahne', hang: true, pos: [-4.4, Y + 6.2, -220.15], length: 4, width: 2 },
      { kind: 'fahne', hang: true, pos: [4.4, Y + 6.2, -220.15], length: 4, width: 2 },
      { kind: 'kette', pos: [-1.9, Y + 7.6, -220.3], length: 3 }, { kind: 'kette', pos: [1.9, Y + 7.6, -220.3], length: 3 },
      { kind: 'fackel', pos: [-6.4, Y, -213], mount: 'stand' }, { kind: 'fackel', pos: [6.4, Y, -213], mount: 'stand' },
      // Zielhof
      { kind: 'fackel', pos: [-7.6, Y, -230], mount: 'stand' }, { kind: 'fackel', pos: [7.6, Y, -230], mount: 'stand' },
      { kind: 'fahne', hang: true, pos: [-5, Y + 3, -247.15], length: 2.4, width: 1.4 },
      { kind: 'fahne', hang: true, pos: [5, Y + 3, -247.15], length: 2.4, width: 1.4, color: 'lila' },
      // Kugelsaal
      { kind: 'fackel', pos: [RX - 7.4, Y, -150.8], mount: 'stand' }, { kind: 'fackel', pos: [RX + 7.4, Y, -150.8], mount: 'stand' },
      { kind: 'fackel', pos: [RX - 7.4, Y, -177.2], mount: 'stand' }, { kind: 'fackel', pos: [RX + 7.4, Y, -177.2], mount: 'stand' },
      { kind: 'knochen', pos: [RX - 6.4, Y, -168.4], n: 4 },
    ] },
    // Basalt in der Lava (Kulisse)
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'basaltsaeulen', pos: [-15, LAVA - 0.3, -22], n: 6, height: [0.6, 2.4] }, { kind: 'basaltsaeulen', pos: [15, LAVA - 0.3, -52], n: 6, height: [0.6, 2.4] },
      { kind: 'basaltsaeulen', pos: [-16, LAVA - 0.3, -100], n: 5, height: [0.8, 3] }, { kind: 'basaltsaeulen', pos: [16, LAVA - 0.3, -148], n: 6, height: [0.6, 2.6] },
      { kind: 'basaltsaeulen', pos: [-15, LAVA - 0.3, -190], n: 5, height: [0.6, 2.2] }, { kind: 'basaltsaeulen', pos: [14, LAVA - 0.3, -226], n: 5, height: [0.8, 2.8] },
      { kind: 'vulkanfelsen', pos: [-18, LAVA - 0.2, -60], size: [6, 10], n: 4 }, { kind: 'vulkanfelsen', pos: [18, LAVA - 0.2, -120], size: [6, 10], n: 4 },
      { kind: 'vulkanfelsen', pos: [-17, LAVA - 0.2, -170], size: [6, 10], n: 4 }, { kind: 'vulkanfelsen', pos: [18, LAVA - 0.2, -200], size: [6, 10], n: 4 },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-2.5, Y + 2.4, -2], content: 'sichel' },
    { kind: 'coinblock', pos: [2.5, Y + 2.4, -2], count: 6 },
    { kind: 'hidden', pos: [6.5, Y + 2.6, 5.5], content: 'oneup' },                // Extraleben neben dem Starttor
    { kind: 'question', pos: [0, Y + 2.4, -86], content: 'funken' },
    { kind: 'brick', pos: [-1, Y + 2.4, -86], content: 'coin' }, { kind: 'brick', pos: [1, Y + 2.4, -86], content: 'coin' },
    { kind: 'question', pos: [-2, Y + 2.4, -159], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [RX - 6, Y + 2.6, -174], content: 'oneup' },             // Extraleben im Kugelsaal
  ],
  enemies: [
    // 1 Startinsel
    { kind: 'pilzlingsturm', id: 'turm1', pos: [3.5, Y, -9.5], count: 3, sight: 8 },
    blase(-12, -2, { phase: 0 }), blase(12.5, -8, { phase: 0.5 }),
    blase(0, -21.5, { color: 'blau', phase: 0.2, height: 4.2 }), blase(0, -27, { color: 'blau', phase: 0.7, height: 4.2 }),
    // 2 Glasröhren-Netz
    werfer('werfer1', 4.5, -40.5),
    blase(-5, -49, { phase: 0.1 }), blase(5, -49, { phase: 0.6 }), blase(0, -57, { phase: 0.35, height: 4.4 }),
    werfer('werfer2', -7.5, -66.5, { axis: [0, 1], pace: 1.2 }),
    werfer('werfer3', 7.5, -66.5, { axis: [0, 1], pace: 1.2, first: 2.2 }),
    blase(0, -64, { phase: 0.15 }), blase(0, -68, { phase: 0.65 }), blase(-13.5, -74, { phase: 0.4 }), blase(13.5, -74, { phase: 0.9 }),
    { kind: 'pilzlingsturm', id: 'turm2', pos: [-4.5, Y, -88.5], count: 3, sight: 7 },
    // 3 Feuerstab-Plattformen
    blase(-3.2, -108, { phase: 0.2, height: 3.2 }), blase(3.2, -108, { phase: 0.7, height: 3.2 }),
    blase(-3.4, -121.6, { phase: 0.45, height: 3.2 }), blase(3.4, -121.6, { phase: 0.95, height: 3.2 }),
    { kind: 'werferturm', id: 'werferturm', riderId: 'werfer4', pos: [0, Y, -133], count: 3, speed: 0.7, sight: 9, interval: 2.6 },
    blase(-4, -148, { phase: 0.1, height: 4.6 }), blase(4, -148, { phase: 0.6, height: 4.6 }),
    // 4 Stampfstein-Passage
    { kind: 'pilzlingsturm', id: 'turm3', pos: [1, Y, -170.5], count: 3, sight: 7 },
    { kind: 'stampfstein', id: 'stampf1', pos: [-1.8, Y + 4.4, -175.5], size: [2.2, 2, 2.2] },
    { kind: 'stampfstein', id: 'stampf2', pos: [1.8, Y + 4.4, -187.5], size: [2.2, 2, 2.2] },
    { kind: 'stampfstein', id: 'stampf3', pos: [0, Y + 4.4, -199.5], size: [2.2, 2, 2.2] },
    { kind: 'marschblock', id: 'marsch1', path: [[-2.9, Y, -179.6], [2.9, Y, -179.6], [2.9, Y, -182.6], [-2.9, Y, -182.6]], count: 4, spacing: 1.5, speed: 1.4 },
    { kind: 'marschblock', id: 'marsch2', path: [[-2.9, Y, -191.6], [2.9, Y, -191.6], [2.9, Y, -194.6], [-2.9, Y, -194.6]], count: 4, spacing: 1.5, speed: 1.4, phase: 0.5, colors: ['blue', 'yellow', 'green', 'red'] },
    { kind: 'marschblock', id: 'marsch3', path: [[-2.9, Y, -203.4], [2.9, Y, -203.4], [2.9, Y, -206.4], [-2.9, Y, -206.4]], count: 4, spacing: 1.5, speed: 1.4, phase: 0.25, colors: ['green', 'red', 'blue', 'yellow'] },
    werfer('werfer5', 0, -209.5, { pace: 2.2, first: 1.6 }),
    werfer('werfer6', 0, -217.4, { pace: 2.6, interval: 2.2 }),
    blase(-4.5, -224, { phase: 0.3, height: 3.4 }), blase(4.5, -224, { phase: 0.8, height: 3.4 }), blase(0, -152, { phase: 0.35, height: 5 }),
    // Kugelsaal: Glutrinne
    blase(RX - 4.5, -164.5, { phase: 0.2, height: 2.6 }), blase(RX + 4.5, -164.5, { phase: 0.7, height: 2.6 }),
  ],
  items: [
    // Hoppel, ein Kaninchen-Freund, sitzt im Käfig des Barons auf der Zielinsel
    { kind: 'rescue_friend', id: 'hoppel', pos: [-5.6, Y, -240], yaw: 0.6, name: 'Hoppel' },
    // Werferturm besiegt → Warp-Box über den Glutsee zum Kontrollpunkt
    { kind: 'task', id: 'aufgabe_turm', area: { pos: [0, Y, -132], r: 10 }, ids: ['werfer4'], reward: [{ reveal: 'warp_cp' }, { sfx: 'switch' }] },
    { kind: 'warpbox', id: 'warp_cp', pos: [0, Y, -138.2], target: 'warp_cp2', hidden: true },
    { kind: 'warpbox', id: 'warp_cp2', pos: [3.6, Y, -158.2], target: 'warp_cp' },
    // letzter Werfer besiegt → Zugbrücke senkt sich
    { kind: 'task', id: 'aufgabe_tor', area: { pos: [0, Y, -214], r: 9 }, ids: ['werfer6'], reward: [{ open: 'tor' }] },
    // Sternenring (Stern 2): Hubinsel, Steg, die Ecken der ersten Feuerstab-Plattform und oben auf ihrem Steinblock
    { kind: 'sternring', id: 'sternring', pos: [5.5, Y, -84.5], yaw: PI / 2, time: 13, star: 2, coins: [
      [5.5, Y + 0.6, -90], [0, Y + 0.6, -91.2], [0, Y + 0.6, -95], [3.8, Y + 0.6, -98], [3.8, Y + 0.6, -105], [-3.8, Y + 0.6, -105], [-3.8, Y + 0.6, -98], [0, Y + 1.7, -101.5],
    ] },
    // Kugel-Rätsel (Stern 1)
    { kind: 'schiebekugel', id: 'kugel', pos: [RX - 2.5, Y, -158], size: 1.5, color: 'blau', respawn: 1.2 },
    // Münzen
    line([0, Y + 0.6, 1.5], [0, Y + 0.6, -6], 4),
    ring([-5, Y + 0.6, -10], 1.4, 6),
    arc([-11, Y + 0.6, -6], [-11, Y + 0.6, -12], 4, 1.2),
    line([-6, Y + 0.6, -35], [6, Y + 0.6, -35], 5),
    ring([-7, Y + 0.6, -64.8], 1.2, 5), ring([7, Y + 0.6, -64.8], 1.2, 5),
    line([-1.6, Y + 0.6, -131], [-1.6, Y + 0.6, -137], 3), line([1.6, Y + 0.6, -131], [1.6, Y + 0.6, -137], 3),
    arc([-4, Y + 3.8, -161.6], [-6.8, Y + 6.8, -163], 3, 0.6),                       // Hinweis: hier geht es hinauf
    line([-2.5, Y + 0.6, -168], [-2.5, Y + 0.6, -172], 3),
    line([2.5, Y + 0.6, -184], [2.5, Y + 0.6, -189], 3), line([-2.5, Y + 0.6, -196], [-2.5, Y + 0.6, -201], 3),
    ring([0, Y + 0.6, -236], 2.2, 10),
    line([RX - 1.6, Y + 0.6, -154], [RX + 1.6, Y + 0.6, -154], 3),
  ],
  checkpoint: { pos: [0, Y, -161], yaw: PI / 2 },
  stars: [
    [0, Y + P - 0.6, -24],                                       // 0: im Quersteg der H-Röhre
    { pos: [RX + 4.5, Y + 0.4, -175.6], hidden: true, id: 'stern1' }, // 1: Kugelsaal
    { pos: [0, Y + 0.4, -95], hidden: true, id: 'stern2r' },      // 2: Sternenring (erscheint am Ring)
  ],
  stamp: [0, Y + 9.2, -114.5],
  goal: [0, Y, -241],
  marks: {
    start: [0, Y, 5], hroehre: [-3.5, Y, -13.5], hof: [0, Y, -37], gabel: [0, Y, -42], insel: [7, Y, -63], hub: [0, Y, -84],
    stab1: [0, Y, -96], stab2: [0, Y, -109], turm: [0, Y, -127], cp: [0, Y, -161], gang: [0, Y, -168], tor: [0, Y, -214], ziel: [0, Y, -238],
    saal: [RX, Y, -156],
  },
};
