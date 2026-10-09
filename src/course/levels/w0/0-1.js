// Gegnerpark (0-1): Testlevel für alle Gegner und Power-ups von Welt 1 (tests/course_enemies.mjs).
// Ein Mittelweg (x ≈ 0) führt nach −Z; links (x −18 … −4) und rechts (x 4 … 18) liegen Gehege (niedrige Mauern,
// 1,2 m – überspringbar) mit je einer Gegnerart. Reihen (z):
//   Start (z 8 … −6)       ?-Blöcke mit allen Power-ups, Ziegel (Tatzenhieb), Steinblöcke (Riesentrank)
//   1 (−8 … −22)           links Pilzlinge (laufen, patrouillieren, verfolgen) · rechts Krallen-Pilzlinge
//   2 (−24 … −38)          links Pilzlingstürme (3; 5 mit Stern 3) · rechts Panzerkröten (eine mit Goldpanzer)
//   3 (−40 … −54)          links Panzerbahn (Panzer + 3 Pilzlinge in Reihe) · rechts Schnappblumen (Topf, Boden, Röhre)
//   4 (−56 … −70)          links Bulle auf einem Plateau (Kanten, Westwand) · rechts Stampfsteine über einem Weg
//   5 (−72 … −86)          links Käferbahnen (Krabbel am Boden, Flatter in der Luft) · rechts Brummer
//   6 (−88 … −102)         links Zauberkröten-Arena (hohe Mauern, Stern 2) · rechts Wühler (Becken und Erde)
//   7 (−104 … −118)        links Kickbomben vor Stein- und Ziegelwand (dahinter Stern 1) · rechts Riesenschnappblume
//   Ziel bei z −132.

const Y = 1; // Bodenhöhe

/** Gehege: vier niedrige Mauern um x0..x1 × z0..z1 (z0 > z1). */
function pen(x0, x1, z0, z1, h = 1.2) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z0 - z1;
  return [
    { type: 'wall', pos: [cx, Y, z0], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [cx, Y, z1], size: [w + 0.5, h, 0.5], camIgnore: true },
    { type: 'wall', pos: [x0, Y, cz], size: [0.5, h, d], camIgnore: true },
    { type: 'wall', pos: [x1, Y, cz], size: [0.5, h, d], camIgnore: true },
  ];
}
const row = (r) => [-8 - 16 * (r - 1), -22 - 16 * (r - 1)];
const L = (r, h) => pen(-18, -4, ...row(r), h);
const R = (r, h) => pen(4, 18, ...row(r), h);

export const LEVEL = {
  id: '0-1',
  world: 0,
  title: 'Gegnerpark',
  archetype: 'parcours',
  theme: 'grass',
  music: 'course_grass',
  timeLimit: 999,
  start: { pos: [0, Y, 5], yaw: Math.PI / 2 },
  camera: [{ from: 12, to: -145, pitch: 45, dist: 13, yaw: 0 }],
  segments: [
    { type: 'island', pos: [0, 0, -65], size: [40, 1, 150] },
    { type: 'killplane', y: -16 },
    ...L(1), ...R(1), ...L(2), ...R(2), ...L(3), ...R(3), ...L(4), ...R(4), ...L(5), ...R(5),
    ...L(6, 3), ...R(6), ...L(7), ...R(7),
    // 3 rechts: Röhre für die Röhren-Schnappblume
    { type: 'pipe', pos: [15, Y, -45], height: 1.2, radius: 0.8 },
    // 4 links: Plateau für den Bullen (2 m hoch, offene Kanten nach N/O/S, Mauer im Westen)
    { type: 'island', pos: [-11, Y, -63], size: [12, 2, 12], top: 'stone', under: 0 },
    { type: 'wall', pos: [-16.7, Y + 2, -63], size: [0.6, 1.6, 12] },
    // 6 rechts: Becken (Rand 1 m, Wasser 0,9 m tief) für den Wasser-Wühler
    { type: 'wall', pos: [11, Y, -90.5], size: [9, 1, 0.5] },
    { type: 'wall', pos: [11, Y, -97.5], size: [9, 1, 0.5] },
    { type: 'wall', pos: [6.75, Y, -94], size: [0.5, 1, 7.5] },
    { type: 'wall', pos: [15.25, Y, -94], size: [0.5, 1, 7.5] },
    { type: 'water', pos: [11, Y, -94], size: [8, 0.9, 6.5] },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-19, Y, 4], size: 4.6 }, { kind: 'tree', pos: [19, Y, -2], size: 5 },
      { kind: 'flowers', pos: [-2, Y, 6], size: [3, 2], n: 8 }, { kind: 'bush', pos: [2.5, Y, 7], size: 0.7 },
      { kind: 'fence', from: [9, Y, -57], to: [9, Y, -69] }, { kind: 'fence', from: [13, Y, -57], to: [13, Y, -69] },
      { kind: 'flowers', pos: [2, Y, -60], size: [1.5, 3], n: 6 }, { kind: 'tree', pos: [-19.5, Y, -80], size: 4.4 },
      { kind: 'tree', pos: [19.5, Y, -110], size: 4.8 }, { kind: 'bush', pos: [-2.5, Y, -120], size: 0.8 },
    ] },
  ],
  blocks: [
    // Power-ups (von unten stoßen)
    { kind: 'question', pos: [-7.5, 3.4, -3], content: 'wachstumsbeere' },
    { kind: 'question', pos: [-5.5, 3.4, -3], content: 'krallenAnzug' },
    { kind: 'question', pos: [-3.5, 3.4, -3], content: 'funkenbluete' },
    { kind: 'question', pos: [3.5, 3.4, -3], content: 'riesentrank' },
    { kind: 'question', pos: [5.5, 3.4, -3], content: 'funkelstern' },
    { kind: 'question', pos: [7.5, 3.4, -3], content: '1up' },
    // Ziegel für den Tatzenhieb, Steinblöcke für den Riesentrank
    { kind: 'brick', pos: [-12, Y, 1] }, { kind: 'brick', pos: [-12, Y + 1, 1] },
    { kind: 'blockwand', pos: [12, Y, 1], size: [3, 2, 1] },
    // 7 links: Steinwand und Ziegelwand vor Stern 2
    { kind: 'blockwand', pos: [-11, Y, -114], size: [5, 3, 1] },
    { kind: 'blockwand', pos: [-16, Y, -114], size: [2, 2, 1], block: 'brick' },
  ],
  enemies: [
    // 1 links: Pilzlinge
    { kind: 'pilzling', id: 'pz_walk', pos: [-14, Y, -11], dir: [1, 0] },
    { kind: 'pilzling', id: 'pz_patrol', pos: [-15, Y, -15], path: [[-16, Y, -15], [-6, Y, -15]] },
    { kind: 'pilzling', id: 'pz_chase', pos: [-8, Y, -19.5], dir: [-1, 0], behavior: 'chase', sight: 6 },
    // 1 rechts: Krallen-Pilzlinge
    { kind: 'krallen_pilzling', id: 'kp1', pos: [8, Y, -12], dir: [1, 0] },
    { kind: 'krallen_pilzling', id: 'kp2', pos: [14, Y, -18.5], path: [[10, Y, -18.5], [16, Y, -18.5]] },
    // 2 links: Pilzlingstürme
    { kind: 'pilzlingsturm', id: 'turm3', pos: [-14, Y, -28], count: 3, behavior: 'walk', dir: [1, 0], speed: 0.8 },
    { kind: 'pilzlingsturm', id: 'turm5', pos: [-9, Y, -34], count: 5, carries: 'star:2' },
    // 2 rechts: Panzerkröten
    { kind: 'panzerkroete', id: 'kroete', pos: [8, Y, -28], path: [[6, Y, -28], [16, Y, -28]] },
    { kind: 'panzerkroete', id: 'kroete_gold', pos: [12, Y, -34], dir: [1, 0], gold: true },
    // 3 links: Panzerbahn (Panzer kicken → Pilzlinge in Reihe)
    { kind: 'panzer', id: 'panzer', pos: [-6.5, Y, -47] },
    ...[-10, -13, -16].map((x, i) => ({ kind: 'pilzling', id: `bahn${i + 1}`, pos: [x, Y, -47], path: [[x, Y, -46.7], [x, Y, -47.3]], speed: 0.3 })),
    // 3 rechts: Schnappblumen
    { kind: 'schnappblume', id: 'blume_topf', pos: [7, Y, -44], base: 'pot', yaw: -Math.PI / 2 },
    { kind: 'schnappblume', id: 'blume_boden', pos: [11, Y, -51], base: 'ground', yaw: -Math.PI / 2 },
    { kind: 'schnappblume', id: 'blume_rohr', pos: [15, Y + 1.2, -45], base: 'pipe', yaw: -Math.PI / 2 },
    // 4 links: Bulle auf dem Plateau (Blick nach Osten)
    { kind: 'rammbock_bulle', id: 'bulle', pos: [-11, Y + 2, -63], dir: [1, 0] },
    // 4 rechts: Stampfsteine über dem Weg (x = 11)
    { kind: 'stampfstein', id: 'stein1', pos: [11, Y + 3.5, -59] },
    { kind: 'stampfstein', id: 'stein2', pos: [11, Y + 3.5, -63] },
    { kind: 'stampfstein', id: 'stein3', pos: [11, Y + 3.5, -67] },
    // 5 links: Käferbahnen
    { kind: 'krabbelkaefer', id: 'krabbel', path: [[-16, Y, -74.5], [-6, Y, -74.5], [-6, Y, -84], [-16, Y, -84]], count: 4, spacing: 1.6 },
    { kind: 'flatterkaefer', id: 'flatter', path: [[-14, Y + 2.4, -77], [-8, Y + 2.4, -77], [-8, Y + 2.4, -81.5], [-14, Y + 2.4, -81.5]], count: 3, spacing: 2, color: 'pink' },
    // 5 rechts: Brummer
    { kind: 'brummer', id: 'brummer_kreis', center: [8.5, Y + 2.6, -77], radius: 2 },
    { kind: 'brummer', id: 'brummer_bahn', path: [[12, Y + 2.8, -80], [16, Y + 2.8, -84], [12, Y + 2.8, -84]] },
    // 6 links: Zauberkröten-Arena
    { kind: 'zauberkroete', id: 'zauber', spots: [[-15, Y, -91], [-7, Y, -91], [-7, Y, -99], [-15, Y, -99]] },
    // 6 rechts: Wühler im Becken und in der Erde
    { kind: 'wuehler', id: 'wuehler_w', pos: [11, Y + 0.9, -94], ground: 'water', path: [[8.5, Y + 0.9, -94], [13.5, Y + 0.9, -94]] },
    { kind: 'wuehler', id: 'wuehler_e', pos: [11, Y, -100], ground: 'earth', phase: 0.5 },
    // 7 links: Kickbomben
    { kind: 'kickbombe', id: 'bombe1', pos: [-8, Y, -108], path: [[-14, Y, -108], [-6, Y, -108]] },
    { kind: 'kickbombe', id: 'bombe2', pos: [-14, Y, -110.5], dir: [1, 0] },
    // 7 rechts: Riesenschnappblume
    { kind: 'riesenschnappblume', id: 'riesenblume', pos: [11, Y, -111.5], yaw: -Math.PI / 2 },
  ],
  items: [
    { kind: 'coins', from: [0, Y + 0.3, -10], to: [0, Y + 0.3, -30], n: 6 },
    { kind: 'coins', from: [0, Y + 0.3, -60], to: [0, Y + 0.3, -80], n: 6 },
  ],
  checkpoint: [0, Y, -70],
  // Stern 3 (Index 2) trägt der große Pilzlingsturm ('star:2'); hier nur Stern 1 und 2
  stars: [[-11, Y + 0.4, -116.5], [-11, Y + 0.4, -95]],
  stamp: [-6, Y + 2.2, -58],
  goal: { pos: [0, Y, -132], height: 7 },
  marks: {
    start: [0, Y, 5],
    blocks: [0, Y, -3],
    claw: [-12, Y, 2.6],
    stoneWall: [12, Y, 2.6],
    pilzlinge: [-11, Y, -15],
    krallen: [11, Y, -15],
    tuerme: [-11, Y, -31],
    kroeten: [11, Y, -31],
    bahn: [-5, Y, -47],
    blumen: [11, Y, -47],
    bulle: [-11, Y + 2, -63],
    steine: [11, Y, -63],
    kaefer: [-11, Y, -79],
    brummer: [11, Y, -79],
    arena: [-11, Y, -95],
    wuehler: [11, Y, -100],
    bomben: [-11, Y, -108],
    riesenblume: [11, Y, -106],
  },
};
