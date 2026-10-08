// Übungsplatz (0-0): ca. 165 m, alle Grund-Bausteine und Bewegungen des Kurs-Motors.
// Abschnitte (Level verläuft nach −Z):
//   A  Übungswiese (z 6 … −24): ?-Blöcke, Ziegel, versteckter Block (1-Up), Mehrfach-Münzblock, weiße Treppe,
//      Pilzling. Linke Bahn (x ≈ −7,5) bleibt frei: 28 m Anlauf/Sprungfeld mit 1-m-Raster.
//   B  Brücke + Wandsprung-Schacht (Stern 1), Trampolin zur hohen Plattform, Förderband, Kristallblöcke.
//   C  Wasserbecken (Schwimmen), Checkpoint.
//   D  Kletterwand (Krallen-Anzug aus dem ?-Block) oder Bohnenranke aufs Plateau; Ziegeldecke zum
//      Stampfen über einer Kammer (Stern 2).
//   E  Bewegliche Plattform über die Schlucht, Lava-Graben, Boost-Pfeil, Röhre in den Bonusraum (Stempel).
//   F  Finale: Sprung über die Lücke, Säule für Rückwärtssalto/Dreifachsprung (Stern 3), Treppe, Zielmast.
//   Bonusraum abseits bei x ≈ 70 (eigene Kameraschiene).

const coinsLine = (from, to, n) => ({ kind: 'coins', from, to, n });

export const LEVEL = {
  id: '0-0',
  world: 0,
  title: 'Übungsplatz',
  archetype: 'parcours',
  theme: 'test',
  music: 'course_grass',
  timeLimit: 300,
  start: { pos: [0, 1, 3], yaw: Math.PI / 2 },
  camera: [
    { from: 8, to: -26, pitch: 48, dist: 13.5, yaw: 0 },
    { from: -26, to: -50, pitch: 50, dist: 14, yaw: 0 },
    { from: -50, to: -74, pitch: 55, dist: 14, yaw: 0 },
    { from: -74, to: -106, pitch: 46, dist: 15, yaw: -8 },
    { from: -106, to: -146, pitch: 50, dist: 14, yaw: 0 },
    { from: -146, to: -170, pitch: 46, dist: 15, yaw: 0, x: 0, xLock: 0.4 },
    { from: -80, to: -120, pitch: 52, dist: 12, yaw: 0, x: 70, xLock: 0.6, area: [55, 90] },
  ],
  segments: [
    // ---------------- A  Übungswiese
    { type: 'island', pos: [0, 0, -9], size: [20, 1, 30] },
    { type: 'stairs', pos: [6, 1, -8], dir: '-z', steps: 3, rise: 1, run: 1.5, width: 3 },
    { type: 'platform', pos: [6, 3.4, -14.5], size: [3, 0.6, 3], color: 'red' },
    { type: 'deco', items: [
      { kind: 'tree', pos: [8.6, 1, 3], size: 4.6 }, { kind: 'tree', pos: [8.8, 1, -21], size: 5 },
      { kind: 'bush', pos: [-3, 1, 4.6], size: 0.7 }, { kind: 'bush', pos: [3.5, 1, -23], size: 0.8 },
      { kind: 'flowers', pos: [3, 1, 2], size: [3, 2], n: 12 }, { kind: 'flowers', pos: [-2.5, 1, -21], size: [3, 2], n: 10 },
      { kind: 'rock', pos: [9, 1, -12], size: 0.5 },
      { kind: 'fence', from: [-9.6, 1, 5.6], to: [-5.6, 1, 5.6] },
    ] },
    // ---------------- B  Brücke, Wandsprung, Trampolin, Förderband
    { type: 'bridge', from: [0, 1, -24], to: [0, 1, -32], width: 3 },
    { type: 'island', pos: [0, 0, -41], size: [20, 1, 18] },
    { type: 'wall', pos: [-8.5, 1, -42], size: [1, 9, 8] },
    { type: 'wall', pos: [-4.5, 1, -42], size: [1, 6, 8] },
    { type: 'trampoline', pos: [6, 1, -36], strength: 17 },
    { type: 'platform', pos: [6, 5.4, -42], size: [3.2, 0.6, 3.2], color: 'blue' },
    { type: 'conveyor', pos: [1, 1, -47], size: [10, 0.3, 3], dir: [1, 0], speed: 3 },
    { type: 'deco', items: [
      { kind: 'tree', pos: [9, 1, -49], size: 4.4 }, { kind: 'bush', pos: [-2, 1, -49.2], size: 0.6 },
      { kind: 'flowers', pos: [3, 1, -33.5], size: [4, 1.5], n: 10 },
    ] },
    // ---------------- C  Wasserbecken, Checkpoint
    { type: 'island', pos: [0, 0, -52], size: [20, 1, 4] },
    { type: 'island', pos: [0, -3, -60], size: [14, 1, 12], top: 'sand', under: 0 },
    { type: 'island', pos: [-8.5, -3, -60], size: [3, 4, 12], under: 1.5 },
    { type: 'island', pos: [8.5, -3, -60], size: [3, 4, 12], under: 1.5 },
    { type: 'water', pos: [0, -2, -60], size: [14, 2.6, 12] },
    { type: 'island', pos: [0, 0, -70], size: [20, 1, 8] },
    { type: 'deco', items: [
      { kind: 'fence', from: [-9.5, 1, -50.3], to: [-6.5, 1, -50.3] }, { kind: 'fence', from: [6.5, 1, -50.3], to: [9.5, 1, -50.3] },
      { kind: 'rock', pos: [-8.6, 1, -63], size: 0.6 }, { kind: 'bush', pos: [8.6, 1, -57], size: 0.7 },
      { kind: 'flowers', pos: [-6, 1, -71], size: [3, 2], n: 10 },
    ] },
    // ---------------- D  Kletterwand, Bohnenranke, Plateau mit Ziegeldecke
    { type: 'island', pos: [0, 0, -81], size: [20, 1, 14] },
    { type: 'wall', pos: [-3, 1, -88.5], size: [10, 6, 1], climbable: true },
    { type: 'beanstalk', pos: [7, 1, -87.3], height: 8.5 },
    { type: 'island', pos: [0, 0, -93], size: [20, 7, 8], under: 3 },
    { type: 'island', pos: [-3, 0, -99], size: [14, 7, 4], under: 3 },
    { type: 'island', pos: [8.5, 0, -99], size: [3, 7, 4], under: 3 },
    { type: 'island', pos: [0, 0, -103], size: [20, 7, 4], under: 3 },
    { type: 'island', pos: [5.5, 0, -99], size: [3, 4, 4], top: 'stone', under: 0 },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-8.5, 7, -92], size: 4.6 }, { kind: 'tree', pos: [8.6, 7, -103.5], size: 4.2 },
      { kind: 'bush', pos: [9, 1, -78], size: 0.8 }, { kind: 'flowers', pos: [-7, 1, -80], size: [3, 3], n: 12 },
    ] },
    // ---------------- E  Bewegliche Plattform, Lava, Boost, Röhre
    { type: 'mover', size: [3, 0.5, 3], path: [[0, 6.5, -107.5], [0, 6.5, -114.5]], speed: 2.5, wait: 0.6 },
    { type: 'island', pos: [0, 0, -122], size: [14, 7, 10], under: 3 },
    { type: 'lava', pos: [0, 2, -128.5], size: [14, 4.4, 3] },
    { type: 'island', pos: [0, 0, -136], size: [14, 7, 12], under: 3 },
    { type: 'boost', pos: [0, 7, -132.5], dir: [0, -1], speed: 16 },
    { type: 'pipe', id: 'p1', pos: [-4.5, 7, -137.5], height: 1.6, target: 'p2' },
    { type: 'pipe', id: 'p3', pos: [4.5, 7, -139.5], height: 1.6 },
    { type: 'deco', items: [{ kind: 'bush', pos: [6.2, 7, -118], size: 0.7 }, { kind: 'flowers', pos: [-5, 7, -120], size: [2, 3], n: 8 }] },
    // ---------------- F  Finale und Ziel
    { type: 'island', pos: [0, 0, -155], size: [16, 7, 14], under: 3 },
    { type: 'wall', pos: [-5.5, 7, -152], size: [2, 4.5, 2], style: 'stone' },
    { type: 'stairs', pos: [0, 7, -151], dir: '-z', steps: 3, rise: 1, run: 1, width: 4 },
    { type: 'island', pos: [0, 7, -158], size: [7, 3, 8], top: 'stone', under: 0 },
    { type: 'deco', items: [{ kind: 'tree', pos: [6.5, 7, -160], size: 4.8 }, { kind: 'flowers', pos: [5, 7, -150], size: [3, 2], n: 10 }] },
    // ---------------- Bonusraum (abseits)
    { type: 'island', pos: [70, 0, -100], size: [14, 1, 10], top: 'stone' },
    { type: 'wall', pos: [70, 1, -105.5], size: [16, 4, 1], style: 'stone' },
    { type: 'wall', pos: [62.5, 1, -100], size: [1, 4, 10], style: 'stone', camIgnore: true },
    { type: 'wall', pos: [77.5, 1, -100], size: [1, 4, 10], style: 'stone', camIgnore: true },
    { type: 'pipe', id: 'p2', pos: [65, 1, -100], height: 1.5, target: 'p3' },
  ],
  blocks: [
    { kind: 'brick', pos: [-1, 3.4, -6] },
    { kind: 'question', pos: [0, 3.4, -6], content: 'coin' },
    { kind: 'brick', pos: [1, 3.4, -6] },
    { kind: 'question', pos: [2, 3.4, -6], content: 'wachstumsbeere' },
    { kind: 'hidden', pos: [-4, 3.4, -10], content: 'oneup' },
    { kind: 'coinblock', pos: [3, 3.4, -15], count: 5 },
    { kind: 'crystal', pos: [-2, 1, -36] },
    { kind: 'crystal', pos: [-1, 1, -36] },
    { kind: 'question', pos: [-3, 3.4, -78], content: 'krallenAnzug' },
    { kind: 'question', pos: [-1, 3.4, -78], content: 'coin' },
    // Ziegeldecke über der Kammer (Stampfen!)
    ...[4.5, 5.5, 6.5].flatMap((x) => [-97.5, -98.5, -99.5, -100.5].map((z) => ({ kind: 'brick', pos: [x, 6, z] }))),
    { kind: 'brick', pos: [-2, 12.4, -156] },
    { kind: 'question', pos: [-1, 12.4, -156], content: 'coin' },
  ],
  enemies: [
    { kind: 'pilzling', pos: [-3.5, 1, -15], path: [[-4, 1, -15], [3, 1, -15]] },
    { kind: 'pilzling', pos: [2, 1, -39], dir: [1, 0] },
    { kind: 'pilzling', pos: [0, 1, -82], path: [[-5, 1, -82], [5, 1, -82]] },
    { kind: 'pilzling', pos: [0, 7, -122], path: [[-4, 7, -122], [4, 7, -122]] },
    { kind: 'pilzling', pos: [4, 7, -150], dir: [-1, 0] },
  ],
  items: [
    coinsLine([0, 1.2, -12], [0, 1.2, -20], 5),
    coinsLine([0, 1.3, -26], [0, 1.3, -30], 3),
    { kind: 'coins', pos: [6, 6.2, -42], r: 1, n: 6 },
    coinsLine([-3, -1.7, -57], [3, -1.7, -63], 4),
    { kind: 'coin', pos: [7, 3.2, -86.5] }, { kind: 'coin', pos: [7, 5.2, -86.5] }, { kind: 'coin', pos: [7, 7.2, -86.5] },
    coinsLine([0, 8, -108], [0, 8, -114], 4),
    coinsLine([-2, 7.3, -134.5], [2, 7.3, -134.5], 3),
    { kind: 'coins', pos: [70, 1.2, -99.5], r: 2.6, n: 10 },
    coinsLine([66, 1.2, -103.5], [74, 1.2, -103.5], 5),
    coinsLine([0, 8.3, -151.5], [0, 10.3, -153.5], 3),
  ],
  checkpoint: [0, 1, -70],
  stars: [[-6.5, 8.5, -42], [5.5, 4.3, -99], [-5.5, 11.7, -152]],
  stamp: [72, 1.2, -101],
  goal: { pos: [0, 10, -159], height: 8 },
  // Benannte Punkte für Tests/Fehlersuche (vom Spiel ignoriert)
  marks: {
    lane: [-7.5, 1, 4.5],
    block: [0, 1, -6],
    wall: [-2.7, 1, -42],
    trampoline: [6, 3, -36],
    water: [0, -0.5, -60],
    checkpoint: [0, 1, -70],
    bricks: [5.5, 7, -99],
    climb: [-3, 1, -87.3],
    stalk: [7, 1, -85.9],
    mover: [0, 7.05, -107.5],
    lava: [0, 9, -128.5],
    pipe: [-4.5, 8.6, -137.5],
    goal: [0, 10, -156],
    pilzling: [-3.5, 1, -15],
    bonus: [70, 1, -98],
  },
};
