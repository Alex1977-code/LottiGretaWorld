// Testlevel 0-5 „Prüfstube“ (Archetyp house): drei Mini-Räume à 10 s, je ein Stern – Raum 1 alle Gegner
// besiegen (zwei Pilzlinge), Raum 2 alle Münzen einsammeln (roomId), Raum 3 den Stern auf dem Podest erreichen.
// Die Räume liegen getrennt nebeneinander (x = 0 / 40 / 80), jeder mit eigener Kamera (area). Zeit abgelaufen →
// Haus verlassen mit den bisherigen Sternen.

const Y = 1;
const room = (x, color) => ({ type: 'room', pos: [x, Y, 0], size: [13, 3.2, 13], ceiling: false, style: color, wall: 0.7 });
const area = (x) => ({ min: [x - 7, Y - 2, -7], max: [x + 7, Y + 8, 7] });
const cam = (x, pitch = 52, cz = -0.5, pull = 0.65) => ({ pitch, dist: 16, yaw: 0, fov: 40, center: [x, Y, cz], pull, ahead: 0 });

export const LEVEL = {
  id: '0-5',
  world: 0,
  title: 'Prüfstube',
  archetype: 'house',
  theme: 'cave',
  music: 'course_house',
  timeLimit: 300,
  start: { pos: [0, Y, 4.5], yaw: Math.PI / 2 },
  house: {
    fail: 'exit',
    rooms: [
      { id: 'r1', goal: 'defeatAll', area: area(0), start: { pos: [0, Y, 4.5], yaw: Math.PI / 2 }, camera: cam(0), star: [0, Y + 1.6, -1.5], time: 10 },
      { id: 'r2', goal: 'collect', area: area(40), start: { pos: [40, Y, 4.5], yaw: Math.PI / 2 }, camera: cam(40), star: [40, Y + 2.2, -2], time: 10 },
      { id: 'r3', goal: 'reach', area: area(80), start: { pos: [80, Y, 4.5], yaw: Math.PI / 2 }, camera: cam(80, 50), star: [80, Y + 3.3, -2.2], time: 10 },
    ],
  },
  segments: [
    room(0, 0x8a6ad0), room(40, 0x4f9ad8), room(80, 0xd0805a),
    // Raum 3: Stufen zum Sternpodest
    { type: 'platform', pos: [80, Y, 1.2], size: [3, 1.2, 2.4], style: 'block', color: 'yellow' },
    { type: 'platform', pos: [80, Y, -2.2], size: [3, 2.4, 3], style: 'block', color: 'orange' },
    // Raum 2: kleine Insel in der Mitte (Münzen darauf)
    { type: 'platform', pos: [40, Y, -2.5], size: [3, 1, 3], style: 'block', color: 'cyan' },
    { type: 'deco', items: [
      { kind: 'lantern', pos: [-5.6, Y, -5.6] }, { kind: 'lantern', pos: [5.6, Y, -5.6] },
      { kind: 'lantern', pos: [34.4, Y, -5.6] }, { kind: 'lantern', pos: [45.6, Y, -5.6] },
      { kind: 'lantern', pos: [74.4, Y, -5.6] }, { kind: 'lantern', pos: [85.6, Y, -5.6] },
    ] },
  ],
  enemies: [
    { kind: 'pilzling', id: 'p1', roomId: 'r1', pos: [-3, Y, -2.5], behavior: 'chase', sight: 12, wake: 30 },
    { kind: 'pilzling', id: 'p2', roomId: 'r1', pos: [3.5, Y, -3.5], behavior: 'chase', sight: 12, wake: 30 },
  ],
  items: [
    { kind: 'coins', roomId: 'r2', pos: [40, Y + 0.4, 0.5], r: 4.2, n: 6 },
    { kind: 'coins', roomId: 'r2', from: [39.4, Y + 1.5, -2.5], to: [40.6, Y + 1.5, -2.5], n: 2 },
  ],
  marks: { r1: [0, Y, 4.5], r2: [40, Y, 4.5], r3: [80, Y, 4.5], podest: [80, Y + 2.4, -2.2] },
};
