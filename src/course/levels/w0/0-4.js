// Testlevel 0-4 „Rollband“ (Archetyp autoscroller): kurzer Autoscroller über drei fahrende Plattformwagen mit
// Lücken auf einer Gerüstbrücke über einer Schlucht. Das Bildfenster fährt schneller (4 → 3,4 m/s) als die Wagen
// (2,5 m/s) – die Figur muss nach vorn von Wagen zu Wagen springen, sonst schiebt die hintere Grenze sie in die
// Lücke. Auf Wagen 2 fährt eine Bombenkanone mit (attach), dazu ein Checkpoint; auf Wagen 3 Ladung (Hindernis) und
// ein Pilzling. Am Ende halten Wagen und Fenster vor dem Zielbahnsteig; die Figur läuft frei weiter zur Röhre,
// die zum Zielmast auf der Nachbarinsel führt.
//
// Pfad: z = 10 − s (gerade nach −Z, Schienenoberkante y = 0). Wagen (Mitte): 18,8 / 30,8 / 43,3 → halten 72 m
// weiter (Wagen 3 vorn bei s = 119,8 direkt am Bahnsteig, z = −110). Fenster: Mitte s 11 → 121.

const Z = (s) => 10 - s;
const DECK = 1.2;

export const LEVEL = {
  id: '0-4',
  world: 0,
  title: 'Rollband',
  archetype: 'autoscroller',
  theme: 'grass',
  music: 'course_train',
  timeLimit: 200,
  killY: -8,
  start: { pos: [0, DECK, 4], yaw: Math.PI / 2 },
  scroll: {
    path: [[0, 0, 10], [0, 0, -150]],
    start: 11, end: 121,
    speed: 4, speeds: [{ from: 40, speed: 3.4 }],
    delay: 2,
    frame: { back: 5, front: 8 },
    startBanner: 'Los geht\'s!',
  },
  camera: [
    { from: 14, to: -150, pitch: 41, dist: 15, yaw: 0, fov: 40 },
    { from: -108, to: -136, pitch: 46, dist: 13, yaw: 0, area: [17, 40] },
  ],
  segments: [
    { type: 'killplane', y: -8 },
    // Start- und Zielbahnsteig (Felsen), Gleis auf Gerüst dazwischen
    { type: 'island', pos: [0, -24, 3], size: [10, 24 + DECK, 14], top: 'stone', under: 0 },
    { type: 'island', pos: [0, -24, -118], size: [12, 24 + DECK, 16], top: 'stone', under: 0 },
    { type: 'island', pos: [26, -24, -122], size: [14, 24 + DECK, 18], under: 0 },
    { type: 'track', path: [[0, 0, -3.6], [0, 0, -109.7]], trestle: { bottom: -36, every: 8 }, buffer: 'end' },
    { type: 'pipe', id: 'zielrohr', pos: [0, DECK, -121], height: 1.4, target: [26, DECK + 1, -116] },
    { type: 'sign', pos: [-3.4, DECK, 7], text: 'Rollband' },
    { type: 'deco', items: [
      { kind: 'fence', from: [-4.6, DECK, 9.6], to: [4.6, DECK, 9.6] },
      { kind: 'tree', pos: [30.5, DECK, -116], size: 4 }, { kind: 'bush', pos: [21, DECK, -129], size: 0.8 },
      { kind: 'flowers', pos: [30, DECK, -128], size: [2.5, 2], n: 8 },
      { kind: 'rock', pos: [-4.2, DECK, -124], size: 0.6 },
    ] },
    // Wagen: Fenster schneller als die Kolonne
    { type: 'vehicle', id: 'wagen1', style: 'cart', at: 18.8, speed: 2.5, delay: 1, stop: 90.8, color: 'red' },
    { type: 'vehicle', id: 'wagen2', style: 'cart', at: 30.8, speed: 2.5, delay: 1, stop: 102.8, color: 'blue' },
    { type: 'vehicle', id: 'wagen3', style: 'cart', at: 43.3, speed: 2.5, delay: 1, stop: 115.3, color: 'green',
      parts: [{ pos: [-0.9, DECK, -1.6], size: [1.8, 1.3, 1.8], color: 0xc98a52, tag: 'ladung' }] },
  ],
  enemies: [
    { kind: 'bomb_cannon', id: 'kanone', attach: 'wagen2', pos: [1.0, DECK, Z(30.8) + 2.6], yaw: Math.PI / 2, interval: 5, first: 2.5, range: 15, max: 1, flight: 1.1 },
    { kind: 'pilzling', id: 'pilz', attach: 'wagen3', pos: [1.2, DECK, Z(43.3) + 2.4], dir: [0, 1], wake: 14 },
  ],
  items: [
    { kind: 'coins', from: [-1, DECK + 0.8, Z(18.8) + 2.5], to: [-1, DECK + 0.8, Z(18.8) - 2.5], n: 4, attach: 'wagen1' },
    { kind: 'coins', from: [0, DECK + 1.6, Z(25)], to: [0, DECK + 1.6, Z(26)], n: 2, attach: 'wagen1' },
    { kind: 'coins', from: [-1.2, DECK + 0.8, Z(30.8) + 1.5], to: [-1.2, DECK + 0.8, Z(30.8) - 1.5], n: 3, attach: 'wagen2' },
    { kind: 'coins', from: [1.2, DECK + 0.8, Z(43.3) - 1], to: [1.2, DECK + 0.8, Z(43.3) - 3.5], n: 3, attach: 'wagen3' },
  ],
  checkpoint: { pos: [-1.3, DECK, Z(30.8) - 3], attach: 'wagen2' },
  stars: [
    { pos: [0, DECK + 2.6, Z(18.8) - 2], attach: 'wagen1' },
    { pos: [-0.9, DECK + 1.3 + 0.9, Z(43.3) - 1.6], attach: 'wagen3' },
    [4.5, DECK, -124],
  ],
  goal: { pos: [26, DECK, -127] },
  marks: { wagen2Deck: [-1, DECK, Z(30.8)], end: [0, DECK, -114] },
};
