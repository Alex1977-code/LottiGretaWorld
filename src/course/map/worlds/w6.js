// Kurs-Weltkarte Welt 6 – „Wolkeninseln“ (Bauplan: Weltkarte & Weltstruktur, Welt 6; Vertrag: Welt 6 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Schwebende Inseln hoch über einem Wolkenmeer (das „Meer“ dieser Welt, sea = 0), verbunden durch begehbare Glasröhren,
// Wolkenbrücken, eine rote Bogenbrücke und eine Regenbogenbrücke; Wasserfälle stürzen ins Wolkenmeer, Regenbögen,
// Luftschiffchen und Vögel kreisen, Windräder drehen sich im Takt der Kartenmusik. Die Inseln steigen nach Norden an.
// Weg (Vertrag): Ankunftsinsel mit der Glasröhre zurück nach Welt 5, Beerenhaus und dem Bergland mit Glasröhren (6-1);
// gleich nebenan der Steinkreis mit den Werfer-Brüdern (6-B, sofort frei) → Glasröhre nach Norden zur Geisterschiff-
// Bucht (6-2) → westlich über die rote Brücke die Fernost-Halle (6-3, ab 110 Sternen), östlich die Dschungel-Insel mit
// dem lila Giftsee (6-4) → von dort die kleine Festung mit Glasröhren und dem Schubser-Prinzen (6-A) und der Schnee-
// Wolkenberg mit Windrädern (6-5) → Himmelsfabrik mit Zahnrädern und Glückshaus (6-6) → westlich das Prüfungs-Haus
// (6-Haus), nördlich der Minen-Turm (6-7) → Wolkenstraße mit Panzern (6-Panzer) → Regenbogenbrücke hinauf zum
// Zirkuszelt auf der höchsten Insel (6-C, ab 120 Sternen) → Röhren-Insel mit der Glasröhre nach Welt 7 (frei nach 6-C;
// „Welt 7 kommt bald!“, solange es Welt 7 nicht gibt). Sternbedarf zählt alle Sterne.
//
// Bereiche (begehbar, Höhe):                 Eingänge (kind):
//   A  Ankunftsinsel            y 10           W5         pipe         Glasröhre zurück        (−16, 10, 45)
//                                              6-1        pipehills    Bergland, Glasröhren     (12, 10, 36)
//   S  Steinkreis-Insel         y 10.5         6-B        stonecircle  Steinkreis (Gruppe)      (−45, 10.5, 24)
//   B  Geisterschiff-Bucht      y 11           6-2        ghostbay     Bucht mit Geisterschiff  (−6, 11, −4.6)
//   C  Fernost-Insel            y 12.5         6-3        fareast      Fernost-Halle (ab 110 ★) (−56, 12.5, −12)
//   D  Dschungel-Insel          y 12           6-4        junglelake   lila Giftsee mit Floß    (43, 12, −9.5)
//   E  Festungs-Insel           y 12.5         6-A        pipefort     Festung (Gruppe)         (75, 12.5, −22)
//   F  Schnee-Wolkenberg        y 14           6-5        snowwind     Windräder, Pustewolke    (40, 14, −66)
//   G  Himmelsfabrik            y 15           6-6        skyfactory   Fabrik mit Zahnrädern    (−9, 15, −74)
//   H  Haus-Insel               y 15           6-Haus     throwhouse   Prüfungs-Haus            (−51, 15, −76)
//   I  Minen-Insel              y 16           6-7        minetower    Minen-Turm               (−15, 16, −117)
//   J  Wolkenstraße             y 16.5         6-Panzer   tankroad     Panzerkolonne            (36, 16.5, −117)
//   K  Zirkus-Gipfel            y 20           6-C        skycircus    Zirkuszelt (ab 120 ★)    (46, 20, −153)
//   L  Röhren-Insel             y 20           W7         pipe         Glasröhre (bald)         (80, 20, −157)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-6',
  world: 6,
  title: 'Wolkeninseln',
  short: 'Wolkeninseln',
  archetype: 'map',
  theme: 'map_sky',
  kit: 'sky',
  music: 'course_world6_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 6)
  base: -3,
  sea: 0,                        // Wolkenmeer tief unter den Inseln
  spawn: { pos: [2, 10, 46], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [12, 40, 120], look: [8, 14, -52], duration: 3.2 },
  edges: { hedge: 'cloudhedge', fence: 'skyrail' },
  pathColors: [0xfffaf2, 0xf4ecdc, 0xd8b47a],      // helle Wolkenstein-Platten mit goldener Kante
  seaColors: [0xffffff, 0xf0f0ff, 0xd6dcf8],      // Wolkenmeer: weiß an den Inseln, zartes Lavendelblau draußen
  // Kacheln: je Insel eine Zone (Mesh je Material/Schattenwurf; Brücken bis zur Mitte des Spalts), außerhalb 48-m-Raster
  batch: { tile: 48, origin: [-8, 4], freeTile: 48, freeOrigin: [-8, 4], zones: [
    [-30, 20, 44, 60, 'ankunft'], [-64, 8, -30, 44, 'steinkreis'], [-30, -44, 20, 20, 'bucht'], [-80, -40, -30, 8, 'fernost'],
    [20, -48, 60, 8, 'dschungel'], [60, -40, 96, 0, 'festung'], [15, -104, 64, -48, 'schnee'], [-33, -104, 15, -56, 'fabrik'],
    [-70, -100, -33, -60, 'haus'], [-40, -150, 5, -104, 'mine'], [5, -136, 64, -104, 'strasse'], [24, -184, 67, -136, 'zirkus'],
    [67, -180, 100, -140, 'roehre7'],
  ] },
  // Nachbarwelten am Horizont: Welt 5 (Lila Strand-Insel) tief im Südwesten – dorthin führt die Rückweg-Röhre; im
  // Nordosten die ferne Lava-Festung (Welt 7, Ziel der Röhre W7)
  neighbors: [{ world: 5, pos: [-205, 116], size: [80, 54], style: 'lila' }, { world: 7, pos: [300, -340], size: [90, 60], style: 'lavafort' }],
  birdStyle: 'gull',
  birds: [{ c: [4, 15, 22], r: 9, n: 3 }, { c: [-52, 17, -16], r: 8, n: 2 }, { c: [42, 19, -62], r: 10, n: 3 }, { c: [-30, 21, -90], r: 8, n: 2 }, { c: [36, 25, -148], r: 9, n: 2 }],
  // Luftschiffchen ziehen ihre Kreise zwischen und unter den Inseln (SkyLife, sky6.js)
  airships: [{ c: [-10, 5, 2], r: 44, speed: 0.06, color: 0xb48ae8 }, { c: [24, 7, -92], r: 48, speed: -0.05, color: 0xff9a6a }, { c: [16, 10, -150], r: 40, speed: 0.055, color: 0x6ac8f0 }],
  // Windräder: [x, y, z, Höhe, yaw] – Flügel drehen je Zählzeit der Kartenmusik eine Achtelrunde weiter
  windmills: [[27, 17.5, -90.5, 6.5, 0.15], [37, 17.5, -92, 7.5, 0], [52.5, 17.5, -90, 6, -0.2], [24.5, 14, -58, 5, 0.3], [55, 14, -60, 5.2, -0.3], [30, 15.5, 47, 5.5, -0.4], [-58, 15, -70.5, 4.6, 0.3]],
  // Wasserfälle aus den Inselflanken hinab ins Wolkenmeer: at = [x, z] (Mitte), w Breite, top (Austritt), face S|E|W
  waterfalls: [
    { at: [-6, 50], w: 3.2, top: 9.2, face: 'S' }, { at: [-16, 12], w: 3, top: 10.2, face: 'S' }, { at: [31, 0], w: 2.6, top: 11.2, face: 'S' },
    { at: [-66, 6], w: 2.4, top: 11.7, face: 'S' }, { at: [48, -54], w: 2.6, top: 13.2, face: 'S' }, { at: [35, -144], w: 2.6, top: 19.2, face: 'S' },
    { at: [57, -144], w: 2.6, top: 19.2, face: 'S' }, { at: [-26, -88], w: 2.2, top: 14.2, face: 'W' }, { at: [86, -16], w: 2, top: 11.7, face: 'E' },
  ],
  // Seilbahn vom Zirkus-Gipfel hinab zur Wolkenstraße (Masten, Seil, pendelnde Gondel – decor_w4.buildCableway)
  cableways: [{ from: [31.6, 20, -173], to: [12.6, 16.5, -126.6], hFrom: 7, hTo: 6, sag: 2.2, period: 18 }],
  // Regenbögen: Mitte (Fußpunkt-Ebene), Radius, Drehung
  rainbows: [{ c: [0, 5, 20.5], r: 14.5, yaw: 0 }, { c: [46, 9, -137], r: 15, yaw: 0 }, { c: [-50, 7, 9], r: 10, yaw: 0.35 }],

  levels: [
    { id: 'W5', world: 5, next: 5, label: 'Welt 5', stars: 0 },
    { id: '6-1', stars: 3, stamp: true },
    { id: '6-B', stars: 1 },
    { id: '6-2', after: '6-1', stars: 3, stamp: true },
    { id: '6-3', after: '6-2', minStars: 110, stars: 3, stamp: true },
    { id: '6-4', after: '6-2', stars: 3, stamp: true },
    { id: '6-A', after: '6-4', stars: 1 },
    { id: '6-5', after: '6-4', stars: 3, stamp: true },
    { id: '6-6', after: '6-5', stars: 3, stamp: true },
    { id: '6-Haus', after: '6-6', stars: 5 },
    { id: '6-7', after: '6-6', stars: 3, stamp: true },
    { id: '6-Panzer', after: '6-7', stars: 3, stamp: true },
    { id: '6-C', after: '6-Panzer', minStars: 120, stars: 3, stamp: true },
    { id: 'W7', after: '6-C', world: 7, next: 7, label: 'Welt 7', stars: 0 },
  ],

  ground: [
    // ---- A Ankunftsinsel, Bergland (6-1) im Osten
    g(-22, 28, 20, 50, 10, { walk: W, under: { rect: [-22, 26, 20, 52], depth: 15 } }),
    g(20, 22, 36, 52, 15.5, { style: 'hill', mound: 3.2, under: { depth: 16 } }),
    g(22, 10, 36, 22, 13.5, { style: 'hill', mound: 2.4, under: { depth: 12 } }),
    // ---- S Steinkreis-Insel (6-B)
    g(-56, 14, -34, 34, 10.5, { style: 'stone', walk: W, under: { depth: 13 } }),
    // ---- B Geisterschiff-Bucht: Ufer, Bucht (Wasser), Felsrand
    g(-26, -8, 14, 12, 11, { walk: W, fence: 'quay', under: { rect: [-26, -38, 14, 12], depth: 17 } }),
    g(-22, -34, 10, -8, 10.1, { style: 'bay', under: false }),
    g(-26, -38, -22, -8, 12.6, { style: 'rock', edge: 'rocks', under: false }),
    g(-22, -38, 14, -34, 12.6, { style: 'rock', edge: 'rocks', under: false }),
    g(10, -34, 14, -8, 12.6, { style: 'rock', edge: 'rocks', under: false }),
    // ---- C Fernost-Insel (6-3)
    g(-72, -30, -40, 6, 12.5, { style: 'fareast', walk: W, under: { depth: 16 } }),
    // ---- D Dschungel-Insel (6-4) mit lila Giftsee in der Mitte
    g(26, -40, 56, -30, 12, { style: 'jungle', walk: W, fence: 'bamboo', under: { rect: [26, -40, 56, 0], depth: 17 } }),
    g(26, -14, 56, 0, 12, { style: 'jungle', walk: W, fence: 'bamboo', under: false }),
    g(26, -30, 36, -14, 12, { style: 'jungle', walk: W, fence: 'bamboo', under: false }),
    g(50, -30, 56, -14, 12, { style: 'jungle', walk: W, fence: 'bamboo', under: false }),
    g(36, -30, 50, -14, 11.2, { style: 'poison', under: false }),
    // ---- E Festungs-Insel (6-A)
    g(64, -34, 86, -10, 12.5, { style: 'fort', walk: W, under: { depth: 14 } }),
    // ---- F Schnee-Wolkenberg (6-5) mit Gipfeln im Norden
    g(22, -86, 58, -54, 14, { style: 'snow', walk: W, under: { rect: [22, -96, 58, -54], depth: 18 } }),
    g(22, -96, 58, -86, 17.5, { style: 'snowpeak', mound: 2.6, edge: 'snowbank', under: false }),
    // ---- G Himmelsfabrik (6-6), H Haus-Insel (6-Haus)
    g(-26, -96, 8, -62, 15, { style: 'metal', walk: W, under: { depth: 16 } }),
    g(-62, -92, -40, -68, 15, { walk: W, under: { depth: 13 } }),
    // ---- I Minen-Insel (6-7) mit Felswand, J Wolkenstraße (6-Panzer)
    g(-30, -134, 0, -108, 16, { style: 'mine', walk: W, under: { rect: [-30, -142, 0, -108], depth: 16 } }),
    g(-30, -142, 0, -134, 19.5, { style: 'rock', edge: 'rocks', under: false }),
    g(10, -128, 54, -112, 16.5, { style: 'cloud', walk: W, under: false }),
    // ---- K Zirkus-Gipfel (6-C), L Röhren-Insel (W7)
    g(30, -176, 62, -144, 20, { style: 'circus', walk: W, under: { depth: 22 } }),
    g(72, -170, 88, -150, 20, { walk: W, under: { depth: 12 } }),
  ],

  // Zusätzlich begehbar: Brücken zwischen den Inseln (Glasröhren, Wolkenbrücken, rote Brücke, Regenbogenbrücke)
  walk: [
    [-2, 12, 2, 28],          // A → B (Glasröhre)
    [-34, 30, -22, 34],       // A → Steinkreis (Wolkenbrücke)
    [-40, -2, -26, 2],        // B → Fernost (rote Brücke)
    [14, -6, 26, -2],         // B → Dschungel (Glasröhre)
    [56, -24, 64, -20],       // Dschungel → Festung (Glasröhre)
    [38, -54, 42, -40],       // Dschungel → Schnee (Glasröhre)
    [8, -78, 22, -74],        // Schnee → Fabrik (Glasröhre)
    [-40, -82, -26, -78],     // Fabrik → Haus (Wolkenbrücke)
    [-14, -108, -10, -96],    // Fabrik → Mine (Glasröhre)
    [0, -122, 10, -118],      // Mine → Wolkenstraße (Wolkenbrücke)
    [44, -144, 48, -128],     // Wolkenstraße → Zirkus (Regenbogenbrücke)
    [62, -162, 72, -158],     // Zirkus → Röhren-Insel (Glasröhre)
  ],

  paths: [
    [[2, 47.5], [2, 40], [0, 36], [0, 28]],
    [[2, 43.5], [-10, 44.6], [-16, 47.6]],
    [[0, 36], [-5, 37.4], [-8, 37.4]],
    [[2, 40], [8, 38.6], [12, 38.6]],
    [[0, 33], [-12, 32], [-22, 32]],
    [[-34, 32], [-37.4, 32]],
    [[0, 12], [0, 4], [-6, -2]],
    [[0, 4], [-14, 1], [-26, 0]],
    [[0, 4], [8, -2], [14, -4]],
    [[-40, 0], [-50, -4], [-56, -9.4]],
    [[26, -4], [32, -5], [43, -6.9]],
    [[32, -5], [31, -20], [32, -34], [40, -36], [40, -40]],
    [[40, -36], [52, -34], [53, -22], [56, -22]],
    [[64, -22], [67.4, -22]],
    [[40, -54], [40, -63.4]],
    [[40, -58], [30, -62], [26, -70], [22, -76]],
    [[8, -76], [0, -74], [-9, -71.4]],
    [[-2, -74], [-12, -78], [-26, -80]],
    [[-12, -78], [-12, -96]],
    [[-12, -70], [-20, -65.5]],
    [[-40, -80], [-46, -76], [-51, -73.4]],
    [[-12, -108], [-14, -112], [-15, -114.4]],
    [[-12, -112], [-4, -118], [0, -120]],
    [[46, -144], [46, -150.4]],
    [[46, -148], [56, -156], [62, -160]],
    [[72, -160], [80, -154.4]],
  ],

  entrances: [
    { id: 'W5', kind: 'pipe', pos: [-16, 10, 45], decor: [-16, 10, 41.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.7, 5.8, 0.5], [-5, 7, 2.6], [-16, 6.6, 7], [-40, 4.4, 15], [-80, 0, 28], [-150, -6, 52]], pipeDetail: 'low',
      arriveCam: { up: 6, ahead: 6, drop: 2.5 }, signPos: [2.6, 0, 0.8], departAlong: true },
    { id: '6-1', kind: 'pipehills', pos: [12, 10, 36], decor: [12, 10, 31] },
    { id: '6-B', kind: 'stonecircle', pos: [-45, 10.5, 24], decor: [-45, 10.5, 24], exit: [-37.4, 10.5, 32], ring: 7.4, gap: 0 },
    { id: '6-2', kind: 'ghostbay', pos: [-6, 11, -4.6], decor: [-5, 10.1, -15.5], wreck: [-16.5, -27] },
    { id: '6-3', kind: 'fareast', pos: [-56, 12.5, -12], decor: [-56, 12.5, -22.5] },
    { id: '6-4', kind: 'junglelake', pos: [43, 12, -9.5], decor: [43, 11.2, -22] },
    { id: '6-A', kind: 'pipefort', pos: [75, 12.5, -22], decor: [75, 12.5, -22], exit: [67.4, 12.5, -22],
      cage: [[65.5, -32.5, 84.5, -32.5], [65.5, -11.5, 84.5, -11.5], [84.5, -32.5, 84.5, -11.5], [65.5, -32.5, 65.5, -24.4], [65.5, -19.6, 65.5, -11.5]],
      towers: [[65.5, -32.5], [84.5, -32.5], [65.5, -11.5], [84.5, -11.5]], gateAt: [65.5, -22] },
    { id: '6-5', kind: 'snowwind', pos: [40, 14, -66], decor: [40, 14, -76] },
    { id: '6-6', kind: 'skyfactory', pos: [-9, 15, -74], decor: [-9, 15, -87] },
    { id: '6-Haus', kind: 'throwhouse', pos: [-51, 15, -76], decor: [-51, 15, -84.5] },
    { id: '6-7', kind: 'minetower', pos: [-15, 16, -117], decor: [-15, 16, -127] },
    { id: '6-Panzer', kind: 'tankroad', pos: [36, 16.5, -117], decor: [36, 16.5, -124.5] },
    { id: '6-C', kind: 'skycircus', pos: [46, 20, -153], decor: [46, 20, -165], labelY: 2.8 },
    { id: 'W7', kind: 'pipe', pos: [80, 20, -157], decor: [80, 20, -160.1],
      pipe: [[0, 0, 0], [0, 3.5, 0], [0.8, 5.8, -0.4], [5, 8.4, -2.4], [16, 11, -8], [40, 14, -22], [80, 16, -46], [140, 15, -80], [205, 12, -118]], pipeDetail: 'low',
      arriveCam: { up: 7.5, ahead: 4, drop: 3.5 } },
  ],

  gates: [
    { for: '6-2', at: [0, 20], axis: 'z' },
    { for: '6-3', at: [-33, 0], axis: 'x' },
    { for: '6-4', at: [20, -4], axis: 'x' },
    { for: '6-A', at: [60, -22], axis: 'x' },
    { for: '6-5', at: [40, -47], axis: 'z' },
    { for: '6-6', at: [15, -76], axis: 'x' },
    { for: '6-Haus', at: [-33, -80], axis: 'x' },
    { for: '6-7', at: [-12, -102], axis: 'z' },
    { for: '6-Panzer', at: [5, -120], axis: 'x' },
    { for: '6-C', at: [46, -136], axis: 'z' },
    { for: 'W7', at: [67, -160], axis: 'x' },
  ],

  // Wandernde Gegnergruppen: fünf Werfer-Brüder (1 Feuer-, 2 Hammer-, 2 Bumerang-Werfer) tänzeln im Steinkreis, der
  // Schubser-Prinz stapft durch den Hof der kleinen Festung (eigener Stellvertreter, solange das Modell fehlt)
  roamers: [
    { level: '6-B', model: 'feuer_werfer', count: 5, circle: [-45, 24, 4.2], y: 10.5, speed: 1.5,
      memberOpts: [{ kind: 'feuer' }, { kind: 'hammer' }, { kind: 'bumerang' }, { kind: 'hammer' }, { kind: 'bumerang' }],
      half: [0.5, 0.8, 0.5], castShadow: false, instance: true, hint: 'Lauf die Werfer-Brüder an!' },
    { level: '6-A', model: 'schubser_prinz', standIn: 'schubser_prinz', count: 1, circle: [75, -22, 4.6], y: 12.5, speed: 1.9,
      half: [0.8, 0.9, 0.8], castShadow: false, hint: 'Lauf den Schubser-Prinzen an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [-8, 10, 31.4], yaw: -PI / 2, item: [-8, 10, 36], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [-20, 15, -73], yaw: -PI / 2, machine: [-20, 15, -68.2], pad: [-20, 15, -65.5], stake: 10 },
  ],

  signs: [
    { pos: [6.4, 10, 47.6], yaw: -0.15, text: 'Welt 6\nWolkeninseln' },
    { pos: [-12.6, 10, 37.8], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [-15.2, 15, -64.6], yaw: -0.2, text: 'Glückshaus' },
    // Sternschranken: Schilder mit dem Sternbedarf vor den Eingängen
    { pos: [-51, 12.5, -8.8], yaw: 0.3, text: 'ab 110 ★' },
    { pos: [41.2, 20, -149.4], yaw: 0.3, text: 'ab 120 ★' },
  ],

  props: [
    // A Ankunftsinsel: runde Bäume, Blumen, Pilze, Laternen am Röhrensteg
    { kind: 'skytree', pos: [-19.6, 10, 30.4], size: 4.6 }, { kind: 'skytree', pos: [17.4, 10, 48], size: 4.2, tone: 1 }, { kind: 'skytree', pos: [-20, 10, 48.2], size: 3.8, tone: 2 },
    { kind: 'flowerbed', pos: [6, 10, 30.4], area: [6, 1.6], solid: false, shadow: false }, { kind: 'flowerbed', pos: [-4, 10, 48.6], area: [5, 1.4], solid: false, shadow: false },
    { kind: 'mushroom', pos: [15.6, 10, 44.4], size: 0.9 }, { kind: 'mushroom', pos: [16.8, 10, 42.6], size: 0.6, tone: 1 },
    { kind: 'skylamp', pos: [-3.2, 10, 28.8] }, { kind: 'skylamp', pos: [3.2, 10, 28.8] },
    { kind: 'bush6', pos: [-21, 10, 39], size: 0.9 }, { kind: 'bush6', pos: [19, 10, 30], size: 0.8 },
    // S Steinkreis-Insel
    { kind: 'skytree', pos: [-54, 10.5, 15.6], size: 4.2, tone: 2 }, { kind: 'flowerbed', pos: [-52, 10.5, 32], area: [4, 1.4], solid: false, shadow: false },
    // B Bucht-Ufer: Fässer, Laternen, Poller
    { kind: 'barrels', pos: [10.6, 11, -5.4] }, { kind: 'skylamp', pos: [-12, 11, -6.6] }, { kind: 'skylamp', pos: [2, 11, -6.6] },
    { kind: 'skytree', pos: [-23.6, 11, 9.6], size: 4.2, tone: 1 }, { kind: 'skytree', pos: [11.6, 11, 9.4], size: 4 },
    { kind: 'bush6', pos: [-24, 11, -2], size: 0.8 }, { kind: 'flowerbed', pos: [6, 11, 9.6], area: [4, 1.4], solid: false, shadow: false },
    // C Fernost-Insel: Blütenbäume, Steinlaternen, Bambus
    { kind: 'blossom', pos: [-68.6, 12.5, 2.4], size: 4.4 }, { kind: 'blossom', pos: [-43.4, 12.5, -27], size: 4.2 }, { kind: 'blossom', pos: [-69, 12.5, -26], size: 3.8 },
    { kind: 'stonelantern', pos: [-50.6, 12.5, -16] }, { kind: 'stonelantern', pos: [-61.4, 12.5, -16] }, { kind: 'stonelantern', pos: [-44, 12.5, 2.6] },
    { kind: 'bamboo', pos: [-70, 12.5, -12], size: 1 }, { kind: 'bamboo', pos: [-42.4, 12.5, -10], size: 0.9 },
    // D Dschungel-Insel: Dschungelbäume, Farne, Pilze
    { kind: 'jungletree6', pos: [28.6, 12, -38], size: 5.2 }, { kind: 'jungletree6', pos: [54, 12, -37.4], size: 4.8 }, { kind: 'jungletree6', pos: [53.6, 12, -2], size: 4.6 },
    { kind: 'jungletree6', pos: [27.6, 12, -24], size: 4.4 }, { kind: 'fern', pos: [34, 12, -2.4] }, { kind: 'fern', pos: [53, 12, -10] }, { kind: 'fern', pos: [28, 12, -12] },
    { kind: 'mushroom', pos: [52.6, 12, -28], size: 0.8, tone: 2 }, { kind: 'mushroom', pos: [28.4, 12, -31.6], size: 0.7, tone: 1 },
    // F Schnee-Wolkenberg: Tannen, Schneemann, Eisblumen
    { kind: 'fir', pos: [24.6, 14, -82.6], size: 3.6, model: false }, { kind: 'fir', pos: [56, 14, -83], size: 3.2, model: false }, { kind: 'fir', pos: [55.4, 14, -56.6], size: 3, model: false },
    { kind: 'snowman', pos: [28, 14, -64], model: false }, { kind: 'icecrystal', pos: [50, 14, -70], size: 1 }, { kind: 'icecrystal', pos: [25.4, 14, -73], size: 0.8 },
    // G Himmelsfabrik: Kisten, Fässer, Zahnräder am Boden
    { kind: 'crates6', pos: [5.4, 15, -64.6] }, { kind: 'barrels', pos: [-24, 15, -88] }, { kind: 'gearpile', pos: [4.6, 15, -92] },
    { kind: 'skylamp', pos: [-3.6, 15, -63.4] }, { kind: 'skylamp', pos: [-24, 15, -63.4] },
    // H Haus-Insel: Bälle, Bäume
    { kind: 'skytree', pos: [-60.4, 15, -90], size: 4, tone: 2 }, { kind: 'skytree', pos: [-41.6, 15, -90], size: 3.8 }, { kind: 'flowerbed', pos: [-58, 15, -70], area: [4, 1.4], solid: false, shadow: false },
    // I Minen-Insel: Laternen, Kisten
    { kind: 'skylamp', pos: [-27.6, 16, -110] }, { kind: 'crates6', pos: [-3, 16, -112] }, { kind: 'barrels', pos: [-27, 16, -131] },
    // K Zirkus-Gipfel: Luftballons, Trommeln
    { kind: 'balloons6', pos: [32.4, 20, -146], solid: false }, { kind: 'balloons6', pos: [59.6, 20, -146.4], solid: false },
    { kind: 'drum6', pos: [33, 20, -158], size: 1 }, { kind: 'drum6', pos: [59.2, 20, -170], size: 0.85, tone: 1 },
    // L Röhren-Insel
    { kind: 'skytree', pos: [86, 20, -151.6], size: 4 }, { kind: 'flowerbed', pos: [75, 20, -152], area: [3.6, 1.4], solid: false, shadow: false },
  ],

  segments: [
    { type: 'glasstube', from: [0, 10, 28], to: [0, 11, 12], width: 4 },
    { type: 'cloudbridge', from: [-22, 10, 32], to: [-34, 10.5, 32], width: 4 },
    { type: 'redbridge', from: [-26, 11, 0], to: [-40, 12.5, 0], width: 4 },
    { type: 'glasstube', from: [14, 11, -4], to: [26, 12, -4], width: 4 },
    { type: 'glasstube', from: [56, 12, -22], to: [64, 12.5, -22], width: 4 },
    { type: 'glasstube', from: [40, 12, -40], to: [40, 14, -54], width: 4 },
    { type: 'glasstube', from: [22, 14, -76], to: [8, 15, -76], width: 4 },
    { type: 'cloudbridge', from: [-26, 15, -80], to: [-40, 15, -80], width: 4 },
    { type: 'glasstube', from: [-12, 15, -96], to: [-12, 16, -108], width: 4 },
    { type: 'cloudbridge', from: [0, 16, -120], to: [10, 16.5, -120], width: 4 },
    { type: 'rainbowbridge', from: [46, 16.5, -128], to: [46, 20, -144], width: 4 },
    { type: 'glasstube', from: [62, 20, -160], to: [72, 20, -160], width: 4 },
  ],
};
