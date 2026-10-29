// 8-4 „Glimmstege der Mitternachtsfestung“ (Archetyp parcours, Bauplan 8-4: „Zeitlimit 400 s, ca. 240 m. Grundmechanik:
// fast alle Wege sind unsichtbare Stege, die nur um die Figur herum sichtbar sind und großflächig aufleuchten, wenn Suchköpfe
// oder Stampfsteine aufschlagen oder die Figur stampft. Stampfstein-Steg (50 m) → Knochenflieger-Steg zum Checkpoint (40 m)
// → Stachelwalzen (50 m) → Kanonengasse mit Projektilköpfen, dann Suchköpfen (70 m) → Warp-Box zum Ziel. Geheimnisse:
// isolierter unsichtbarer Steg vor dem Checkpoint; unsichtbare Treppe nach rechts zwischen den Kanonenabschnitten;
// Rätselbox hinter dem Stempel. Sterne: 1) isolierter Steg 2) Sternring 3) Rätselbox. Stempel: auf der unsichtbaren
// Treppe.“). Thema nightfort, Musik course_footlight.
//
// Mitternacht über Baron Brummbärs Festung: zwischen schwarzen Türmen liegen nur ein paar feste Steinbalkone, dazwischen
// führen unsichtbare Glimmstege über den Abgrund. Sie leuchten golden um die Heldin auf (Kachel für Kachel) und
// großflächig, wenn ein Stampfstein landet, ein Projektil-/Suchkopf zerplatzt oder die Heldin stampft. Bitcoin-Spuren
// verraten Ecken und Sprünge. Abschnitte (nach −Z, Stege mit Oberseite y = 0):
//   Burgbalkon (z 9 … −3):        Start, Laternen, ?-Block mit Funkenblüte, Schild.
//   Stampfstein-Steg (−3 … −58):   goldener Zickzack-Steg, drei Stampfsteine schweben über der breiten Seite – geht man
//                                  daneben vorbei, krachen sie herab und der Steg leuchtet weit voraus auf.
//   Knochenflieger-Steg (−58 … −98): türkiser Zickzack, zwei Knochenflieger-Gruppen stoßen herab (Steg 3 m breit);
//                                  links abseits schwebt ein Stern über dem Abgrund: isolierter Steg (Stern 1).
//   Laternenhof (−98 … −110):      fester Balkon mit Checkpoint und Sternring (acht Sternmünzen, ein Teil auf einer
//                                  unsichtbaren Schleife rechts – Stern 2).
//   Stachelwalzen (−110 … −162):   rosa Steg mit vier rotierenden Stachelwalzen (darüber springen), Versatz nach rechts.
//   Kanonengasse 1 (−162 … −190):  breiter goldener Steg, am Ende eine Kanone, die Projektilköpfe entgegenschießt
//                                  (ausweichen, drüberspringen oder draufspringen – sie zerplatzen und leuchten).
//   Zwischenhof (−190 … −200):     fester Balkon; rechts führt eine unsichtbare Treppe hinauf (Stempel auf der obersten
//                                  Stufe, dahinter die Rätselbox → Stampfstein-Kammer, Stern 3).
//   Kanonengasse 2 (−200 … −232):  zwei Kanonen auf Pfeilern schießen Suchköpfe; die stürzen ab und erhellen den Steg.
//   Warp-Box (−235) → Zielturm (z −260 … −286) mit Zielmast, Laternen und Feuerwerk-Glühen.
// Extraleben: unsichtbarer Block hinten am Burgbalkon. Münzblock (8 Bitcoins) in der Stampfstein-Kammer, Himmelslaternen
// steigen aus dem Abgrund, Lampionketten und Feuerschalen auf den Balkonen.

import {
  isl, line, ring, arc, stege, burgZinnen, laternen, mond, gluehwuermchen, glowPoints, Bld, NACHT, teppich, feuerschalen,
  himmelslaternen,
} from './_helpers_b.js';

const RX = 80;                 // Stampfstein-Kammer (Rätselbox-Raum), x
const S = (x0, x1, zA, zB, top = 0, o = {}) => isl(x0, x1, zA, zB, top, top + 6, { top: 'stone', ...o });

// ------------------------------------------------------------------ Glimmstege (Rechtecke [x0, x1, zA, zB, top])
const STEG_A = stege('steg_a', [
  [-1.8, 1.8, -3, -15], [-1.8, 7.8, -15, -18.6], [4.2, 7.8, -18.6, -31], [-4.8, 7.8, -31, -34.6],
  [-4.8, -1.2, -34.6, -48], [-4.8, 1.8, -48, -51.6], [-1.8, 1.8, -51.6, -58],
], { color: 'gold' });
const STEG_B = stege('steg_b', [
  [-1.5, 1.5, -58, -70], [-6.5, 1.5, -70, -73.6], [-6.5, -3.5, -73.6, -84], [-6.5, 3.5, -84, -87.6], [0.5, 3.5, -87.6, -98],
], { color: 'tuerkis' });
const STEG_ISO = stege('steg_iso', [[-11.8, -9, -77.6, -82.4]], { color: 'rosa' });
const STEG_RING = stege('steg_ring', [[4, 7.6, -99.5, -101.5], [5.6, 7.6, -101.5, -106.5], [4, 7.6, -106.5, -108.5]], { color: 'tuerkis' });
const STEG_C = stege('steg_c', [
  [-1.6, 1.6, -110, -129.4], [-1.6, 4.6, -129.4, -133], [1.4, 4.6, -133, -158.4], [-1.6, 4.6, -158.4, -162],
], { color: 'rosa' });
const STEG_D = stege('steg_d', [[-2.5, 2.5, -162, -190]], { color: 'gold' });
const TREPPE = { type: 'leuchtsteg', id: 'treppe', from: [7.2, 0.25, -195], to: [15.2, 3.45, -195], n: 5, size: [1.8, 0.3, 1.8], color: 'rosa' };
const STEG_TOP = stege('steg_top', [[16.3, 19.7, -193.2, -196.8, 3.75]], { color: 'rosa' });
const STEG_E = stege('steg_e', [
  [-2.5, 2.5, -200, -211], [-2.5, 6.5, -211, -214.6], [3.5, 6.5, -214.6, -224], [-2.5, 6.5, -224, -227.6], [-2.5, 2.5, -227.6, -232],
], { color: 'tuerkis' });
// Stampfstein-Kammer
const STEG_R = stege('steg_r', [
  [RX - 1.6, RX + 1.6, -190, -197], [RX - 1.6, RX + 6.6, -197, -200.6], [RX + 3.4, RX + 6.6, -200.6, -207], [RX + 1.4, RX + 8.6, -207, -212],
], { color: 'gold' });

// ------------------------------------------------------------------ Stachelwalzen (rotierend, darüber springen)
const WR = 0.6, WH = WR + 0.55;
const WALZE = (id, x, z, speed = 1.3) => ({ type: 'stachelwalze_rot', id, pos: [x, WH, z], radius: WR, length: 3.4, axis: 'x', speed, stand: true, shadow: false });

function build(level) {
  // Zinnen an den festen Balkonen (dort, wo man nicht weitergeht)
  burgZinnen(level, [
    { x0: -5, x1: 5, zA: 9, zB: -3, edges: 'lrf' },
    { x0: -4, x1: 4, zA: -98, zB: -110, edges: 'l' },
    { x0: -5, x1: 5, zA: -190, zB: -200, edges: 'l' },
    { x0: -7, x1: 7, zA: -260, zB: -286, edges: 'lrb' },
    { x0: RX - 4, x1: RX + 4, zA: -183, zB: -190, edges: 'lrf' },
  ]);
  laternen(level, [
    [-4.2, 0, 8.2], [4.2, 0, 8.2], [-4.2, 0, -2.4], [4.2, 0, -2.4],
    [-3.4, 0, -98.6], [3.4, 0, -98.6], [-3.4, 0, -109.4], [3.4, 0, -109.4],
    [-4.4, 0, -190.6], [4.4, 0, -190.6], [-4.4, 0, -199.4], [4.4, 0, -199.4],
    [-6.2, 0, -260.8], [6.2, 0, -260.8], [-6.2, 0, -285.2], [6.2, 0, -285.2], [-6.2, 0, -273], [6.2, 0, -273],
    [RX - 3.4, 0, -183.6], [RX + 3.4, 0, -183.6],
  ]);
  // Wegweiser-Funkeln an den Ecken der Stege (schwach, nur als Hinweis über dem Abgrund)
  glowPoints(level, [[6, 0.2, -16.8, 1.4], [-3, 0.2, -32.8, 1.4], [-5, 0.2, -71.8, 1.4], [2, 0.2, -85.8, 1.4], [3, 0.2, -131.2, 1.4], [4.6, 0.2, -212.8, 1.4]],
    { color: 0xffe8a0, opacity: 0.35, pulse: 0.6 });
  teppich(level, [
    [-1.6, 1.6, 8.4, -3, 0], [-2.4, 2.4, -98, -110, 0, 0x2a4ab0], [-1.6, 1.6, -190, -200, 0, 0x6a2ab0],
    [-1.8, 1.8, -260, -286, 0], [RX - 1.4, RX + 1.4, -183, -190, 0, 0x2a8a6a],
  ]);
  feuerschalen(level, [[-3.4, 0, -105.5], [3.4, 0, -105.5, 0x6ad0ff], [-4, 0, -195], [-5.6, 0, -280], [5.6, 0, -280, 0xff6ad8], [RX + 3, 0, -188.6]]);
  himmelslaternen(level, [-28, 28, -12, 12, 6, -290], 80, {
    avoid: [[-5, 8, 9, -60], [-7, 4, -58, -112], [-2, 5, -110, -200], [-3, 7, -200, -238], [-7, 7, -258, -286]],
  });
  mond(level, [-70, 70, -330], 11);
  gluehwuermchen(level, [[-6, 6, 0.6, 3.5, 8, -3, 10], [-5, 5, 0.6, 3, -98, -110, 8], [-7, 7, 0.6, 3.5, -260, -286, 14], [RX - 4, RX + 9, 0.6, 3, -184, -212, 8]]);
  // Burgbalkon: Baron-Wappen und Fahnenstangen hinten
  const b = new Bld();
  for (const [x, z] of [[-4.6, 8.6], [4.6, 8.6]]) { b.cyl(0.08, 0.1, 4.6, x, 0, z, 0x6a6e88, 8); b.sphere(0.16, x, 4.7, z, NACHT.gold); }
  b.flush(level, { castShadow: false });
}

export const LEVEL = {
  id: '8-4',
  world: 8,
  title: 'Glimmstege der Mitternachtsfestung',
  archetype: 'parcours',
  theme: 'nightfort',
  music: 'course_footlight',
  timeLimit: 400,
  killY: -14,
  build,
  start: { pos: [0, 0, 5], yaw: Math.PI / 2 },
  instances: { coin: { farHide: 40, shadow: false } },
  camera: [
    { from: 14, to: -60, pitch: 48, dist: 14, ahead: 2.5, area: [-40, 40] },
    { from: -60, to: -112, pitch: 50, dist: 15, ahead: 2.5, area: [-40, 40] },
    { from: -112, to: -165, pitch: 47, dist: 14, ahead: 2.5, area: [-40, 40] },
    { from: -165, to: -240, pitch: 46, dist: 15, ahead: 3, area: [-40, 40] },
    { from: -240, to: -300, pitch: 42, dist: 14, ahead: 2, area: [-40, 40] },
    { from: -170, to: -220, pitch: 52, dist: 15, ahead: 2, area: [60, 110], x: RX + 3, xLock: 0.3 },
  ],
  segments: [
    // feste Balkone
    S(-5, 5, 9, -3),
    S(-4, 4, -98, -110),
    S(-5, 5, -190, -200),
    { ...S(-2.6, 2.6, -232, -238), under: 0 },
    S(-7, 7, -260, -286),
    S(RX - 4, RX + 4, -183, -190),
    // Pfeiler der Kanonen (Kanonengasse 2)
    S(-7.4, -5, -206, -208.4, 0.2), S(8, 10.4, -219, -221.4, 0.2),
    // Glimmstege
    STEG_A, STEG_B, STEG_ISO, STEG_RING, STEG_C, STEG_D, TREPPE, STEG_TOP, STEG_E, STEG_R,
    // Stachelwalzen
    WALZE('walze1', 0, -118), WALZE('walze2', 0, -125, -1.3), WALZE('walze3', 3, -141), WALZE('walze4', 3, -151, -1.3),
    // Kulisse: Türme, Fahnen, Fackeln (Optik)
    { type: 'deco_w7', shadow: false, items: [
      { kind: 'burgturm', pos: [-30, -18, -40], height: 26, radius: 3 }, { kind: 'burgturm', pos: [32, -18, -110], height: 27, radius: 3 },
      { kind: 'burgturm', pos: [-31, -18, -190], height: 26, radius: 3 }, { kind: 'burgturm', pos: [-15, -14, -276], height: 22, radius: 2.8 },
      { kind: 'burgturm', pos: [15, -14, -282], height: 20, radius: 2.6 },
      { kind: 'fahne', pos: [-3.6, 0, 7.6], height: 4.4 }, { kind: 'fahne', pos: [3.6, 0, 7.6], height: 4.4, color: 'lila' },
      { kind: 'fahne', pos: [-3, 0, -108.8], height: 4 }, { kind: 'fahne', pos: [-4.4, 0, -198.8], height: 4, color: 'lila' },
      { kind: 'fahne', pos: [-5, 0, -284.6], height: 5 }, { kind: 'fahne', pos: [5, 0, -284.6], height: 5, color: 'lila' },
      { kind: 'kette', pos: [-3.6, 7, -40], length: 5 }, { kind: 'kette', pos: [4, 7, -150], length: 5 },
      { kind: 'knochen', pos: [3.2, 0, -105], n: 3 }, { kind: 'wappen', pos: [0, 2.6, -285.6], size: 1.8, yaw: 0 },
    ] },
    // bunte Lampionketten über den festen Balkonen (Rummel-Nacht in der Festung)
    { type: 'deco_w8', shadow: false, items: [
      { kind: 'lampions', from: [-4.6, 3.8, -2.8], to: [4.6, 3.8, -2.8], sag: 0.6 },
      { kind: 'lampions', from: [-3.6, 3.6, -98.8], to: [3.6, 3.6, -98.8], sag: 0.6 }, { kind: 'lampions', from: [-4.6, 3.6, -199.6], to: [4.6, 3.6, -199.6], sag: 0.6 },
      { kind: 'lampions', from: [-6.4, 4.4, -261], to: [6.4, 4.4, -261], sag: 0.9 }, { kind: 'lampions', from: [-6.4, 4.4, -273], to: [6.4, 4.4, -273], sag: 0.9 },
      { kind: 'lampions', from: [RX - 3.6, 3.6, -183.8], to: [RX + 3.6, 3.6, -183.8], sag: 0.6 },
    ] },
    { type: 'sign', pos: [-3.2, 0, 7], text: 'Mitternachtsfestung', size: [3.2, 0.9], yaw: 0 },
    { type: 'sign', pos: [-3.4, 0, -109], text: 'Glimmstege!', size: [2.4, 0.8], yaw: 0 },
    { type: 'sign', pos: [RX - 2.8, 0, -184.2], text: 'Stampfstein-Kammer', size: [3.2, 0.8], yaw: 0 },
  ],
  blocks: [
    { kind: 'question', pos: [2.4, 1.8, 2.5], content: 'funken' },
    { kind: 'hidden', pos: [3.6, 2.6, 7.4], content: 'oneup' },
    { kind: 'coinblock', pos: [RX - 2.4, 2.4, -186], count: 8 },
  ],
  enemies: [
    // Stampfsteine über der breiten Seite des goldenen Stegs (daneben vorbeigehen → Absturz, der Steg leuchtet auf)
    { kind: 'stampfstein', id: 'stampf1', pos: [0.8, 3.6, -10], trigger: 1.0, wait: 1.4 },
    { kind: 'stampfstein', id: 'stampf2', pos: [5.2, 3.6, -25], trigger: 1.0, wait: 1.4 },
    { kind: 'stampfstein', id: 'stampf3', pos: [-2.2, 3.6, -42], trigger: 1.0, wait: 1.4 },
    // Knochenflieger-Gruppen über dem türkisen Steg
    { kind: 'knochenflieger_gruppe', id: 'kg1', pos: [-5, 4.6, -78], count: 4, formation: 'ring', radius: 1.6, center: [-5, 4.6, -78], orbit: 1.8, sight: 6.5, respawn: 4 },
    { kind: 'knochenflieger_gruppe', id: 'kg2', pos: [2, 4.6, -92], count: 3, formation: 'linie', path: [[2, 4.6, -89], [2, 4.6, -96]], loop: false, sight: 6.5, respawn: 4, phase: 0.5 },
    // Kanonengasse 1: Projektilköpfe von vorn
    { kind: 'kanone_turm', id: 'kanone1', pos: [0, 0, -193.5], dir: [0, 1], height: 1.4, shot: 'projektilkopf', interval: 2.8, first: 1.2, range: 24, speed: 5, life: 7, max: 3 },
    // Kanonengasse 2: Suchköpfe von den Pfeilern
    { kind: 'kanone_turm', id: 'kanone2', pos: [-6.2, 0.2, -207.2], dir: [1, 0], height: 1.6, shot: 'suchkopf', interval: 3.6, first: 1.0, range: 15, seek: 2.4, life: 4.5, track: true, max: 2 },
    { kind: 'kanone_turm', id: 'kanone3', pos: [9.2, 0.2, -220.2], dir: [-1, 0], height: 1.6, shot: 'suchkopf', interval: 3.6, first: 2.6, range: 15, seek: 2.4, life: 4.5, track: true, max: 2 },
    // Stampfstein-Kammer
    { kind: 'stampfstein', id: 'kammer1', pos: [RX + 0.6, 3.6, -194.5], trigger: 0.8, wait: 1.6 },
    { kind: 'stampfstein', id: 'kammer2', pos: [RX + 4.2, 3.6, -204], trigger: 0.8, wait: 1.6 },
  ],
  items: [
    // Burgbalkon
    line([-2, 0.6, 1], [2, 0.6, 1], 3),
    // Stampfstein-Steg: Spur an der Laufseite, Ecken markiert
    line([-1, 0.6, -5], [-1, 0.6, -13], 4), line([0, 0.6, -16.8], [4, 0.6, -16.8], 3),
    line([7, 0.6, -20], [7, 0.6, -29], 4), line([4, 0.6, -32.8], [-2, 0.6, -32.8], 4),
    line([-4, 0.6, -36], [-4, 0.6, -46], 4), line([-2.5, 0.6, -49.8], [0, 0.6, -52], 2),
    // Knochenflieger-Steg
    line([0, 0.6, -60], [0, 0.6, -68], 4), line([-2, 0.6, -71.8], [-4, 0.6, -71.8], 2),
    line([-5, 0.6, -75], [-5, 0.6, -82], 3), line([-3, 0.6, -85.8], [0, 0.6, -85.8], 2), line([2, 0.6, -89], [2, 0.6, -96], 4),
    // Stachelwalzen: Bögen über die Walzen
    ...arc([0, 0.6, -115.6], [0, 0.6, -120.4], 3, 2.4), ...arc([0, 0.6, -122.6], [0, 0.6, -127.4], 3, 2.4),
    ...arc([3, 0.6, -138.6], [3, 0.6, -143.4], 3, 2.4), ...arc([3, 0.6, -148.6], [3, 0.6, -153.4], 3, 2.4),
    // Kanonengasse
    line([-1.6, 0.6, -165], [-1.6, 0.6, -186], 6), line([0, 0.6, -202], [0, 0.6, -209], 3),
    line([5, 0.6, -216], [5, 0.6, -222], 3), line([0, 0.6, -226], [0, 0.6, -230], 2),
    // Treppe (Hinweis) und Ziel
    line([7.2, 1.1, -195], [11.2, 2.7, -195], 3),
    ring([0, 0.6, -268], 2.2, 8),
    // Sternring (Stern 2): Laternenhof und die unsichtbare Schleife rechts
    { kind: 'starring', id: 'sternring', pos: [-2, 0, -101], star: 1, time: 15,
      coins: [[-2.6, 0.6, -106], [0, 2.4, -104], [2.6, 0.6, -101], [5, 0.6, -100.5], [6.6, 0.6, -102.6], [6.6, 0.6, -105.6], [5, 0.6, -107.5], [2.6, 0.6, -108]] },
    // Rätselbox: hinter dem Stempel → Stampfstein-Kammer (Stern 3), Rückweg in derselben Box
    { kind: 'warpbox', id: 'rb1', style: 'mystery', pos: [18.8, 3.75, -195], target: 'rb2' },
    { kind: 'warpbox', id: 'rb2', style: 'mystery', pos: [RX + 2.2, 0, -186.5], target: 'rb1' },
    line([RX, 0.6, -191], [RX, 0.6, -196], 3), line([RX + 5, 0.6, -199], [RX + 5, 0.6, -206], 3),
    // Warp-Box zum Ziel
    { kind: 'warpbox', id: 'warp_ziel', pos: [0, 0, -235.6], target: [0, 0.2, -264] },
  ],
  checkpoint: [{ pos: [0, 0, -103.5], yaw: Math.PI / 2 }],
  stars: [
    { pos: [-10.4, 0.9, -80], id: 'stern_iso' },
    { pos: [-2, 0.6, -101], hidden: true, id: 'stern_ring' },
    { pos: [RX + 5, 0.9, -210.4], id: 'stern_kammer' },
  ],
  stamp: [15.2, 4.35, -195],
  goal: [0, 0, -279],
  marks: {
    start: [0, 0, 5], cp: [0, 0, -103.5], hof: [0, 0, -195], kammer: [RX, 0, -187], ziel: [0, 0, -279], warp: [0, 0, -235.6],
  },
};
