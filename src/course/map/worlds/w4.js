// Kurs-Weltkarte Welt 4 – „Canyon-Inselkette“ (Bauplan: Weltkarte & Weltstruktur, Welt 4; Vertrag: Welt 4 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eine Kette roter Canyon-Inseln im Meer, verbunden durch Hängebrücken und Felsbögen (Seilbahnen fahren als Kulisse
// zwischen den Inseln). Weg (Bauplan-Reihenfolge): Ankunftsinsel mit der Glasröhre zurück nach Welt 3, Beerenhaus und
// dem großen Ameisenhügel (4-1) → Hängebrücke zur Giftwald-Insel mit Sumpf und Giftwasserfall (4-2) und Glückshaus →
// Felsbogen nach Westen zur Lava-Felsinsel mit der wandernden Lavabrocken-Gruppe (4-A) → Hängebrücke nach Norden zum
// Lautsprecherturm mit Piep-Blöcken im Takt der Kartenmusik (4-3, ab 60 Sternen) → Brücke nach Osten zum
// geheimnisvollen Haus mit der Stoppuhr (4-Haus, ab 70 Sternen) → Felsbogen hinauf zur Bergwiese mit Trampolinen
// (4-4) → Hängebrücke zur Ruinenstadt (4-5) → Felsbogen zur blau vergitterten Werfer-Festung mit der wandernden
// Feuer-Werfer-Gruppe (4-B) → Hängebrücke zur Lava-Burg mit Baron-Brummbär-Banner (4-Burg, ab 80 Sternen) →
// Glasröhre nach Welt 5 (frei nach 4-Burg; „Bald“, solange es Welt 5 nicht gibt). Sternbedarf zählt alle Sterne.
//
// Bereiche (begehbar, Höhe):                 Eingänge:
//   A  Ankunftsinsel           y 1            W3        Glasröhre zurück         (−14, 1, 40)
//   N  Beerenhaus-Nische       y 1            4-1       Ameisenhügel             (9, 1, 32)
//   B  Giftwald-Insel          y 2            4-2       Giftwald mit Sumpf       (−6, 2, −6)
//   C  Lava-Felsinsel          y 1.4          4-A       Lava-Felsinsel (Gruppe)  (−52, 1.4, −1)
//   D  Turm-Insel              y 3            4-3       Lautsprecherturm         (0, 3, −36)
//   E  Haus-Insel              y 3            4-Haus    geheimnisvolles Haus     (35, 3, −32)
//   F  Bergwiese               y 5            4-4       Riesentrampolin          (−4, 5, −70)
//   G  Ruinenstadt             y 5            4-5       Ruinenstadt              (32, 5, −77)
//   H  Werfer-Festung          y 5            4-B       Festung (Gruppe)         (70, 5, −81)
//   I  Lava-Burg               y 6            4-Burg    Lava-Burg                (38, 6, −122.5)
//   J  Röhren-Insel            y 6            W5        Glasröhre (bald)         (64, 6, −124)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-4',
  world: 4,
  title: 'Canyon-Inselkette',
  short: 'Canyon',
  archetype: 'map',
  theme: 'map_canyon',
  kit: 'canyon',
  music: 'course_world4_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 4)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1, 46], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [10, 22, 104], look: [8, 5, -40], duration: 3.2 },
  edges: { hedge: 'redrock', fence: 'rope' },
  pathColors: [0xf2d9ae, 0xe6c594, 0xb07a4e],      // helle Sandstein-Platten
  seaColors: [0x5ad8e6, 0x249ed6, 0x1666b8],
  // Kacheln der statischen Geometrie wie Welt 3: 32 m (Ursprung so, dass die Inseln in wenige Kacheln fallen), Teile
  // ohne Schattenwurf (Deckschichten, Wege, Ränder) in 64-m-Kacheln
  batch: { tile: 32, origin: [16, 16], freeTile: 64, freeOrigin: [0, 0] },
  // Nachbarwelt am Horizont: Welt 3 (Schneeinsel) im Südwesten – dorthin führt die Rückweg-Röhre
  neighbors: [{ world: 3, pos: [-262, 112], size: [80, 54], style: 'snow' }],
  birds: [{ c: [-8, 13, 18], r: 7, n: 2 }, { c: [20, 14, -52], r: 9, n: 2 }, { c: [40, 15, -104], r: 8, n: 1 }],   // Geier kreisen

  levels: [
    { id: 'W3', world: 3, next: 3, label: 'Welt 3', stars: 0 },
    { id: '4-1', stars: 3, stamp: true },
    { id: '4-2', after: '4-1', stars: 3, stamp: true },
    { id: '4-A', after: '4-2', stars: 1 },
    { id: '4-3', after: '4-2', minStars: 60, stars: 3, stamp: true },
    { id: '4-Haus', after: '4-3', minStars: 70, stars: 10 },
    { id: '4-4', after: '4-3', stars: 3, stamp: true },
    { id: '4-5', after: '4-4', stars: 3, stamp: true },
    { id: '4-B', after: '4-5', stars: 1 },
    { id: '4-Burg', after: '4-5', minStars: 80, stars: 3, stamp: true },
    { id: 'W5', after: '4-Burg', world: 5, next: 5, label: 'Welt 5', stars: 0 },
  ],

  ground: [
    // ---- A Ankunftsinsel, Beerenhaus-Nische, Strand
    g(-20, 28, 20, 50, 1, { walk: W }),
    g(20, 28, 23, 45, 2.4, { style: 'canyonlow' }),
    g(20, 45, 23, 50, 1, { walk: W }),
    g(23, 30, 34, 50, 1, { walk: W }),
    g(34, 28, 42, 52, 6.5, { style: 'mesa' }),
    g(-34, 50, 40, 55, 0.45, { style: 'beach', noEdge: true }),
    g(-30, 34, -20, 50, 1.6, { style: 'canyonlow', noDeco: true }),
    g(-40, 18, -20, 34, 7.5, { style: 'mesa' }),
    g(-20, 18, -2, 28, 5.5, { style: 'mesa' }),
    g(-2, 18, 2, 28, 1, { walk: W }),
    g(2, 16, 23, 28, 1.3, { style: 'canyonlow', noDeco: true }),
    g(23, 16, 34, 30, 4.2, { style: 'mesa' }),
    // ---- B Giftwald-Insel (Sumpf im Nordwesten, Marsch im Südwesten, Glückshaus im Osten)
    g(-10, -12, 12, 10, 2, { style: 'poison', walk: W }),
    g(-2, -16, 2, -12, 2, { style: 'poison', walk: W }),
    g(-30, -2, -10, 2, 2, { style: 'poison', walk: W }),
    g(12, -12, 26, 4, 2, { walk: W }),
    g(-34, -16, -10, -2, 1.2, { style: 'swamp' }),
    g(-30, 2, -10, 10, 1.3, { style: 'marsh' }),
    g(12, 4, 26, 10, 1.4, { style: 'canyonlow' }),
    g(-38, -26, -16, -16, 9, { style: 'mesa' }),
    g(-16, -22, -2, -12, 4.5, { style: 'mesa' }), g(2, -22, 12, -12, 4.5, { style: 'mesa' }),
    g(12, -24, 26, -12, 6, { style: 'mesa' }),
    // ---- C Lava-Felsinsel im Lavasee (Becken, Rand aus Lavafels)
    g(-64, -18, -38, 16, 0.25, { style: 'basin' }),
    g(-60, -10, -44, 8, 1.4, { style: 'lavarock', walk: W }),
    g(-68, -22, -36, -18, 1.1, { style: 'lavarock', noEdge: true }),
    g(-68, -18, -64, 16, 1.1, { style: 'lavarock', noEdge: true }),
    g(-68, 16, -36, 19, 0.8, { style: 'lavarock', noEdge: true }),
    // ---- D Turm-Insel (Lautsprecherturm 4-3)
    g(-12, -46, 14, -28, 3, { style: 'tech', walk: W }),
    g(14, -38, 18, -34, 3, { walk: W }),
    g(-2, -50, 2, -46, 3, { walk: W }),
    g(-30, -54, -12, -30, 7.5, { style: 'mesa' }),
    g(14, -52, 24, -38, 5.5, { style: 'mesa' }),
    g(14, -34, 24, -26, 3.4, { style: 'canyonlow' }),
    g(-12, -54, -2, -46, 5, { style: 'mesa' }), g(2, -54, 14, -46, 5, { style: 'mesa' }),
    // ---- E Haus-Insel (4-Haus)
    g(28, -44, 42, -26, 3, { walk: W }),
    g(28, -52, 46, -44, 7, { style: 'mesa' }),
    g(42, -44, 48, -26, 4.6, { style: 'canyonlow' }),
    // ---- F Bergwiese (4-4)
    g(-16, -84, 14, -62, 5, { style: 'meadow', walk: W }),
    g(14, -78, 18, -74, 5, { style: 'meadow', walk: W }),
    g(-22, -102, 12, -84, 12, { style: 'mesa' }),
    g(-26, -84, -16, -60, 8, { style: 'mesa' }),
    g(14, -74, 22, -62, 6.2, { style: 'canyonlow' }),
    // ---- G Ruinenstadt (4-5)
    g(26, -96, 50, -66, 5, { style: 'ruins', walk: W }),
    g(50, -84, 54, -80, 5, { style: 'ruins', walk: W }),
    g(42, -100, 46, -96, 5, { style: 'ruins', walk: W }),
    g(26, -104, 42, -96, 8.5, { style: 'mesa' }), g(46, -104, 56, -96, 8, { style: 'mesa' }),
    g(50, -96, 58, -84, 6.4, { style: 'canyonlow' }), g(50, -80, 58, -66, 6, { style: 'canyonlow' }),
    // ---- H Werfer-Festung (4-B)
    g(62, -92, 78, -70, 5, { style: 'fortress', walk: W }),
    g(60, -100, 80, -92, 5, { style: 'fortress', noEdge: true }),
    // ---- I Lava-Burg (4-Burg), Lavagraben im Westen
    g(26, -128, 50, -110, 6, { style: 'castle', walk: W }),
    g(26, -142, 50, -128, 6, { style: 'castle', noEdge: true }),
    g(14, -142, 26, -106, 0.25, { style: 'basin' }),
    g(10, -142, 14, -102, 1.6, { style: 'lavarock', noEdge: true }),
    g(8, -152, 26, -142, 10, { style: 'castle' }),
    g(50, -128, 52, -110, 6, { style: 'castle', walk: W }),
    g(50, -142, 58, -128, 7.5, { style: 'mesa' }),
    // ---- J Röhren-Insel (Glasröhre nach Welt 5)
    g(58, -134, 72, -112, 6, { walk: W }),
    g(72, -138, 78, -108, 8.5, { style: 'mesa' }),
  ],

  // Zusätzlich begehbar: Hängebrücken und Felsbögen zwischen den Inseln
  walk: [
    [-2, 10, 2, 18],          // A → B  Hängebrücke
    [-44, -2, -30, 2],        // B → C  Felsbogen über Meer und Lava
    [-2, -28, 2, -16],        // B → D  Hängebrücke
    [18, -38, 28, -34],       // D → E  Hängebrücke
    [-2, -62, 2, -50],        // D → F  Felsbogen (steigt auf 5)
    [18, -78, 26, -74],       // F → G  Hängebrücke
    [54, -84, 62, -80],       // G → H  Felsbogen
    [42, -110, 46, -100],     // G → I  Hängebrücke (steigt auf 6)
    [52, -124, 58, -120],     // I → J  Hängebrücke
  ],

  paths: [
    [[2, 47.5], [2, 38], [0, 36], [0, 18]],
    [[2, 41.5], [-10, 41.5], [-14, 42.6]],
    [[2, 38], [9, 34.6]],
    [[2, 44], [21.5, 46], [27, 44]],
    [[0, 10], [0, -12]],
    [[0, -2], [-6, -3.4]],
    [[0, 0], [-30, 0]],
    [[0, 0], [14, 0], [19, -1.4]],
    [[0, -28], [0, -46]],
    [[0, -31], [-6.5, -31], [-6.5, -32.8]],
    [[0, -36], [18, -36]],
    [[28, -36], [32, -32], [35, -29.4]],
    [[0, -62], [0, -66], [-4, -67.4]],
    [[0, -66], [8, -76], [18, -76]],
    [[26, -76], [30, -74.4], [32, -74.4]],
    [[26, -76], [44, -76], [44, -96]],
    [[44, -76], [44, -82], [50, -82]],
    [[44, -110], [44, -114], [38, -119.9]],
    [[44, -114], [48, -122], [52, -122]],
    [[58, -122], [64, -121.4]],
  ],

  entrances: [
    { id: 'W3', kind: 'pipe', pos: [-14, 1, 40], decor: [-14, 1, 36.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.2], [-5, 6.8, 0.8], [-16, 7.4, 2.5], [-40, 7, 7], [-80, 5.5, 14], [-140, 4, 26], [-205, 1.5, 40]], pipeDetail: 'low' },
    { id: '4-1', kind: 'anthill', pos: [9, 1, 32], decor: [10, 1.3, 23.6] },
    { id: '4-2', kind: 'poisonwood', pos: [-6, 2, -6], decor: [-21, 1.2, -9], exit: [-3.4, 2, -3.4],
      waterfall: { x0: -26, x1: -21, z: -15.92, top: 9, bottom: 1.1 } },
    { id: '4-A', kind: 'lavaisle', pos: [-52, 1.4, -1], decor: [-52, 1.4, -1], exit: [-45.6, 1.4, 0],
      spikes: [[-58.6, -8.4, 3.2], [-45.6, -8.6, 2.4], [-58.4, 6.4, 2.2]], braziers: [[-45.4, -6.4], [-45.4, 4.6]] },
    { id: '4-3', kind: 'beeptower', pos: [-6.5, 3, -35.4], decor: [-7, 3, -41.4] },
    { id: '4-Haus', kind: 'mysteryclock', pos: [35, 3, -32], decor: [35, 3, -39.2] },
    { id: '4-4', kind: 'bouncemeadow', pos: [-4, 5, -70], decor: [-4, 5, -78.2],
      trampolines: [[-11.6, -65.6, 1.5], [7.6, -66.4, 1.4], [-12.2, -77.6, 1.3]] },
    { id: '4-5', kind: 'ruincity', pos: [32, 5, -77], decor: [32, 5, -86] },
    { id: '4-B', kind: 'bluefortress', pos: [70, 5, -81], decor: [70, 5, -95.4], exit: [64.8, 5, -82],
      cage: [[62.4, -70.4, 77.6, -70.4], [77.6, -91.6, 77.6, -70.4], [62.4, -91.6, 77.6, -91.6], [62.4, -91.6, 62.4, -84.2], [62.4, -79.8, 62.4, -70.4]] },
    { id: '4-Burg', kind: 'lavacastle', pos: [38, 6, -122.5], decor: [38, 6, -134], labelY: 2.8,
      lavafalls: [[15.6, 18.2, -141.94, 10], [20.6, 23.6, -141.94, 10]] },
    { id: 'W5', kind: 'pipe', pos: [64, 6, -124], decor: [64, 6, -127.1],
      pipe: [[0, 0, 0], [0, 3.5, 0], [0.3, 5.6, -0.8], [1.5, 6.8, -5], [5, 7, -15], [14, 6.4, -37], [30, 5.5, -72], [52, 3.5, -110], [72, 1.5, -140]], pipeDetail: 'low' },
  ],

  gates: [
    { for: '4-2', at: [0, 22], axis: 'z' },
    { for: '4-A', at: [-26, 0], axis: 'x' },
    { for: '4-3', at: [0, -14], axis: 'z' },
    { for: '4-Haus', at: [16, -36], axis: 'x' },
    { for: '4-4', at: [0, -48], axis: 'z' },
    { for: '4-5', at: [16, -76], axis: 'x' },
    { for: '4-B', at: [52, -82], axis: 'x' },
    { for: '4-Burg', at: [44, -98], axis: 'z' },
    { for: 'W5', at: [55, -122], axis: 'x' },
  ],

  // Wandernde Gegnergruppen: drei Lavabrocken rollen über die Lava-Felsinsel, drei Feuer-Werfer tänzeln durch die
  // blau vergitterte Festung. Fehlt ein Modell noch, springt ein Stellvertreter ein (standIn, decor_w4.js).
  roamers: [
    { level: '4-A', model: 'lavabrocken', standIn: 'lavabrocken', count: 3, circle: [-52, -1, 4.6], y: 1.4, speed: 1.7,
      half: [0.6, 0.7, 0.6], castShadow: false, hint: 'Lauf die Lavabrocken an!' },
    { level: '4-B', model: 'feuer_werfer', standIn: 'feuer_werfer', count: 3, circle: [70, -81, 4.4], y: 5, speed: 1.5,
      half: [0.5, 0.8, 0.5], castShadow: false, hint: 'Lauf die Feuer-Werfer an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [28.4, 1, 36.8], yaw: -PI / 2, item: [28.4, 1, 41.4], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [19, 2, -8.2], yaw: -PI / 2, machine: [19, 2, -3.4], pad: [19, 2, -0.7], stake: 10 },
  ],

  signs: [
    { pos: [5.4, 1, 46.8], yaw: -0.15, text: 'Welt 4\nCanyon' },
    { pos: [18.6, 1, 48.6], yaw: 0.35, text: 'Beerenhaus' },
    { pos: [15.2, 2, 1.8], yaw: -0.2, text: 'Glückshaus' },
    // Sternschranken: Schilder mit dem Sternbedarf vor den Eingängen
    { pos: [-11, 3, -32.6], yaw: 0.3, text: 'ab 60 ★' }, { pos: [30.4, 3, -29.4], yaw: 0.3, text: 'ab 70 ★' },
    { pos: [42.6, 6, -118.6], yaw: -0.3, text: 'ab 80 ★' },
  ],

  props: [
    // A Ankunftsinsel: Kakteen, Felsnadeln, Ameisenhügelchen, Planwagen, Lagerfeuer
    { kind: 'needle', pos: [-26, 0, 52.6], size: 9, solid: false }, { kind: 'needle', pos: [-31, 0, 47], size: 6.5, solid: false },
    { kind: 'needle', pos: [44, 0, 50], size: 11, solid: false },
    { kind: 'cactus_lo', pos: [-17.2, 1, 30.6], size: 2.4 }, { kind: 'cactus_lo', pos: [15.2, 1, 47.6], size: 1.8 },
    { kind: 'cactus_lo', pos: [-6.4, 1, 47.8], size: 2.0 }, { kind: 'barrel_lo', pos: [-4.6, 1, 47.2] },
    { kind: 'anthill_lo', pos: [-9.6, 1, 33.4], size: 0.9 }, { kind: 'anthill_lo', pos: [16.6, 1, 38.4], size: 0.7 },
    { kind: 'wagon', pos: [-6.6, 1, 37.2], yaw: 0.35 }, { kind: 'campfire', pos: [-3.2, 1, 42.4] },
    { kind: 'boulder', pos: [17.6, 1, 30.4], size: 1.1 }, { kind: 'signpost', pos: [-17.6, 1, 45.4], yaw: 0.6 },
    // Beerenhaus-Nische
    { kind: 'cactus_lo', pos: [32.4, 1, 47.4], size: 2.2 }, { kind: 'boulder', pos: [32, 1, 31.6], size: 0.9 },
    // B Giftwald-Insel: Giftbäume am Rand, Pilze, Glückshaus-Platz
    { kind: 'poisontree', pos: [-8.6, 2, 8.2], size: 4.2 }, { kind: 'poisontree', pos: [9.6, 2, 8.4], size: 3.8 },
    { kind: 'poisontree', pos: [9.4, 2, -10.4], size: 4.4 }, { kind: 'toadstools', pos: [-8.6, 2, -10.6], solid: false },
    { kind: 'toadstools', pos: [5.4, 2, 6.6], solid: false }, { kind: 'vinepost', pos: [-12.4, 2, -2.6], size: 2.2, solid: false },
    { kind: 'cactus_lo', pos: [24.4, 2, 2.4], size: 2.0 }, { kind: 'lamp', pos: [14.4, 2, -2.2] },
    // C Lava-Felsinsel: Felsnadeln im Lavasee
    { kind: 'needle', pos: [-62, 0.3, -14.4], size: 7, color: 'dark', solid: false }, { kind: 'needle', pos: [-40.2, 0.3, 12.2], size: 5, color: 'dark', solid: false },
    { kind: 'needle', pos: [-63, 0.3, 10.4], size: 4.6, color: 'dark', solid: false },
    // D Turm-Insel: Kabelrollen, Kisten, Lampenmasten
    { kind: 'spool', pos: [-9.2, 3, -30.6] }, { kind: 'crates_lo', pos: [10.6, 3, -44.2] }, { kind: 'lightpole', pos: [-9.6, 3, -44.4] },
    { kind: 'lightpole', pos: [11.2, 3, -30.4] },
    // E Haus-Insel
    { kind: 'cactus_lo', pos: [40, 3, -28.4], size: 2.2 }, { kind: 'boulder', pos: [29.4, 3, -42.6], size: 1.0 },
    // F Bergwiese: Blumen, Bäume am Hang
    { kind: 'meadowtree', pos: [-13.4, 5, -82], size: 4.4 }, { kind: 'meadowtree', pos: [11.6, 5, -82.2], size: 4.0 },
    { kind: 'flowers_lo', pos: [4, 5, -64.4], n: 7, solid: false }, { kind: 'flowers_lo', pos: [-8.6, 5, -73.4], n: 6, solid: false },
    { kind: 'flowers_lo', pos: [9.6, 5, -77.4], n: 6, solid: false },
    // G Ruinenstadt: Säulen, Mauerreste, Statue am Weg
    { kind: 'column', pos: [27.6, 5, -67.6], size: 3.4, broken: true }, { kind: 'column', pos: [48.4, 5, -67.6], size: 4.2 },
    { kind: 'column', pos: [48.4, 5, -94.4], size: 3.0, broken: true }, { kind: 'ruinwall', pos: [29, 5, -94.2], size: 5, yaw: 0 },
    { kind: 'fallen', pos: [39.6, 5, -69.4], size: 3, yaw: 0.4, solid: false },
    // H Festung (Kulisse in decor_w4)
    // I Lava-Burg: Fackeln am Weg
    { kind: 'torch', pos: [40.6, 6, -112.4] }, { kind: 'torch', pos: [47.8, 6, -112.4] },
    // J Röhren-Insel
    { kind: 'cactus_lo', pos: [69.6, 6, -114.6], size: 2.4 }, { kind: 'boulder', pos: [59.8, 6, -132.2], size: 1.1 },
    // Felsnadeln und Felsbögen im Meer zwischen den Inseln (nur Kulisse)
    { kind: 'needle', pos: [-18, 0, 12.6], size: 8, solid: false }, { kind: 'needle', pos: [18, 0, 13.4], size: 6, solid: false },
    { kind: 'needle', pos: [-20, 0, -40], size: 10, solid: false }, { kind: 'needle', pos: [26, 0, -60], size: 7, solid: false },
    { kind: 'needle', pos: [-30, 0, -66], size: 9.5, solid: false }, { kind: 'needle', pos: [60, 0, -64], size: 8, solid: false },
    { kind: 'needle', pos: [84, 0, -86], size: 10, solid: false }, { kind: 'needle', pos: [4, 0, -118], size: 9, solid: false },
    { kind: 'seaarch', pos: [-44, 0, -42], size: 1.2, yaw: 0.5, solid: false }, { kind: 'seaarch', pos: [74, 0, -50], size: 1, yaw: -0.4, solid: false },
  ],

  // Seilbahn (Kulisse): Gondel pendelt von der Haus-Insel zur Ruinenstadt
  cableways: [{ from: [41, 3, -42.4], to: [48.6, 5, -68.4], hFrom: 6.5, hTo: 6.5, sag: 1.4 }],

  segments: [
    { type: 'ropebridge', from: [0, 1, 18], to: [0, 2, 10], width: 4 },
    { type: 'rockarch', from: [-30, 2, 0], to: [-44, 1.4, 0], width: 4 },
    { type: 'ropebridge', from: [0, 2, -16], to: [0, 3, -28], width: 4 },
    { type: 'ropebridge', from: [18, 3, -36], to: [28, 3, -36], width: 4 },
    { type: 'rockarch', from: [0, 3, -50], to: [0, 5, -62], width: 4 },
    { type: 'ropebridge', from: [18, 5, -76], to: [26, 5, -76], width: 4 },
    { type: 'rockarch', from: [54, 5, -82], to: [62, 5, -82], width: 4 },
    { type: 'ropebridge', from: [44, 5, -100], to: [44, 6, -110], width: 4 },
    { type: 'ropebridge', from: [52, 6, -122], to: [58, 6, -122], width: 4 },
    // Lavasee um die Lava-Felsinsel, Lavagraben an der Burg
    { type: 'lava', pos: [-51, 0.25, -1], size: [26, 0.35, 34] },
    { type: 'lava', pos: [20, 0.25, -124], size: [12, 0.35, 36] },
  ],
};
