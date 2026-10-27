// 5-6 „Flipp-Flapp-Tortenland“ – Torten-Welt mit Rot-Blau-Flippern (Bauplan: Detail 5-6). Thema cake, Musik course_cake,
// 400 s, ≈ 215 m nach −Z; es geht stufenweise hinauf (y 1 → 4 → 9 → 12).
//
// Grundregel (Schild am Start): Jeder Sprung – auch der eines Klons – wechselt die feste Farbe. Felder der festen Farbe
// tragen (farbige Platte mit ● bzw. ◆), die andere Farbe zeigt nur ein durchscheinendes Gitter: man fällt hindurch. Wer
// auf ein Feld der anderen Farbe will, springt hinüber (der Sprung macht es fest); auf festem Tortenboden kann man auf der
// Stelle hüpfen, bis die Farbe passt.
//
// Abschnitte:
//   1  Tortenstart        z   9 …  −4   Startplatte mit Kerzen, Riesen-Erdbeeren, Keksen; Regel-Schild.
//      Übungsfeld        z  −4 … −10   drei Reihen Rot/Blau über einer flachen Sahnemulde (harmlos: hinausspringen).
//   2  Rot-Blau-Felder   z −10 … −46   Rastplatte, Feld 1 (5 × 7 Schachbrett über dem Abgrund), Rastplatte mit Pilzling,
//                                     Feld 2 (6 × 6 mit Lücken) – in seiner hinteren linken Ecke steht Stern 0 auf
//                                     einem blauen Feld.
//   3  ?-Blöcke          z −46 … −54   Keks-Insel mit vier ?-Blöcken (Spiegelfrucht, Münzen, Funkenblüte), Pilzlinge.
//   4  Wechselplattformen I z −54 … −79  sechs rot/blaue Plattformen im Zickzack, je 0,6 m höher.
//   5  Steigung          z −79 … −108  Sahnehang hinauf (y 4 → 9) mit Pilzlingen, Zuckerstangen, Münzbögen.
//   6  Checkpoint        z −108 … −120 Kirschtorten-Plateau; links die grüne Röhre mit Schnappblume obenauf → Kugel-
//                                     Rätselraum (Stern 1: Bonbon-Kugel auf das P-Feld bugsieren).
//   7  Feuerring-Platz   z −120 … −160 zwei Puls-Feuerringe (versetzt) und ein Flammenrad, Schnappblumen, Pilzlinge.
//   8  Wechselplattformen II z −160 … −195  enger und höher, dazwischen die Sternring-Torte (Stern 2: acht Sternmünzen in
//                                     10 s – drei davon über den nächsten Wechselplattformen).
//   9  Ziel              z −195 … −214  Zieltorte: ?-Block mit Spiegelfrucht, 2er-Lift (mit Klon) hinauf zur Stempel-
//                                     Etage, Zielmast.
//   Kugel-Rätselraum (abseits, x ≈ 70): Konditorei-Backbrett mit Zuckerwürfel-Mauer, Kugel und P-Feld.
// Sterne (Index): 0 blaue Ecke von Feld 2, 1 Kugel-Rätsel, 2 Sternring. Stempel: oben über dem 2er-Lift.
// Extraleben: im Kugel-Raum (Ziegel über der Lücke neben der Zuckerwürfel-Mauer) und versteckter Block über der
// Startplatte.
// Gegner: Feuerring 4, Schnappblume 3, Pilzling 7.

import {
  isl, line, ring, arc, sign, creamRims, icingDrips, sprinkles, candles, berries, cookies, candyCanes, sugarCubes, lollipops,
  cakeTowers, candyFence, creamClouds, sparkleField, flipperNoShadow, icingSplats, chocoDrops, rampSprinkles, CAKE,
  glazeTops, floatingSweets,
} from './_helpers_c.js';

const Y0 = 1;      // Start, Felder
const Y1 = 4;      // nach Wechselplattformen I
const Y2 = 9;      // Checkpoint, Feuerring-Platz
const Y3 = 10.5;   // Sternring-Torte
const Y4 = 12;     // Zieltorte
const XR = 70;     // Kugel-Rätselraum

// Wechselplattformen (Mitte der Oberseite, Größe [w, d], Farbe)
const WP1 = [
  [0, Y0, -56, 'rot'], [1.6, Y0 + 0.6, -59.6, 'blau'], [-0.6, Y0 + 1.2, -63.2, 'rot'],
  [1.4, Y0 + 1.8, -66.8, 'blau'], [-1.0, Y0 + 2.4, -70.4, 'rot'], [0.6, Y0 + 3.0, -74, 'blau'],
];
const WP2 = [
  [0, Y2, -162.6, 'rot'], [2.8, Y2 + 0.5, -165.8, 'blau'], [2.8, Y2 + 1.0, -169.4, 'rot'], [0, Y2 + 1.5, -172.6, 'blau'],
];
const WP3 = [
  [-2.2, Y3 + 0.5, -185.6, 'rot'], [0, Y3 + 1.0, -188.8, 'blau'], [2.2, Y3 + 1.5, -192, 'rot'],
];
const plat = (list, w = 2.8, d = 2.4) => list.map(([x, y, z, color]) => ({ pos: [x, y, z], size: [w, d], color }));

function build(level) {
  // ---------------------------------------------------------------- Glasur-Kacheln: jede Tortenplatte eine Sorte
  glazeTops(level, [
    [-6.4, 6.4, 8.4, -3.4, Y0, CAKE.rosa, 0xfff0f6],                    // Start: Erdbeer-Vanille
    [-6.4, 6.4, -10.4, -13.6, Y0, CAKE.minze, 0xe6fff4, 1.6],           // Rastplatte 1: Minze
    [-5.4, 5.4, -26.8, -31.6, Y0, CAKE.himmel, 0xeefaff, 1.6],          // Rastplatte 2: Blaubeer
    [-6.4, 6.4, -46.4, -53.6, Y0, 0xffe680, 0xfff8d8, 1.8],             // ?-Insel: Zitrone
    [-5.4, 5.4, -77, -79.6, Y1, CAKE.lila, 0xf2eaff, 1.3],              // Hangfuß: Lavendel
    [-7.4, 7.4, -108.4, -119.6, Y2, 0xf4c070, 0xffeccc],                // Checkpoint: Karamell
    [-7.4, 7.4, -120.4, -159.6, Y2, 0xff8ac0, 0xfff4f8],                // Feuerring-Platz: Erdbeer
    [-3.8, 3.8, -175.4, -182.2, Y3, CAKE.minze, 0xe6fff4, 1.5],         // Sternring-Torte: Minze
    [-7.4, 7.4, -194.8, -213.6, Y4, CAKE.lila, 0xf2eaff],               // Zieltorte: Lavendel
    [2.9, 7.1, -206.7, -210.3, Y4 + 6.5, 0xffe680, 0xfff8d8, 1.4],      // Stempel-Etage: Zitrone
    [XR - 7.4, XR + 7.4, -108.4, -127.6, Y2, CAKE.himmel, 0xeefaff],    // Kugel-Raum: Blaubeer
  ]);
  // Kulisse: schwebende Macarons und Donuts links und rechts der Strecke (unter den Platten, ohne Schatten)
  floatingSweets(level, [
    [-12.5, Y0 - 3, -8, 2.6, 'macaron', CAKE.minze], [13.5, Y0 - 4, -24, 3, 'macaron', CAKE.lila, 0.4],
    [-13, Y0 - 2.5, -40, 2.4, 'donut', 0xff7ab8, 0.5], [12.5, Y0 - 3, -60, 2.8, 'macaron', CAKE.zitrone],
    [-12.5, Y1 - 4, -86, 3, 'donut', 0x9ad8ff, -0.4], [13, Y1 - 3, -100, 2.6, 'macaron', 0xff9ad0],
    [-14, Y2 - 4, -132, 3, 'macaron', CAKE.himmel], [14.5, Y2 - 5, -150, 3.2, 'donut', 0xffe070, 0.3],
    [-12.5, Y2 - 3, -168, 2.6, 'macaron', CAKE.lila], [12, Y3 - 4, -184, 2.4, 'macaron', CAKE.minze],
    [-13.5, Y4 - 4, -204, 3, 'donut', 0xff7ab8, -0.3], [14, Y4 - 5, -216, 2.8, 'macaron', CAKE.zitrone],
    [XR + 13, Y2 - 4, -114, 2.8, 'macaron', 0xff9ad0], [XR - 13, Y2 - 3, -124, 2.6, 'donut', 0x9af0c8],
  ]);
  // ---------------------------------------------------------------- Sahne, Glasur, Streusel an den Tortenplatten
  creamRims(level, [
    [-7, 7, 9, -4, Y0, 0.9, CAKE.sahne], [-7, 7, -10, -14, Y0, 0.9, CAKE.sahne, '+z,-z'], [-6, 6, -26.4, -32, Y0, 0.9, CAKE.sahne, '+z,-z'],
    [-7, 7, -46, -54, Y0, 0.9, 0xfff4c0], [-6, 6, -76.6, -80, Y1, 0.9, CAKE.sahne, '+z'],
    [-8, 8, -108, -120, Y2, 0.9, CAKE.sahne], [-8, 8, -120, -160, Y2, 1.0, 0xffe0f0, '-x,+x'],
    [-4.4, 4.4, -175, -182.6, Y3, 0.8, CAKE.sahne], [-8, 8, -194.4, -214, Y4, 0.9, CAKE.sahne],
    [XR - 8, XR + 8, -108, -128, Y2, 1.0, 0xfff4c0],
  ]);
  icingDrips(level, [
    [-7, 7, 9, Y0, CAKE.pink], [-7, 7, -46, Y0, CAKE.schoko], [-6, 6, -76.6, Y1, CAKE.pink], [-8, 8, -108, Y2, 0xff8ac8],
    [-4.4, 4.4, -175, Y3, CAKE.minze], [-8, 8, -194.4, Y4, CAKE.pink], [XR - 8, XR + 8, -108, Y2, CAKE.schoko],
  ]);
  sprinkles(level, [
    [-6, 6, 8, -3, Y0, 60], [-5, 5, -10.4, -13.6, Y0, 20], [-5, 5, -26.6, -31.8, Y0, 22], [-6, 6, -46.4, -53.6, Y0, 34],
    [-5, 5, -77.2, -79.8, Y1, 14], [-7, 7, -108.4, -119.6, Y2, 44], [-7, 7, -121, -159, Y2, 90], [-3.6, 3.6, -176, -182.2, Y3, 24],
    [-7, 7, -195.4, -213.6, Y4, 60], [XR - 7, XR + 7, -109, -127, Y2, 50],
  ]);
  candles(level, [
    [-5.6, Y0, 7, 1.4], [5.8, Y0, 6.4, 1.1], [-6, Y0, -2.6, 1.2], [6.2, Y0, -2.8, 1.5],
    [-6.2, Y0, -48, 1.2], [6.2, Y0, -52, 1.3], [-7, Y2, -110, 1.6], [7, Y2, -111, 1.3], [-7.2, Y2, -125, 1.4], [7.2, Y2, -137, 1.2],
    [-7.2, Y2, -150, 1.5], [7.2, Y2, -156, 1.3], [-3.8, Y3, -181.8, 1.1], [3.8, Y3, -181.8, 1.1],
    [-7, Y4, -197, 1.4], [7.2, Y4, -212, 1.5], [-7.2, Y4, -212.6, 1.2], [XR - 7, Y2, -109.6, 1.3], [XR + 7, Y2, -126.6, 1.5],
  ]);
  berries(level, [
    [5.4, Y0, 3.4, 1.6], [-5.2, Y0, 0.6, 1.3], [5.6, Y0, -30.6, 1.0], [-6.2, Y0, -50.8, 1.4], [6.2, Y2, -116, 1.5], [-6.4, Y2, -140, 1.2],
    [6.4, Y2, -146, 1.4], [-6.6, Y4, -205, 1.6], [3.6, Y3, -176.6, 0.9], [XR + 6, Y2, -112, 1.4],
  ]);
  cookies(level, [
    [-4.8, Y0, 4.8, 1.3, 0], [6, Y0, -0.2, 1.1, 0, 'doppel', 0.4], [-5.4, Y0, -29.6, 1.0, 0], [5.6, Y0, -47.6, 1.2, 0, 'doppel'],
    [-6.6, Y2, -131, 1.3, 0], [6.6, Y2, -128, 1.1, 0, 'doppel'], [6.4, Y4, -198.4, 1.2, 0], [XR - 6, Y2, -125, 1.2, 0, 'doppel'],
  ]);
  candyCanes(level, [
    [-6.2, Y1 + 0.3, -82, 2.6, 0.3], [6.2, Y1 + 1.6, -90, 2.4, Math.PI - 0.3, 0x2a9aff], [-6.2, Y1 + 3, -99, 2.6, 0.2, 0x3ac06a],
    [6.2, Y2 - 0.2, -106, 2.8, Math.PI], [-7.2, Y4, -201, 3.0, 0.4], [7.3, Y4, -206, 2.6, Math.PI - 0.2, 0x2a9aff],
  ]);
  lollipops(level, [[-6, Y2, -120.6, 1.1, 0xff5ab0], [6.4, Y2, -159, 1.2, 0x5ac8ff], [-6.6, Y0, -45.6, 1.0, 0xffd23d], [XR + 7, Y2, -110, 1.0, 0x9a6aff]]);
  sugarCubes(level, [[5.6, Y0, 7.6, 0.6, 0xffffff, 0.3], [6.4, Y0, 7.2, 0.45, 0xffd8ec, 0.7], [-6.4, Y2, -113, 0.6, 0xffffff, 0.2], [6.4, Y4, -210.4, 0.6, 0xffe8a8, 0.5]]);
  candyFence(level, [
    [[-7.6, Y2, -108.6], [-7.6, Y2, -119], 1.2], [[7.6, Y2, -108.6], [7.6, Y2, -119], 1.2, 0x7ad8ff],
    [[-7.6, Y4, -195.6], [-7.6, Y4, -213.4], 1.2], [[7.6, Y4, -195.6], [7.6, Y4, -201.2], 1.2, 0x7ad8ff],
  ]);
  // Kulisse: Etagentorten und Sahnewolken weit außen (ohne Schatten)
  cakeTowers(level, [
    [-24, -14, 10, 9, 3], [26, -16, -10, 8, 3], [-28, -15, -44, 10, 3], [30, -16, -70, 9, 3], [-26, -14, -96, 8, 4],
    [28, -15, -126, 10, 3], [-30, -14, -160, 9, 3], [27, -13, -192, 8, 4], [-22, -12, -224, 8, 3], [16, -12, -236, 9, 3],
  ]);
  creamClouds(level, [[-18, 14, -20, 4], [20, 18, -60, 5], [-22, 22, -110, 4.5], [18, 24, -150, 5], [-14, 26, -205, 4]]);
  // Glasur-Kleckse, Schokotropfen, Streusel auf dem Sahnehang
  icingSplats(level, [
    [-3.6, Y0, 6.2, 1.1, 0xffe070], [3.8, Y0, -1.2, 0.9, 0x9ae8ff], [-4.2, Y0, -30.6, 0.8, 0xc8a8ff], [3.4, Y0, -48.2, 1.0, 0x9af0c8],
    [-4.8, Y2, -114.4, 1.2, 0xffe070], [4.6, Y2, -118.6, 0.9, 0xc8a8ff], [-4.4, Y2, -126, 1.3, 0x9ae8ff], [4.8, Y2, -136, 1.1, 0xffe070],
    [-4.6, Y2, -151, 1.2, 0x9af0c8], [4.4, Y2, -157, 0.9, 0xff9ad8], [-2.6, Y3, -176.2, 0.7, 0xffe070], [-5, Y4, -207.6, 1.3, 0x9ae8ff],
    [4.6, Y4, -196.4, 0.9, 0xffe070], [-3.6, Y4, -212, 1.0, 0xc8a8ff], [XR + 4.6, Y2, -112, 1.2, 0xffe070], [XR - 5, Y2, -120.6, 1.0, 0x9ae8ff],
  ]);
  chocoDrops(level, [
    [-6, 6, 8, -3, Y0, 8], [-6, 6, -46.4, -53.6, Y0, 6], [-7, 7, -108.6, -119.4, Y2, 8], [-7, 7, -121, -159, Y2, 16], [-7, 7, -196, -213, Y4, 10],
  ]);
  rampSprinkles(level, [[-4.4, 4.4, -80.4, -106.6, Y1, Y2, 70]]);
  // Geburtstagstorte hinter dem Zielmast
  cakeTowers(level, [[0, Y4 - 5.5, -223, 6.5, 3, CAKE.rosa]]);
  // Zuckerwürfel auf der Mauer im Kugel-Raum
  const cubes = [];
  for (let i = 0; i < 19; i++) cubes.push([XR - 7.7 + i * 0.6, Y2 + 1.2, -118, 0.56, i % 4 === 1 ? 0xffd8ec : 0xffffff, (i % 3) * 0.08]);
  sugarCubes(level, cubes);
}

function setup(level) {
  flipperNoShadow(level);
  sparkleField(level, { min: [-10, Y0, -60], max: [10, Y0 + 8, 6], n: 40, size: 0.32, color: 0xffd8f8 });
  sparkleField(level, { min: [-10, Y2, -214], max: [10, Y4 + 10, -110], n: 50, size: 0.32, color: 0xfff0c0 });
}

export const LEVEL = {
  id: '5-6',
  world: 5,
  title: 'Flipp-Flapp-Tortenland',
  archetype: 'parcours',
  theme: 'cake',
  music: 'course_cake',
  timeLimit: 400,
  flipperStart: 'rot',
  killY: -14,
  farHide: 46,                      // Gegner weiter als 46 m von der Figur werden nicht gezeichnet (Feuerringe, Pilzlinge)
  build,
  setup,
  start: { pos: [0, Y0, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -10, pitch: 46, dist: 13 },
    { from: -10, to: -46, pitch: 52, dist: 14 },
    { from: -46, to: -79, pitch: 46, dist: 14, height: 1.6 },
    { from: -79, to: -108, pitch: 42, dist: 13.5 },
    { from: -108, to: -160, pitch: 46, dist: 14 },
    { from: -160, to: -195, pitch: 48, dist: 14, height: 1.5 },
    { from: -195, to: -220, pitch: 44, dist: 13.5 },
    // Kugel-Rätselraum
    { from: -100, to: -135, pitch: 54, dist: 15, area: [XR - 14, XR + 14] },
  ],
  segments: [
    // ============================================================ 1 Tortenstart + Übungsfeld
    isl(-7, 7, 9, -4, Y0, 5),
    isl(-4.2, 4.2, -4, -10, Y0 - 1.6, 3.4, { under: 0 }),                // Sahnemulde unter dem Übungsfeld
    { type: 'flipper', id: 'uebung', pos: [0, Y0, -7], grid: [3, 3], cell: 2, pattern: 'rows', first: 'rot' },
    sign(-4.4, Y0, 2.2, 'Jeder Sprung\nwechselt die Farbe!', { size: [3.0, 1.0] }),
    // ============================================================ 2 Rot-Blau-Felder
    isl(-7, 7, -10, -14, Y0, 5),
    { type: 'flipper', id: 'feld1', pos: [0, Y0, -20.2], grid: [5, 6], cell: 2, pattern: 'checker', first: 'blau' },
    isl(-6, 6, -26.4, -32, Y0, 5),
    { type: 'flipper', id: 'feld2', pos: [0, Y0, -39], map: ['rb.brb', 'brbrbr', 'r.rbr.', 'brbr.r', 'rbrbrb', 'brbrbr'], cell: 2 },
    // ============================================================ 3 ?-Blöcke
    isl(-7, 7, -46, -54, Y0, 5),
    // ============================================================ 4 Wechselplattformen I
    { type: 'flipper', id: 'wechsel1', platforms: plat(WP1) },
    isl(-6, 6, -76.6, -80, Y1, 5),
    // ============================================================ 5 Steigung
    { type: 'ramp', pos: [0, Y1, -93.5], size: [10, Y2 - Y1, 27], axis: 'z', dir: -1 },
    isl(-5, 5, -80, -107, Y1, 6, { under: 0 }),
    isl(-8, 8, -107, -108, Y2, 11, { under: 0 }),
    // ============================================================ 6 Checkpoint + Röhre zum Kugel-Raum
    isl(-8, 8, -108, -120, Y2, 6),
    { type: 'pipe', id: 'roehre_kugel', pos: [-5, Y2, -116.4], height: 1.4, target: 'kugel_ein' },
    sign(-2.2, Y2, -116.8, 'Konditorei →', { size: [2.0, 0.8] }),
    // ============================================================ 7 Feuerring-Platz
    isl(-8, 8, -120, -160, Y2, 6),
    // ============================================================ 8 Wechselplattformen II + Sternring-Torte
    { type: 'flipper', id: 'wechsel2', platforms: plat(WP2, 2.6, 2.2) },
    isl(-4.4, 4.4, -175, -182.6, Y3, 6),
    { type: 'flipper', id: 'wechsel3', platforms: plat(WP3, 2.6, 2.2) },
    // ============================================================ 9 Zieltorte
    isl(-8, 8, -194.4, -214, Y4, 7),
    { type: 'multilift', id: 'zweierlift', pos: [5, Y4, -203.6], rise: 6, need: 2, size: [4, 0.5, 4], color: 'pink' },
    isl(2.6, 7.4, -206.4, -210.6, Y4 + 6.5, 1.4, { under: 1.2 }),       // Stempel-Etage
    sign(1.2, Y4, -199.6, '2er-Lift:\nzu zweit!', { size: [2.0, 0.9] }),
    // ============================================================ Kugel-Rätselraum (Konditorei)
    isl(XR - 8, XR + 8, -108, -128, Y2, 5),
    // Zuckerwürfel-Mauer quer durch das Backbrett (Lücke rechts), Randmauern
    { type: 'wall', pos: [XR - 2.2, Y2, -118], size: [11.6, 1.2, 1], style: 0xfff4f8, camIgnore: true },
    { type: 'wall', pos: [XR - 8.2, Y2, -118], size: [0.4, 1.2, 20], style: 0xffd8ec, camIgnore: true },
    { type: 'wall', pos: [XR + 8.2, Y2, -118], size: [0.4, 1.2, 20], style: 0xffd8ec, camIgnore: true },
    { type: 'wall', pos: [XR, Y2, -128.2], size: [16.8, 1.2, 0.4], style: 0xffd8ec, camIgnore: true },
    { type: 'wall', pos: [XR, Y2, -107.8], size: [16.8, 0.5, 0.4], style: 0xffd8ec, camIgnore: true },
    { type: 'pipe', id: 'kugel_ein', pos: [XR - 5.6, Y2, -111], height: 1.2 },
    { type: 'pipe', id: 'kugel_aus', pos: [XR - 6.4, Y2, -126.4], height: 1.2, target: 'roehre_kugel', color: 'pink' },
    sign(XR + 1.4, Y2, -109.6, 'Kugel aufs P-Feld!', { size: [2.6, 0.8] }),
  ],
  blocks: [
    { kind: 'hidden', pos: [0, Y0 + 3.4, -1], content: 'oneup' },
    { kind: 'question', pos: [-3.2, Y0 + 2.4, -50], content: 'spiegel' },
    { kind: 'coinblock', pos: [-1.1, Y0 + 2.4, -50], count: 8 },
    { kind: 'question', pos: [1.1, Y0 + 2.4, -50], content: 'coin' },
    { kind: 'question', pos: [3.2, Y0 + 2.4, -50], content: 'funken' },
    { kind: 'question', pos: [-2, Y1 + 3.6, -84], content: 'coins:5' },
    { kind: 'coinblock', pos: [XR + 5.2, Y2 + 2.6, -118], count: 6 },
    { kind: 'brick', pos: [XR + 4.2, Y2 + 2.6, -118], content: 'oneup' },
  ],
  enemies: [
    // Pilzlinge (7)
    { kind: 'pilzling', id: 'p1', pos: [3, Y0, -30.2], path: [[-4, Y0, -30.2], [4, Y0, -30.2]] },
    { kind: 'pilzling', id: 'p2', pos: [-4, Y0, -52], path: [[-5, Y0, -52.4], [5, Y0, -52.4]] },
    { kind: 'pilzling', id: 'p3', pos: [2, Y1 + 2, -95], path: [[2, Y1, -86], [2, Y1 + 4, -104]] },
    { kind: 'pilzling', id: 'p4', pos: [-2.5, Y1 + 3, -99], path: [[-2.5, Y1, -84], [-2.5, Y1 + 4.4, -105]] },
    { kind: 'pilzling', id: 'p5', pos: [-4, Y2, -134], path: [[-5, Y2, -134], [5, Y2, -134]] },
    { kind: 'pilzling', id: 'p6', pos: [4, Y2, -146.8], path: [[-5, Y2, -146.8], [5, Y2, -146.8]] },
    { kind: 'pilzling', id: 'p7', pos: [0, Y4, -210], path: [[-4, Y4, -210.8], [4, Y4, -210.8]] },
    // Schnappblumen (3): eine auf der Röhre zum Kugel-Raum, zwei am Feuerring-Platz
    { kind: 'schnappblume', id: 'sb_roehre', pos: [-5, Y2 + 1.4, -116.4], base: 'pipe', yaw: -Math.PI / 2 },
    { kind: 'schnappblume', id: 'sb2', pos: [-6.4, Y2, -144], yaw: 0 },
    { kind: 'schnappblume', id: 'sb3', pos: [6.4, Y2, -126], yaw: Math.PI },
    // Feuerringe (4)
    { kind: 'feuerring', id: 'fr1', farHide: 46, pos: [0, Y2, -129], mode: 'puls', radius: 4.2, period: 2.4, wait: 0.8, phase: 0 },
    { kind: 'feuerring', id: 'fr2', farHide: 46, pos: [0, Y2, -141], mode: 'puls', radius: 4.2, period: 2.4, wait: 0.8, phase: 0.5 },
    { kind: 'feuerring', id: 'fr3', farHide: 46, pos: [0, Y2, -153.2], mode: 'rad', radius: 3, gaps: 1, gap: 85, speed: 1.0 },
    { kind: 'feuerring', id: 'fr4', farHide: 46, pos: [0, Y3, -180], mode: 'rad', radius: 1.4, gaps: 2, gap: 80, speed: -0.9, color: 'pink' },
  ],
  items: [
    // Kugel-Rätsel
    { kind: 'schiebekugel', id: 'kugel', pos: [XR - 2, Y2, -123.4], size: 1.6, color: 'rosa' },
    { kind: 'pfeld', id: 'kugelfeld', pos: [XR - 2.4, Y2, -112.6], need: 1, size: [2.4, 2.4], on: { star: 1 } },
    // Spiegelfrucht für den 2er-Lift (liegt auf einem Tortenteller)
    { kind: 'powerup', pos: [1.4, Y4, -201], power: 'spiegel' },
    // Sternring (Stern 2): fünf Münzen auf der Torte, drei über den nächsten Wechselplattformen
    { kind: 'sternring', id: 'sternring', pos: [0, Y3, -176.8], star: 2, yaw: Math.PI / 2, coins: [
      [-3, Y3 + 0.4, -178.4], [3, Y3 + 0.4, -178.4], [-3, Y3 + 0.4, -181.4], [3, Y3 + 0.4, -181.4], [0, Y3 + 0.4, -182],
      [WP3[0][0], WP3[0][1] + 0.5, WP3[0][2]], [WP3[1][0], WP3[1][1] + 0.5, WP3[1][2]], [WP3[2][0], WP3[2][1] + 0.5, WP3[2][2]],
    ] },
    // Münzen
    line([0, Y0 + 0.6, 2], [0, Y0 + 0.6, -3], 4),
    line([0, Y0 + 0.6, -15.2], [0, Y0 + 0.6, -25.2], 6),
    ...arc([0, Y0 + 0.5, -33], [0, Y0 + 0.5, -45], 7, 0.8),
    ring([0, Y0 + 0.7, -50.6], 2.4, 8),
    ...WP1.map(([x, y, z]) => ({ kind: 'coin', pos: [x, y + 0.6, z] })),
    line([0, Y1 + 0.8, -82], [0, Y2 + 0.8, -106], 9),
    line([-3, Y2 + 0.6, -112], [3, Y2 + 0.6, -112], 4),
    ring([0, Y2 + 0.7, -129], 1.4, 6), ring([0, Y2 + 0.7, -141], 1.4, 6),
    ...WP2.map(([x, y, z]) => ({ kind: 'coin', pos: [x, y + 0.6, z] })),
    line([-3, Y4 + 0.6, -203], [3, Y4 + 0.6, -203], 4),
    ring([5, Y4 + 7.1, -208.5], 1.2, 6),
    ring([XR + 4, Y2 + 0.6, -123], 1.6, 6),
  ],
  checkpoint: [0, Y2, -112],
  stars: [
    [-5, Y0 + 0.8, -44],
    { pos: [XR - 2.4, Y2 + 1.6, -112.6], hidden: true, id: 'stern1' },
    { pos: [0, Y3 + 1.2, -177.6], hidden: true, id: 'stern2' },
  ],
  stamp: [5, Y4 + 6.6, -208.6],
  goal: [0, Y4, -208.6],
  marks: {
    uebung: [0, Y0, -7], feld1: [0, Y0, -20.2], feld2: [0, Y0, -39], bloecke: [0, Y0, -50], wechsel1: [0, Y0, -56],
    hang: [0, Y1, -82], checkpoint: [0, Y2, -112], roehre: [-5, Y2, -116.4], ringe: [0, Y2, -129], wechsel2: [0, Y2, -162.6],
    sternring: [0, Y3, -176.8], ziel: [0, Y4, -208.6], kugelraum: [XR, Y2, -118],
  },
};
