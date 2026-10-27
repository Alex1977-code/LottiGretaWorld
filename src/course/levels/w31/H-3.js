// H-3 „Gekicher auf dem Nebelfriedhof“ (Halloween-Welt 31 „Kürbisinsel“; Archetyp parcours, Thema graveyard, Musik
// course_graveyard, 400 s, 3 Sterne + Stempel). Mondnacht über einem Friedhof voller lachender Grabsteine: hinter dem Tor
// liegt eine Laterne – ihr Licht macht lila Geisterplattformen sichtbar und begehbar. Klapperknochen klappern umher (draufspringen
// → Knochenhaufen, Stampfattacke auf den Haufen besiegt sie), Kreisgeister drehen ihre Runden, Pflaume wartet mit dem
// Blatt-Floß am grünen Glibberbach, blaue Geisterbrücken zeigt nur das Licht der Laternenpfähle.
//
// Abschnitte (nach −Z, Plateaus y 1):                                                                  z
//   1 Friedhofstor   Tor mit Kürbislaternen, Laterne liegt im Weg, Klapperknochen zum Üben, Nebelgraben mit dem
//                    ersten Geistersteg (Hineinfallen harmlos), kichernder Geist am linken Rand            8 …  −30
//   2 Nebelschlucht  lila Geisterplatten im Zickzack über den Abgrund (nur Laternenlicht), Grabinsel mit Kreisgeist
//                    und Flatterfledi                                                                     −30 …  −62
//   3 Glibberbach    Checkpoint, Floßfahrt auf Pflaume durch die Gruft-Durchfahrt (zu Fuß kein Weg), Süßes über
//                    dem Glibber, Krümel winkt mit seiner Laterne vom Ufer                                 −62 … −140
//   4 Gruftgarten    blinkender Laternenpfahl zeigt die blaue Brücke, Klappergarten (drei Klapperknochen),
//                    Kreisgeist-Ring um die Gruft, Spuk; Grabstein-Schalter zündet den Pfahl der nächsten Brücke  −140 … −194
//   5 Kapellenhügel  Treppe zur Kapelle, Kreisgeist, Klapperknochen, Zielmast vor der Kapelle; Glockenturm   −194 … −236
// Sterne: 0 der kichernde Geist huscht hinter einen Grabstein – dahinter führen unsichtbare Geisterstufen (Laterne!) auf
//           die schwebende Gruft · 1 über dem Glibberbach hinter der Gruft-Durchfahrt (mit dem Floß hochhüpfen) ·
//         2 Klappergarten: alle drei Klapperknochen endgültig besiegen (Stampfattacke auf den Knochenhaufen)
// Stempel: oben auf dem Glockenturm – lila Stufen (Laterne) und blaue Stufen (nur wenn der Turm-Pfahl brennt) im Wechsel.

import {
  isl, line, arc, sweets, sweetRing, floatRock, pumpkinsOn, pumpkinPatch, lanternPosts, glowPoints, fireflies, cemeteryGate,
  chapel, bellTower, cryptPassage, boneGarden, rockNeedle, gigglingGhost, kruemelCameo, stonePath, glowShrooms, meadow,
} from './_helpers_b.js';

const Y = 1;
// Glibberbach (Mittellinie, y = Oberfläche) und x der Mitte je z (für die Gruft-Durchfahrt und die Kulisse)
const CREEK = [[0, -0.5, -73], [0, -0.5, -84], [3, -0.5, -94], [-1, -0.6, -106], [2, -0.6, -116], [0, -0.6, -127]];
const creekX = (z) => {
  for (let i = 0; i < CREEK.length - 1; i++) {
    const a = CREEK[i], b = CREEK[i + 1];
    if (z <= a[2] && z >= b[2]) return a[0] + (b[0] - a[0]) * ((a[2] - z) / (a[2] - b[2]));
  }
  return z > CREEK[0][2] ? CREEK[0][0] : CREEK[CREEK.length - 1][0];
};
const TUNNEL = { z0: -97, z1: -105 };
const GARDEN = { x0: -13.6, x1: -4.6, z0: -157, z1: -174 };
const TOWER = { x0: -8, x1: -6, z0: -228, z1: -230, top: 8.1 };
const PLAZA = 2.5;

// Geisterstufen zum Stempel: lila (Laterne) und blau (Turm-Pfahl) im Wechsel rund um den Glockenturm
const TOWER_STEPS = [
  [-4.4, 3.3, -227.0, 'laterne'], [-4.4, 4.1, -230.6, 'pfahl'], [-7.0, 4.9, -232.0, 'laterne'],
  [-9.6, 5.7, -230.6, 'pfahl'], [-9.6, 6.5, -227.4, 'laterne'], [-7.0, 7.3, -226.0, 'pfahl'],
];
const towerPlates = (light) => TOWER_STEPS.filter((s) => s[3] === light).map(([x, top, z]) => ({ pos: [x, top - 0.4, z], size: [2.0, 0.4, 2.0] }));

function scene(level) {
  // ---------------- 1 Friedhofstor
  cemeteryGate(level, 0, Y, 0.5, 3.4, 8.6);
  floatRock(level, -9, 9, 8, -30, -4, 6, { n: 4, roots: 8, seed: 3 });
  floatRock(level, -21, -16.5, -22.5, -27, 2.2, 4, { n: 3, seed: 4 });
  // ---------------- 2 Nebelschlucht
  floatRock(level, -1.5, 8.5, -41, -48.5, -0.8, 4, { n: 3, seed: 5 });
  // ---------------- 3 Glibberbach: Gruft-Durchfahrt (Mauern über beide Ufer)
  cryptPassage(level, TUNNEL.z0, TUNNEL.z1, creekX, 4.0, -16, 16, Y - 4, 11, { ground: 4, thick: 5.6 });
  // ---------------- 4 Gruftgarten
  rockNeedle(level, -4.6, -146, Y, 1.6, -9);
  boneGarden(level, GARDEN.x0, GARDEN.x1, GARDEN.z0, GARDEN.z1, Y, { side: 'e', from: -164, to: -167.4 });
  rockNeedle(level, -4.4, -190, Y, 1.6, -9);
  // ---------------- 5 Kapellenhügel
  chapel(level, -0.6, 7.4, -224, -234, PLAZA, 4, { door: 3.4 });
  bellTower(level, TOWER.x0, TOWER.x1, TOWER.z0, TOWER.z1, PLAZA, TOWER.top);
  // Plattenwege entlang der Route, schwebende Felsen unter den Plateaus
  stonePath(level, [
    [-1.3, 1.3, 7.5, -13], [-1.3, 1.3, -18, -30], [-1.3, 1.3, -62.5, -72], [-1.3, 1.3, -128, -140], [-1.3, 1.3, -152, -186],
    [-4.6, -1.3, -164.4, -167.0], [1.3, 4.4, -178.6, -181.6], [-1.3, 1.3, -194, -206],
  ], Y);
  stonePath(level, [[-1.3, 1.3, -209, -215.0], [-3.6, 4.6, -215.0, -222.6]], PLAZA);
  floatRock(level, -8, 8, -62.5, -72, -4, 6, { n: 3, seed: 6 });
  floatRock(level, -9, 11, -74, -127, -4.2, 6, { n: 4, roots: 10, seed: 7 });
  floatRock(level, -9, 9, -128, -140, -4, 6, { n: 3, seed: 8 });
  floatRock(level, -14, 10, -152, -186, -4, 7, { n: 4, roots: 8, seed: 9 });
  floatRock(level, -11, 11, -194, -236, -4, 7, { n: 4, roots: 8, seed: 10 });
  meadow(level, [[-1.5, 8.5, -41, -48.5]], Y + 1.2, { seed: 7, density: 0.3 });
  meadow(level, [[-9, 9, 8, -13], [-9, 9, -18, -30], [-8, 8, -62.5, -72], [-9, 9, -128, -140], [-14, 10, -152, -186], [-10, 10, -194, -206]], Y,
    { avoid: [[-1.6, 1.6, 8, -240], [GARDEN.x0, GARDEN.x1, GARDEN.z0, GARDEN.z1], [1.5, 8.5, -164.5, -171.5]], density: 0.3 });
  meadow(level, [[-11, 11, -209, -236]], PLAZA, { avoid: [[-1.6, 4.8, -209, -236], [-1, 7.6, -223.5, -236], [-10.8, -3.2, -224, -233.4]], density: 0.3, seed: 5 });
  glowShrooms(level, [
    [-7.6, Y, 6.4, 1.1], [7.8, Y, 5.8], [-7.4, Y, -11.6], [7.6, Y, -16.2, 0.8], [-7.0, Y, -28.6], [8.0, Y, -29.0, 1.2],
    [-19.8, Y + 3.2, -23.4], [-17.2, Y + 3.2, -26.4, 0.8], [0.2, Y + 1.2, -47.6], [7.6, Y + 1.2, -42.0, 0.9],
    [-7.0, Y, -70.6], [-6.2, Y, -76], [7.4, Y, -90], [-5.6, Y, -110], [5.8, Y, -107], [-7.6, Y, -138.6, 1.1],
    [-12.6, Y, -153.6], [8.8, Y, -160.4], [-1.8, Y, -185.0, 0.8], [-8.6, Y, -195.6], [8.8, Y, -204.6, 1.1], [-10.0, PLAZA, -234.4], [9.6, PLAZA, -233.0],
  ]);
  // Kürbisse mit Gesichtern überall
  pumpkinsOn(level, [
    [-3.2, Y, 2.4, 0.42, 'lachen'], [3.4, Y, 2.6, 0.36, 'grinsen'], [-6.8, Y, -8.6, 0.5, 'staunen'], [6.6, Y, -4.2, 0.3, null, 'weiss'],
    [7.2, Y, -26.4, 0.45, 'lachen'], [5.2, 2.2, -42.0, 0.4, 'grinsen'], [-6.4, Y, -63.6, 0.48, 'lachen'], [6.8, Y, -69.6, 0.34, 'staunen', 'gelb'],
    [-6.6, Y, -130.6, 0.4, 'grinsen'], [7.2, Y, -137.6, 0.45, 'lachen'], [8.4, Y, -155.2, 0.38, 'grinsen'], [-2.6, Y, -183.6, 0.42, 'lachen'],
    [8.2, Y, -200.4, 0.42, 'grinsen'], [-8.6, PLAZA, -222.4, 0.4, 'lachen'], [9.4, PLAZA, -229.8, 0.5, 'staunen'],
    ...pumpkinPatch(-6, Y, -80, 2.6, 6, 5, { seed: 21 }), ...pumpkinPatch(7.6, Y, -118, 2.4, 6, 5, { seed: 22 }),
    ...pumpkinPatch(6.5, Y, -135, 3, 4, 4, { seed: 23 }),
    // kleine Kürbislaternen säumen den Weg am Tor und hinauf zur Kapelle
    ...[4.4, -1.2, -16.4, -22.6, -27.6].flatMap((z, i) => [[-1.75, Y, z, 0.2, i % 2 ? 'lachen' : 'grinsen', 'orange', -Math.PI / 2 + 0.5], [1.75, Y, z - 0.8, 0.2, i % 2 ? 'grinsen' : 'lachen', i === 2 ? 'gelb' : 'orange', -Math.PI / 2 - 0.5]]),
    ...[-196.6, -200.4, -204.2].flatMap((z) => [[-1.8, Y, z, 0.2, 'lachen', 'orange', -Math.PI / 2 + 0.5], [1.8, Y, z, 0.2, 'grinsen', 'orange', -Math.PI / 2 - 0.5]]),
    ...[-211.2, -214.2, -217.2].map((z, i) => [-1.8, PLAZA, z, 0.2, i % 2 ? 'staunen' : 'lachen', 'orange', -Math.PI / 2 + 0.5]),
  ]);
  lanternPosts(level, [
    [-2.6, Y, -6.6], [2.8, Y, -11.6], [-2.4, Y, -20.4], [2.6, Y, -28.6], [-3.6, Y, -70.6], [3.6, Y, -70.4],
    [-3.4, Y, -129.6], [3.0, Y, -138.8], [-2.6, Y, -155.0], [2.4, Y, -182.2], [-3.4, Y, -196.4], [3.6, PLAZA, -211.4],
  ]);
  return [];
}

function setup(level) {
  gigglingGhost(level, [-6.9, Y + 0.25, -22.9], [-8.3, Y + 0.1, -26.1], { id: 'kichergeist', near: 5.2, far: 9 });
  kruemelCameo(level, [6.4, Y, -110.4], -Math.PI / 2 - 0.5, { id: 'kruemel_ufer', near: 9 });
  fireflies(level, -9, 9, 6, -28, Y + 1.0, 12, 0xa8ffd8);
  fireflies(level, -14, 14, -150, -184, Y + 1.2, 14, 0xc8ffa0);
  fireflies(level, -10, 10, -196, -234, PLAZA + 1.0, 12, 0xffe080);
  glowPoints(level, [[0, -0.3, -88, 3], [1.5, -0.3, -112, 3], [0.5, -0.3, -124, 2.6]], { color: 0x8aff5a, size: 2.2, opacity: 0.35, pulse: 0.6 });
}

export const LEVEL = {
  id: 'H-3',
  world: 31,
  title: 'Gekicher auf dem Nebelfriedhof',
  archetype: 'parcours',
  theme: 'graveyard',
  music: 'course_graveyard',
  build: scene,
  setup,
  timeLimit: 400,
  candyHud: true,
  killY: -14,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  camera: [
    { from: 12, to: -30, pitch: 44, dist: 13 },
    { from: -30, to: -62, pitch: 48, dist: 13.5 },
    { from: -62, to: -128, pitch: 42, dist: 14, ahead: 2.4 },
    { from: -128, to: -194, pitch: 46, dist: 13.5 },
    { from: -194, to: -240, pitch: 44, dist: 14 },
  ],
  segments: [
    // ================= 1 Friedhofstor (z 8 … −30)
    isl(-9, 9, 8, -13, Y, 5),
    isl(-9, 9, -13, -18, Y - 2, 3),                 // Nebelgraben (2 m tief, harmlos)
    isl(-9, 9, -18, -30, Y, 5),
    { type: 'nebel', pos: [0, Y - 2, -15.5], size: [18, 5], height: 1.6, density: 0.5 },
    { type: 'geisterplattform', id: 'grabensteg', light: 'laterne', from: [0, Y - 0.5, -14.25], to: [0, Y - 0.5, -16.75], n: 2, size: [2.8, 0.5, 2.6], color: 'lila' },
    // Stern 0: unsichtbare Geisterstufen hinter dem Grabstein links hinauf zur schwebenden Gruft
    { type: 'geisterplattform', id: 'geheimstufen', light: 'laterne', hint: 0.04, parts: [
      { pos: [-10.4, Y + 0.6 - 0.5, -24.6], size: [2.0, 0.5, 2.0] },
      { pos: [-12.9, Y + 1.4 - 0.5, -25.4], size: [2.0, 0.5, 2.0] },
      { pos: [-15.0, Y + 2.3 - 0.5, -24.4], size: [2.0, 0.5, 2.0] },
    ], color: 'lila' },
    isl(-21, -16.5, -22.5, -27, Y + 3.2, 1.2, { top: 'stone' }),
    // ================= 2 Nebelschlucht (z −30 … −62)
    { type: 'geisterplattform', id: 'schlucht_a', light: 'laterne', parts: [
      { pos: [0, Y - 0.5, -32.0], size: [2.6, 0.5, 2.6] },
      { pos: [1.6, Y + 0.6 - 0.5, -35.4], size: [2.6, 0.5, 2.6] },
      { pos: [3.2, Y + 1.2 - 0.5, -38.8], size: [2.6, 0.5, 2.6] },
    ], color: 'lila' },
    isl(-1.5, 8.5, -41, -48.5, Y + 1.2, 2),          // Grabinsel
    { type: 'geisterplattform', id: 'schlucht_b', light: 'laterne', parts: [
      { pos: [2.0, Y + 1.2 - 0.5, -50.4], size: [2.6, 0.5, 2.6] },
      { pos: [0.0, Y + 1.8 - 0.5, -53.8], size: [2.6, 0.5, 2.6] },
      { pos: [-2.0, Y + 1.2 - 0.5, -57.2], size: [2.6, 0.5, 2.6] },
      { pos: [-0.4, Y + 0.6 - 0.5, -60.4], size: [2.6, 0.5, 2.6] },
    ], color: 'lila' },
    // ================= 3 Glibberbach (z −62 … −140)
    isl(-8, 8, -62.5, -72, Y, 5),
    { type: 'glibberbach', id: 'glibber', path: CREEK, width: 6, bank: 5, bankH: 1.5, depth: 2, speed: 3, open: ['start', 'end'], bubbles: 30, blobs: 12 },
    isl(-9, 9, -128, -140, Y, 5),
    // ================= 4 Gruftgarten (z −140 … −194)
    { type: 'laternenpfahl', id: 'pfahl_schlucht', pos: [-4.6, Y, -146], radius: 6, blink: [5, 2.6], warn: 0.8, style: 'laterne', yaw: 0 },
    { type: 'geisterplattform', id: 'pfahlsteg_a', light: 'pfahl', from: [0, Y - 0.5, -141.5], to: [0, Y - 0.5, -150.5], n: 4, size: [2.8, 0.5, 3.1], color: 'blau' },
    isl(-14, 10, -152, -186, Y, 5),
    { type: 'grabstein_schalter', id: 'schalter', pos: [5.6, Y, -180.4], on: { start: 'pfahl_bruecke' }, once: true },
    { type: 'laternenpfahl', id: 'pfahl_bruecke', pos: [-4.4, Y, -190], radius: 5.5, on: false, style: 'kuerbis', yaw: 0 },
    { type: 'geisterplattform', id: 'pfahlsteg_b', light: 'pfahl', from: [0, Y - 0.5, -187.4], to: [0, Y - 0.5, -192.6], n: 3, size: [2.8, 0.5, 2.7], color: 'blau' },
    { type: 'sign', pos: [8.4, Y, -178.2], text: 'Spring auf den\nGrabstein!', yaw: -0.4 },
    // ================= 5 Kapellenhügel (z −194 … −236)
    isl(-10, 10, -194, -206, Y, 5),
    { type: 'stairs', pos: [0, Y, -206], dir: '-z', steps: 3, rise: 0.5, run: 1, width: 6, style: 'stone' },
    isl(-11, 11, -209, -236, PLAZA, 6.5),
    { type: 'laternenpfahl', id: 'pfahl_turm', pos: [-7.0, TOWER.top, -229.0], radius: 5.2, blink: [3.6, 2.4], warn: 0.7, style: 'kuerbis', yaw: -Math.PI / 2 },
    { type: 'geisterplattform', id: 'turmstufen_lila', light: 'laterne', parts: towerPlates('laterne'), color: 'lila' },
    { type: 'geisterplattform', id: 'turmstufen_blau', light: 'pfahl', parts: towerPlates('pfahl'), color: 'blau' },
    // ================= Kulisse
    { type: 'deco_hw', items: [
      { kind: 'grabsteine', pos: [-6, Y, 4], size: [4, 6], n: 4, avoid: [[-3.2, 2.4, 1]] },
      { kind: 'grabsteine', pos: [6, Y, -7], size: [4, 8], n: 4 },
      { kind: 'grabstein', pos: [-8.4, Y, -25.2], style: 'rund', size: 1.5 },
      { kind: 'grabsteine', pos: [6, Y, -22], size: [4, 8], n: 4 },
      { kind: 'krummer_baum', pos: [6.6, Y, -18.6], height: 5 },
      { kind: 'kerzen', pos: [-4.8, Y, -2.4], n: 4 },
      { kind: 'kerzen', pos: [4.6, Y, -27.0], n: 3 },
      { kind: 'grabstein', pos: [3.6, Y + 1.2, -44.8], style: 'kreuz', size: 1.2 },
      { kind: 'krummer_baum', pos: [7.2, Y + 1.2, -47.0], height: 4.4 },
      { kind: 'grabsteine', pos: [-5.0, Y, -85], size: [2, 8], n: 4 },
      { kind: 'grabsteine', pos: [5.6, Y, -78], size: [2.4, 6], n: 3 },
      { kind: 'krummer_baum', pos: [-4.8, Y, -114], height: 4.6 },
      { kind: 'krummer_baum', pos: [-3.6, Y, -122.4], height: 3.8 },
      { kind: 'grabsteine', pos: [5.6, Y, -124], size: [2, 3], n: 2 },
      { kind: 'gruft', pos: [5.0, Y, -168.0], size: 1.1 },
      { kind: 'grabsteine', pos: [0, Y, -205], size: [16, 4], n: 6, avoid: [[0, -201, 2.5]] },
      { kind: 'krummer_baum', pos: [-8.4, PLAZA, -212.6], height: 4.6 },
      { kind: 'grabsteine', pos: [8.5, PLAZA, -217], size: [4, 8], n: 3 },
      { kind: 'spinnweben', pos: [7.2, PLAZA + 2.6, -224.2], size: 1.2, yaw: 0.2 },
      { kind: 'kerzen', pos: [-1.6, PLAZA, -222.6], n: 5 },
      { kind: 'gruft', pos: [-20.0, Y + 3.2, -26.0], size: 0.7 },
      { kind: 'kerzen', pos: [-20.3, Y + 3.2, -23.3], n: 3 },
      { kind: 'suessigkeiten', pos: [6.8, Y, 4.6], size: 1.1 },
      { kind: 'suessigkeiten', pos: [-6.2, Y, -68.8], size: 1.0 },
      { kind: 'suessigkeiten', pos: [7.8, PLAZA, -233.4], size: 1.2 },
      { kind: 'fledermaus_girlande', from: [-0.4, PLAZA + 4.1, -223.7], to: [7.2, PLAZA + 4.1, -223.7], n: 8, sag: 0.5 },
      { kind: 'fledermaus_girlande', from: [-2.1, Y + 2.3, 0.5], to: [-8.6, Y + 1.2, 0.5], n: 5, sag: 0.3 },
    ] },
    { type: 'sign', pos: [-5.6, Y, 3.2], text: 'Nebelfriedhof\nBitte leise kichern', yaw: 0.3 },
  ],
  items: [
    { kind: 'laterne', pos: [0, Y, -5.4] },
    // Klappergarten: alle drei Klapperknochen endgültig besiegt → Stern 2 erscheint in der Mitte
    { kind: 'task', id: 'aufgabe_garten', area: { min: [GARDEN.x0, Y - 0.5, GARDEN.z1], max: [GARDEN.x1, Y + 4, GARDEN.z0] }, ids: ['kg_1', 'kg_2', 'kg_3'], star: 2, pos: [-9.1, Y + 0.9, -165.6] },
    // Pflaume wartet mit dem Blatt-Floß am Glibberbach
    { kind: 'raft', id: 'floss', pos: [0, -0.5, -75.5], yaw: -Math.PI / 2, exit: [0, -0.6, -126.6], exitR: 0.9 },
    // 1 Friedhofstor
    sweets([0, Y, 3], [0, Y, -2], 3),
    line([0, Y + 0.6, -8.6], [0, Y + 0.6, -11.6], 3),
    sweets([-2, Y - 2, -15.5], [2, Y - 2, -15.5], 3),
    arc([0, Y + 0.5, -13.6], [0, Y + 0.5, -18.4], 4, 1.2),
    sweets([-10.4, Y + 0.6, -24.6], [-15.0, Y + 2.3, -24.4], 3),
    sweetRing([-17.9, Y + 3.2, -24.3], 1.1, 5),
    // 2 Nebelschlucht
    line([0, Y + 0.6, -32.0], [3.2, Y + 1.8, -38.8], 3),
    sweetRing([3.6, Y + 1.2, -44.8], 2.0, 6),
    line([2.0, Y + 1.8, -50.4], [-0.4, Y + 1.2, -60.4], 4),
    // 3 Glibberbach: Süßes und Bitcoins über dem Glibber (das Floß sammelt mit)
    sweetRing([0, Y, -66.5], 1.6, 6),
    line([0, -0.1, -80], [0, -0.1, -86], 3),
    sweets([creekX(-92), -0.3, -92], [creekX(-100), -0.3, -100], 4),
    arc([creekX(-109), 0.0, -109], [creekX(-117), 0.0, -117], 5, 2.2),
    line([creekX(-120), -0.1, -120], [creekX(-125), -0.1, -125], 3),
    // 4 Gruftgarten
    line([0, Y + 0.6, -141.5], [0, Y + 0.6, -150.5], 4),
    sweetRing([5.0, Y, -168.0], 1.6, 6),
    sweets([-1.0, Y, -158], [-1.0, Y, -176], 5),
    line([0, Y + 0.6, -187.4], [0, Y + 0.6, -192.6], 3),
    // 5 Kapellenhügel
    sweets([-6, Y, -199], [6, Y, -199], 5),
    line([0, PLAZA + 0.6, -212], [0, PLAZA + 0.6, -217], 3),
    ...TOWER_STEPS.map(([x, top, z]) => ({ kind: 'coin', pos: [x, top + 0.6, z] })),
  ],
  enemies: [
    { kind: 'klapperknochen', id: 'kk_tor', pos: [-3.5, Y, -9.4], path: [[-4.5, Y, -9.4], [4.5, Y, -9.4]] },
    { kind: 'klapperknochen', id: 'kk_graben', pos: [3.5, Y, -26.6], path: [[-4.5, Y, -26.6], [5, Y, -26.6]] },
    { kind: 'klapperknochen', id: 'kk_dock', pos: [-4, Y, -66.8], path: [[-5.5, Y, -66.8], [5.5, Y, -66.8]], speed: 1.0 },
    { kind: 'klapperknochen', id: 'kg_1', pos: [-11.6, Y, -160.2], path: [[-12.4, Y, -160.2], [-6.4, Y, -160.2]], drop: 'coin' },
    { kind: 'klapperknochen', id: 'kg_2', pos: [-7.0, Y, -165.6], path: [[-12.4, Y, -165.6], [-6.4, Y, -165.6]], drop: 'coin' },
    { kind: 'klapperknochen', id: 'kg_3', pos: [-11.0, Y, -170.8], path: [[-12.4, Y, -170.8], [-6.4, Y, -170.8]], drop: 'coin' },
    { kind: 'klapperknochen', id: 'kk_huegel', pos: [5, Y, -201.0], path: [[-6, Y, -201.0], [6, Y, -201.0]] },
    { kind: 'klapperknochen', id: 'kk_kapelle', pos: [-2, PLAZA, -214.6], path: [[-3.5, PLAZA, -214.6], [6.5, PLAZA, -214.6]], speed: 1.0 },
    { kind: 'kreisgeist', id: 'kg_insel', center: [3.6, Y + 1.5, -44.8], radius: 2.2, speed: 1.2 },
    { kind: 'kreisgeist', id: 'kg_kapelle', center: [7.0, PLAZA + 0.3, -218.0], radius: 2.0, speed: 1.1 },
    { kind: 'kreisgeist_kreis', id: 'gruftring', pos: [5.0, Y + 0.2, -168.0], count: 8, radius: 3.0, speed: 1.4 },
    { kind: 'spuk', id: 'spuk_garten', pos: [1.5, Y + 0.4, -176], sight: 9, speed: 1.1 },
    { kind: 'flatterfledi', id: 'ff_tor', pos: [5.2, Y + 2.9, -18.8], sight: 4 },
    { kind: 'flatterfledi', id: 'ff_insel', pos: [6.4, Y + 1.2 + 2.8, -46.8], sight: 3.5 },
    { kind: 'flatterfledi', id: 'ff_kapelle', pos: [-7.6, PLAZA + 2.9, -212.6], sight: 4 },
  ],
  checkpoint: [[0, Y, -66], [0, Y, -134], [5.8, Y, -184]],
  stars: [
    [-17.9, Y + 3.2, -24.3],                                             // 0: schwebende Gruft hinter dem kichernden Geist
    [creekX(-113), 1.6, -113],                                           // 1: über dem Glibberbach (Floß-Hüpfer)
    { pos: [-9.1, Y + 0.9, -165.6], hidden: true, id: 'stern_garten' },  // 2: Klappergarten
  ],
  stamp: [-7.4, TOWER.top, -229.4],
  goal: [3.4, PLAZA, -219.6],
  marks: {
    start: [0, Y, 5], laterne: [0, Y, -5.4], graben: [0, Y, -12.6], geist: [-6.9, Y, -22.9], gruft0: [-17.9, Y + 3.2, -24.3],
    schlucht: [0, Y, -29.4], insel: [3.6, Y + 1.2, -42], dock: [0, Y, -71.4], tunnel: [creekX(-101), -0.5, -101], ufer: [6.4, Y, -110.4],
    landung: [0, Y, -130], pfahl: [0, Y, -139.6], garten: [-9.1, Y, -165.6], schalter: [5.6, Y, -180.4], bruecke: [0, Y, -185.4],
    huegel: [0, Y, -199], kapelle: [3.4, PLAZA, -217], turm: [-4.4, PLAZA, -224.4], goal: [3.4, PLAZA, -219.6],
  },
};
