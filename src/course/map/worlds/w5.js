// Kurs-Weltkarte Welt 5 – „Lila Strand-Insel“ (Bauplan: Weltkarte & Weltstruktur, Welt 5; Vertrag: Welt 5 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eine Kette lila Sandinseln im türkisen Meer, verbunden durch weiße Holzstege. Weg (Bauplan-Reihenfolge): Ankunftsbucht
// mit der Glasröhre zurück nach Welt 4, Beerenhaus-Nische und dem Sonnenstrand (5-1, Strandkörbe, Wellen) → Steg nach
// Norden zur Zirkus-Insel mit dem Zirkuszelt (5-2) → westlich der Arena-Käfig mit fünf Rammbock-Bullen (5-A), östlich
// der Höhleneingang mit blauem Lavaschein (5-3, ab 90 Sternen) → Steg zur Savanne mit dem Savannenberg und der
// Röhrenkanone (5-4) → westlich das Geisterhaus-Diorama mit Krümel (5-Kapitän), östlich die Minen-Insel mit Loren (5-5)
// → von dort zu den Lava-Felsen mit den Feuer-Werfern (5-B) und durch eine Schlucht zur Torten-Insel (5-6) → Steg zur
// Schleich-Festung mit dem kreisenden Suchscheinwerfer (5-7) → westlich der Goldzug-Bahnhof mit Glückshaus (5-Zug),
// nördlich der Ruinen-Tempel mit dem Kippquader-König (5-Burg, ab 100 Sternen) → Röhren-Insel mit der Glasröhre nach
// Welt 6 (frei nach 5-Burg; „Bald“, solange es Welt 6 nicht gibt). Sternbedarf zählt alle Sterne.
//
// Bereiche (begehbar, Höhe):                 Eingänge:
//   A  Ankunftsbucht            y 1            W4         Glasröhre zurück          (−16, 1, 42)
//   N  Beerenhaus-Nische        y 1            5-1        Sonnenstrand              (14, 1, 37)
//   B  Zirkus-Insel             y 2            5-2        Zirkuszelt                (−4, 2, −4)
//   BA Arena-Insel              y 1.6          5-A        Arena-Käfig (Gruppe)      (−38, 1.6, −5)
//   BH Höhlen-Insel             y 2            5-3        Höhleneingang (ab 90 ★)   (35, 2, −6)
//   C  Savanne                  y 3.5          5-4        Savannenberg              (−6, 3.5, −50)
//   CG Spuk-Insel               y 3.5          5-Kapitän  Geisterhaus-Diorama       (−50, 3.5, −44)
//   D  Minen-Insel              y 4.5          5-5        Minen-Eingang             (30, 4.5, −57)
//   DL Lava-Felsen              y 2            5-B        Lava-Felsen (Gruppe)      (76, 2, −52)
//   E  Torten-Insel             y 5.5          5-6        Riesentorte               (46, 5.5, −102)
//   F  Schleich-Festung         y 6            5-7        Festung mit Suchscheinwerfer (−4, 6, −110)
//   G  Goldzug-Bahnhof          y 6            5-Zug      Bahnhof mit Goldzug       (−46, 6, −110)
//   H  Ruinen-Tempel            y 7            5-Burg     Stufenpyramide (ab 100 ★) (10, 7, −150)
//   I  Röhren-Insel             y 7            W6         Glasröhre (bald)          (54, 7, −158)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-5',
  world: 5,
  title: 'Lila Strand-Insel',
  short: 'Lila Strand',
  archetype: 'map',
  theme: 'map_lila',
  kit: 'lila',
  music: 'course_world5_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 5)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1, 46], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [14, 24, 108], look: [10, 5, -48], duration: 3.2 },
  edges: { hedge: 'violetrock', fence: 'rope' },
  pathColors: [0xfff2dc, 0xf6e2c2, 0xb88a6a],      // helle, warme Sandstein-Platten (heben sich vom Flieder ab)
  seaColors: [0x5ef2e2, 0x22c2dc, 0x1678c8],      // Türkis am Ufer, Tiefblau draußen
  birdStyle: 'gull',                               // Möwen statt Hackvögel
  // Kacheln wie Welt 4: 40 m (Ursprung so, dass die Inseln in wenige Kacheln fallen), Teile ohne Schattenwurf in 80 m
  batch: { tile: 48, origin: [-4, 4], freeTile: 128, freeOrigin: [-72, -72] },
  // Nachbarwelt am Horizont: Welt 4 (Canyon-Inseln) im Südwesten – dorthin führt die Rückweg-Röhre
  neighbors: [{ world: 4, pos: [-262, 112], size: [80, 54], style: 'canyon' }],
  birds: [{ c: [6, 12, 30], r: 8, n: 3 }, { c: [40, 13, -30], r: 9, n: 2 }, { c: [-20, 14, -100], r: 10, n: 2 }, { c: [60, 12, 30], r: 6, n: 2 }],

  levels: [
    { id: 'W4', world: 4, next: 4, label: 'Welt 4', stars: 0 },
    { id: '5-1', stars: 3, stamp: true },
    { id: '5-2', after: '5-1', stars: 3, stamp: true },
    { id: '5-3', after: '5-2', minStars: 90, stars: 3, stamp: true },
    { id: '5-A', after: '5-2', stars: 1 },
    { id: '5-4', after: '5-2', stars: 3, stamp: true },
    { id: '5-Kapitän', after: '5-4', stars: 5 },
    { id: '5-5', after: '5-4', stars: 3, stamp: true },
    { id: '5-B', after: '5-5', stars: 1 },
    { id: '5-6', after: '5-5', stars: 3, stamp: true },
    { id: '5-7', after: '5-6', stars: 3, stamp: true },
    { id: '5-Zug', after: '5-7', stars: 0 },
    { id: '5-Burg', after: '5-7', minStars: 100, stars: 3, stamp: true },
    { id: 'W6', after: '5-Burg', world: 6, next: 6, label: 'Welt 6', stars: 0 },
  ],

  ground: [
    // ---- A Ankunftsbucht, Beerenhaus-Nische, Strände, Klippen
    g(-24, 28, 22, 50, 1, { walk: W }),
    g(-36, 32, -24, 44, 1, { walk: W }),
    g(-46, 28, -36, 50, 3.2, { style: 'palmgrove' }),
    g(-36, 44, -24, 50, 1.8, { style: 'palmgrove', trees: 0.6 }),
    g(-36, 28, -24, 32, 4.6, { style: 'lilarock' }),
    g(-46, 50, 22, 57, 0.45, { style: 'lilabeach', noEdge: true }),
    g(22, 22, 46, 57, 0.6, { style: 'lilabeach', edge: 'driftwood', trees: 0 }),
    g(-46, 16, -2, 28, 5, { style: 'lilarock' }),
    g(-2, 16, 2, 28, 1, { walk: W }),
    g(2, 16, 22, 28, 3.2, { style: 'lilarock' }),
    // ---- B Zirkus-Insel, Arena-Insel (5-A), Höhlen-Insel (5-3) mit Felswand
    g(-14, -16, 14, 8, 2, { style: 'circus', walk: W, edge: 'tropic' }),
    g(-50, -18, -26, 8, 1.6, { style: 'arena', walk: W }),
    g(26, -14, 44, 6, 2, { style: 'cave', walk: W }),
    g(22, -30, 48, -14, 9.5, { style: 'lilarock' }),
    g(44, -14, 52, 4, 4.5, { style: 'lilarock' }),
    // ---- C Savanne mit Savannenberg, Spuk-Insel (5-Kapitän)
    g(-24, -64, 14, -28, 3.5, { style: 'savanna', walk: W }),
    g(-24, -86, 8, -64, 6.5, { style: 'savannahill', hill: { h: 5.5, at: [-9, -75], r: 11 } }),
    g(8, -88, 22, -64, 5.5, { style: 'lilarock' }),
    g(-62, -60, -38, -32, 3.5, { style: 'spook', walk: W }),
    g(-66, -70, -36, -60, 6, { style: 'spook', trees: 1.2 }),
    // ---- D Minen-Insel mit Felswand und Schlucht nach Norden, Lava-Felsen (5-B) im Lavasee
    g(24, -66, 50, -36, 4.5, { style: 'gravel', walk: W }),
    g(22, -82, 44, -66, 11, { style: 'lilarock' }),
    g(44, -82, 48, -66, 4.5, { style: 'gravel', walk: W }),
    g(48, -82, 56, -66, 8, { style: 'lilarock' }),
    g(56, -74, 96, -30, 0.25, { style: 'basin' }),
    g(64, -64, 88, -40, 2, { style: 'lavarock', walk: W }),
    g(96, -78, 100, -26, 1.1, { style: 'lavarock', noEdge: true }),
    g(56, -78, 96, -74, 1.1, { style: 'lavarock', noEdge: true }),
    g(56, -30, 96, -26, 0.9, { style: 'lavarock', noEdge: true }),
    g(52, -66, 56, -30, 1.0, { style: 'lavarock', noEdge: true }),
    // ---- E Torten-Insel
    g(28, -118, 64, -92, 5.5, { style: 'cake', walk: W, edge: 'cream' }),
    g(64, -114, 72, -96, 4, { style: 'cake' }),
    // ---- F Schleich-Festung, G Goldzug-Bahnhof
    g(-16, -124, 16, -94, 6, { style: 'fort', walk: W, edge: 'fortwall' }),
    g(-66, -126, -30, -96, 6, { style: 'paving', walk: W }),
    g(-66, -96, -30, -90, 3, { style: 'palmgrove', trees: 0.8 }),
    // ---- H Ruinen-Tempel, I Röhren-Insel
    g(-14, -170, 34, -138, 7, { style: 'temple', walk: W, edge: 'templewall' }),
    g(-24, -176, -14, -136, 9, { style: 'temple', trees: 1.2 }),
    g(46, -170, 62, -146, 7, { walk: W }),
    g(62, -172, 70, -142, 9.5, { style: 'lilarock' }),
  ],

  // Zusätzlich begehbar: Holzstege zwischen den Inseln
  walk: [
    [-2, 8, 2, 16],           // A → B
    [-26, -6, -14, -2],       // B → Arena
    [14, -6, 26, -2],         // B → Höhle
    [6, -28, 10, -16],        // B → C
    [-38, -48, -24, -44],     // C → Spuk-Insel
    [14, -50, 24, -46],       // C → D
    [50, -54, 64, -50],       // D → Lava-Felsen
    [44, -92, 48, -82],       // Schlucht → E
    [16, -108, 28, -104],     // E → F
    [-30, -112, -16, -108],   // F → G
    [8, -138, 12, -124],      // F → H
    [34, -160, 46, -156],     // H → I
  ],

  paths: [
    [[2, 47.5], [2, 38], [0, 34], [0, 16]],
    [[2, 43], [-10, 43], [-16, 44.6]],
    [[2, 39], [9, 38.8], [14, 39.6]],
    [[-10, 43], [-20, 41.2], [-30, 41.2]],
    [[0, 8], [0, 0], [-4, -1.4]],
    [[0, 0], [8, -3], [8, -16]],
    [[-4, -1.4], [-10, -4], [-14, -4]],
    [[8, -3], [10, -4], [14, -4]],
    [[-26, -4], [-28.5, -4]],
    [[26, -4], [32, -3.4], [35, -3.4]],
    [[8, -28], [8, -36], [0, -44], [-9, -53.9]],
    [[0, -44], [-14, -46], [-24, -46]],
    [[8, -36], [10, -48], [14, -48]],
    [[-38, -46], [-46, -42.4], [-50, -42.4]],
    [[24, -48], [30, -50], [30, -56.9]],
    [[30, -50], [40, -49], [46, -56], [46, -66]],
    [[46, -66], [46, -82]],
    [[40, -49], [46, -51], [50, -52]],
    [[46, -92], [46, -99.4]],
    [[46, -96], [36, -102], [34, -106], [28, -106]],
    [[16, -106], [6, -106], [-4, -109.9]],
    [[6, -106], [10, -112], [10, -124]],
    [[-4, -109.9], [-10, -110], [-16, -110]],
    [[-30, -110], [-40, -107.4], [-46, -107.4]],
    [[-40, -107.4], [-52, -101], [-60, -100.5]],
    [[10, -138], [10, -146.4]],
    [[10, -143], [24, -150], [30, -158], [34, -158]],
    [[46, -158], [54, -155.4]],
  ],

  entrances: [
    { id: 'W4', kind: 'pipe', pos: [-16, 1, 42], decor: [-16, 1, 38.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.8, 5.6, 0.2], [-5, 6.8, 0.8], [-16, 7.4, 2.5], [-40, 7, 7], [-80, 5.5, 14], [-140, 4, 26], [-205, 1.5, 40]], pipeDetail: 'low',
      arriveCam: { up: 6, ahead: 6, drop: 2.5 } },
    { id: '5-1', kind: 'seaside', pos: [14, 1, 37], decor: [31, 0.6, 38], waves: [{ x: 46, z0: 23, z1: 56, dir: 1 }] },
    { id: '5-2', kind: 'bigtop', pos: [-4, 2, -4], decor: [-4, 2, -11], trapeze: [-11.4, -9.5, 8] },
    { id: '5-A', kind: 'bullcage', pos: [-38, 1.6, -5], decor: [-38, 1.6, -5], exit: [-28.5, 1.6, -4],
      cage: [[-47.5, -15.5, -28.5, -15.5], [-47.5, 5.5, -28.5, 5.5], [-47.5, -15.5, -47.5, 5.5], [-28.5, -15.5, -28.5, -7.4], [-28.5, -0.6, -28.5, 5.5]],
      towers: [[-47.5, -15.5], [-28.5, -15.5], [-47.5, 5.5], [-28.5, 5.5]], gateAt: [-28.5, -4, 0] },
    { id: '5-3', kind: 'bluecave', pos: [35, 2, -6], decor: [35, 2, -14] },
    { id: '5-4', kind: 'savanna', pos: [-9, 3.5, -56.5], decor: [-9, 3.5, -56.5],
      cannon: [-9, 12, -75, 0.6], acacias: [[-17, 6.5, -69, 5.2], [0, 6.5, -67.5, 4.6], [-19.5, 6.5, -81, 4.8], [2.5, 6.5, -82, 5.4], [-13, 3.5, -33, 4.4], [10.5, 3.5, -60, 4.6],
        [-19.5, 3.5, -49, 4.8], [-2, 3.5, -32.5, 4.0]],
      termites: [[-20.5, 3.5, -40, 1.0], [11, 3.5, -38.5, 0.8], [-21, 3.5, -60.5, 1.1], [1, 3.5, -61, 0.8]], bunnies: [[-12, -38, 3.2], [4, -54, 3.4], [-17, -55, 2.6]] },
    { id: '5-Kapitän', kind: 'ghostdiorama', pos: [-50, 3.5, -45], decor: [-50, 3.5, -52], kruemel: [-45.4, 3.5, -47.8], disc: '5-K' },
    { id: '5-5', kind: 'mine', pos: [30, 4.5, -59.5], decor: [30, 4.5, -66], rail: { x: 38.5, z0: -66, z1: -54 } },
    { id: '5-B', kind: 'lavarocks', pos: [76, 2, -52], decor: [76, 2, -52], exit: [66.4, 2, -52],
      pillars: [[60.5, -42, 2.6], [92, -38, 3.0], [92, -66, 2.4], [60.5, -68, 2.8]], tower: [82.5, -58.5], braziers: [[66, -55.6], [66, -48.4]], lavaRing: 14 },
    { id: '5-6', kind: 'cakeisle', pos: [46, 5.5, -102], decor: [46, 5.5, -110.5], flipper: [35, -98.5, 3, 1.6] },
    { id: '5-7', kind: 'sneakfort', pos: [-4, 6, -112.5], decor: [-4, 6, -120.5], lamp: [-11.2, 15.8, -120.3], sweep: [-3, -107, 5.5] },
    { id: '5-Zug', kind: 'goldstation', pos: [-46, 6, -110], decor: [-46, 6, -120], rail: { z: -121, x0: -65, x1: -31, train: -44 } },
    { id: '5-Burg', kind: 'kipptemple', pos: [10, 7, -149], decor: [10, 7, -159.5], labelY: 2.8 },
    { id: 'W6', kind: 'pipe', pos: [54, 7, -158], decor: [54, 7, -161.1],
      pipe: [[0, 0, 0], [0, 3.5, 0], [0.8, 5.6, -0.3], [5, 8, -1.5], [16, 11, -5], [40, 16, -12], [80, 22, -24], [140, 30, -40], [205, 38, -56]], pipeDetail: 'low',
      arriveCam: { up: 7.5, ahead: 4, drop: 3.5 } },
  ],

  gates: [
    { for: '5-2', at: [0, 22], axis: 'z' },
    { for: '5-A', at: [-20, -4], axis: 'x' },
    { for: '5-3', at: [20, -4], axis: 'x' },
    { for: '5-4', at: [8, -22], axis: 'z' },
    { for: '5-Kapitän', at: [-31, -46], axis: 'x' },
    { for: '5-5', at: [19, -48], axis: 'x' },
    { for: '5-B', at: [57, -52], axis: 'x' },
    { for: '5-6', at: [46, -74], axis: 'z' },
    { for: '5-7', at: [22, -106], axis: 'x' },
    { for: '5-Zug', at: [-23, -110], axis: 'x' },
    { for: '5-Burg', at: [10, -131], axis: 'z' },
    { for: 'W6', at: [40, -158], axis: 'x' },
  ],

  // Wandernde Gegnergruppen: fünf Rammbock-Bullen stürmen im Arena-Käfig im Kreis, drei Feuer-Werfer tänzeln über
  // die Lava-Felsen (als Instanzen gezeichnet)
  roamers: [
    { level: '5-A', model: 'rammbock_bulle', count: 5, circle: [-38, -5, 5.6], y: 1.6, speed: 2.2,
      half: [0.55, 0.8, 0.55], castShadow: false, instance: true, hint: 'Lauf die Rammbock-Bullen an!' },
    { level: '5-B', model: 'feuer_werfer', count: 3, circle: [76, -52, 4.6], y: 2, speed: 1.5,
      half: [0.5, 0.8, 0.5], castShadow: false, instance: true, hint: 'Lauf die Feuer-Werfer an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [-30, 1, 35.4], yaw: -PI / 2, item: [-30, 1, 40], items: ['funken', 'krallen'] },
    { kind: 'glueck', pos: [-60, 6, -108], yaw: -PI / 2, machine: [-60, 6, -103.2], pad: [-60, 6, -100.5], stake: 10 },
  ],

  signs: [
    { pos: [6, 1, 47.6], yaw: -0.15, text: 'Welt 5\nLila Strand' },
    { pos: [-25.6, 1, 45.6], yaw: 0.35, text: 'Beerenhaus' },
    { pos: [-55.2, 6, -98.4], yaw: -0.2, text: 'Glückshaus' },
    // Sternschranken: Schilder mit dem Sternbedarf vor den Eingängen
    { pos: [30.4, 2, -0.6], yaw: 0.3, text: 'ab 90 ★' },
    { pos: [5.2, 7, -145.6], yaw: 0.3, text: 'ab 100 ★' },
  ],

  props: [
    // A Ankunftsbucht: Palmen, Lavendel, Hibiskus, Tiki-Fackeln am Steg, Rettungsring, Sandburg am Weg
    { kind: 'palm5', pos: [-21, 1, 30.4], size: 5.4 }, { kind: 'palm5', pos: [19.4, 1, 30.6], size: 5 }, { kind: 'palm5', pos: [-9, 1, 30.2], size: 4.6 },
    { kind: 'palm5', pos: [-33.4, 1, 42], size: 4.4 },
    { kind: 'hibiscus', pos: [-4.6, 1, 29.6], size: 0.7 }, { kind: 'hibiscus', pos: [4.8, 1, 29.8], size: 0.65 },
    { kind: 'lavender', pos: [-14, 1, 30], size: 0.6 }, { kind: 'lavender', pos: [11.6, 1, 30], size: 0.55 }, { kind: 'lavender', pos: [-22, 1, 47.6], size: 0.6 },
    { kind: 'tiki', pos: [-3.2, 1, 27.4] }, { kind: 'tiki', pos: [3.2, 1, 27.4] },
    { kind: 'lifebuoy', pos: [20.6, 1, 46.6] }, { kind: 'sandcastle', pos: [-6.6, 1, 47.4], size: 0.8 },
    { kind: 'shells5', pos: [-12, 1, 47.2], area: [6, 2.4], n: 6, solid: false, shadow: false },
    { kind: 'shells5', pos: [-10, 0.45, 53.6], area: [20, 3], n: 12, solid: false, shadow: false },
    { kind: 'towel', pos: [-26, 0.45, 53.2], yaw: 0.3, color: 0xb46ae8, solid: false, shadow: false },
    { kind: 'surfboard', pos: [-30, 0.45, 52.4], yaw: 0.6, color: 0x3ac8e8, solid: false },
    { kind: 'parasol', pos: [-14, 1, 44.6], color: 0xff7a5a, tone: 'rot' }, { kind: 'towel', pos: [-13, 1, 45.4], yaw: 0.2, color: 0x3ac8e8, solid: false, shadow: false },
    { kind: 'beachchair', pos: [-19.4, 1, 33.2], yaw: 0.5, color: 0x2ab8d8 }, { kind: 'violetrock', pos: [17.6, 1, 48], size: 0.6 },
    { kind: 'shells5', pos: [8, 1, 31], area: [6, 2], n: 5, solid: false, shadow: false },
    // Meer ringsum: Leuchtturm, Segelboote, violette Felsen
    { kind: 'lighthouse', pos: [62, 0, 6], size: 8, solid: false },
    { kind: 'sailboat', pos: [56, 0, 42], yaw: 0.4, solid: false }, { kind: 'sailboat', pos: [-62, 0, 8], yaw: -0.6, color: 0xff7ab4, solid: false },
    { kind: 'sailboat', pos: [84, 0, -100], yaw: 1.2, color: 0x3ac8e8, solid: false }, { kind: 'sailboat', pos: [-74, 0, -130], yaw: 0.2, solid: false },
    { kind: 'violetrock', pos: [-16, 0, 12], size: 2.2, solid: false }, { kind: 'violetrock', pos: [24, 0, 12], size: 1.8, solid: false },
    { kind: 'violetrock', pos: [-58, 0, -22], size: 2.4, solid: false }, { kind: 'violetrock', pos: [-30, 0, -98], size: 2.0, solid: false },
    { kind: 'violetrock', pos: [76, 0, -120], size: 2.6, solid: false }, { kind: 'violetrock', pos: [38, 0, -136], size: 2.2, solid: false },
    // B Zirkus-Insel
    { kind: 'lavender', pos: [12, 2, 6], size: 0.55 }, { kind: 'hibiscus', pos: [-12.4, 2, 6.2], size: 0.6 },
    { kind: 'drum', pos: [11.6, 2, -9], size: 1 }, { kind: 'drum', pos: [12.4, 2, -12.6], size: 0.8, color: 0x2a6ae8 },
    { kind: 'balloons', pos: [9.8, 2, 3.6], solid: false }, { kind: 'balloons', pos: [-11.6, 2, 3.2], solid: false },
    // Arena-Insel: Palmen außen
    { kind: 'palm5', pos: [-48.4, 1.6, 6.6], size: 4.6 }, { kind: 'palm5', pos: [-48.6, 1.6, -16.6], size: 4.2 },
    // Höhlen-Insel: Kristalle sind Kulisse; Felsen
    { kind: 'violetrock', pos: [42.4, 2, 4.4], size: 0.9 },
    // C Savanne: Grasbüschel
    { kind: 'grasstuft', pos: [-18, 3.5, -46], solid: false }, { kind: 'grasstuft', pos: [4, 3.5, -31.4], solid: false },
    { kind: 'grasstuft', pos: [-2, 3.5, -61], solid: false }, { kind: 'grasstuft', pos: [12, 3.5, -46], solid: false },
    { kind: 'pond5', pos: [3.6, 3.5, -40.4], size: 2.4 }, { kind: 'grasstuft', pos: [-16, 3.5, -36], solid: false }, { kind: 'grasstuft', pos: [-21, 3.5, -54], solid: false },
    // Spuk-Insel: Grabsteine, kahle Bäume
    { kind: 'tomb5', pos: [-59.6, 3.5, -40], solid: true }, { kind: 'tomb5', pos: [-41, 3.5, -34.6] }, { kind: 'tomb5', pos: [-60, 3.5, -54] },
    { kind: 'deadtree', pos: [-59.4, 3.5, -34.6], size: 4.4 }, { kind: 'deadtree', pos: [-40.4, 3.5, -57.6], size: 3.8 },
    // D Minen-Insel: Felsen, Fackeln
    { kind: 'violetrock', pos: [25.6, 4.5, -38], size: 0.9 }, { kind: 'tiki', pos: [43, 4.5, -64.6] }, { kind: 'tiki', pos: [49, 4.5, -64.6] },
    { kind: 'crates', pos: [26.6, 4.5, -41.4] }, { kind: 'violetrock', pos: [48.2, 4.5, -38.6], size: 0.7 },
    // E Torten-Insel: Zuckerstangen, Cupcakes, Kirschen am Rand
    { kind: 'candycane', pos: [29.6, 5.5, -93.6], size: 2.2 }, { kind: 'cupcake', pos: [62, 5.5, -94], size: 0.9 },
    { kind: 'cherry5', pos: [61.6, 5.5, -116], size: 0.8 }, { kind: 'cupcake', pos: [30, 5.5, -116.4], size: 1.0, color: 0xc8a0ff },
    { kind: 'donut', pos: [58, 5.5, -104], size: 1.1 }, { kind: 'balloons', pos: [57.4, 5.5, -95.8], solid: false },
    // F Schleich-Festung: Fackeln an den Ecken, Kisten
    { kind: 'tiki', pos: [-14.4, 6, -95.6] }, { kind: 'tiki', pos: [14.4, 6, -95.6] }, { kind: 'crates', pos: [13.6, 6, -118.4] },
    // G Bahnhof: Palmen, Lavendel
    { kind: 'palm5', pos: [-64.4, 6, -97.6], size: 4.8 }, { kind: 'lavender', pos: [-32, 6, -97.8], size: 0.6 },
    { kind: 'bench5', pos: [-38, 6, -98.6] }, { kind: 'lamppost5', pos: [-34.4, 6, -100.2] }, { kind: 'lamppost5', pos: [-54.6, 6, -113.6] },
    { kind: 'luggage', pos: [-36.6, 6, -113.8] },
    // H Tempel: Säulenreste, Obelisk
    { kind: 'templecolumn', pos: [-11.6, 7, -140.4], size: 4 }, { kind: 'templecolumn', pos: [31.6, 7, -140.4], size: 2.6, broken: true },
    { kind: 'templecolumn', pos: [-11.6, 7, -168], size: 2.2, broken: true }, { kind: 'obelisk5', pos: [31.4, 7, -167.4], size: 5 },
    { kind: 'jungletree', pos: [-9.6, 7, -157.6], size: 4.6 }, { kind: 'jungletree', pos: [29.6, 7, -163.4], size: 4.4 }, { kind: 'stonehead', pos: [-6.4, 7, -141.6], size: 0.8, yaw: 0.4 },
    // I Röhren-Insel
    { kind: 'palm5', pos: [60, 7, -147.6], size: 4.6 }, { kind: 'lavender', pos: [47.6, 7, -168], size: 0.6 },
    // Wolkeninseln über dem Ende der Welt-6-Röhre (Ausblick auf die Wolkeninseln)
    { kind: 'cloud5', pos: [252, 34, -228], size: 9, solid: false, shadow: false }, { kind: 'cloud5', pos: [282, 42, -206], size: 7, solid: false, shadow: false },
    { kind: 'cloud5', pos: [230, 26, -246], size: 6, solid: false, shadow: false },
  ],

  segments: [
    { type: 'boardwalk', from: [0, 1, 16], to: [0, 2, 8], width: 4 },
    { type: 'boardwalk', from: [-14, 2, -4], to: [-26, 1.6, -4], width: 4 },
    { type: 'boardwalk', from: [14, 2, -4], to: [26, 2, -4], width: 4 },
    { type: 'boardwalk', from: [8, 2, -16], to: [8, 3.5, -28], width: 4 },
    { type: 'boardwalk', from: [-24, 3.5, -46], to: [-38, 3.5, -46], width: 4 },
    { type: 'boardwalk', from: [14, 3.5, -48], to: [24, 4.5, -48], width: 4 },
    { type: 'boardwalk', from: [50, 4.5, -52], to: [64, 2, -52], width: 4 },
    { type: 'boardwalk', from: [46, 4.5, -82], to: [46, 5.5, -92], width: 4 },
    { type: 'boardwalk', from: [28, 5.5, -106], to: [16, 6, -106], width: 4 },
    { type: 'boardwalk', from: [-16, 6, -110], to: [-30, 6, -110], width: 4 },
    { type: 'boardwalk', from: [10, 6, -124], to: [10, 7, -138], width: 4 },
    { type: 'boardwalk', from: [34, 7, -158], to: [46, 7, -158], width: 4 },
    // Lavasee um die Lava-Felsen
    { type: 'lava', pos: [76, 0.25, -52], size: [40, 0.35, 44] },
  ],
};
