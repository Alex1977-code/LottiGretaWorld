// Kurs-Weltkarte Welt 8 – „Brummbär-Rummelplatz“ (Bauplan: Weltkarte & Weltstruktur, Welt 8; Vertrag: Welt 8 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung (Mehrwelten-Karte)“.
// Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Das Finale: das dunkle Baron-Land als abendlicher Vergnügungspark (eigene Gestaltung, kindgerecht und warm: Glühbirnen,
// Wimpel, Buden, Brummbär-Ballons – kein Grusel). Im Norden der Mitte steht der riesige Baron-Turm mit der Brummbär-Büste
// (Ziel 8-Burg), oben das leise leuchtende Glas der gefangenen Freunde; davor Riesenrad, Karussell und Achterbahn im Park.
// Die Level-Zonen liegen als Inseln im Abendmeer und führen gegen den Uhrzeigersinn zum Turm: Rummel-Eingang mit der
// Glasröhre zurück nach Welt 7, Beerenhaus und der Regenfestung im Meer (8-1, eigene Regenwolke, Stachelbrücken im Takt) →
// Dünen mit Baron-Sandstatue (8-2) → Keks-Fabrik mit Schornsteinen (8-3) → Bahnhof mit dem Baron-Express (8-Zug) und
// Glückshaus → Nacht-Festung mit blau glimmenden Stegen (8-4) → Prüfungs-Haus (8-Haus) und das Seeufer mit der versunkenen
// Unterwasser-Festung (8-5) → Spukhaus (8-6) → Lava-Inferno mit Kristall-Felsklötzen (8-7) → zwei Zirkuszelte am Rand
// (8-A goldene Würfelblase, 8-B rosa Schlangenkönig) → über die Zugbrücke auf den Turmplatz (8-Burg, nach 8-A **und** 8-B,
// ab 190 Sternen) → Glasröhre in den Sternenhimmel zur Welt Stern (frei nach 8-Burg). Sternbedarf zählt alle Sterne.
// Nach dem Spielende (courseSave.data.finished) ist der Turm befreit: bunte Herz-/Stern-Fahnen, die Freunde winken vor dem
// Turm, Feuerwerk über dem Rummel (rummel8.js, decor_w8.js).
//
// Bereiche (begehbar, Höhe):                 Eingänge (kind):
//   A  Rummel-Eingang           y 1.5          W7         pipe            Glasröhre zurück            (−17, 1.5, 46)
//                                              8-1        rainfort        Regenfestung im Meer        (12, 1.5, 9.5)
//   B  Dünenplatz               y 2.5          8-2        dunes8          Dünen, Baron-Sandstatue     (40, 2.5, −2)
//   C  Kekshof                  y 3.5          8-3        cookiefactory   Keks-Fabrik                 (44, 3.5, −50)
//   D  Bahnsteig                y 4.5          8-Zug      baronstation    Bahnhof, Baron-Express      (−6, 4.5, −66)
//   E  Nacht-Festung            y 5.5          8-4        nightfort       Leuchtstege                 (−62, 5.5, −65.5)
//   H  Haus-Insel               y 5            8-Haus     clawhouse       Prüfungs-Haus (Krallen)     (−68, 5, −30)
//   F  Seeufer                  y 5            8-5        lakefort        Unterwasser-Festung im See  (−58, 5, −107)
//   G  Spukgarten               y 6.5          8-6        darkmansion     Spukhaus                    (−31, 6.5, −105)
//   I  Inferno-Plateau          y 7.5          8-7        inferno         Lava-Inferno, Kristalle     (20, 7.5, −92)
//   J  Zirkusplatz Nord         y 8            8-A        goldtent        Zelt, goldene Würfelblase   (37, 8, −116)
//   K  Zirkusplatz Ost          y 8            8-B        snaketent       Zelt, rosa Schlangenkönig   (58, 8, −82)
//   TP Turmplatz                y 9.5          8-Burg     barontower      Baron-Turm (ab 190 ★)       (0, 9.5, −125)
//   S  Sternen-Röhre            y 9.5          WS         pipe            Glasröhre zur Welt Stern    (−23, 9.5, −132)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

// Leuchtstege der Nacht-Festung: Kacheln am Boden zum Festungstor, dann eine schwebende Treppe auf die Westmauer
const STEPS8 = [
  ...Array.from({ length: 10 }, (_, i) => [-60 - i, 5.52, -69.4]),
  ...Array.from({ length: 8 }, (_, i) => [-70.2 - i * 1.05, 5.8 + i * 0.42, -69.4]),
];
// Achterbahn im Westpark: geschlossene Bahn (Oval) mit zwei Hügeln
const COASTER8 = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * PI * 2;
  return [-46 + Math.cos(a) * 9, 0.8 + 3.0 + 4.2 * Math.max(0, Math.sin(a * 2 + 0.6)) + 1.2 * Math.max(0, Math.cos(a)), 5 + Math.sin(a) * 13];
});

export const MAP = {
  id: 'karte-8',
  world: 8,
  title: 'Brummbär-Rummelplatz',
  short: 'Brummbär-Rummelplatz',
  archetype: 'map',
  theme: 'map_rummel',
  kit: 'rummel',
  music: 'course_world8_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 8)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1.5, 49], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 48, dist: 16.5, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [12, 36, 124], look: [0, 14, -72], duration: 3.4 },
  edges: { hedge: 'parkwall', fence: 'parkrail' },
  pathColors: [0xf6dca4, 0xe8c27e, 0x9a6a4a],      // goldgelbe Wegplatten (gut lesbar auf dem Flieder-Pflaster)
  seaColors: [0x5a7ac8, 0x3a3e94, 0x261e5e],      // Abendmeer: blau am Ufer, draußen tiefes Violett
  // Kacheln: je Insel eine Zone (Mesh je Material/Schattenwurf), außerhalb 48-m-Raster
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-30, 4, 24, 58, 'ankunft'], [10, -16, 27, 3, 'regenfels'], [25, -28, 88, 16, 'duenen'], [22, -72, 66, -26, 'keks'],
    [-36, -78, 20, -48, 'bahnhof'], [-96, -80, -40, -46, 'nacht'], [-84, -42, -56, -16, 'haus'], [-98, -134, -45, -76, 'see'],
    [-46, -124, -22, -94, 'spuk'], [-24, -111, 46, -74, 'inferno'], [24, -134, 50, -111, 'inferno'], [46, -98, 72, -74, 'inferno'],
    [-16, -160, 16, -111, 'turm'], [-32, -148, -16, -124, 'turm'], [-64, -50, 14, 26, 'park'],
  ], alias: { 'w7:leuchten': 'w8:leuchten', 'w6:leuchten': 'w8:leuchten' } },
  // Nachbarwelt am Horizont: Welt 7 (Lava-Festung) im Südwesten – dorthin führt die Rückweg-Röhre
  neighbors: [{ world: 7, pos: [-250, 150], size: [90, 60], style: 'vulkan' }],
  birds: [],

  // ---- lebendige Kulisse (rummel8.js RummelLife; Lava, Rauch, Knochenflieger, Fackeln über LavaLife)
  wheel: { pos: [-8, 1.0, -8], radius: 11, speed: 0.09 },
  carousel: { pos: [-14, 1.5, 18], speed: 0.55, r: 4.3 },
  coaster: { pts: COASTER8, base: 0.8, cars: 3, speed: 7 },
  // Glühbirnenketten zwischen zwei Masten (Füße a, b; Höhe h) – blinken im Takt der Kartenmusik
  lights: [
    { a: [-3.8, 1.5, 44.5], b: [8.2, 1.5, 44.5] }, { a: [-3.8, 1.5, 36], b: [8.2, 1.5, 36] }, { a: [-25, 1.5, 26], b: [-8, 1.5, 28], h: 4.6 },
    { a: [8, 1.5, 24], b: [18.6, 1.5, 20] }, { a: [-24.5, 1.5, 8], b: [-6.4, 1.5, 7.5], h: 4.4 },
    { a: [30, 2.5, 12.6], b: [44, 2.5, 12.6] }, { a: [50, 2.5, 12.6], b: [57.4, 2.5, 4] },
    { a: [26, 3.5, -27.5], b: [40, 3.5, -27.5] }, { a: [52, 3.5, -27.5], b: [62.5, 3.5, -34] },
    { a: [-28.5, 4.5, -53.5], b: [-12, 4.5, -53.5] },
    { a: [-46, 5.5, -49.5], b: [-60, 5.5, -49.5] }, { a: [-50.6, 5, -84], b: [-50.6, 5, -98] },
    { a: [-12.5, 7.5, -77.5], b: [4, 7.5, -77.5] }, { a: [12, 7.5, -77.5], b: [28, 7.5, -77.5] }, { a: [-25.5, 6.5, -97], b: [-36, 6.5, -97] },
    { a: [-10.6, 9.5, -111], b: [-4.5, 9.5, -113], h: 5 }, { a: [4.5, 9.5, -113], b: [10.6, 9.5, -111], h: 5 },
    { a: [27.5, 8, -111.5], b: [33, 8, -111.5] }, { a: [62, 8, -77.5], b: [69, 8, -77.5] },
  ],
  // Brummbär-Ballons steigen von Ständen auf
  balloons: [{ at: [-22, 1.5, 12.5], n: 6, h: 24 }, { at: [55, 2.5, -11], n: 4, h: 20 }, { at: [8, 9.5, -126], n: 5, h: 26 }, { at: [66, 8, -94], n: 3, h: 20 }],
  // Brummbär-Fahnen [x, y, z, Masthöhe] (nach dem Spielende bunte Herz-Fahnen) und Turm-Banner
  flags: [[-25, 1.5, 7, 4.4], [19, 1.5, 22, 4.4], [13.6, 1.4, 0.6, 4.4], [24.6, 1.4, -12.4, 4.4], [57.4, 2.5, 13.4, 4], [62.5, 3.5, -26.5, 4],
    [-14.6, 4.5, -71, 5.6], [-79, 5.5, -50, 4], [-79, 5, -21, 4], [-26, 6.5, -97.5, 4], [-13, 7.5, -99, 4.4], [27, 8, -131, 4.4],
    [69, 8, -95, 4.4], [-11, 9.5, -131, 5.2], [11, 9.5, -131, 5.2], [-29, 9.5, -145, 4.4]],
  banners: [{ pos: [-3.7, 27.5, -135.6], yaw: -0.55, w: 2.6, h: 7.4 }, { pos: [3.7, 27.5, -135.6], yaw: 0.55, w: 2.6, h: 7.4 }],
  // Feuerwerk über dem Rummel – nur nach dem Spielende
  fireworks: [[-8, 36, -12], [24, 40, -52], [-44, 38, -76], [6, 52, -124], [48, 40, -96], [-22, 42, 6], [36, 34, 22], [-6, 30, 30]],
  // Lava (Becken im Inferno), Rauch aus den Fabrik-Schornsteinen, Knochenflieger über Regen- und Nacht-Festung, Fackeln
  fountains: [[18, 6.3, -105.5, 3.2, 'rot'], [28, 6.3, -103, 3.6, 'rot'], [-18, 6.3, -84, 3, 'rot']],
  fishjumps: [[23, 6.3, -104, 3, 0.3]],
  smoke: [[38, 15.1, -66.2, 0.9], [44.5, 15.1, -66.2, 1.0], [50.5, 15.1, -66.2, 0.9], [24, 6.3, -107, 0.7]],
  boneflyers: [{ c: [19, 12, -4], r: 8, n: 3, speed: 0.3 }, { c: [-66, 14, -66], r: 10, n: 2, speed: -0.28 }],
  torches: [[-66, 5.5, -64, 'rot'], [-75, 5.5, -64, 'rot'], [-44, 5.5, -57, 'rot'], [-4.2, 9.5, -118.5, 'rot'], [4.2, 9.5, -118.5, 'rot'],
    [-27, 6.5, -104, 'rot'], [-12, 7.5, -95, 'rot']],

  levels: [
    { id: 'W7', world: 7, next: 7, label: 'Welt 7', stars: 0 },
    { id: '8-1', stars: 3, stamp: true },
    { id: '8-2', after: '8-1', stars: 3, stamp: true },
    { id: '8-3', after: '8-2', stars: 3, stamp: true },
    { id: '8-Zug', after: '8-3', stars: 3, stamp: true },
    { id: '8-4', after: '8-Zug', stars: 3, stamp: true },
    { id: '8-5', after: '8-4', stars: 3, stamp: true },
    { id: '8-Haus', after: '8-4', stars: 10 },
    { id: '8-6', after: '8-5', stars: 3, stamp: true },
    { id: '8-7', after: '8-6', stars: 3, stamp: true },
    { id: '8-A', after: '8-7', stars: 3, stamp: true },
    { id: '8-B', after: '8-7', stars: 3, stamp: true },
    { id: '8-Burg', after: ['8-A', '8-B'], minStars: 190, stars: 3, stamp: true },
    { id: 'WS', after: '8-Burg', world: 9, next: 9, label: 'Welt Stern', worldLabel: 'Welt Stern', stars: 0 },
  ],

  ground: [
    // ---- A Rummel-Eingang (Pflaster), Sandstrand im Süden, nasser Fels der Regenfestung im Osten
    g(-26, 6, 20, 54, 1.5, { walk: W, style: 'plaza' }),
    g(-30, 54, 22, 58, 0.45, { style: 'sand', noEdge: true, noDeco: true }),
    g(12, -14, 26, 2, 1.4, { style: 'rainrock', noDeco: true }),
    // ---- Park mit dem Riesenrad (Mitte) und Westpark mit der Achterbahn (nicht begehbar)
    g(-30, -46, 12, 6, 1.0, { style: 'parkgrass', keep: [[-8, -8, 16]] }),
    g(-62, -14, -30, 24, 0.8, { style: 'parkgrass', noDeco: true }),
    // ---- B Dünenplatz, Dünen im Osten (Baron-Sandstatue) und Norden
    g(28, -14, 58, 14, 2.5, { walk: W, style: 'sand' }),
    g(58, -26, 84, 14, 2.8, { style: 'sand', noDeco: true }),
    g(26, -26, 43, -14, 1.6, { style: 'sand', noDeco: true }),
    g(49, -26, 58, -14, 1.6, { style: 'sand', noDeco: true }),
    // ---- C Kekshof, Fabrik-Block im Norden
    g(24, -58, 64, -26, 3.5, { walk: W, style: 'cookie' }),
    g(26, -70, 62, -58, 3.5, { style: 'cookie', noDeco: true }),
    // ---- D Bahnsteig, Gleisbett im Norden
    g(-30, -72, 14, -52, 4.5, { walk: W, style: 'station' }),
    g(-34, -76, 18, -72, 4.3, { style: 'rails', noEdge: true, noDeco: true }),
    // ---- E Nacht-Festung, H Haus-Insel
    g(-80, -74, -42, -48, 5.5, { walk: W, style: 'nightstone' }),
    g(-80, -40, -58, -20, 5.0, { walk: W, style: 'house' }),
    // ---- F Seeufer am See mit der Unterwasser-Festung
    g(-66, -112, -50, -82, 5.0, { walk: W, style: 'shore' }),
    g(-92, -132, -66, -78, 1.2, { style: 'lake' }),
    g(-66, -132, -46, -112, 1.2, { style: 'lake' }),
    // ---- G Spukgarten
    g(-44, -120, -24, -96, 6.5, { walk: W, style: 'spook' }),
    // ---- I Inferno-Plateau mit Lavabecken (Nord und West)
    g(-14, -100, 40, -76, 7.5, { walk: W, style: 'inferno', fence: 'battlement' }),
    g(14, -110, 32, -100, 6.0, { style: 'basin', flow: [1, 0.2] }),
    g(-22, -94, -14, -76, 6.0, { style: 'basin', flow: [0, 1] }),
    // ---- J, K Zirkusplätze am Rand
    g(26, -132, 48, -110, 8.0, { walk: W, style: 'circus' }),
    g(48, -96, 70, -76, 8.0, { walk: W, style: 'circus' }),
    // ---- TP Turmplatz, Felssockel des Turms, Sternen-Röhre
    g(-12, -132, 12, -108, 9.5, { walk: W, style: 'tower' }),
    g(-14, -158, 14, -132, 9.5, { style: 'towerbase', noDeco: true }),
    g(-30, -146, -16, -126, 9.5, { walk: W, style: 'starplaza' }),
  ],

  // Zusätzlich begehbar: Stege und Brücken
  walk: [
    [20, 8, 28, 12],          // A → B (Rummelsteg)
    [44, -26, 48, -14],       // B → C (Rummelsteg)
    [14, -56, 24, -52],       // C → D (Rummelsteg)
    [-42, -64, -30, -60],     // D → E (Kettensteg)
    [-68, -48, -64, -40],     // E → H (Rummelsteg)
    [-58, -82, -54, -74],     // E → F (Kettensteg)
    [-50, -108, -44, -104],   // F → G (Kettensteg)
    [-24, -100, -14, -96],    // G → I (Basaltbrücke)
    [34, -110, 38, -100],     // I → J (Rummelsteg)
    [40, -88, 48, -84],       // I → K (Rummelsteg)
    [-2, -108, 2, -100],      // I → Turmplatz (Zugbrücke)
    [-16, -132, -12, -128],   // Turmplatz → Sternen-Röhre (Glasröhre)
  ],

  paths: [
    [[2, 49.5], [2, 40], [4, 30], [10, 20], [14, 12], [20, 10]],
    [[2, 46], [-8, 46], [-17, 48.6]],
    [[10, 20], [12, 12.1]],
    [[1, 38], [-6, 38], [-8, 37.6]],
    [[28, 10], [36, 6], [40, 0.6]],
    [[36, 6], [46, -6], [46, -14]],
    [[46, -26], [46, -38], [44, -47.4]],
    [[46, -38], [36, -46], [28, -54], [24, -54]],
    [[14, -54], [2, -58], [-6, -63.4]],
    [[2, -57], [8, -61]],
    [[-6, -60], [-20, -61], [-30, -62]],
    [[-42, -62], [-52, -61], [-62, -62.9]],
    [[-52, -60], [-56, -66], [-56, -74]],
    [[-56, -60], [-64, -54], [-66, -48]],
    [[-66, -40], [-68, -32], [-68, -27.4]],
    [[-56, -82], [-58, -92], [-58, -104.4]],
    [[-58, -96], [-54, -102], [-50, -106]],
    [[-44, -106], [-38, -103], [-31, -102.4]],
    [[-30, -100], [-26, -98], [-24, -98]],
    [[-14, -98], [0, -94], [20, -89.4]],
    [[0, -94], [0, -100]],
    [[20, -90], [30, -92], [36, -96], [36, -100]],
    [[30, -92], [34, -87], [40, -86]],
    [[36, -110], [37, -113.4]],
    [[48, -86], [56, -84], [58, -79.4]],
    [[0, -114], [-8, -124], [-12, -130]],
    [[-16, -130], [-23, -129.4]],
  ],

  entrances: [
    { id: 'W7', kind: 'pipe', pos: [-17, 1.5, 46], decor: [-17, 1.5, 42.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.7, 5.8, 0.5], [-5, 7.6, 2.6], [-16, 9, 7], [-40, 12, 15], [-80, 16, 28], [-150, 22, 52]], pipeDetail: 'low',
      arriveCam: { up: 6, ahead: 6, drop: 2.5 }, signPos: [2.6, 0, 0.8], departAlong: true },
    { id: '8-1', kind: 'rainfort', pos: [12, 1.5, 9.5], decor: [19, 1.4, -4], bridges: [[14.5, 1.6, 14.5, 5.9, 1.55], [18.5, 1.6, 18.5, 5.9, 1.55]] },
    { id: '8-2', kind: 'dunes8', pos: [40, 2.5, -2], decor: [46, 2.5, -9],
      statues: [[48, 2.5, -9, 0.5, 1]], dunes: [[66, 2.8, -4, 1, 1], [68, 2.8, 8, 0.9, 2], [33, 1.6, -21, 0.7, 3], [72, 2.8, -18, 0.9, 4]], schub: [34, 2.5, -8], fin: [52, 5, 3.6] },
    { id: '8-3', kind: 'cookiefactory', pos: [44, 3.5, -50], decor: [44, 3.5, -64] },
    { id: '8-Zug', kind: 'baronstation', pos: [-6, 4.5, -66], decor: [-6, 4.3, -74], platformZ: -70.5, range: 7 },
    { id: '8-4', kind: 'nightfort', pos: [-62, 5.5, -65.5], decor: [-70, 5.5, -70],
      walls: [[-73.5, -73.3, 11, 3.2, 0], [-79.3, -66, 14, 3.2, PI / 2]], towers: [[-79, -73, 6], [-67.5, -73, 6]], steps: STEPS8 },
    { id: '8-Haus', kind: 'clawhouse', pos: [-68, 5, -30], decor: [-75, 5, -36] },
    { id: '8-5', kind: 'lakefort', pos: [-58, 5, -107], decor: [-60, 1.2, -120],
      towers: [[-62, -120, 5.5], [-52, -123, 4.5], [-71, -110, 4], [-80, -96, 4.5]], parts: [['saeule', -57, -116, 0.4], ['gitter', -66, -126, 0], ['algen', -50, -117], ['algen', -72, -120, 1, { seed: 2 }], ['saeule', -76, -104, 2, { seed: 3 }]],
      cube: [-63, 4.8, -114.5] },
    { id: '8-6', kind: 'darkmansion', pos: [-31, 6.5, -105], decor: [-36, 6.5, -114] },
    { id: '8-7', kind: 'inferno', pos: [20, 7.5, -92], decor: [23, 6.0, -105], roll: [16.5, 29.5], cube: [29.5, 6.2, -102.4] },
    { id: '8-A', kind: 'goldtent', pos: [37, 8, -116], decor: [37, 8, -125.5] },
    { id: '8-B', kind: 'snaketent', pos: [58, 8, -82], decor: [59, 8, -90.5], puddles: [[52, -90], [66, -80.5]] },
    { id: '8-Burg', kind: 'barontower', pos: [0, 9.5, -125], decor: [0, 9.5, -142], labelY: 2.8, wreck: [-8, 9.5, -115.5], carpet: [-1.2, -122.5, 1.2, -108],
      friends: [[-6.5, 9.5, -126.5], [-3.6, 9.5, -129.6], [3.6, 9.5, -129.6], [6.5, 9.5, -126.5]] },
    { id: 'WS', kind: 'pipe', pos: [-23, 9.5, -132], decor: [-23, 9.5, -135.1], disc: '★',
      pipe: [[0, 0, 0], [0, 4, 0], [-0.6, 7, -0.8], [-3, 13, -3.5], [-8, 24, -9], [-16, 40, -18], [-28, 62, -30], [-44, 90, -46]], pipeDetail: 'low',
      arriveCam: { up: 12, ahead: 2, drop: 9 }, signPos: [2.8, 0, 0.6] },
  ],

  gates: [
    { for: '8-2', at: [24, 10], axis: 'x' },
    { for: '8-3', at: [46, -20], axis: 'z' },
    { for: '8-Zug', at: [19, -54], axis: 'x' },
    { for: '8-4', at: [-36, -62], axis: 'x' },
    { for: '8-Haus', at: [-66, -44], axis: 'z' },
    { for: '8-5', at: [-56, -78], axis: 'z' },
    { for: '8-6', at: [-47, -106], axis: 'x' },
    { for: '8-7', at: [-19, -98], axis: 'x' },
    { for: '8-A', at: [36, -105], axis: 'z' },
    { for: '8-B', at: [44, -86], axis: 'x' },
    { for: '8-Burg', at: [0, -104], axis: 'z' },
    { for: 'WS', at: [-14, -130], axis: 'x' },
  ],

  roamers: [],

  houses: [
    { kind: 'beeren', pos: [-8, 1.5, 33], yaw: -PI / 2, item: [-8, 1.5, 37.6], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [8, 4.5, -68.6], yaw: -PI / 2, machine: [8, 4.5, -63.8], pad: [8, 4.5, -61.1], stake: 10 },
  ],

  signs: [
    { pos: [8.4, 1.5, 51.2], yaw: -0.15, text: 'Welt 8\nBrummbär-Rummel' },
    { pos: [-12.6, 1.5, 36.6], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [3.2, 4.5, -60.4], yaw: -0.2, text: 'Glückshaus' },
    // Sternschranke: Schild mit dem Sternbedarf am Turmplatz
    { pos: [-5.4, 9.5, -112.6], yaw: 0.3, text: 'ab 190 ★' },
  ],

  props: [
    // A Rummel-Eingang: Rummel-Tor über dem Weg, Buden mit Wimpeln, Laternen, Zierbüsche, Ballonstand
    { kind: 'arch8', pos: [2, 1.5, 41], w: 6 },
    { kind: 'booth8', pos: [-22.6, 1.5, 33], yaw: PI / 2, color: 'rot', seed: 1 }, { kind: 'booth8', pos: [-22.6, 1.5, 41], yaw: PI / 2, color: 'blau', seed: 2 },
    { kind: 'booth8', pos: [-3, 1.5, 9.4], color: 'gruen', seed: 3 },
    { kind: 'booth8', pos: [16.6, 1.5, 31], yaw: -PI / 2, color: 'rot', seed: 5 }, { kind: 'booth8', pos: [16.6, 1.5, 39.5], yaw: -PI / 2, color: 'gelb', seed: 4 },
    { kind: 'lamp8', pos: [-11.6, 1.5, 47.6] }, { kind: 'lamp8', pos: [12.4, 1.5, 47.4] }, { kind: 'lamp8', pos: [-24, 1.5, 22] }, { kind: 'lamp8', pos: [5, 1.5, 12] },
    { kind: 'bush8', pos: [-24, 1.5, 51], size: 0.9 }, { kind: 'bush8', pos: [17.4, 1.5, 51.2], size: 0.8, tone: 1 }, { kind: 'bush8', pos: [-5.6, 1.5, 21.6], size: 0.8, tone: 2 },
    { kind: 'bush8', pos: [-6.4, 1.5, 27.4], size: 0.7, tone: 0 }, { kind: 'bush8', pos: [-2.6, 1.5, 25.4], size: 0.6, tone: 1 }, { kind: 'lamp8', pos: [-4.6, 1.5, 24.4], h: 3.0 },
    { kind: 'bush8', pos: [12.6, 1.5, 26.6], size: 0.7, tone: 2 }, { kind: 'bush8', pos: [-17.6, 1.5, 28], size: 0.8, tone: 1 },
    { kind: 'balloons8', pos: [-22, 1.5, 12.5], color: 'rot', n: 3 },
    { kind: 'barrels7', pos: [17.4, 1.5, 38.6] }, { kind: 'crates7', pos: [-24.2, 1.5, 46.6] },
    // Park: Zierbüsche am Riesenrad, Westpark mit Achterbahn und Looping
    { kind: 'looping8', pos: [-59.5, 0.8, 5], yaw: PI / 2, radius: 5, h: 1.5 },
    { kind: 'bush8', pos: [-36, 0.8, -10], size: 1.1, solid: false }, { kind: 'bush8', pos: [-33, 0.8, 21], size: 1.0, tone: 1, solid: false },
    { kind: 'balloons8', pos: [-40, 0.8, 18], color: 'gelb', n: 3, solid: false },
    // B Dünenplatz: Laternen, Fässer, Ballonstand
    { kind: 'lamp8', pos: [30, 2.5, -12] }, { kind: 'lamp8', pos: [56.4, 2.5, -12.4] }, { kind: 'barrels7', pos: [30.4, 2.5, 4] }, { kind: 'balloons8', pos: [55, 2.5, -11], color: 'blau', n: 3 },
    { kind: 'booth8', pos: [55.6, 2.5, 1], yaw: -PI / 2, color: 'gelb', seed: 6 },
    // C Kekshof
    { kind: 'crates7', pos: [60, 3.5, -30] }, { kind: 'lamp8', pos: [26, 3.5, -45] }, { kind: 'lamp8', pos: [62, 3.5, -50] },
    // D Bahnsteig: Koffer (Kisten), Fässer, Laternen
    { kind: 'crates7', pos: [-26, 4.5, -66] }, { kind: 'barrels7', pos: [-20, 4.5, -68.6] }, { kind: 'lamp8', pos: [12, 4.5, -54] },
    // E/H/F/G
    { kind: 'lamp8', pos: [-44, 5.5, -50.6] }, { kind: 'lamp8', pos: [-60, 5, -22] }, { kind: 'bush8', pos: [-60.4, 5, -38], size: 0.8, tone: 1 },
    { kind: 'vrock7', pos: [-64.4, 5, -84], size: 0.8, seed: 2 }, { kind: 'lamp8', pos: [-64.4, 5, -110.6] },
    { kind: 'bush8', pos: [-25.6, 6.5, -118.4], size: 0.9, tone: 1 }, { kind: 'bush8', pos: [-42.4, 6.5, -98], size: 0.8, tone: 1 },
    // I Inferno-Plateau: Kristalle, Basalt
    { kind: 'crystal8', pos: [-11, 7.5, -80], size: 1.1, tone: 0 }, { kind: 'crystal8', pos: [37, 7.5, -79], size: 1.0, tone: 1 }, { kind: 'crystal8', pos: [12, 7.5, -97.6], size: 0.9, tone: 2 },
    { kind: 'crystal8', pos: [28.6, 7.5, -98.2], size: 0.8, tone: 0 },
    { kind: 'basalt7', pos: [38, 7.5, -98], size: 1.8, seed: 3 },
    // J/K Zirkusplätze, Turmplatz, Sternen-Röhre
    { kind: 'lamp8', pos: [46.6, 8, -128] }, { kind: 'lamp8', pos: [49.4, 8, -78] }, { kind: 'balloons8', pos: [66, 8, -94], color: 'lila', n: 3 },
    { kind: 'balloons8', pos: [8, 9.5, -126], color: 'rot', n: 3 }, { kind: 'lamp8', pos: [-10.6, 9.5, -124] }, { kind: 'lamp8', pos: [10.6, 9.5, -122] },
    { kind: 'crystal8', pos: [-28, 9.5, -140], size: 0.9, tone: 0 }, { kind: 'crystal8', pos: [-18, 9.5, -144], size: 0.8, tone: 1 },
  ],

  segments: [
    { type: 'rummelbridge', from: [20, 1.5, 10], to: [28, 2.5, 10], width: 4 },
    { type: 'rummelbridge', from: [46, 2.5, -14], to: [46, 3.5, -26], width: 4 },
    { type: 'rummelbridge', from: [24, 3.5, -54], to: [14, 4.5, -54], width: 4 },
    { type: 'chainbridge', from: [-30, 4.5, -62], to: [-42, 5.5, -62], width: 4 },
    { type: 'rummelbridge', from: [-66, 5.5, -48], to: [-66, 5.0, -40], width: 4 },
    { type: 'chainbridge', from: [-56, 5.5, -74], to: [-56, 5.0, -82], width: 4 },
    { type: 'chainbridge', from: [-50, 5.0, -106], to: [-44, 6.5, -106], width: 4 },
    { type: 'basaltbridge', from: [-24, 6.5, -98], to: [-14, 7.5, -98], width: 4 },
    { type: 'rummelbridge', from: [36, 7.5, -100], to: [36, 8.0, -110], width: 4 },
    { type: 'rummelbridge', from: [40, 7.5, -86], to: [48, 8.0, -86], width: 4 },
    { type: 'drawbridge', from: [0, 7.5, -100], to: [0, 9.5, -108], width: 4 },
    { type: 'glasstube', from: [-12, 9.5, -130], to: [-16, 9.5, -130], width: 4 },
  ],
};
