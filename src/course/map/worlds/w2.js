// Kurs-Weltkarte Welt 2 – „Wüste mit Sandblöcken“ (Bauplan: Weltkarte & Weltstruktur, Welt 2; Vertrag: Welt 2 –
// Level-Liste und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Weg (Bauplan-Reihenfolge): Ankunftsstrand mit der Glasröhre zurück nach Welt 1 → Schluchttor (2-1) → Schluchtweg
// → Oasen-Platz mit schwebender Sternenplattform (2-2, ab 15 Sternen), Glückshaus und Oase → Abzweig zum
// geheimnisvollen Haus (2-Haus, ab 20 Sternen) → Felsenhof mit Höhleneingang (2-3) → Abzweige zur Lava-Felsinsel
// (2-A, drei Großrollpilze) und über die Treppe zum Hügelland (2-4) → rosa Grasland (2-5) → Panzer-Depot von Baron
// Brummbär (2-Panzer, ab 30 Sternen) → Glasröhre nach Welt 3 (bald). Sternbedarf zählt alle Sterne (starScope).
//
// Bereiche (begehbar, Höhe):                 Eingänge:
//   A  Ankunftsstrand          y 1            W1        Glasröhre zurück        (−10, 1, 41)
//   N  Beerenhaus-Nische       y 1            2-1       Schluchttor             (0, 1, 34)
//   B  Schluchtweg             y 1            2-2       Sternenplattform        (12, 3.4, −2.6)
//   C  Oasen-Platz             y 1            2-Haus    geheimnisvolles Haus    (−36, 1, −11)
//   D  Hof am Haus             y 1            2-3       Höhle mit Lichtschein   (0, 1, −53)
//   E  Felsenhof               y 1            2-A       Lava-Felsinsel          (−34.5, 1.4, −48)
//   G  Lava-Felsinsel          y 1.4          2-4       Hügelwalze              (33, 3, −54)
//   F  Hügelland               y 3            2-5       Doppelkirsche           (36, 3, −90)
//   I  rosa Grasland           y 3            2-Panzer  Panzer-Depot            (2, 3, −93)
//   K  Panzer-Depot            y 3            W3        Glasröhre (bald)        (0, 3, −121)
//   M  Röhrenplateau           y 3

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;
const SAND = 0xedc282, SAND2 = 0xe0ac66;

export const MAP = {
  id: 'karte-2',
  world: 2,
  title: 'Wüste mit Sandblöcken',
  short: 'Wüste',
  archetype: 'map',
  theme: 'map_desert',
  kit: 'desert',
  music: 'course_world2_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 2)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1, 46], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [6, 17, 98], look: [0, 4, -30], duration: 3.2 },
  edges: { hedge: 'adobe', fence: 'rope' },
  pathColors: [0xe8b47a, 0xdba06a, 0xb98352],
  neighbors: [{ world: 1, pos: [-262, 104], size: [72, 48], style: 'grass' }],

  levels: [
    { id: 'W1', world: 1, next: 1, label: 'Welt 1', stars: 0 },
    { id: '2-1', stars: 3, stamp: true },
    { id: '2-2', after: '2-1', minStars: 15, stars: 3, stamp: true },
    { id: '2-3', after: '2-2', stars: 3, stamp: true },
    { id: '2-Haus', after: '2-2', minStars: 20, stars: 5 },
    { id: '2-4', after: '2-3', stars: 3, stamp: true },
    { id: '2-A', after: '2-3', stars: 1 },
    { id: '2-5', after: '2-4', stars: 3, stamp: true },
    { id: '2-Panzer', after: '2-5', minStars: 30, stars: 3, stamp: true },
    { id: 'W3', after: '2-Panzer', world: 3, next: 3, label: 'Welt 3', stars: 0 },
  ],

  ground: [
    // ---- Ankunftsstrand, Nische, Dünen
    g(-18, 30, 16, 50, 1, { walk: W }),
    g(-34, 50, 42, 54, 0.45, { style: 'sand', noEdge: true }),
    g(-34, 22, -18, 50, 2.4, { style: 'dune' }),
    g(16, 30, 20, 45, 2.8, { style: 'dune', mound: 1.1 }),
    g(16, 45, 20, 50, 1, { walk: W }),
    g(20, 30, 34, 50, 1, { walk: W }),
    g(34, 30, 42, 50, 2.2, { style: 'dune' }),
    // ---- Schluchtweg zwischen hohen Sandstein-Klippen
    g(-2, 6, 2, 30, 1, { walk: W }), g(-4, 14, -2, 21, 1, { walk: W }), g(2, 14, 4, 21, 1, { walk: W }),
    g(-18, 6, -2, 14, 9.5, { style: 'sandstone' }), g(-18, 14, -4, 21, 10.5, { style: 'sandstone' }), g(-18, 21, -2, 30, 9, { style: 'sandstone' }),
    g(2, 6, 18, 14, 8.5, { style: 'sandstone' }), g(4, 14, 18, 21, 9.5, { style: 'sandstone' }), g(2, 21, 18, 30, 8, { style: 'sandstone' }),
    g(-34, 6, -18, 22, 5, { style: 'sandstone' }),
    g(18, 6, 42, 30, 6, { style: 'sandstone' }),
    // ---- Oasen-Platz (um den Teich gestückelt), Hof am Haus
    g(-24, -26, 22, -6, 1, { walk: W }), g(-24, -6, -17, 3, 1, { walk: W }), g(-7, -6, 22, 3, 1, { walk: W }), g(-24, 3, 22, 6, 1, { walk: W }),
    g(-17, -6, -7, 3, -0.45, { style: 'pond' }),
    g(-28, -12, -24, 6, 2.2, { style: 'dune', mound: 0.8 }),
    g(-28, -16, -24, -12, 1, { walk: W }),
    g(-28, -26, -24, -16, 2.2, { style: 'dune', mound: 0.8 }),
    g(-44, -26, -28, -2, 1, { walk: W }),
    g(-50, -26, -44, -2, 2.6, { style: 'dune' }),
    g(-50, -2, -28, 6, 3.5, { style: 'sandstone' }),
    g(-50, 6, -34, 22, 3, { style: 'dune' }),
    g(22, -38, 46, 6, 1.2, { noDeco: true }),
    // ---- Riegel vor dem Felsenhof (Sphinx-Wächter)
    g(-2, -32, 2, -26, 1, { walk: W }),
    g(-24, -32, -2, -26, 2.4, { style: 'sandstone' }),
    g(-50, -32, -24, -26, 3, { style: 'sandstone' }),
    g(2, -32, 22, -26, 2.4, { style: 'sandstone' }),
    // ---- Felsenhof (2-3), Lava-Felsinsel (2-A), Treppe zum Hügelland (2-4)
    g(-16, -58, 14, -32, 1, { walk: W }),
    g(-22, -50, -16, -46, 1, { walk: W }),
    g(-22, -46, -16, -32, 3.5, { style: 'sandstone' }), g(-22, -64, -16, -50, 3.5, { style: 'sandstone' }),
    g(-50, -66, -22, -32, 0.35, { style: 'basin', noDeco: true }),
    g(-42, -57, -27, -39, 1.4, { style: 'lavarock', walk: W, fence: 'chain' }),
    g(14, -50, 20, -46, 1, { walk: W }), g(20, -50, 26, -46, 1, { walk: W }),
    g(14, -46, 26, -38, 2.4, { style: 'dune', mound: 1.2 }), g(14, -38, 22, -32, 2.4, { style: 'dune', mound: 1 }),
    g(14, -60, 26, -50, 2.4, { style: 'dune', mound: 1.4 }),
    g(26, -74, 46, -38, 3, { style: 'grass', walk: W, edge: 'hedge', fence: 'fence' }),
    g(24, -78, 34, -74, 3.8, { style: 'grass' }), g(38, -78, 46, -74, 3.8, { style: 'grass' }),
    g(34, -78, 38, -74, 3, { style: 'grass', walk: W, edge: 'hedge', fence: 'fence' }),
    // ---- Felsberg mit der Höhle, Dünen dahinter
    g(-16, -74, 14, -58, 11, { style: 'sandstone' }),
    g(-50, -80, -16, -66, 2.6, { style: 'dune' }),
    g(14, -74, 26, -60, 2.4, { style: 'dune', mound: 1.6 }),
    g(-16, -80, 24, -74, 2.2, { style: 'dune', mound: 0.9 }),
    // ---- Panzer-Depot und rosa Grasland
    g(-16, -110, 18, -80, 3, { walk: W }),
    g(18, -96, 24, -92, 3, { walk: W }),
    g(18, -92, 24, -80, 4, { style: 'sandstone' }), g(18, -110, 24, -96, 4, { style: 'sandstone' }),
    g(24, -104, 48, -78, 3, { style: 'pink', walk: W, edge: 'pink', fence: 'fence' }),
    g(24, -112, 48, -104, 3.6, { style: 'pink' }),
    g(-50, -110, -16, -80, 2.6, { style: 'dune', noDeco: true, mound: 0.6 }),
    // ---- Röhrenplateau (Welt 3)
    g(-2, -116, 2, -110, 3, { walk: W }),
    g(-8, -128, 8, -116, 3, { walk: W }),
    g(-30, -116, -2, -110, 4.5, { style: 'sandstone' }), g(-24, -130, -8, -116, 3.5, { style: 'dune' }),
    g(2, -116, 24, -110, 4.5, { style: 'sandstone' }), g(8, -130, 24, -116, 3.5, { style: 'dune' }),
  ],

  // Zusätzlich begehbar: Teich der Oase, Brücke über die Lava
  walk: [
    [-17, -6, -7, 3],
    [-27, -50, -22, -46],
  ],

  paths: [
    [[2, 47.5], [2, 38], [0, 36], [0, 34]],
    [[2, 41], [-10, 41]],
    [[0, 34], [0, 6]],
    [[0, 6], [0, -26], [0, -32], [0, -53]],
    [[0, 1.5], [5, 1.5]],
    [[0, -10], [15, -10], [15, -13]],
    [[0, -14], [-28, -14], [-36, -14], [-36, -11]],
    [[0, -48], [26, -48]],
    [[0, -48], [-22, -48]],
    [[26, -48], [33, -48], [33, -54]],
    [[33, -48], [42, -48], [42, -70], [36, -70], [36, -78]],
    [[36, -78], [36, -90]],
    [[36, -84], [29, -84], [29, -94], [18, -94], [2, -94], [2, -93]],
    [[2, -91], [-4, -91], [-4, -106], [0, -106], [0, -121]],
  ],

  entrances: [
    { id: 'W1', kind: 'pipe', pos: [-10, 1, 41], decor: [-10, 1, 37.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.2], [-5, 6.8, 0.8], [-16, 7, 2.5], [-40, 6.4, 7], [-80, 5.5, 14], [-140, 4, 26], [-205, 1.5, 40]] },
    { id: '2-1', kind: 'canyon', pos: [0, 1, 34], decor: [0, 1, 30.4] },
    { id: '2-2', kind: 'space', pos: [12, 3.4, -2.6], decor: [12, 1, -1.2], exit: [12, 3.4, 0.6], radius: 3.6,
      steps: [[5.9, 1.85, 1.9], [7.7, 2.6, 0.5]] },
    { id: '2-Haus', kind: 'mystery', pos: [-36, 1, -11], decor: [-36, 1, -18.5] },
    { id: '2-3', kind: 'glowcave', pos: [0, 1, -53], decor: [0, 1, -58] },
    { id: '2-A', kind: 'lavaarena', pos: [-34.5, 1.4, -48], decor: [-34.5, 1.4, -48], exit: [-29.6, 1.4, -48],
      spikes: [[-40.6, -41, 2.6], [-40.2, -55, 2.2], [-28.8, -55.2, 2.4], [-29.2, -40.8, 1.8]], braziers: [[-28.4, -44.4], [-28.4, -51.6]] },
    { id: '2-4', kind: 'hills', pos: [33, 3, -54], decor: [32, 3, -62] },
    { id: '2-5', kind: 'pinkgrass', pos: [36, 3, -90], decor: [36, 3, -96.5] },
    { id: '2-Panzer', kind: 'tankdepot', pos: [2, 3, -93], decor: [2, 3, -100] },
    { id: 'W3', kind: 'pipe', pos: [0, 3, -121], decor: [0, 3, -124.1],
      pipe: [[0, 0, 0], [0, 4, 0], [0, 6.5, -2], [0, 8, -10], [0, 12, -30], [0, 18, -60], [0, 26, -100]] },
  ],

  gates: [
    { for: '2-2', at: [0, 27.5], axis: 'z' },
    { for: '2-3', at: [0, -29], axis: 'z' },
    { for: '2-Haus', at: [-26, -14], axis: 'x' },
    { for: '2-4', at: [17, -48], axis: 'x' },
    { for: '2-A', at: [-19, -48], axis: 'x' },
    { for: '2-5', at: [36, -76], axis: 'z' },
    { for: '2-Panzer', at: [21, -94], axis: 'x' },
    { for: 'W3', at: [0, -113], axis: 'z' },
  ],

  // Drei Großrollpilze laufen auf der Lava-Felsinsel im Kreis (Modell vom Modell-Agenten; bis dahin Pilzling, groß)
  roamers: [
    { level: '2-A', model: 'grossrollpilz', fallback: 'pilzling', fallbackScale: 2.0, count: 3, circle: [-34.5, -48, 4.4], y: 1.4,
      speed: 1.7, half: [0.85, 1.0, 0.85], hint: 'Lauf die Großrollpilze an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [27, 1, 37.4], yaw: -PI / 2, item: [27, 1, 42], items: ['funken', 'krallen'] },
    { kind: 'glueck', pos: [15, 1, -21.6], yaw: -PI / 2, machine: [15, 1, -17], pad: [15, 1, -14.3], stake: 10 },
  ],

  signs: [
    { pos: [5.2, 1, 46.8], yaw: -0.15, text: 'Welt 2\nWüste' },
    { pos: [18.2, 1, 49], yaw: 0.35, text: 'Beerenhaus' },
    { pos: [20.2, 1, -12.6], yaw: -0.45, text: 'Glückshaus' },
  ],

  props: [
    // Strand
    { kind: 'palm', pos: [-15, 1, 46.5], size: 5.2, lean: 1.1, yaw: 0.4 }, { kind: 'palm', pos: [13, 1, 47.5], size: 4.6, lean: 0.9, yaw: 2.4 },
    { kind: 'palm', pos: [-15.6, 1, 32.6], size: 5.6, lean: 1.2, yaw: -0.6 }, { kind: 'palm', pos: [12.6, 1, 32.4], size: 5, lean: 0.8, yaw: 3.6 },
    { kind: 'pots', pos: [-4.6, 1, 47.4], yaw: 0.3 }, { kind: 'barrel', pos: [9.4, 1, 44.4] }, { kind: 'shrub', pos: [-6, 1, 32], size: 0.5 },
    { kind: 'rock', pos: [14.2, 1, 40], size: 0.6 },
    // Nische mit Beerenhaus
    { kind: 'palm', pos: [22.4, 1, 32.6], size: 5, lean: 0.9, yaw: 1.2 }, { kind: 'palm', pos: [32.4, 1, 47.4], size: 4.4, lean: 0.7, yaw: 4 },
    { kind: 'cactus', pos: [32.6, 1, 33.2], size: 2.4 }, { kind: 'barrel', pos: [21.4, 1, 46.6] },
    // Schlucht
    { kind: 'rock', pos: [-3.2, 1, 17.6], size: 0.6, solid: false }, { kind: 'shrub', pos: [3.3, 1, 15.2], size: 0.45, solid: false },
    // Ruinen auf dem Tafelberg östlich der Schlucht
    { kind: 'column', pos: [24, 6, 24], size: 4.2 }, { kind: 'column', pos: [28.4, 6, 24], size: 4.2, broken: true },
    { kind: 'column', pos: [32.8, 6, 24], size: 4.2 }, { kind: 'fallen', pos: [29, 6, 17], size: 3.2, yaw: 0.4 },
    { kind: 'arch', pos: [36.5, 6, 12], yaw: 0.3, size: 4 },
    // Oase
    { kind: 'palm', pos: [-18.6, 1, -4.2], size: 5.4, lean: 1.0, yaw: -0.5 }, { kind: 'palm', pos: [-18.2, 1, 2.6], size: 4.8, lean: 0.8, yaw: 0.6 },
    { kind: 'palm', pos: [-5.4, 1, 4.6], size: 5.2, lean: 1.2, yaw: 2.6 }, { kind: 'palm', pos: [-5.6, 1, -7.4], size: 4.6, lean: 0.9, yaw: 3.5 },
    { kind: 'palm', pos: [-12.6, 1, -8.2], size: 5.8, lean: 0.6, yaw: 1.6 },
    { kind: 'tent', pos: [-19.5, 1, -19.6], yaw: 0.35 }, { kind: 'pots', pos: [-15.2, 1, -21.6], yaw: 1 },
    { kind: 'obelisk', pos: [-9, 1, -22.2], size: 5.6 },
    { kind: 'column', pos: [6.6, 1, -24], size: 4, broken: true }, { kind: 'column', pos: [-21.6, 1, -10.2], size: 4 },
    { kind: 'sandblocks', pos: [20.6, 1, 4.4], n: 3, yaw: -0.3 }, { kind: 'sandblocks', pos: [-21.6, 1, 4.6], n: 2, yaw: 0.5 },
    // Sphinx-Wächter am Riegel zum Felsenhof
    { kind: 'sphinx', pos: [-5.8, 2.4, -29.6], size: 0.8 }, { kind: 'sphinx', pos: [5.8, 2.4, -29.6], size: 0.8 },
    // Pyramiden
    { kind: 'pyramid', pos: [34, 1.2, -16], size: [21, 14], steps: 9 }, { kind: 'pyramid', pos: [41.4, 1.2, 1.8], size: [7, 5], steps: 5 },
    { kind: 'obelisk', pos: [24.6, 1.2, -3.4], size: 4.6 }, { kind: 'obelisk', pos: [24.6, 1.2, -29.6], size: 4.6 },
    { kind: 'pyramid', pos: [-34, 2.6, -95], size: [22, 15], steps: 9 },
    { kind: 'pyramid', pos: [-38.5, 3.5, 1.5], size: [8, 5.5], steps: 5 },
    // Felsenhof
    { kind: 'column', pos: [-12.4, 1, -35.6], size: 4.2 }, { kind: 'column', pos: [-12.4, 1, -42], size: 4.2, broken: true },
    { kind: 'column', pos: [10.6, 1, -35.6], size: 4.2 }, { kind: 'column', pos: [10.6, 1, -53.4], size: 4.2, broken: true },
    { kind: 'fallen', pos: [-10, 1, -54.6], size: 3.4, yaw: 0.2 }, { kind: 'rock', pos: [8.6, 1, -44], size: 0.7 },
    { kind: 'cactus', pos: [-13.6, 1, -50], size: 2.6 }, { kind: 'barrel', pos: [12.4, 1, -39.4] },
    // Hof am Haus
    { kind: 'barrel', pos: [-42, 1, -24.2] }, { kind: 'rock', pos: [-30, 1, -24.4], size: 0.6 }, { kind: 'pots', pos: [-41.6, 1, -4.6], yaw: 2 },
    // Hügelland
    { kind: 'rock', pos: [44.6, 3, -40], size: 0.5 },
    // rosa Grasland
    { kind: 'pinktree', pos: [27.4, 3, -81.2], size: 4.4 }, { kind: 'pinktree', pos: [45.2, 3, -82.4], size: 4 },
    { kind: 'pinktree', pos: [26.6, 3, -101.4], size: 4.6 }, { kind: 'pinktree', pos: [45.4, 3, -100.6], size: 4.2 },
    // Panzer-Depot
    { kind: 'tank', pos: [-10, 3, -85.2], yaw: 0.35 }, { kind: 'tank', pos: [11.6, 3, -105.4], yaw: -2.6 },
    { kind: 'tank', pos: [-11.2, 3, -104.2], yaw: 1.2, size: 0.9 },
    { kind: 'crates', pos: [11.2, 3, -84.2], yaw: 0.4 }, { kind: 'crates', pos: [-13.6, 3, -95], yaw: -0.3 },
    { kind: 'sandbags', pos: [-9.4, 3, -97.4], size: 4, yaw: 0.2 }, { kind: 'sandbags', pos: [13.4, 3, -95.6], size: 3.6, yaw: 1.4 },
    // Röhrenplateau
    { kind: 'cactus', pos: [-6.4, 3, -126.4], size: 2.2 }, { kind: 'rock', pos: [6.2, 3, -126.6], size: 0.6 },
  ],

  segments: [
    { type: 'water', pos: [-12, -0.45, -1.5], size: [10, 1.2, 9] },
    { type: 'stairs', pos: [20, 1, -48], dir: '+x', steps: 7, rise: 2 / 7, run: 6 / 7, width: 4, style: SAND2 },
    { type: 'bridge', from: [-22, 1, -48], to: [-27, 1.4, -48], width: 4, color: 0x9a8a80 },
    { type: 'lava', pos: [-36, 0.35, -49], size: [28, 0.25, 34] },
    // Sandblöcke zum Hüpfen am Strand
    { type: 'platform', pos: [7.6, 1, 36.4], size: [1.6, 1, 1.6], color: SAND },
    { type: 'platform', pos: [9.6, 1, 37.6], size: [1.6, 2, 1.6], color: SAND2 },
    { type: 'platform', pos: [11.6, 1, 39.2], size: [1.6, 3, 1.6], color: SAND },
    // Hügelland: bunte Blöcke, Blumen
    { type: 'platform', pos: [29, 3, -42], size: [2, 1, 2], color: 'red' },
    { type: 'platform', pos: [29, 3, -44.4], size: [2, 2, 2], color: 'yellow' },
    { type: 'deco', items: [
      { kind: 'flowers', pos: [40, 3, -44], size: [4, 4], n: 9 }, { kind: 'flowers', pos: [30, 3, -70], size: [4, 3], n: 8 },
      { kind: 'bush', pos: [45, 3, -60], size: 0.8 }, { kind: 'tree', pos: [44.4, 3, -66], size: 4.4, color: 'green' },
      // rosa Grasland
      { kind: 'flowers', pos: [31, 3, -92], size: [4, 4], n: 9 }, { kind: 'flowers', pos: [42, 3, -88], size: [4, 4], n: 9 },
    ] },
    { type: 'deco_w1', items: [
      { kind: 'mushrooms', pos: [-41.6, 1, -14.6], size: 1.0, color: 'violet', glow: true },
      { kind: 'mushrooms', pos: [-30.2, 1, -20.2], size: 0.8, color: 'violet', glow: true },
      { kind: 'reeds', pos: [-8, -0.45, 1.8], n: 6, size: 1.4 }, { kind: 'reeds', pos: [-16, -0.45, -5], n: 5, size: 1.3 },
      { kind: 'lilypads', pos: [-12, 0.75, -1], size: [6, 5], n: 5 },
      { kind: 'daisies', pos: [36, 3, -48], size: [12, 8], n: 16 },
      { kind: 'butterflies', pos: [36, 3, -94], n: 5, r: 4, colors: [0xff8ccc, 0xffffff, 0xffd23a] },
    ] },
  ],
};
