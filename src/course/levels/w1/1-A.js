// 1-A „Hörnerkrach im Käfig“ (Archetyp arena, Bauplan 1-A: Gegner-Blockade): geschlossener gelber Käfigraum auf
// einer runden Festungsplattform (Innenradius 11 m ≈ 22 m Durchmesser) über einer Blumenwiese. Zwei Rammbock-Bullen
// (je 3 Treffer – draufspringen, wenn sie scharren oder nach einem Aufprall am Gitter benommen sind). Sind beide
// besiegt, steigt der grüne Stern in der Mitte auf (Kamerafahrt); Einsammeln beendet das Level. Zeitlimit 200 s.
// Kulisse: Tribünen mit jubelnden Zuschauern (Wichtel in bunten Farben), Fahnenmasten mit Wimpeln, Feuerschalen,
// Bäume und Büsche auf der Wiese, Hügel am Horizont.
// Geheimnisse: keine (Bauplan). Ein ?-Block mit Münzen und zwei Münzkreise belohnen das Herumspringen.

const Y = 2.4;            // Bodenoberfläche der Arena
const R = 11;             // Innenradius des Käfigs

/** Punkte auf einem Kreis um die Arena-Mitte (Winkel 0 = +Z, zur Kamera). */
const ring = (r, a, y = 0) => [Math.sin(a) * r, y, Math.cos(a) * r];

export const LEVEL = {
  id: '1-A',
  world: 1,
  title: 'Hörnerkrach im Käfig',
  archetype: 'arena',
  theme: 'grass',
  music: 'course_arena',
  timeLimit: 200,
  starSlots: 1,           // ein Stern, kein Stempel (HUD/Ergebnis)
  start: { pos: [0, Y, 6], yaw: Math.PI / 2 },
  // Arena: etwas steiler und weiter weg (Überblick über beide Bullen), Blick seitlich halb auf die Mitte fixiert
  camera: [{ from: 20, to: -20, pitch: 42, dist: 17.5, x: 0, xLock: 0.3, ahead: 1.2, lead: 0.5 }],
  arena: { enemies: 'all', star: [0, Y + 0.5, 0], starIndex: 0, crowd: 'crowd', intro: 'Besiege beide Bullen!', center: [0, Y, -1], camPull: 0.25 },
  segments: [
    // Wiese rund um die Festung
    { type: 'island', pos: [0, -1, -2], size: [64, 1, 64], under: 0 },
    { type: 'killplane', y: -14 },
    // Festungsplattform mit Käfig (Tor hinten; zur Kamera nur Geländer + Maschengitter)
    { type: 'arena_cage', pos: [0, Y, 0], radius: R, height: 5, floor: Y, ceiling: 6.4, gate: Math.PI, low: 0.85 },
    // Treppe von der Wiese zum Tor (nur Zier – der Käfig ist geschlossen)
    { type: 'stairs', pos: [0, 0, -14.3], dir: '+z', steps: 2, rise: 1.2, run: 1.2, width: 4.4, style: 'stone' },
    // Tribünen links, rechts und hinten (Zuschauer blicken zur Mitte)
    { type: 'crowd', id: 'crowd', stands: [
      { from: [-16, 0, 7], to: [-16, 0, -9], rows: 3, face: [1, 0] },
      { from: [16, 0, -9], to: [16, 0, 7], rows: 3, face: [-1, 0] },
      { from: [-12, 0, -16], to: [-4, 0, -16], rows: 4, face: [0, 1] },
      { from: [4, 0, -16], to: [12, 0, -16], rows: 4, face: [0, 1] },
    ] },
    { type: 'pennants', items: [
      { pos: ring(R + 2.4, 0.55), color: 0xe8322a }, { pos: ring(R + 2.4, -0.55), color: 0x3d8bff },
      { pos: ring(R + 2.4, 1.6), color: 0xffcf2a }, { pos: ring(R + 2.4, -1.6), color: 0x4fd04a },
      { pos: ring(R + 2.4, 2.55), color: 0xff7ac0, h: 7 }, { pos: ring(R + 2.4, -2.55), color: 0xa865ff, h: 7 },
    ].map((it) => ({ ...it, pos: [it.pos[0], 0, it.pos[2]] })) },
    { type: 'torches', h: 2.6, items: [ring(R + 3.2, 0.3), ring(R + 3.2, -0.3), ring(R + 3.2, 1.15), ring(R + 3.2, -1.15), ring(R + 3.4, 2.15), ring(R + 3.4, -2.15)] },
    { type: 'deco', items: [
      { kind: 'tree', pos: [-24, 0, 14], size: 5.2 }, { kind: 'tree', pos: [24, 0, 12], size: 4.8, color: 'green' },
      { kind: 'tree', pos: [-25, 0, -14], size: 5.6, color: 'green' }, { kind: 'tree', pos: [25, 0, -18], size: 5 },
      { kind: 'tree', pos: [-12, 0, -26], size: 4.6 }, { kind: 'tree', pos: [13, 0, -27], size: 5.4, color: 'green' },
      { kind: 'bush', pos: [-7, 0, 19], size: 0.9 }, { kind: 'bush', pos: [7.5, 0, 19.5], size: 0.8 },
      { kind: 'flowers', pos: [-11, 0, 18], size: [5, 3], n: 14 }, { kind: 'flowers', pos: [11, 0, 18], size: [5, 3], n: 14 },
      { kind: 'flowers', pos: [-21, 0, -2], size: [3, 8], n: 12 }, { kind: 'flowers', pos: [21, 0, -4], size: [3, 8], n: 12 },
      { kind: 'fence', from: [-6, 0, 21], to: [-14, 0, 21] }, { kind: 'fence', from: [6, 0, 21], to: [14, 0, 21] },
      { kind: 'rock', pos: [-19, 0, 15], size: 0.9 }, { kind: 'rock', pos: [19, 0, -12], size: 0.7 },
      { kind: 'lantern', pos: [-3.2, 0, 19] }, { kind: 'lantern', pos: [3.2, 0, 19] },
    ] },
  ],
  blocks: [
    { kind: 'question', pos: [-4.5, Y + 3.2, 4.5], content: 'coins:5' },
  ],
  enemies: [
    { kind: 'rammbock_bulle', id: 'bulle_links', pos: [-4.5, Y, -4], dir: [0.4, 1], sight: 26 },
    { kind: 'rammbock_bulle', id: 'bulle_rechts', pos: [4.5, Y, -4], dir: [-0.4, 1], sight: 26 },
  ],
  items: [
    { kind: 'coins', pos: [-6.5, Y + 0.3, -1], r: 1.4, n: 6 },
    { kind: 'coins', pos: [6.5, Y + 0.3, -1], r: 1.4, n: 6 },
  ],
  stars: [],
  marks: { center: [0, Y, 0], start: [0, Y, 6], left: [-4.5, Y, -4], right: [4.5, Y, -4] },
};
