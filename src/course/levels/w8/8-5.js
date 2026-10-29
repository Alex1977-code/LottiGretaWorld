// 8-5 „Flutverlies der Brummbär-Festung“ (Archetyp parcours_ride, Bauplan 8-5: „Zeitlimit 400 s, ca. 270 m. Steigbecken
// (füllt und leert sich alle paar Sekunden) → schwebende Wasserkörper zum Checkpoint → blaue Stachelblöcke → kurzer
// Reittier-Abschnitt, Fallblock-Brücke → rote Stachelblöcke → wandernde Stachelwände → Röhre oder Wolkenkanone zum Ziel.
// Geheimnisse: unsichtbare Wand nach dem ersten Wasserabschnitt kletterbar; Wolkenkanone in einen Münzhimmel. Sterne:
// 1) unsichtbare Wand vor dem Checkpoint 2) nach dem Reittier Bogenwände hoch, verschwindende Plattformen 3) Münzhimmel.
// Stempel: erster Bereich mit blauen Stachelwänden, Nische oben links.“). Thema dungeon, Musik course_dungeon.
//
// Tief unter Baron Brummbärs See liegt seine alte Festung halb geflutet: türkis glimmende Gitterfenster, Bogenmauern mit
// Moos, Korallen und bunte Fischschwärme. Abschnitte (nach −Z; nach dem Flutsaal liegt der Boden bei FL = 1,0):
//   Schleusenhof (z 10 … −6):        Start, ?-Block mit Krallen-Anzug, Schild.
//   Flutsaal (−6 … −30):              Steigbecken (Boden −4): das Wasser steigt im Takt bis knapp unter den Rand und
//                                     fällt wieder – nur mit dem Hochwasser kommt man an die hohe Ausgangskante.
//   Ausgangskante (−30 … −40):        rechts eine unsichtbare Wand (Münzsäule als Hinweis) – mit dem Krallen-Anzug hinauf
//                                     zum schwebenden Balkon mit Stern 1.
//   Wasserkörper-Schlucht (−40 … −58): drei schwebende Wasserwürfel über dem Abgrund – hineinspringen, oben heraus.
//   Kontrollpunkt (−58 … −70).
//   Blaue Stachelblöcke (−70 … −100): vier Blöcke fahren im Takt quer (Vorwarnung: zittern, Stacheln blinken); ihre
//                                     Oberseite trägt – von dort in die Nische oben links (Stempel).
//   Pflaume-Kanal (−100 … −146):      Pflaume wartet am Steg im Kanal; Ritt unter Bögen, an Felsen vorbei.
//   Bogenhalle (−146 … −152):         Absteigen; links die Bogenwand (Krallen-Anzug) hinauf, oben verschwindende
//                                     Fallblöcke zum Stern 2.
//   Fallblock-Brücke (−152 … −168):   stürzt hinter der Figur Block für Block ein.
//   Rote Stachelblöcke (−168 … −200): wandern ohne Pause um zwei Pfeiler und quer vor dem Ausgang.
//   Stachelwand-Gang (−200 … −234):   eine Stachelwand rückt im Gang vor und zurück; Nischen zum Verstecken; Ausgang rechts.
//   Endsaal (x 4 … 16, −228 … −250): grüne Röhre zum Ziel; hinter dem Pfeiler die Wolkenkanone in den Münzhimmel
//                                     (Stern 3, Röhre zum Ziel).
//   Seeufer (x 0, z −270 … −300):     Ziel am Ausgang der Festung.

import {
  isl, line, ring, arc, column, plate, Bld, FLUT, flutMauern, korallen, fischSchwaerme, glowPoints,
} from './_helpers_b.js';

const FL = 1.0;              // Boden nach dem Flutsaal
const WS = FL - 1;           // Wasserspiegel des Kanals
const HX = 40, HY = 42;      // Münzhimmel
const S = (x0, x1, zA, zB, top, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'stone', ...o });

// ------------------------------------------------------------------ Kanal (Ritt)
const RIVER = [[0, WS, -101.5, 6, 0.4], [0, WS, -108, 6, 2.2], [0, WS, -118, 6, 2.8], [1.2, WS, -128, 6, 2.8], [0, WS, -138, 6, 2.4], [0, WS, -145, 6.4, 1.0], [0, WS, -148.6, 6.8, 0.3]];

// ------------------------------------------------------------------ Stachelblöcke
const BLAU = (id, x, z, dx, phase) => ({ type: 'stachelblock', id, pos: [x, FL, z], size: [2, 2, 2], color: 'blau', spikes: ['+x', '-x', '+z', '-z'], move: [dx, 0, 0], speed: 3, wait: 1.5, warn: 0.6, phase });
const ROT = (id, path, o = {}) => ({ type: 'stachelblock', id, pos: path[0], path: path.slice(1), size: [2, 2, 2], color: 'rot', spikes: 'alle', speed: 2.2, mode: 'loop', ...o });

function build(level) {
  // Festungsmauern (Bögen zur Wegseite, Kamera darf hindurch)
  flutMauern(level, [
    { x0: -8, x1: -6, zA: 10, zB: -30, y0: -6, y1: 5, arches: 'z', side: 1 },
    { x0: 6, x1: 8, zA: 10, zB: -30, y0: -6, y1: 5, arches: 'z', side: -1 },
    { x0: -8, x1: -6, zA: -30, zB: -40, y0: -6, y1: FL + 4, arches: 'z', side: 1 },
    { x0: -7, x1: -5, zA: -57.6, zB: -70, y0: -2.6, y1: FL + 4, arches: 'z', side: 1 },
    { x0: 5, x1: 7, zA: -57.6, zB: -100, y0: -2.6, y1: FL + 4, arches: 'z', side: -1 },
    // linke Wand der Stachelblock-Halle mit der Nische (Stempel): unten, oben, hinter der Nische
    { x0: -8, x1: -5, zA: -70, zB: -81, y0: -2.6, y1: FL + 7.4, arches: 'z', side: 1 },
    { x0: -8, x1: -5, zA: -85, zB: -100, y0: -2.6, y1: FL + 7.4, arches: 'z', side: 1 },
    { x0: -8, x1: -5, zA: -81, zB: -85, y0: -2.6, y1: FL + 5, windows: false },
    { x0: -8, x1: -7.4, zA: -81, zB: -85, y0: FL + 5, y1: FL + 7.4, windows: false },
    { x0: -8, x1: -5, zA: -81, zB: -85, y0: FL + 7.2, y1: FL + 7.4, windows: false },
    // Kanal
    { x0: -5.6, x1: -3.6, zA: -101.2, zB: -149.6, y0: -2, y1: FL + 3.6, arches: 'z', side: 1 },
    { x0: 3.6, x1: 5.6, zA: -101.2, zB: -149.6, y0: -2, y1: FL + 3.6, arches: 'z', side: -1 },
    // Bogenhalle: rechte Mauer; die linke Bogenwand ist kletterbar (Krallen-Anzug)
    { x0: 6, x1: 8, zA: -149.6, zB: -153, y0: -2, y1: FL + 4, arches: 'z', side: -1 },
    { x0: -6.2, x1: -5, zA: -149.6, zB: -153, y0: -2, y1: FL + 7, arches: 'z', side: 1, climbable: true, camIgnore: false },
    // rote Stachelblöcke
    { x0: -8, x1: -6, zA: -168.5, zB: -200, y0: -2, y1: FL + 4, arches: 'z', side: 1 },
    { x0: 6, x1: 8, zA: -168.5, zB: -200, y0: -2, y1: FL + 4, arches: 'z', side: -1 },
    // Stachelwand-Gang mit Nischen: links (−208 … −211, −224 … −227), rechts (−216 … −219), Ausgang rechts (−229 … −234)
    { x0: -6.6, x1: -4, zA: -200, zB: -208, y0: -2, y1: FL + 4, arches: 'z', side: 1 },
    { x0: -6.6, x1: -6.2, zA: -208, zB: -211, y0: -2, y1: FL + 4, windows: false },
    { x0: -6.6, x1: -4, zA: -211, zB: -224, y0: -2, y1: FL + 4, arches: 'z', side: 1 },
    { x0: -6.6, x1: -6.2, zA: -224, zB: -227, y0: -2, y1: FL + 4, windows: false },
    { x0: -6.6, x1: -4, zA: -227, zB: -236, y0: -2, y1: FL + 4, arches: 'z', side: 1 },
    { x0: 4, x1: 6.6, zA: -200, zB: -216, y0: -2, y1: FL + 4, arches: 'z', side: -1 },
    { x0: 6.2, x1: 6.6, zA: -216, zB: -219, y0: -2, y1: FL + 4, windows: false },
    { x0: 4, x1: 6.6, zA: -219, zB: -229, y0: -2, y1: FL + 4, arches: 'z', side: -1 },
    { x0: -4, x1: 4, zA: -234, zB: -236, y0: -2, y1: FL + 4, arches: 'x', side: 1 },
    // Endsaal
    { x0: 4, x1: 17, zA: -250, zB: -252, y0: -2, y1: FL + 5, arches: 'x', side: 1 },
    { x0: 16, x1: 18, zA: -226, zB: -252, y0: -2, y1: FL + 5, arches: 'z', side: -1 },
  ]);
  // unsichtbare Kletterwand rechts an der Ausgangskante (Stern 1) und Kante zum Balkon
  plate(level, [6, 6.4, FL, FL + 8, -31, -39], { climbable: true, tag: 'unsichtbare_wand' });
  korallen(level, [
    [-4.5, -6, -9, 1.2], [4.6, -6, -14, 1], [-4.2, -6, -24, 1.3], [4.4, -6, -27, 1.1], [0, -6, -16, 0.9],
    [-3.6, FL, -61.6, 0.9], [3.8, FL, -68.8, 1], [-4.4, FL, -147, 1], [4.6, FL, -151, 1.1], [-4.6, FL, -175, 1],
    [14.6, FL, -229.4, 1.3], [5.4, FL, -248.4, 1.1], [-4, FL, -272, 1.2], [4.4, FL, -296, 1.3],
    // mehr Farbe am Kontrollpunkt, in der roten Halle und am Seeufer
    [4.2, FL, -58.8, 0.8], [-4.4, FL, -169.5, 0.9], [4.6, FL, -199, 0.9], [-5.6, FL, -268, 1.4], [5.8, FL, -276, 1.1],
    [-5.4, FL, -290, 1.0], [2.6, FL, -298.6, 0.8], [-2.4, FL, -299, 0.9],
  ]);
  fischSchwaerme(level, [
    { c: [0, -3.6, -18], r: 3.2, n: 9, h: 1.4, speed: 0.6 }, { c: [0, 0.4, -50], r: 1.2, n: 5, h: 0.8, speed: 0.9 },
    { c: [-2, 5, -110], r: 3, n: 7, h: 1.5, speed: 0.4 }, { c: [10, 4, -238], r: 3.5, n: 8, h: 1, speed: 0.5 },
    { c: [0, 4, -285], r: 4, n: 10, h: 1.6, speed: 0.45 },
  ]);
  // Lichtschein der Gitterfenster und Glimmsteine
  glowPoints(level, [[-5.8, 2.6, -2, 3], [5.8, 2.6, -14, 3], [-5.8, 2.6, -26, 3], [4.8, FL + 2.6, -78, 3], [-4.8, FL + 2.6, -90, 3], [10, FL + 3, -249, 4]],
    { color: 0x7af0ff, opacity: 0.45, pulse: 0.4 });
  // Schatztruhen-Glitzern im Münzhimmel (Zier) und Wolken-Kulisse folgen über die Bausteine
  const b = new Bld();
  // Seeufer: Sandflecken, Seesterne und Muscheln auf dem Steinboden (flach, nur Zier)
  for (const [x, z, r, c] of [[-3.6, -270.5, 2.2, 0xe8d8a8], [3.8, -279, 2.6, 0xdcc894], [-3.2, -287.5, 2.0, 0xe8d8a8], [3.4, -294.5, 1.8, 0xf0e0b8],
    [-4.6, -61.8, 1.2, 0xdcc894], [4.4, -171.5, 1.3, 0xe8d8a8]]) {
    b.cyl(r, r * 1.05, 0.03, x, FL + 0.005, z, c, 18);
    b.cyl(r * 0.55, r * 0.6, 0.03, x + r * 0.2, FL + 0.012, z - r * 0.15, 0xf6ead0, 14);
  }
  for (const [x, z, c, yaw] of [[-2.2, -271.6, 0xff7a4a, 0.3], [4.6, -280.2, 0xff5a8a, 1.1], [-4.2, -288.4, 0xffb84a, 2.0], [2.2, -295.2, 0xc07aff, 0.7], [-3.8, -62.6, 0xff7a4a, 0.5]]) {
    b.cone(0.42, 0.1, x, FL + 0.02, z, c, 5, { yaw });
    b.sphere(0.07, x, FL + 0.12, z, 0xfff0d0, { ws: 5, hs: 3 });
  }
  for (const [x, z, c] of [[-4.8, -269, 0xffe0f0], [2.6, -277.4, 0xfff0d0], [4.6, -293.2, 0xffd0e0], [-2.8, -296.4, 0xfff0d0]]) {
    b.sphere(0.24, x, FL + 0.05, z, c, { s: [1, 0.45, 0.8], ws: 8, hs: 4 });
    for (let k = -1; k <= 1; k++) b.box(0.03, 0.03, 0.36, x + k * 0.1, FL + 0.12, z, 0xe8b8c8, { r: 0, seg: 0, yaw: k * 0.3 });
  }
  // Steg am Kanal (Holzplanken über dem Wasser bis zu Pflaume)
  for (let i = 0; i < 6; i++) b.box(3.2, 0.12, 0.42, 0, FL - 0.12, -100.4 - i * 0.5, i % 2 ? 0x8a6a3a : 0x9a7a46, { r: 0.02, seg: 0 });
  b.flush(level, { castShadow: false });
}

export const LEVEL = {
  id: '8-5',
  world: 8,
  title: 'Flutverlies der Brummbär-Festung',
  archetype: 'parcours_ride',
  theme: 'dungeon',
  music: 'course_dungeon',
  timeLimit: 400,
  killY: -12,
  build,
  start: { pos: [0, 0, 6], yaw: Math.PI / 2 },
  instances: { coin: { farHide: 40, shadow: false } },
  ride: {
    section: true,
    raft: [0, WS, -106],
    raftYaw: -Math.PI / 2,
    dock: { min: [-5, -104.6], max: [5, -99] },
    beach: { min: [-6, -152], max: [6, -146], land: [0, FL, -151] },
    swim: true,
    after: 'stay',
    footCamYaw: 0,
  },
  camera: [
    { from: 14, to: -40, pitch: 46, dist: 14, ahead: 2.5, area: [-30, 30] },
    { from: -40, to: -70, pitch: 44, dist: 14, ahead: 2.5, area: [-30, 30] },
    { from: -70, to: -100, pitch: 48, dist: 14, ahead: 2, area: [-30, 30] },
    { from: -100, to: -150, pitch: 42, dist: 13.5, ahead: 2.5, area: [-30, 30] },
    { from: -150, to: -200, pitch: 46, dist: 14, ahead: 2.5, area: [-30, 30] },
    { from: -200, to: -260, pitch: 50, dist: 14, ahead: 2, area: [-30, 30] },
    { from: -262, to: -310, pitch: 42, dist: 13, ahead: 2, area: [-30, 30] },
    { from: -240, to: -300, pitch: 40, dist: 14, ahead: 3, area: [30, 80] },
  ],
  segments: [
    // Schleusenhof, Flutsaal (Becken), Ausgangskante
    S(-6, 6, 10, -6, 0),
    S(-6, 6, -6, -30, -6, 3),
    { type: 'steigbecken', id: 'becken', pos: [0, -6, -18], size: [12, 6.2, 24], low: 0.3, wait: 3.0, warn: 0.9, rise: 2.4, hold: 4.0, fall: 2.4 },
    S(-3.6, -1.4, -11, -14, -4.6, 1), S(1.4, 3.6, -20, -23, -4.6, 1),
    S(-6, 6, -30, -40, FL, FL + 6),
    // Stern-1-Balkon über der unsichtbaren Wand
    S(6.4, 10.4, -32, -38, FL + 8, 1.2, { under: 1.2 }),
    // Wasserkörper-Schlucht
    { type: 'wasserkoerper', id: 'wuerfel1', pos: [0, -1.6, -43.6], size: [4, 4, 4] },
    { type: 'wasserkoerper', id: 'wuerfel2', pos: [1.5, -1, -49.2], size: [4, 4, 4] },
    { type: 'wasserkoerper', id: 'wuerfel3', pos: [-0.5, -1.6, -54.8], size: [4, 4, 4] },
    // Kontrollpunkt, blaue Stachelblöcke, Steg
    S(-5, 5, -57.6, -100, FL, 4),
    S(-7.4, -5, -81, -85, FL + 5, 0.4, { under: 0 }),
    BLAU('blau1', -3, -76, 6, 0), BLAU('blau2', 3, -82.4, -6, 1.1), BLAU('blau3', -3, -88.6, 6, 2.2), BLAU('blau4', 3, -94.6, -6, 0.6),
    S(-5.5, 5.5, -100, -101.2, FL, 3),
    // Pflaume-Kanal
    { type: 'river', channels: [{ id: 'kanal', points: RIVER, bank: { height: 1.0, out: 0.6, skirt: false }, deco: 0 }] },
    { type: 'river_arch', pos: [0, WS, -114], span: 9, height: 5, depth: 2.4 },
    { type: 'river_arch', pos: [1.2, WS, -130], span: 9, height: 5, depth: 2.4 },
    { type: 'riverrock', pos: [-1.8, -120], r: 0.7, h: 0.9 },
    { type: 'riverrock', pos: [2.4, -136], r: 0.8, h: 1 },
    { type: 'river_deco', items: [{ kind: 'arrow', pos: [0, -110] }, { kind: 'arrow', pos: [1.2, -126] }, { kind: 'lilies', pos: [-2.2, -140], r: 0.7, n: 3 }] },
    // Bogenhalle (Absteigen), Stern-2-Weg oben links
    S(-6, 6, -149.6, -153, FL, 4),
    S(-9.5, -6.2, -149.6, -153, FL + 7, 1.2, { under: 1 }),
    { type: 'fallblock_bruecke', id: 'oben', blocks: [[-7.8, FL + 6.4, -155], [-7.8, FL + 6.4, -157.8], [-7.8, FL + 6.4, -160.6], [-7.8, FL + 6.4, -163.4]], size: [1.6, 0.6, 1.6], mode: 'einzeln', warn: 0.5, respawn: 4, color: 'orange' },
    S(-9.6, -6, -165, -168.6, FL + 7, 1.2, { under: 1 }),
    // Fallblock-Brücke
    { type: 'fallblock_bruecke', id: 'bruecke', from: [0, FL - 0.6, -154.1], to: [0, FL - 0.6, -167.4], n: 8, size: [1.8, 0.6, 1.8], delay: 0.3, warn: 0.45, respawn: 5 },
    // rote Stachelblöcke (Pfeiler als Hindernis)
    S(-6, 6, -168.5, -200, FL, 4),
    S(-3.4, -1.6, -182, -184, FL + 3, 3),
    S(1.6, 3.4, -192.6, -194.4, FL + 3, 3),
    ROT('rot1', [[-4.5, FL, -180.5], [0, FL, -180.5], [0, FL, -185.5], [-4.5, FL, -185.5]]),
    ROT('rot2', [[4.5, FL, -196], [0, FL, -196], [0, FL, -191], [4.5, FL, -191]], { phase: 1.2 }),
    { type: 'stachelblock', id: 'rot3', pos: [-4, FL, -199], size: [2, 2, 2], color: 'rot', spikes: 'alle', move: [8, 0, 0], speed: 2.4 },
    // Stachelwand-Gang
    S(-6.2, 6.2, -200, -236, FL, 4),
    { type: 'stachelwand', id: 'wand', pos: [0, FL, -233.4], size: [7.8, 3, 1], spikes: ['+z'], move: [0, 0, 25], speed: 3.4, wait: 1.6, warn: 0.7 },
    // Endsaal
    S(4, 16, -226, -250, FL, 4),
    { type: 'pipe', id: 'p_end', pos: [9, FL, -246], height: 1.2, target: 'p_ziel' },
    { type: 'cloudcannon', id: 'kanone', pos: [14, FL, -238], target: [HX, HY, -248], arc: 6 },
    // Münzhimmel (Stern 3) mit Röhre zum Ziel
    { type: 'cloud', pos: [HX, HY - 0.6, -248], size: [5, 0.6, 5], oneWay: false },
    { type: 'cloud', pos: [HX, HY - 0.6, -256], size: [3, 0.6, 3], oneWay: false },
    { type: 'cloud', pos: [HX + 4, HY - 0.6, -262], size: [3, 0.6, 3], oneWay: false },
    { type: 'cloud', pos: [HX, HY - 0.6, -268], size: [3.4, 0.6, 3.4], oneWay: false },
    { type: 'cloud', pos: [HX - 4, HY - 0.6, -274], size: [3, 0.6, 3], oneWay: false },
    { type: 'cloud', pos: [HX, HY - 0.6, -281], size: [5, 0.6, 5], oneWay: false },
    { type: 'pipe', id: 'p_himmel', pos: [HX, HY, -282.2], height: 1.2, target: 'p_ziel' },
    // Seeufer (Ziel)
    S(-7, 7, -266, -300, FL, 4),
    { type: 'pipe', id: 'p_ziel', pos: [0, FL, -270], height: 1.2 },
    // Kulisse
    { type: 'deco_w8', items: [
      { kind: 'saeule', pos: [-4.8, 0, -4.4], height: 4.6 }, { kind: 'saeule', pos: [4.8, 0, -4.4], height: 4.2 },
      { kind: 'saeule', pos: [-4.2, FL, -98.6], height: 4 }, { kind: 'saeule', pos: [-5, FL, -266.8], height: 4.6 }, { kind: 'saeule', pos: [5, FL, -266.8], height: 4.2 },
      { kind: 'muscheln', pos: [0, 0, 2], size: [8, 8], n: 7 }, { kind: 'muscheln', pos: [0, FL, -65], size: [8, 8], n: 6 },
      { kind: 'muscheln', pos: [0, FL, -285], size: [10, 20], n: 10 }, { kind: 'anker', pos: [4.2, FL, -64], size: 1.6 },
      { kind: 'anker', pos: [-4.6, FL, -292], size: 2 },
      { kind: 'algen', pos: [-5, -6, -8], height: 3.4 }, { kind: 'algen', pos: [5, -6, -16], height: 3.8 }, { kind: 'algen', pos: [-5, -6, -22], height: 3.2 },
      { kind: 'algen', pos: [5, -6, -28], height: 3.6 }, { kind: 'algen', pos: [-4.4, FL, -146.6], height: 2.6 }, { kind: 'algen', pos: [5.4, FL, -233], height: 2.4 },
      { kind: 'algen', pos: [-6, FL, -281], height: 3 }, { kind: 'algen', pos: [6, FL, -276], height: 3.2 },
      { kind: 'fallgitter', pos: [0, FL, -235.2] },
    ] },
    { type: 'sign', pos: [-3.6, 0, 7.4], text: 'Flutverlies', size: [2.6, 0.9], yaw: 0 },
    { type: 'sign', pos: [-3.4, FL, -101], text: 'Pflaume wartet!', size: [2.6, 0.8], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [2.6, 1.9, 1.5], content: 'krallen' },
    { kind: 'question', pos: [-2.6, FL + 1.9, -64], content: 'krallen' },
    { kind: 'question', pos: [3, FL + 1.9, -151.4], content: 'krallen' },
    { kind: 'hidden', pos: [12, FL + 2.6, -232], content: 'oneup' },
    { kind: 'coinblock', pos: [2.4, FL + 2.2, -66.5], count: 6 },
  ],
  enemies: [],
  items: [
    line([-2, 0.6, 3], [2, 0.6, 3], 3),
    // Flutsaal: Spur unter Wasser
    line([0, -5.4, -8], [0, -5.4, -14], 3), line([0, -5.4, -18], [0, -5.4, -26], 4),
    // Hinweis: Münzsäule an der unsichtbaren Wand
    column(5.6, -35, FL + 1.2, FL + 7, 5),
    // Wasserkörper
    line([0, 0.6, -42.6], [0, 0.6, -44.6], 2), line([1.5, 1.2, -48.2], [1.5, 1.2, -50.2], 2), line([-0.5, 0.6, -53.8], [-0.5, 0.6, -55.8], 2),
    ...arc([0.2, 3, -45.9], [1.3, 3.6, -46.9], 2, 0.6), ...arc([1.3, 3.6, -51.5], [-0.3, 3, -52.5], 2, 0.6),
    // Stachelblöcke: Münzen an den Durchgängen
    line([-4.2, FL + 0.6, -73], [4.2, FL + 0.6, -73], 4), line([0, FL + 0.6, -79], [0, FL + 0.6, -79.6], 1), line([0, FL + 0.6, -85.4], [0, FL + 0.6, -86], 1),
    line([0, FL + 0.6, -91.6], [0, FL + 0.6, -92.2], 1), line([-3, FL + 0.6, -98], [3, FL + 0.6, -98], 3),
    // Kanal
    line([0, WS + 0.6, -110], [0, WS + 0.6, -118], 4), line([-1.6, WS + 0.6, -123], [1.6, WS + 0.6, -131], 4), line([0, WS + 0.6, -138], [0, WS + 0.6, -143], 3),
    // Fallblock-Brücke, rote Stachelblöcke, Stachelwand
    line([0, FL + 0.6, -155], [0, FL + 0.6, -166], 5),
    line([3.6, FL + 0.6, -180], [3.6, FL + 0.6, -187], 3), line([-3.6, FL + 0.6, -189], [-3.6, FL + 0.6, -196], 3),
    line([0, FL + 0.6, -203], [0, FL + 0.6, -226], 7),
    // Endsaal, Münzhimmel
    ring([9, FL + 0.6, -240], 1.8, 8),
    line([HX - 1.6, HY + 0.6, -246.4], [HX + 1.6, HY + 0.6, -249.6], 4), line([HX, HY + 0.6, -254], [HX, HY + 0.6, -258], 3),
    line([HX + 4, HY + 0.6, -260.6], [HX + 4, HY + 0.6, -263.4], 3), ...arc([HX + 4, HY + 0.6, -264], [HX, HY + 0.6, -266], 3, 1.2),
    ring([HX, HY + 0.6, -268], 1.3, 8), ...arc([HX, HY + 0.6, -270], [HX - 4, HY + 0.6, -272], 3, 1.2), line([HX - 4, HY + 0.6, -273], [HX - 4, HY + 0.6, -275], 2),
    ...arc([HX - 4, HY + 0.6, -276], [HX, HY + 0.6, -279], 3, 1.2), ring([HX, HY + 0.6, -281], 2, 10),
    // Seeufer
    line([0, FL + 0.6, -276], [0, FL + 0.6, -284], 4),
  ],
  checkpoint: [{ pos: [0, FL, -65], yaw: Math.PI / 2 }],
  stars: [
    { pos: [8.4, FL + 8.7, -35], id: 'stern_wand' },
    { pos: [-7.8, FL + 7.6, -166.8], id: 'stern_bogen' },
    { pos: [HX, HY + 1.0, -279.6], id: 'stern_himmel' },
  ],
  stamp: [-6.4, FL + 5.6, -83],
  goal: [0, FL, -292],
  marks: { start: [0, 0, 6], kante: [0, FL, -35], cp: [0, FL, -65], steg: [0, FL, -101], halle: [0, FL, -151], endsaal: [10, FL, -238], himmel: [HX, HY, -248], ziel: [0, FL, -292] },
};
