// Kurs-Weltkarte Welt 3 – „Schnee und Eis“ (Bauplan: Weltkarte & Weltstruktur, Welt 3; Vertrag: Welt 3 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Weg (Bauplan-Reihenfolge): Ankunftsbucht mit Iglu-Dorf und der Glasröhre zurück nach Welt 2 → Schneefeld-Tor (3-1)
// → Schneise zwischen Tannenwald und Eisfels (ab 35 Sternen weiter zur Himmelsleiter) → Seeplatz mit Dorftanne,
// Glückshaus und zugefrorenem See (Eisbahn, rutschig) → Himmelsleiter (3-2) → Treppe auf den Spukhügel (3-3) →
// Krümels See-Diorama auf der Insel im See (3-Kapitän, taucht nach 3-3 auf) → Pastell-Garten mit Pavillon (3-4) →
// rote Käfig-Festung mit drei Zauberkröten (3-A) → Lagune mit Röhren (3-5) → Rennberg mit Startbogen (3-6, ab 45
// Sternen) → Brücke zum Zirkuszelt auf dem Gipfelplateau (3-B, Seilbahn) und Glasröhre nach Welt 4 (frei nach 3-Zug) →
// Weg unter dem Zirkusberg zum Herbstwald mit Wasserfall und Schienen (3-7) → Bahnhof mit Zug und Baron-Flagge
// (3-Zug, ab 55 Sternen). Sternbedarf zählt alle Sterne (starScope).
//
// Bereiche (begehbar, Höhe):                 Eingänge:
//   A  Ankunftsbucht           y 1            W2        Glasröhre zurück        (−14, 1, 40)
//   N  Beerenhaus-Nische       y 1            3-1       Schneefeld-Tor          (0, 1, 33.4)
//   B  Schneise                y 1            3-2       Himmelsleiter           (14, 1, −10)
//   C  Seeplatz (+ Eisbahn)    y 1 / 0.8      3-3       Spukhaus                (0.6, 5, −45.6)
//   K  Kapitäns-Insel          y 1            3-Kapitän Krümels See-Diorama     (−44.5, 1, −14)
//   D  Spukhügel               y 5            3-4       Pastell-Pavillon        (27, 5, −48.5)
//   F  Pastell-Garten          y 5            3-A       Käfig-Festung           (52, 5, −52.5)
//   G  Käfig-Festung           y 5            3-5       Lagune mit Röhren       (−27, 1, −55)
//   H  Lagunenstrand           y 1            3-6       Rennberg-Start          (−30, 1, −79.6)
//   I  Rennberg (Start/Gipfel) y 1 → 9        3-B       Zirkuszelt              (1, 9, −104)
//   J  Zirkus-Plateau          y 9            3-7       Herbstwald              (29, 3, −100)
//   P  Weg unter dem Zirkusberg y 1           3-Zug     Bahnhof                 (55, 3, −101)
//   L  Herbstwald              y 3            W4        Glasröhre nach Welt 4   (1, 9, −135.6)
//   M  Bahnhof                 y 3

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;
const LAKE = -0.7;   // Seegrund (das Meer darüber ist der See)

export const MAP = {
  id: 'karte-3',
  world: 3,
  title: 'Schnee und Eis',
  short: 'Schnee',
  archetype: 'map',
  theme: 'map_snow',
  kit: 'snow',
  music: 'course_world3_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 3)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1, 46], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [8, 19, 102], look: [0, 4, -34], duration: 3.2 },
  edges: { hedge: 'snow', fence: 'snowfence' },
  pathColors: [0xe6dccb, 0xd8ccb6, 0xa8977e],      // geräumte Wege: heller Kies
  seaColors: [0x74d6ea, 0x3a9ed8, 0x1b5aa6],
  snowfall: { count: 900 },
  // Kacheln der statischen Geometrie: 32 m (Ursprung so, dass die Insel in wenige Kacheln fällt), Teile ohne
  // Schattenwurf (Schneedecken, Wege, Ränder) in 64-m-Kacheln – weniger Zeichenaufrufe im Weitblick
  batch: { tile: 32, origin: [16, 16], freeTile: 64, freeOrigin: [0, 0] },
  // Nachbarwelten am Horizont: Welt 2 (Wüste) im Südwesten – dorthin führt die Rückweg-Röhre –, die Canyon-Inseln von
  // Welt 4 im Nordosten (Glasröhre nach 3-Zug)
  neighbors: [{ world: 2, pos: [-262, 112], size: [76, 52], style: 'desert' }, { world: 4, pos: [150, -330], size: [92, 60], style: 'canyon' }],

  levels: [
    { id: 'W2', world: 2, next: 2, label: 'Welt 2', stars: 0 },
    { id: '3-1', stars: 3, stamp: true },
    { id: '3-2', after: '3-1', minStars: 35, stars: 3, stamp: true },
    { id: '3-3', after: '3-2', stars: 3, stamp: true },
    { id: '3-Kapitän', after: '3-3', stars: 5 },
    { id: '3-4', after: '3-3', stars: 3, stamp: true },
    { id: '3-A', after: '3-4', stars: 1 },
    { id: '3-5', after: '3-4', stars: 3, stamp: true },
    { id: '3-6', after: '3-5', minStars: 45, stars: 3, stamp: true },
    { id: '3-B', after: '3-6', stars: 1 },
    { id: '3-7', after: '3-6', stars: 3, stamp: true },
    { id: '3-Zug', after: '3-7', minStars: 55, stars: 3, stamp: true },
    { id: 'W4', after: '3-Zug', world: 4, next: 4, label: 'Welt 4', stars: 0 },   // Vertrag Welt 4: frei nach 3-Zug
  ],

  ground: [
    // ---- Ankunftsbucht, Beerenhaus-Nische, Strand
    g(-40, 28, -20, 50, 2.4, { style: 'snowhill', mound: 2.2 }),
    g(-20, 28, 16, 50, 1, { walk: W }),
    g(16, 28, 20, 45, 2.2, { style: 'snowhill', mound: 1.0 }),
    g(16, 45, 20, 50, 1, { walk: W }),
    g(20, 30, 34, 50, 1, { walk: W }),
    g(34, 30, 44, 52, 2.4, { style: 'snowhill', mound: 1.6 }),
    g(-32, 50, 40, 55, 0.45, { style: 'snowbeach', noEdge: true }),
    // ---- Schneise zwischen Tannenwald und Eisfels
    g(-2, 0, 2, 28, 1, { walk: W }),
    g(-46, 8, -2, 28, 2.2, { style: 'forest' }),
    g(2, 8, 20, 28, 4.2, { style: 'cliff', icicleLen: 1.3 }),
    g(20, 8, 44, 30, 2.6, { style: 'snowhill', mound: 2.4 }),
    g(-50, -2, -14, 8, 1.4, { noDeco: true, drips: false }), g(-14, 0, -2, 8, 1.4, { noDeco: true, drips: false }),
    g(2, 0, 48, 8, 1.4, { noDeco: true, drips: false }),
    // ---- Seeplatz, Eisbahn, See mit der Kapitäns-Insel
    g(-14, -30, 24, 0, 1, { walk: W }),
    g(-32, -26, -14, -8, 0.8, { style: 'ice', walk: W, ice: true }),
    g(-50, -34, -14, -26, LAKE, { style: 'lakebed' }), g(-50, -8, -14, -2, LAKE, { style: 'lakebed' }),
    g(-50, -26, -32, -23, LAKE, { style: 'lakebed' }), g(-50, -10, -32, -8, LAKE, { style: 'lakebed' }),
    g(-50, -23, -49, -10, LAKE, { style: 'lakebed' }), g(-40, -23, -32, -18.5, LAKE, { style: 'lakebed' }), g(-40, -15.5, -32, -10, LAKE, { style: 'lakebed' }),
    g(-49, -23, -40, -10, 1, { walk: W, drips: false }),
    g(24, -40, 44, 0, 5, { style: 'cliff', icicleLen: 1.4 }),
    g(44, -40, 56, -4, 2.2, { style: 'forest' }),
    // ---- Treppe und Spukhügel
    g(-2, -34, 2, -30, 1, { walk: W }),
    g(-14, -40, -2, -30, 3, { style: 'snowhill', mound: 1.4 }), g(2, -40, 10, -30, 3, { style: 'snowhill', mound: 1.2 }),
    g(10, -40, 24, -30, 3, { style: 'snowhill', mound: 1.6 }),
    g(-10, -58, 10, -40, 5, { style: 'spook', walk: W, icicles: true }),
    // ---- Pastell-Garten (3-4), Käfig-Festung (3-A)
    g(10, -51, 16, -47, 5, { walk: W }), g(10, -58, 16, -51, 6), g(10, -47, 16, -40, 6),
    g(16, -62, 38, -40, 5, { style: 'pastel', walk: W, edge: 'mint', fence: 'snowfence' }),
    g(38, -55, 44, -51, 5, { walk: W }), g(38, -62, 44, -55, 6), g(38, -51, 44, -40, 6),
    g(44, -64, 60, -40, 5, { style: 'paving', walk: W }),
    g(60, -64, 66, -36, 2.4, { style: 'snowhill', mound: 1.4 }),
    // ---- Abstieg zur Lagune (3-5)
    g(-14, -51, -10, -47, 5, { walk: W }), g(-14, -58, -10, -51, 6), g(-14, -47, -10, -40, 6),
    g(-20, -47, -14, -40, 3), g(-20, -58, -14, -51, 3), g(-20, -72, -10, -58, 4),
    g(-36, -66, -20, -46, 1, { walk: W }),
    g(-36, -46, -14, -40, 1.4, { noDeco: true, drips: false }),
    g(-50, -40, -14, -34, 1.8, { style: 'forest', trees: 0.8 }),
    g(-54, -74, -36, -40, -0.8, { style: 'lakebed' }),
    // ---- Rennberg (3-6): Startplatz, Rennstraße, Gipfel
    g(-32, -72, -28, -66, 1, { walk: W }), g(-36, -72, -32, -66, 2.4), g(-28, -72, -20, -66, 2.4),
    g(-44, -88, -22, -72, 1, { style: 'asphalt', walk: W, grid: [[-32.4, -84.6], [-27.6, -84.6], [-32.4, -82.2], [-27.6, -82.2]], startLine: [-34, -26, -86.2] }),
    g(-48, -88, -44, -66, 2.6, { style: 'snowhill', mound: 1 }),
    g(-48, -108, -34, -88, 9, { style: 'cliff' }), g(-26, -108, -14, -88, 9, { style: 'cliff' }),
    g(-44, -122, -22, -108, 9, { walk: W }),
    g(-50, -144, -20, -122, 9, { style: 'peak', mound: 12 }),
    g(-22, -126, -10, -108, 4.5),
    g(-14, -108, -10, -88, 9, { style: 'cliff' }),
    // ---- Zirkus-Plateau (3-B) und Glasröhre nach Welt 4
    g(-10, -126, 12, -100, 9, { walk: W }),
    g(-10, -100, 14, -86, 7, { style: 'cliff', icicleLen: 1.2 }),
    g(12, -126, 14, -100, 8),
    g(-1, -132, 3, -126, 9, { walk: W }), g(-20, -132, -1, -126, 8), g(3, -132, 14, -126, 8),
    g(-5, -144, 7, -132, 9, { walk: W }), g(-20, -144, -5, -132, 7.5, { style: 'snowhill', mound: 1.4 }), g(7, -144, 14, -132, 7.5, { style: 'snowhill', mound: 1.4 }),
    // ---- Weg unter dem Zirkusberg (3-7)
    g(-22, -86, -16, -82, 1, { walk: W }), g(-22, -88, -16, -86, 2), g(-22, -82, -16, -72, 1.4, { noDeco: true }),
    g(-16, -86, 18, -80, 1, { walk: W }),
    g(-16, -80, 18, -72, 1.4, { noDeco: true, drips: false }),
    g(-10, -72, 10, -58, 5.5, { noDeco: true }), g(10, -72, 16, -58, 6, { style: 'forest' }),
    g(16, -72, 44, -62, 6, { style: 'forest' }),
    // ---- Herbstwald (3-7), Wasserfall, Bahnhof (3-Zug)
    g(14, -115, 46, -92, 3, { style: 'autumn', walk: W, edge: 'autumn', fence: 'snowfence' }),
    g(14, -120, 25, -115, 3, { style: 'autumn', walk: W, edge: 'autumn', fence: 'snowfence' }),
    g(33, -120, 46, -115, 3, { style: 'autumn', walk: W, edge: 'autumn', fence: 'snowfence' }),
    g(25, -120, 33, -115, 1.8, { style: 'lakebed' }),
    g(14, -134, 50, -120, 13, { style: 'cliff', icicles: false }),
    g(18, -92, 62, -84, 3.4, { noDeco: true, drips: false }),
    g(18, -84, 44, -72, 6, { style: 'forest' }), g(44, -84, 62, -64, 6, { style: 'forest' }),
    g(46, -106, 50, -102, 3, { walk: W }), g(46, -118, 50, -106, 4), g(46, -102, 50, -92, 4),
    g(50, -118, 62, -92, 3, { style: 'paving', walk: W }),
    g(62, -134, 68, -70, 3, { noDeco: true, drips: false }),
    g(46, -134, 62, -118, 11, { style: 'cliff', icicles: false }),
  ],

  // Zusätzlich begehbar: Treppen, Steg zur Kapitäns-Insel, Rennstraße, Brücke zum Zirkus
  walk: [
    [-2, -40, 2, -34],
    [-20, -51, -14, -47],
    [-40, -18.5, -32, -15.5],
    [-34, -108, -26, -88],
    [-22, -117, -10, -113],
    [14, -92, 18, -86],
  ],

  paths: [
    [[2, 47.5], [2, 38], [0, 36], [0, 33.4]],
    [[2, 41.5], [-10, 41.5], [-14, 42.6]],
    [[0, 33.4], [0, 0]],
    [[0, 0], [0, -30], [0, -34]],
    [[0, -10], [14, -10]],
    [[0, -17], [-8, -17], [-8, -19.1]],
    [[-8, -17], [-13, -17]],
    [[0, -40], [0, -45.6]],
    [[0, -48.6], [16, -48.6], [27, -48.6]],
    [[0, -48.6], [-14, -48.6]],
    [[27, -48.6], [33, -48.6], [33, -53], [44, -53]],
    [[-20, -49], [-30.6, -49], [-30.6, -55]],
    [[-30.6, -55], [-30.6, -60], [-30, -62], [-30, -72]],
    [[-22, -84], [16, -84], [16, -86]],
    [[-30, -108], [-30, -115], [-22, -115]],
    [[-10, -115], [-7.6, -115], [-7.6, -104], [1, -104]],
    [[-7.6, -112], [-8, -124], [1, -124], [1, -135.6]],
    [[16, -92], [16, -96], [29, -96], [29, -100]],
    [[29, -96], [44, -96], [44, -104], [50, -104]],
  ],

  entrances: [
    { id: 'W2', kind: 'pipe', pos: [-14, 1, 40], decor: [-14, 1, 36.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.2], [-5, 6.8, 0.8], [-16, 7, 2.5], [-40, 6.4, 7], [-80, 5.5, 14], [-140, 4, 26], [-205, 1.5, 40]], pipeDetail: 'low' },
    { id: '3-1', kind: 'snowfield', pos: [0, 1, 33.4], decor: [0, 1, 29.3] },
    { id: '3-2', kind: 'skyladder', pos: [14, 1, -10], decor: [19.6, 1, -16.6], height: 17 },
    { id: '3-3', kind: 'spookhouse', pos: [0.6, 5, -45.6], decor: [0, 5, -53.6], labelY: 2.8 },
    { id: '3-Kapitän', kind: 'kapitaen', pos: [-44.5, 1, -14], decor: [-44.2, 1, -19.6], appear: true, disc: '3-K' },
    { id: '3-4', kind: 'pavilion', pos: [27, 5, -48.5], decor: [27, 5, -56.6] },
    { id: '3-A', kind: 'redfortress', pos: [52, 5, -52.5], decor: [52, 5, -62.2], exit: [52, 5, -47.6],
      cage: [[44.4, -40.4, 59.6, -40.4], [59.6, -60, 59.6, -40.4], [44.4, -60, 44.4, -55.2], [44.4, -50.8, 44.4, -40.4]],
      podests: [[47.6, -57.4], [56.4, -57.4]] },
    { id: '3-5', kind: 'lagoon', pos: [-30.6, 1, -55], decor: [-41.6, 0, -55.2], wreck: [-48.5, -0.4, -67.5, 0.8, 0.7], buoy: [-35.0, 1, -49.4] },
    { id: '3-6', kind: 'racehill', pos: [-30, 1, -79.6], decor: [-30, 1, -87.4], archWidth: 8,
      road: { x0: -34, x1: -26, z0: -108, z1: -88, y0: 1, y1: 9, boosts: [-92.5, -100] },
      barriers: [[-43.2, -79, PI / 2, 8], [-43.2, -87, PI / 2, 6], [-23, -78, PI / 2, 8], [-42.6, -72.6, 0, 8]],
      tires: [[-42.4, -86.6], [-23.4, -86.8], [-42.6, -73.4]], flags: [[-35, 1, -87.8], [-25, 1, -87.8], [-35, 9, -108.6], [-25, 9, -108.6]] },
    { id: '3-B', kind: 'circustent', pos: [1, 9, -104], decor: [1, 9, -114.6], tentRadius: 6.4, booth: [-9.2, 3.0],
      bunting: [[-9.2, -101, -4.2, -101], [6.2, -101, 11.2, -101]],
      ropeway: { from: [12.5, 1.4, -76.5], to: [9.6, 9, -102.4], hFrom: 7.5, hTo: 5.5, sag: 1.3 } },
    { id: '3-7', kind: 'autumnfalls', pos: [29, 3, -100], decor: [29, 3, -110],
      waterfall: { x0: 26.5, x1: 31.5, z: -119.92, top: 13, bottom: 2.4 }, pool: [25.2, -119.8, 32.8, -115.2, 2.72],
      rail: { from: [17.6, 3, -110.5], to: [43.2, 3, -110.5], height: 1.7 } },
    { id: '3-Zug', kind: 'station', pos: [55, 3, -101], decor: [56, 3, -114.2],
      canopy: [60.6, -109, -95], lamps: [[51.4, -94.6], [51.4, -109.6]], benches: [[58.6, -102.4, PI / 2]],
      train: { track: [65, 3, -134, -70], lok: -96, cars: 2 } },
    { id: 'W4', kind: 'pipe', pos: [1, 9, -135.6], decor: [1, 9, -138.7],
      pipe: [[0, 0, 0], [0, 4, 0], [0.3, 6.5, -1.8], [1.5, 7.8, -6], [5, 8.4, -16], [14, 8, -38], [30, 6.5, -72], [52, 4, -110], [72, 2, -140]], pipeDetail: 'low' },
  ],

  gates: [
    { for: '3-2', at: [0, 22], axis: 'z' },
    { for: '3-3', at: [0, -32], axis: 'z' },
    { for: '3-Kapitän', at: [-36, -17], axis: 'x' },
    { for: '3-4', at: [13, -49], axis: 'x' },
    { for: '3-A', at: [41, -53], axis: 'x' },
    { for: '3-5', at: [-12, -49], axis: 'x' },
    { for: '3-6', at: [-30, -69], axis: 'z' },
    { for: '3-B', at: [-16, -115], axis: 'x' },
    { for: '3-7', at: [-19, -84], axis: 'x' },
    { for: '3-Zug', at: [48, -104], axis: 'x' },
    { for: 'W4', at: [1, -129], axis: 'z' },
  ],

  // Drei Zauberkröten schweben im Kreis durch den roten Käfig (Modell aus Welt 1; zaubern, wenn die Heldin nahe ist)
  roamers: [
    { level: '3-A', model: 'zauberkroete', fallback: 'pilzling', count: 3, circle: [52, -52.5, 4.2], y: 5, speed: 1.4,
      half: [0.5, 0.75, 0.5], anims: { walk: 'idle', idle: 'cast' }, castShadow: false, hint: 'Lauf die Zauberkröten an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [27, 1, 37.4], yaw: -PI / 2, item: [27, 1, 42], items: ['funken', 'krallen'] },
    { kind: 'glueck', pos: [-8, 1, -26.6], yaw: -PI / 2, machine: [-8, 1, -21.8], pad: [-8, 1, -19.1], stake: 10 },
  ],

  signs: [
    { pos: [5.4, 1, 46.8], yaw: -0.15, text: 'Welt 3\nSchnee' },
    { pos: [18.6, 1, 49], yaw: 0.35, text: 'Beerenhaus' },
    { pos: [-3.2, 1, -21.8], yaw: 0.25, text: 'Glückshaus' },
    { pos: [-12.6, 1, -5.6], yaw: 0.3, text: 'Eisbahn' },
    // Sternschranken: Schilder mit dem Sternbedarf vor den Eingängen
    { pos: [17.2, 1, -7.6], yaw: -0.3, text: 'ab 35 ★' }, { pos: [-26.4, 1, -77.6], yaw: -0.3, text: 'ab 45 ★' },
    { pos: [51.4, 3, -98.4], yaw: 0.3, text: 'ab 55 ★' },
  ],

  props: [
    // Ankunftsbucht: Iglu-Dorf, Schneemänner, Lagerfeuer, Laternen
    { kind: 'igloo_lo', pos: [-9.6, 1, 31.4], size: 3.4, yaw: 0.35 }, { kind: 'igloo_lo', pos: [11.8, 1, 31.8], size: 3.0, yaw: -0.4 },
    { kind: 'snowman_lo', pos: [7.6, 1, 44.4], yaw: -0.35 }, { kind: 'snowman_lo', pos: [-17.4, 1, 46], yaw: 0.4, size: 0.85 },
    { kind: 'bench', pos: [-4.6, 1, 35.6], yaw: 0 }, { kind: 'bench', pos: [-7.2, 1, 37.9], yaw: PI / 2 },
    { kind: 'lamp', pos: [-3.4, 1, 42.6] }, { kind: 'lamp', pos: [5.6, 1, 36.4] },
    { kind: 'sled', pos: [-7.4, 1, 46.4], yaw: 0.5 }, { kind: 'snowballs', pos: [13, 1, 40.4], n: 6 },
    { kind: 'fir_lo', pos: [14.2, 1, 47.2], size: 4.2 }, { kind: 'fir_lo', pos: [-18.4, 1, 30.4], size: 4.6 },
    { kind: 'iceblocks', pos: [-16.8, 1, 35.2], n: 3, yaw: 0.4 }, { kind: 'drift', pos: [-1, 1, 49], size: 1.1 },
    { kind: 'snowangel', pos: [9.6, 1, 38.6], yaw: 0.3, shadow: false }, { kind: 'footprints', pos: [5.2, 1, 36.6], n: 14, yaw: 2.2, shadow: false },
    { kind: 'rowboat', pos: [12.6, 0.45, 52.4], yaw: 1.3 }, { kind: 'snowangel', pos: [-10.6, 1, -2.4], yaw: -0.4, shadow: false },
    { kind: 'footprints', pos: [14.6, 1, -2.2], n: 12, yaw: 1.4, shadow: false },
    { kind: 'crystal', pos: [9.4, 1, 48.6], size: 1.3 },
    // Beerenhaus-Nische
    { kind: 'snowcap', pos: [27, 4.45, 37.4], size: 2.4, solid: false }, { kind: 'fir_lo', pos: [22.6, 1, 32.6], size: 4.4 },
    { kind: 'fir_lo', pos: [32.4, 1, 47.4], size: 3.8 }, { kind: 'snowman_lo', pos: [31.6, 1, 33.4], yaw: -0.9, size: 0.8 },
    // Schneise
    { kind: 'lamp', pos: [-3.2, 1, 12.6], solid: false }, { kind: 'snowrock', pos: [3.4, 1, 17.2], size: 0.6, solid: false },
    // Seeplatz: Dorftanne mit Lichtern, Hütte, Bänke, Laternen, Schneemänner
    { kind: 'bigfir', pos: [6.4, 1, -18.6], size: 7.2 },
    { kind: 'bench', pos: [12.6, 1, -19.6], yaw: -0.3 }, { kind: 'bench', pos: [-3.4, 1, -9.4], yaw: 0.2 },
    { kind: 'cabin', pos: [18.8, 1, -25.4], size: [4, 3.2], yaw: -0.2 },
    { kind: 'lamp', pos: [-12.6, 1, -1.6] }, { kind: 'lamp', pos: [22.4, 1, -1.6] }, { kind: 'lamp', pos: [-12.4, 1, -28.4] },
    { kind: 'snowman_lo', pos: [21, 1, -5.6], yaw: -0.6 }, { kind: 'snowman_lo', pos: [-12.6, 1, -24.4], yaw: 0.5, size: 0.9 },
    { kind: 'skis', pos: [-12.9, 1, -9.6], yaw: 0.6 }, { kind: 'sled', pos: [3.6, 1, -1.6], yaw: -0.3 },
    // Eisbahn: Bank mit Schlittschuhen, Eisstöcke am Rand
    { kind: 'bench', pos: [-12.5, 1, -12.6], yaw: -PI / 2 }, { kind: 'skates', pos: [-12.4, 1, -14.4], yaw: 1.2, solid: false },
    { kind: 'curling', pos: [-15.6, 0.8, -24.4], n: 3, yaw: 0.2, solid: false, shadow: false },
    { kind: 'snowballs', pos: [-4.4, 1, -2.4], n: 4 },
    // kleiner Weihnachtsmarkt (Buden mit Lichterketten) und gefrorener Brunnen
    { kind: 'stall', pos: [4.8, 1, -14.4], n: 1 }, { kind: 'stall', pos: [9.4, 1, -14.4], n: 2 }, { kind: 'stall', pos: [-5, 1, -13.4], n: 3 },
    { kind: 'fountain', pos: [-7, 1, -7] }, { kind: 'drift', pos: [22, 1, -12], size: 1.2, solid: false },
    // Kapitäns-Insel (Steg-Schild)
    { kind: 'fir_lo', pos: [-47.4, 1, -11.8], size: 3.6 }, { kind: 'snowrock', pos: [-47.6, 1, -22], size: 0.6 },
    { kind: 'lamp', pos: [-41.2, 1, -21.8] }, { kind: 'snowman_lo', pos: [-47.8, 1, -15.4], yaw: 1.2, size: 0.75 },
    { kind: 'snowballs', pos: [-41.4, 1, -11.6], n: 3 },
    // Spukhügel: kahle Bäume
    { kind: 'baretree', pos: [-7.6, 5, -55.6], size: 4.6 }, { kind: 'baretree', pos: [8, 5, -55.2], size: 4.2 },
    { kind: 'baretree', pos: [-8.2, 5, -42.6], size: 3.8 }, { kind: 'snowrock', pos: [7.6, 5, -42.6], size: 0.7 },
    { kind: 'tomb', pos: [-6.6, 5, -46.0], yaw: 0.2 }, { kind: 'tomb', pos: [-4.6, 5, -50.6], yaw: -0.15 }, { kind: 'tomb', pos: [6.8, 5, -50.4], yaw: -0.3 },
    { kind: 'tomb', pos: [7.6, 5, -46.2], yaw: 0.25 }, { kind: 'spookfence', pos: [-6, 5, -43.6], size: 5 },
    { kind: 'spookfence', pos: [6.4, 5, -43.4], size: 4.4 },
    // Pastell-Garten
    { kind: 'pasteltree', pos: [18.8, 5, -60], size: 4.2 }, { kind: 'pasteltree', pos: [35.8, 5, -60], size: 4.4 },
    { kind: 'pasteltree', pos: [35.6, 5, -42.4], size: 3.8 }, { kind: 'pasteltree', pos: [18.6, 5, -42.4], size: 4 },
    // Käfig-Festung: Laternen am Tor
    { kind: 'lamp', pos: [46, 5, -49.6] },
    // Lagunenstrand
    { kind: 'fir_lo', pos: [-34.2, 1, -47.6], size: 4 }, { kind: 'cabin', pos: [-22.8, 1, -63.2], size: [3.6, 3], yaw: 0.25 },
    { kind: 'iceblocks', pos: [-22.6, 1, -48.6], n: 2 }, { kind: 'snowrock', pos: [-34.6, 1, -57.6], size: 0.8 },
    { kind: 'lamp', pos: [-21.4, 1, -52.6] },
    // Rennberg
    { kind: 'fir_lo', pos: [-24.4, 1, -73.6], size: 4 },
    // geräumter Schnee an den Ecken des Startplatzes
    { kind: 'drift', pos: [-40.6, 1, -82.6], size: 1.3, solid: false }, { kind: 'drift', pos: [-25.4, 1, -82.8], size: 1.1, solid: false },
    { kind: 'drift', pos: [-37.6, 1, -74.6], size: 1.0, solid: false },
    { kind: 'fir_lo', pos: [-42.2, 9, -120.2], size: 4.4 }, { kind: 'fir_lo', pos: [-24, 9, -120.4], size: 3.8 },
    // Gipfelplatz: Skihütte, Ski, Schlitten, Bank – oben am Ziel der Rennstraße
    { kind: 'cabin', pos: [-40.2, 9, -113.6], size: [3.6, 3], yaw: 1.35 }, { kind: 'skis', pos: [-37.2, 9, -111.4], yaw: 0.2 },
    { kind: 'sled', pos: [-35.6, 9, -118.6], yaw: 0.8 }, { kind: 'bench', pos: [-24.6, 9, -111.2], yaw: -PI / 2 },
    { kind: 'lamp', pos: [-34.6, 9, -110.4] }, { kind: 'snowballs', pos: [-26.2, 9, -118.8], n: 5 },
    // Zirkus-Plateau, Röhrenplateau
    { kind: 'snowman_lo', pos: [9.6, 9, -122.4], yaw: -0.8, size: 0.9 }, { kind: 'fir_lo', pos: [-8.4, 9, -124.6], size: 3.6, solid: false },
    { kind: 'fir_lo', pos: [5.6, 9, -142.4], size: 3.4 }, { kind: 'snowrock', pos: [-3.6, 9, -142.6], size: 0.7 },
    { kind: 'lamp', pos: [-2.8, 9, -133.6] }, { kind: 'crystal', pos: [-3.4, 9, -136.6], size: 1.1 },
    { kind: 'snowman_lo', pos: [5.0, 9, -139.6], yaw: -0.9, size: 0.8 },
    // Weg unter dem Zirkusberg
    { kind: 'lamp', pos: [-8, 1, -81] }, { kind: 'lamp', pos: [8, 1, -81] }, { kind: 'snowman_lo', pos: [3.4, 1, -81.2], yaw: -0.2, size: 0.85 },
    // Herbstwald
    { kind: 'autumntree', pos: [17.4, 3, -95.4], size: 4.8 }, { kind: 'autumntree', pos: [42.6, 3, -94.8], size: 4.4 },
    { kind: 'autumntree', pos: [21.6, 3, -104.6], size: 5 }, { kind: 'autumntree', pos: [37.4, 3, -104.2], size: 4.6 },
    { kind: 'autumntree', pos: [17.6, 3, -117.4], size: 4.2 }, { kind: 'autumntree', pos: [43, 3, -117.6], size: 4.8 },
    { kind: 'leaves', pos: [24.4, 3, -97.4], size: 0.8, solid: false }, { kind: 'leaves', pos: [35, 3, -106.4], size: 0.7, solid: false },
    { kind: 'leaves', pos: [40.4, 3, -99], size: 0.6, solid: false }, { kind: 'bench', pos: [35.4, 3, -95.2], yaw: 0 },
    // Bahnhof
    { kind: 'iceblocks', pos: [51.6, 3, -116.4], n: 2 },
  ],

  segments: [
    { type: 'snowstairs', pos: [0, 1, -34], dir: '-z', steps: 10, rise: 0.4, run: 0.6, width: 4 },
    { type: 'snowstairs', pos: [-20, 1, -49], dir: '+x', steps: 10, rise: 0.4, run: 0.6, width: 4 },
    { type: 'snowstairs', pos: [16, 1, -86], dir: '-z', steps: 6, rise: 2 / 6, run: 1, width: 4 },
    { type: 'snowbridge', from: [-32, 0.8, -17], to: [-40, 1, -17], width: 3, color: 0xb07a44 },
    { type: 'snowbridge', from: [-22, 9, -115], to: [-10, 9, -115], width: 4, color: 0xb07a44 },
  ],
};
