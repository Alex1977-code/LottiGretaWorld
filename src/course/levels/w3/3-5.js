// 3-5 „Leuchtturmriff“ – tropische Lagune (Welt 3), Parcours nach −Z, ≈ 250 m. Kernidee: Schwimmen und Tauchen
// (Ducken taucht ab, Sprung = Schwimmzug) zwischen Röhren, Riffen und einem alten Wrack; am Horizont weist der
// Leuchtturm den Weg zum Zielmast. Thema `water` (Unterwasser-Stimmung beim Abtauchen), Musik `course_water`, 500 s.
//
// Abschnitte (Level verläuft nach −Z, +X = rechts im Bild; Wasseroberfläche y 0, Land y 1):
//   1  Strand        (z 12 … −38)     Sandstrand mit Strandkörben, Sandburg, Sonnenschirmen, Muscheln, Krabben;
//                                     ?-Block mit Gleitblatt; flache Lagune mit drei Reifen-Pilzlingen; grüne Röhren
//                                     führen übers Wasser zur Riffkante (Münzmarder 1 am Strand, 2 auf dem Riff).
//   2  Tiefwasser    (z −38 … −94)    8 m tiefes Becken zwischen Felswänden: Flossling-Schwärme, Stachelfische an der
//                                     Oberfläche, Korallen, Seetang, Fischschwärme. Am Ende unter dem Felsbogen in die
//                                     Flutkammer (z −94 … −108): Wasser steigt (y 0 → 5) → Sims mit dem Glasrohr.
//                                     Stern 1: Felsnische oben links in der Flutkammer (nur mit gestiegenem Wasser).
//   3  Wrackbucht    (z −108 … −164)  Glasrohr hinab in die Bucht, Schiffswrack links im Hintergrund, Holzsteg mit
//                                     springenden Flosslingen, Kanonen-Helm am Landeplatz; rechts der Rissfels: Wandriss
//                                     mit der Kanone sprengen → goldene Röhre → Goldraum (Stern 2, Goldschalter).
//                                     Checkpoint. Danach versteckter Gang nach oben (Glasrohr in der Wrackklippe links,
//                                     Eingang hinter Palmen) → Klippe mit dem Stempel.
//   4  Stachelwand   (z −164 … −226)  Kanal mit Wänden voller Löcher: Stachelfische schießen im Takt heraus, drei
//                                     Säulen mit eigenen Löchern. Stern 3: von der dritten Säule unsichtbare Blöcke
//                                     hinauf zum versteckten Raum im Hochfels.
//   5  Ausgang       (z −226 … −252)  Inselchen mit Glasrohr-Kanone → Zielinsel mit dem großen Leuchtturm, Zielmast.
// Geheimnis 1-Up: unsichtbarer Block über der Sandburg am Start.
// Gegner: Reifen-Pilzling 5, Flossling 12, Stachelfisch 13, Münzmarder 4.
// Level-Haken (LEVEL.setup, _helpers_d.js): Meer zwischen den Becken, Felsen, Strandzier, Leuchttürme, Möwen,
// Krabben, Fischschwärme, Wandlöcher, Flutkammer (steigendes Wasser, Neustart setzt es zurück).

import { isl, line, ring, arc, levelSetup, cullStatic, seaFill, leuchtturm, strand, felsen, wandloecher, fischschwaerme, moewen, krabbe, flutKammer, gegnerSicht } from './_helpers_d.js';

const Y = 1;        // Land
const W = 0;        // Wasseroberfläche
const FLUT = 5;     // Wasserstand der Flutkammer nach dem Steigen

const sign = (x, y, z, text, o = {}) => ({ type: 'sign', pos: [x, y, z], text, size: o.size ?? [2.8, 0.95], yaw: o.yaw ?? 0 });
const sand = (x0, x1, zA, zB, top = Y, h = 4, o = {}) => isl(x0, x1, zA, zB, top, h, { top: 'sand', under: 0, ...o });

// Becken (Rechtecke [x0, z0, x1, z1]) – auch die Aussparungen der Meeresfläche
const POOLS = {
  strand: [-30, 12, 30, -38],
  tief: [-11, -38, 11, -94],
  flut: [-5, -94, 5, -108],
  bucht: [-30, -112, 30, -164],
  kanal: [-9, -164, 9, -226],
};
const lagune = (id, r, bed, o = {}) => {
  const [x0, z0, x1, z1] = r;
  return { type: 'lagune', id, pos: [(x0 + x1) / 2, bed, (z0 + z1) / 2], size: [x1 - x0, W - bed, Math.abs(z1 - z0)], ...o };
};

// Felsen [x0, x1, zA, zB, y0, y1]
const ROCKS = [
  // Tiefwasser: Felswände links/rechts
  [-17, -11, -38, -92, -8, 4], [11, 17, -38, -92, -8, 4],
  // Flutkammer: Felsmassen links (mit Nische für Stern 1) und rechts, Felsbogen vorn, Sims hinten
  [-17, -5, -92, -101, -8, 8], [-17, -7, -101, -104, -8, 8], [-7, -5, -101, -104, -8, FLUT + 0.6], [-17, -5, -104, -118, -8, 8],
  [5, 17, -92, -118, -8, 8],
  [-5, 5, -92, -94, -3, 8],
  [-5, 5, -108, -118, -8, FLUT + 0.6],
  // Wrackbucht: Rissfels rechts (Kerbe x 10 … 13 hinter dem Wandriss), Wrackklippe links (Stempel oben)
  [8, 10, -150, -164, -3, 6], [13, 20, -150, -164, -3, 6], [10, 13, -154, -164, -3, 6],
  [-20, -8, -152, -168, -3, 8],
  // Stachelwand: Kanalwände, Hochfels rechts (versteckter Raum oben)
  [-16, -9, -164, -226, -6, 3], [9, 16, -164, -208, -6, 3], [6.5, 16, -208, -220, -6, 8.4], [9, 16, -220, -226, -6, 3],
];

// Stachelwand: Löcher (Fischmitte) und Säulen
const PILLARS = [[-2.5, -182], [2.5, -196], [-1, -210]];
const PH = 1.4;   // Oberkante der Säulen
const WALL_FISH = [
  // [x, y, z, dx] – Wandlöcher (x = Wandfläche), Schussrichtung dx
  [-8.95, -0.25, -174, 1], [8.95, -0.25, -184, -1], [-8.95, -2.2, -192, 1],
  [8.95, -0.25, -200, -1], [-8.95, -0.25, -216, 1], [6.45, -0.25, -214, -1],
];
const PILLAR_FISH = [[-2.5 + 1.25, -0.25, -182, 1], [2.5 - 1.25, -0.25, -196, -1], [-1 + 1.25, -0.25, -210, 1]];

/** Level-Haken: Meer, Felsen, Strand- und Riffzier, Leuchttürme, Tiere, Wandlöcher, Flutkammer. */
function setup(level) {
  felsen(level, ROCKS, { color: 0xc8a882, dark: 0x7a6250, top: 0xb8d870 });
  // Felsfuß des Goldraums (Insel weit draußen)
  felsen(level, [[63, 81, -141, -159, -3, 0.4]], { color: 0xc8a882, top: 0xf0d8a0 });
  // Strand, Riffkante, Buchten
  strand(level, {
    koerbe: [[-9, Y, 5, 0.2, 0x3a7aff], [-6.6, Y, 6.4, -0.1, 0xff4a5a], [9.4, Y, -36, 0.3, 0x2ac0a0], [-14, Y, -144, 0.6, 0xffb02a]],
    schirme: [[-11, Y, 2.4, 0xff4a5a, 0xffffff], [10.6, Y, 7.4, 0x3a9aff, 0xfff2c8], [-15.4, Y, -139.4, 0x30c070, 0xffffff]],
    burgen: [[-6.6, Y, 1.2, 1, 0.2], [7, Y, -133, 0.7, -0.4]],
    muscheln: [[-3, Y, 6, 6, 3], [8, Y, -2, 5, 2.5], [-10, Y, -30, 5, 2], [6, Y, -32, 4, 2], [-12, Y, -146, 5, 2.5], [3, Y, -160, 5, 2], [-4, Y, -229, 4, 2], [0, 5, -238, 4, 3]],
    ringe: [[12, Y, 2, -0.6], [-5.6, Y, -132.4, 0.4]],
    palmen: [[-12.6, Y, 9, 4.6, 0.35, 0.8], [12.4, Y, -3.4, 4.2, 0.3, -0.9], [-11, Y, -36.4, 4.4, 0.3, 1.2], [11.2, Y, -29, 3.8, 0.25, -1],
      [-6.4, Y, -137.4, 4.2, 0.3, 0.6], [-7, Y, -158.4, 4.4, 0.35, 1.4], [-7.2, Y, -164, 3.6, 0.25, 1.9], [7.4, Y, -137, 3.8, 0.3, -0.7],
      [-17.6, Y, -137, 4.6, 0.3, 1.0], [16.4, Y, -147.4, 4, 0.3, -1.2], [-6.6, 5, -250, 4.4, 0.3, 0.7], [6.6, Y, -230.6, 3.6, 0.25, -0.5],
      [66, 0.4, -143, 3.8, 0.3, 0.6], [79, 0.4, -156, 4.2, 0.3, -2.2]],
  });
  // Leuchttürme: groß auf der Zielinsel (vom Start aus sichtbar), klein auf dem Felsen neben dem Strand
  leuchtturm(level, [5.6, 5, -248.4], { height: 12, r: 1.6 });
  leuchtturm(level, [-20, 2.4, -12], { height: 7, r: 1.1, shadow: false });
  moewen(level, [{ center: [5.6, 21, -248], radius: 7, n: 3 }, { center: [-20, 13, -12], radius: 5, n: 2 }, { center: [-24, 9, -146], radius: 6, n: 2 }]);
  krabbe(level, [-2, Y, 8.6], [3, Y, 8.6], { speed: 0.4 });
  krabbe(level, [3, Y, -37], [-2, Y, -37], { speed: 0.5, color: 0xff7a2a, phase: 0.4 });
  krabbe(level, [-3, Y, -162.6], [2, Y, -162.6], { speed: 0.45, phase: 0.7 });
  fischschwaerme(level, [
    { center: [0, -4.5, -64], radius: 5, rz: 8, n: 12, speed: 1.6, color: 0xffd23d, size: 1 },
    { center: [-4, -6, -80], radius: 3, n: 8, speed: 1.2, color: 0x3a8aff, size: 1.2, cw: true },
    { center: [8, -1.4, -10], radius: 3, n: 7, speed: 1.1, color: 0xff7a3a, size: 0.9 },
    { center: [-14, -1.6, -128], radius: 4, n: 8, speed: 1.3, color: 0xffd23d, size: 1 },
    { center: [0, -4, -202], radius: 3.5, rz: 9, n: 9, speed: 1.5, color: 0x9a6aff, size: 1, cw: true },
  ]);
  wandloecher(level, [
    ...WALL_FISH.map(([x, y, z, dx]) => [x - dx * 0.06, y, z, dx, 0, 0.42]),
    ...PILLAR_FISH.map(([x, y, z, dx]) => [x - dx * 0.06, y, z, dx, 0, 0.42]),
    // blinde Löcher (Abwechslung)
    [-8.98, 1.6, -180, 1, 0, 0.3], [8.98, 1.8, -190, -1, 0, 0.3], [-8.98, -3.6, -206, 1, 0, 0.36], [8.98, -3.4, -176, -1, 0, 0.36],
  ]);
  // Flutkammer: schwimmt eine Figur in der Kammer, steigt das Wasser auf 5 m (Neustart vor dem Checkpoint: zurück)
  flutKammer(level, { id: 'flut', from: W, to: FLUT, speed: 1.1, area: { min: [-5, -9, -107.8], max: [5, 6, -95] }, resetBefore: -150 });
  // Meeresfläche zwischen den Becken bis zum Kulissen-Meer
  seaFill(level, Object.values(POOLS), { path: [-20, 20] });
  // Fische werfen keinen Sonnenschatten (unter Wasser), versteckte Lochschützen und ferne Gegner werden nicht gezeichnet
  gegnerSicht(level, {
    flossling: { dist: 24, shadow: false }, stachelfisch: { dist: 26, shadow: false, hide: (e) => e.hidden },
    pilzling_reifen: { dist: 34 }, muenzmarder: { dist: 34 },
  });
}

/** Haken: Aufbau, danach Fern-/Schatten-Ausblendung der statischen Abschnitte. */
const build = levelSetup(setup);
function hook(level, scene) { build(level, scene); cullStatic(level, { floorY: -9 }); }

export const LEVEL = {
  id: '3-5',
  world: 3,
  title: 'Leuchtturmriff',
  archetype: 'parcours',
  theme: 'water',
  music: 'course_water',
  timeLimit: 500,
  killY: -16,
  setup: hook,
  start: { pos: [0, Y, 8], yaw: Math.PI / 2 },
  camera: [
    { from: 16, to: -36, pitch: 44, dist: 13 },
    { from: -36, to: -92, pitch: 41, dist: 12 },
    { from: -92, to: -110, pitch: 47, dist: 12 },
    { from: -110, to: -166, pitch: 43, dist: 13.5 },
    { from: -166, to: -226, pitch: 46, dist: 12.5 },
    { from: -226, to: -256, pitch: 42, dist: 13 },
    // Goldraum (abseits)
    { from: -138, to: -162, pitch: 48, dist: 11, x: 72, xLock: 0.7, area: [60, 86] },
  ],
  segments: [
    // ======================================================== Becken
    lagune('strand', POOLS.strand, -2, { caustics: 0.5 }),
    lagune('tief', POOLS.tief, -8, { caustics: false }),
    lagune('flut', POOLS.flut, -8, { caustics: false }),
    lagune('bucht', POOLS.bucht, -3, { caustics: 0.45 }),
    lagune('kanal', POOLS.kanal, -6, { caustics: false }),

    // ======================================================== 1  Strand
    sand(-14, 14, 12, -5, Y, 3),
    { type: 'ramp', pos: [0, -2, -6.5], size: [28, 3, 3], axis: 'z', dir: 1, low: 0, top: 'stone' },
    sign(-3.6, Y, 9.6, 'Leuchtturmriff'),
    sign(4.6, Y, -2.6, 'Ducken = Abtauchen\nSprung = Schwimmzug', { size: [3.2, 1.1] }),
    // Felsen mit dem kleinen Leuchtturm (links im Meer)
    isl(-23.5, -16.5, -8.5, -15.5, 2.4, 5.4, { top: 'stone', under: 0 }),
    // Sandbänke
    sand(7, 11, -12, -16.4, 0.8, 2.8),
    sand(-11, -7.4, -19, -22.6, 0.7, 2.7),
    // grüne Röhren über das Wasser
    { type: 'rohrteile', items: [
      { kind: 'gerade', pos: [-2.4, -0.7, -4.6], yaw: Math.PI / 2, length: 9.4, radius: 0.9 },
      { kind: 'ende', pos: [-2.4, -0.7, -14], yaw: Math.PI / 2, radius: 0.9 },
      { kind: 'gerade', pos: [1.8, -0.5, -16.2], yaw: Math.PI / 2, length: 10.6, radius: 0.9 },
      { kind: 't', pos: [1.8, -0.5, -26.8], yaw: Math.PI / 2, radius: 0.9 },
    ] },
    // Riffkante
    sand(-12, 12, -27, -38, Y, 3),
    { type: 'deco_w3', items: [{ kind: 'korallen', pos: [0, Y, -37], size: [20, 1.4], n: 6, scale: [0.4, 0.7] }] },

    // ======================================================== 2  Tiefwasser
    { type: 'deco_w3', shadow: false, items: [
      { kind: 'korallen', pos: [-6, -8, -50], size: [8, 14], n: 4, gap: 2.5, scale: [1, 1.7] },
      { kind: 'korallen', pos: [6, -8, -68], size: [8, 16], n: 4, gap: 2.5, scale: [1, 1.7] },
      { kind: 'korallen', pos: [-3, -8, -86], size: [12, 8], n: 4, gap: 2.5, scale: [0.9, 1.5] },
    ] },
    { type: 'seetang', pos: [-8, -8, -66], height: 5, count: 3 },
    { type: 'blasen', pos: [3, -8, -82], height: 7.5, count: 12 },
    { type: 'koralle', pos: [0, -8, -58], kind: 'hirn', scale: 1.6 },
    // versunkene Kiste mit Münzen (Kulisse) und Wegweiser unter Wasser
    { type: 'platform', pos: [-6, -8, -62], size: [1.6, 1.2, 1.2], style: 'wood' },
    sign(-6.6, Y, -36.4, 'Tief tauchen!\nAm Ende unter dem Felsbogen durch', { size: [3.4, 1.1] }),
    // Glasrohr vom Sims der Flutkammer hinab in die Bucht
    { type: 'rohrnetz', id: 'rohr_bucht', oneWay: true, radius: 1, coins: 6,
      path: [[0, FLUT + 1.6, -110.4], [0, FLUT + 1.6, -114], [0, 9, -118], [0, 5, -124], [0, 2.05, -128.5], [0, 2.05, -131.6]] },

    // ======================================================== 3  Wrackbucht
    sand(-8, 8, -128, -138, Y, 4),
    sand(-20, -8, -136, -150, Y, 4),
    sand(-8, 20, -146, -164, Y, 4),
    { type: 'steg', pos: [0, -0.2, -137.6], yaw: Math.PI / 2, length: 8.8, width: 2, height: 1.2 },
    { type: 'schiffswrack', pos: [-25, -3, -150], yaw: 0.7, size: 1.6, shadow: false },
    { type: 'deco_w3', shadow: false, items: [{ kind: 'korallen', pos: [-20, -3, -128], size: [14, 10], n: 4, gap: 3 }, { kind: 'korallen', pos: [16, -3, -136], size: [10, 8], n: 3, gap: 3 }] },
    sign(4.2, Y, -129.6, 'Kanonen-Helm:\nder Riss hält nicht ewig!', { size: [3.2, 1.1] }),
    // Wandriss vor der Kerbe im Rissfels, dahinter die goldene Röhre
    { type: 'wandriss', id: 'riss', pos: [11.5, Y, -149.5], size: [3, 3.4, 1] },
    { type: 'goldroehre', id: 'gold_ein', pos: [11.5, Y, -152.6], height: 1.2, target: 'gold_aus' },
    // Goldraum (weit draußen auf einem Felsinselchen)
    { type: 'room', pos: [72, 1.4, -150], size: [12, 5, 10], top: 'stone', style: 0xd8a040 },
    { type: 'goldroehre', id: 'gold_aus', pos: [67.4, 1.4, -153], height: 1.2 },
    { type: 'goldroehre', id: 'gold_raus', pos: [77, 1.4, -153], height: 1.2, target: [3, Y + 0.4, -157] },
    { type: 'platform', pos: [72, 1.4, -153.4], size: [2.4, 1.4, 2.4], style: 'block', color: 0xffc93a },
    // versteckter Gang nach oben: Glasrohr in der Wrackklippe (Eingang zur Kamera hinter den Palmen)
    { type: 'rohrnetz', id: 'rohr_gang', oneWay: true, radius: 0.9, coins: 3, waterColor: 0x7af0ff,
      path: [[-7.6, 1.95, -161], [-10, 1.95, -161], [-12.4, 3, -161.4], [-13.2, 6.4, -161.8], [-13.2, 9.6, -162]] },

    // ======================================================== 4  Stachelwand
    ...PILLARS.map(([x, z]) => ({ type: 'island', pos: [x, -6, z], size: [2.4, PH + 6, 2.4], top: 'stone', under: 0, color: 0xa89078 })),
    { type: 'deco_w3', shadow: false, items: [{ kind: 'korallen', pos: [0, -6, -190], size: [14, 50], n: 6, gap: 4, scale: [0.9, 1.6] }] },
    { type: 'seetang', pos: [-6.5, -6, -198], height: 4, count: 2 },
    { type: 'blasen', pos: [6, -6, -172], height: 6, count: 10 },
    // unsichtbare Blöcke über der dritten Säule → Hochfels mit dem versteckten Raum
    { type: 'hiddenchain', id: 'kette', blocks: [[-1, 3.4, -210], [1.6, 5.2, -211], [4.2, 7, -212]] },
    { type: 'room', pos: [12, 8.4, -214], size: [5, 3, 6], top: 'grass', style: 0xb89a78, door: { side: '-x', w: 2, h: 2.4 } },

    // ======================================================== 5  Ausgang
    sand(-9, 9, -226, -233, Y, 4),
    { type: 'rohrnetz', id: 'rohr_ziel', radius: 1, coins: 3, oneWay: true,
      path: [[0, 2.05, -227], [0, 2.05, -230], [0, 3.6, -232.4]], cannon: { target: [0, 5, -240.5], arc: 4.5 } },
    isl(-9, 9, -234, -253, 5, 8, { top: 'grass', under: 0 }),
  ],
  blocks: [
    { kind: 'question', pos: [2.6, Y + 2.4, 2.4], content: 'gleitblatt' },
    { kind: 'hidden', pos: [-6.6, Y + 2.6, 1.2], content: 'oneup' },
    { kind: 'question', pos: [0, Y + 2.6, -33], content: 'coins:5' },
  ],
  enemies: [
    // 1 Strand
    { kind: 'pilzling_reifen', id: 'rf1', pos: [-6, W, -10.5], path: [[-8, W, -10.5], [-4.6, W, -12]] },
    { kind: 'pilzling_reifen', id: 'rf2', pos: [5.6, W, -20], path: [[4.8, W, -19], [8.6, W, -21]] },
    { kind: 'pilzling_reifen', id: 'rf3', pos: [-4.6, W, -25.4] },
    { kind: 'muenzmarder', id: 'm1', path: [[8, Y, 2.6], [11.6, Y, -1], [12, Y, 6], [5, Y, 9.6], [-1, Y, 10.6]], speed: 6, sight: 5.5, lead: 9 },
    { kind: 'muenzmarder', id: 'm2', path: [[5, Y, -30.4], [10, Y, -33], [-2, Y, -37.4], [-10.6, Y, -33]], speed: 6, sight: 5.5, lead: 9 },
    // 2 Tiefwasser
    { kind: 'flossling', id: 'fA', path: [[-7, -5.2, -45], [7, -5.2, -45], [7, -5.2, -58], [-7, -5.2, -58]], count: 4, spacing: 1.4, color: 'tuerkis' },
    { kind: 'flossling', id: 'fB', center: [1, -3, -73], radius: 4, count: 3, spacing: 1.6, color: 'koralle' },
    { kind: 'flossling', id: 'fC', path: [[-6, -2, -86], [6, -2, -86]], behavior: 'chase', sight: 4.5, color: 'gold' },
    { kind: 'stachelfisch', id: 'sT1', pos: [6, W, -52], sight: 6, speed: 1.8 },
    { kind: 'stachelfisch', id: 'sT2', pos: [-6, W, -78], sight: 6, speed: 1.8 },
    // 3 Wrackbucht
    { kind: 'flossling', id: 'fJ1', mode: 'jump', pos: [-3.2, -0.8, -141.6], dir: [1, 0], dist: 6.4, height: 2.6, every: 2.6, color: 'koralle' },
    { kind: 'flossling', id: 'fJ2', mode: 'jump', pos: [3.2, -0.8, -144], dir: [-1, 0], dist: 6.4, height: 2.6, every: 2.6, phase: 0.5, color: 'gold' },
    { kind: 'pilzling_reifen', id: 'rf4', pos: [-9, W, -122] },
    { kind: 'pilzling_reifen', id: 'rf5', pos: [12, W, -132], path: [[10, W, -128], [14, W, -136]] },
    { kind: 'stachelfisch', id: 'sB', pos: [13, W, -141], sight: 5, speed: 1.6 },
    { kind: 'muenzmarder', id: 'm3', path: [[-11, Y, -139], [-18, Y, -141], [-17, Y, -148], [-10, Y, -148.6]], speed: 6, sight: 5.5, lead: 9 },
    // 4 Stachelwand
    { kind: 'flossling', id: 'fK', path: [[-6, -3.6, -186], [6, -3.6, -186], [6, -3.6, -192], [-6, -3.6, -192]], count: 2, spacing: 2, color: 'tuerkis' },
    { kind: 'stachelfisch', id: 'sK', pos: [5, W, -172], sight: 5, speed: 1.6 },
    ...WALL_FISH.map(([x, y, z, dx], i) => ({ kind: 'stachelfisch', id: `sW${i + 1}`, mode: 'wall', pos: [x, y, z], dir: [dx, 0], period: 2.4, phase: (i * 0.29) % 1, reach: 3.4 })),
    ...PILLAR_FISH.map(([x, y, z, dx], i) => ({ kind: 'stachelfisch', id: `sP${i + 1}`, mode: 'wall', pos: [x, y, z], dir: [dx, 0], period: 2.4, phase: 0.15 + i * 0.33, reach: 3.2 })),
    // 5 Ausgang
    { kind: 'muenzmarder', id: 'm4', path: [[-5, Y, -228.4], [-8, Y, -231.4], [6.6, Y, -231.6], [8, Y, -227.4]], speed: 6, sight: 5, lead: 8 },
  ],
  items: [
    // 1
    line([0, Y + 0.5, 3], [0, Y + 0.5, -1], 2),
    line([-2.4, 1.7, -6], [-2.4, 1.7, -12.6], 4),
    arc([-2.4, 1.7, -13.4], [1.8, 1.9, -17], 3, 1.4),
    line([1.8, 1.9, -18.6], [1.8, 1.9, -25], 4),
    // 2 (unter Wasser)
    ring([0, -2.5, -46], 1.4, 6),
    ring([5, -5, -70], 1.2, 5),
    line([0, -6.6, -88], [0, -6.6, -93], 3),
    ring([0, 2.4, -101], 1.2, 4),
    // 3
    line([0, 2.3, -139.4], [0, 2.3, -145.6], 3),
    { kind: 'coins', pos: [-14, Y + 0.5, -143], r: 1.2, n: 3 },
    { kind: 'helm_kanone', id: 'helm', pos: [3.6, Y, -134.6], respawn: 3 },
    // Goldraum
    { kind: 'goldschalter', id: 'goldschalter', pos: [72, 1.4, -147.6], area: { pos: [72, 1.4, -149], size: [10, 7] }, time: 8, rate: 7, height: 4 },
    { kind: 'coins', pos: [72, 3.4, -153.4], r: 1.6, n: 6 },
    // Stempel-Klippe
    { kind: 'coins', pos: [-15, 8.6, -158], r: 1.3, n: 5 },
    // 4
    line([-2.5, PH + 0.5, -183], [-2.5, PH + 0.5, -181], 2),
    line([2.5, PH + 0.5, -197], [2.5, PH + 0.5, -195], 2),
    ring([0, -3, -204], 1.1, 5),
    { kind: 'coins', pos: [12, 9, -214.8], r: 1.2, n: 5 },
    // 5
    line([0, Y + 0.5, -228.4], [0, Y + 0.5, -229.6], 2),
    line([0, 5.5, -242], [0, 5.5, -243.4], 2),
  ],
  checkpoint: { pos: [0, Y, -156], yaw: Math.PI / 2 },
  stars: [
    [-6, FLUT + 1.5, -102.5],     // 1: Felsnische oben in der Flutkammer (nur mit gestiegenem Wasser)
    [72, 3.6, -153.4],            // 2: Goldraum (Wandriss sprengen → goldene Röhre)
    [13.4, 9.6, -215.6],          // 3: versteckter Raum im Hochfels über der dritten Säule
  ],
  stamp: [-16, 8.8, -164],
  goal: { pos: [0, 5, -245], height: 9 },
  marks: {
    start: [0, Y, 8], qblock: [2.6, Y, 2.4], pipe1: [-2.4, 1.2, -6], pipe2: [1.8, 1.4, -18], riff: [0, Y, -32],
    tief: [0, W, -40], bogen: [0, -5.5, -93], flut: [0, -4, -100], nische: [-6, FLUT + 0.6, -102.5], sims: [0, FLUT + 0.6, -109.5],
    bucht: [0, Y, -132], helm: [3.6, Y, -134.6], steg: [0, 1, -142], riss: [11.5, Y, -147], checkpoint: [0, Y, -156],
    gang: [-7.2, Y, -161], klippe: [-15, 8, -162], goldraum: [72, 1.4, -150],
    kanal: [0, W, -166], saeule1: [-2.5, PH, -182], saeule2: [2.5, PH, -196], saeule3: [-1, PH, -210], hochfels: [8, 8.4, -214],
    raum: [12, 8.4, -214], ausgang: [0, Y, -229], goal: [0, 5, -245],
  },
};
