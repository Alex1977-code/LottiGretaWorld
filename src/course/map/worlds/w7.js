// Kurs-Weltkarte Welt 7 – „Lava-Festung“ (Bauplan: Weltkarte & Weltstruktur, Welt 7; Vertrag: Welt 7 – Level-Liste
// und Freischaltung). Format: docs/KURS-ARCHITEKTUR.md, „Präzisierung (Weltkarte)“ und „Präzisierung
// (Mehrwelten-Karte)“. Koordinaten in Metern, Y oben, Kamera blickt von Süden nach Norden (−Z).
//
// Eine dunkle Vulkaninsel im Abendmeer (eigene Gestaltung, kindgerecht: warmes Abendlicht, leuchtende Lava, Spielzeug-
// Festungen): rote und blaue Lavaflüsse und -seen trennen die Bereiche, Basaltbrücken, Kettenstege, ein Damm aus
// Basaltsäulen und eine Zugbrücke verbinden sie; Festungsmauern mit Brummbär-Fahnen, glühende Risse, Rauchfahnen,
// Lava-Fontänen im Takt der Kartenmusik, Knochenflieger kreisen; im Hintergrund der große Vulkan, davor die Lava-Burg.
// Weg (Vertrag): Ankunftsbucht mit der Glasröhre zurück nach Welt 6, Beerenhaus und der Werfer-Festung in der blauen
// Lava (7-1) → nördlich über den Lavafluss zum Tempel-Eingang im Fels (7-2), westlich am Rand die Felsfläche im Lavasee
// (7-A) → vom Tempel östlich die Rennbahn über dem Lavafeld (7-3), westlich die blaue Lava mit Zylindern (7-4) → von dort
// der Käfig mit Glasröhren am Westrand (7-B) und der Turm im Lavasee (7-5) → daneben das Maschinen-Diorama mit Krümel
// (7-Kapitän) und das Vulkan-Riff an der Lagune (7-6) mit Glückshaus → von dort die Werfer-Halle am Ostrand (7-C) und
// über den Basaltdamm der Vulkankrater (7-7) → Zugbrücke zur Lava-Burg (7-Burg, ab 150 Sternen) → Glasröhre zur
// Röhren-Insel mit der Glasröhre nach Welt 8 (frei nach 7-Burg; „Welt 8 kommt bald!“). Sternbedarf zählt alle Sterne.
//
// Bereiche (begehbar, Höhe):                 Eingänge (kind):
//   A  Ankunftsbucht            y 1.5          W6         pipe            Glasröhre zurück          (−16, 1.5, 45)
//                                              7-1        bluefort        Werfer-Festung, blaue Lava (16, 1.5, 44)
//   AA Felsfläche im Lavasee    y 1.2          7-A        rockarena       Lava-Felsfläche (Gruppe)   (−48, 1.2, 24)
//   B  Tempelplatz              y 3            7-2        templerock      Tempel-Eingang im Fels     (0, 3, 2.4)
//   C  Startplatz der Rennbahn  y 4            7-3        lavarace        Rennbahn über Lava         (43, 4, −2)
//   D  Blaue-Lava-Ufer          y 3.5          7-4        bluecylinders   blaue Lava mit Zylindern   (−40, 3.5, −4)
//   DB Käfig-Insel              y 3.5          7-B        bluecage        Käfig mit Glasröhren (Gr.) (−77, 3.5, −4)
//   E  Turm-Ufer                y 5            7-5        lavatower       Turm im Lavasee            (−41, 5, −40.5)
//   EK Diorama-Insel            y 5            7-Kapitän  machinediorama  Maschinen-Diorama, Krümel  (−68, 5, −36)
//   F  Riff-Ufer                y 3            7-6        reeflagoon      Vulkan-Riff an der Lagune  (−13, 3, −45)
//   FC Hallen-Insel             y 5            7-C        werferhall      Werfer-Halle (Gruppe)      (29, 5, −44)
//   G  Kraterrand               y 7            7-7        crater          Vulkankrater               (−7, 7, −96.5)
//   H  Burghof                  y 8.5          7-Burg     lavakeep        Lava-Burg (ab 150 ★)       (37, 8.5, −108)
//   I  Röhren-Insel             y 8.5          W8         pipe            Glasröhre (bald)           (70, 8.5, −110)

const PI = Math.PI;
const g = (x0, z0, x1, z1, top, opts = {}) => ({ rect: [x0, z0, x1, z1], top, ...opts });
const W = true;

export const MAP = {
  id: 'karte-7',
  world: 7,
  title: 'Lava-Festung',
  short: 'Lava-Festung',
  archetype: 'map',
  theme: 'map_lava',
  kit: 'lava',
  music: 'course_world7_map',
  fallbackMusic: 'course_map',
  starScope: 'all',              // Sternbedarf zählt alle gesammelten Sterne (Vertrag Welt 7)
  base: -3,
  sea: 0,
  spawn: { pos: [2, 1.5, 47], yaw: PI / 2 },
  camera: [{ from: 200, to: -300, pitch: 50, dist: 16, fov: 40, ahead: 3.6, lead: 0.7, height: 1.0 }],
  intro: { from: [8, 30, 116], look: [4, 9, -64], duration: 3.2 },
  edges: { hedge: 'basaltwall', fence: 'battlement' },
  pathColors: [0xf0cfa0, 0xe2b886, 0x9a5e44],      // warme Tuffstein-Platten (gut lesbar auf dunklem Grund)
  seaColors: [0x3fb2b8, 0x23709e, 0x1c3a76],      // Abendmeer: türkis am Ufer, draußen tiefes Blau
  // Kacheln: je Insel eine Zone (Mesh je Material/Schattenwurf), außerhalb 48-m-Raster
  batch: { tile: 48, origin: [-8, 4], freeTile: 96, freeOrigin: [-56, -56], zones: [
    [-30, 8, 50, 60, 'sued'], [-72, 6, -22, 44, 'felsarena'], [-26, -24, 24, 8, 'tempel'], [24, -30, 74, 28, 'rennbahn'], [-92, -32, -24, 6, 'west'],
    [-78, -86, -24, -32, 'turm'], [-24, -80, 42, -32, 'riff'], [-28, -128, 12, -80, 'krater'], [12, -148, 82, -84, 'burg'],
  ] },
  // Nachbarwelten am Horizont: Welt 6 (Wolkeninseln) hoch im Südwesten – dorthin führt die Rückweg-Röhre; im Nordosten
  // das dunkle Land mit Riesenrad und Turm (Welt 8, Ziel der Röhre W8)
  neighbors: [{ world: 6, pos: [-250, 150], size: [90, 60], style: 'sky' }, { world: 8, pos: [262, -272], size: [90, 60], style: 'erzpark' }],
  birds: [],
  // Knochenflieger kreisen über der Insel (LavaLife, lava7.js): Mitte, Radius, Anzahl, Tempo
  boneflyers: [{ c: [-30, 15, 26], r: 12, n: 2, speed: 0.32 }, { c: [-40, 17, -22], r: 13, n: 3, speed: -0.28 }, { c: [10, 20, -96], r: 14, n: 2, speed: 0.3 },
    { c: [44, 24, -118], r: 10, n: 2, speed: -0.34 }],
  // Lava-Fontänen: [x, y (Lava-Oberfläche), z, Höhe, Farbe] – sprühen abwechselnd je Zählzeit der Kartenmusik
  fountains: [[-8, 0.7, 22, 4.5, 'rot'], [12, 0.7, 24, 4, 'rot'], [-50, 0.7, 40, 5, 'rot'], [-64, 0.7, 12, 4.5, 'rot'], [36, 0.7, 50, 3.6, 'blau'], [42, 0.7, 31, 4, 'blau'],
    [30, 0.7, 18, 4.5, 'rot'], [62, 0.7, -22, 5, 'rot'], [-58, 0.7, -24, 4.4, 'blau'], [-30, 0.7, -26, 4, 'blau'], [-66, 0.7, -60, 5, 'rot'], [-30, 0.7, -76, 4.6, 'rot'],
    [20, 0.7, -140, 5, 'rot'], [56, 0.7, -138, 4.6, 'rot'], [-4.8, 8.25, -106.8, 3.2, 'rot'], [-9.4, 8.25, -108.6, 2.8, 'rot']],
  // Platschfische springen im Bogen aus der Lava: [x, y (Lava), z, Weite, Richtung]
  fishjumps: [[-62, 0.7, 26, 4, 0.5], [-34, 0.7, 12, 3.6, 2.2], [60, 0.7, 4, 4, 1.2], [56, 0.7, -18, 4.4, -0.4], [30, 0.7, -136, 4, 0.2], [57, 0.7, -100, 3.6, 1.6],
    [-56, 0.7, -72, 4, 0.8], [8, 0.7, 20, 3.6, 0], [-7, 8.25, -107, 2.4, 0.4]],
  // Seilbahn vom Turm-Ufer hinauf zur Turmspitze (7-5; Masten, Seil, pendelnde Gondel – decor_w4.buildCableway)
  cableways: [{ from: [-33.6, 5, -42.6], to: [-39.4, 15.6, -51.6], hFrom: 5.5, hTo: 2.6, sag: 0.9, period: 14 }],
  // Lavafälle: at [x, z] (Mitte), w Breite, top/bottom, face S|E|W|N, Farbe
  lavafalls: [
    { at: [24, -14], w: 2.4, top: 10.6, bottom: 0.7, face: 'E', color: 'rot' },
    { at: [-24, -16], w: 2.2, top: 10.6, bottom: 0.7, face: 'W', color: 'blau' },
    { at: [22, -118], w: 2.4, top: 8.3, bottom: 0.7, face: 'W', color: 'rot' },
    { at: [52, -124], w: 2.4, top: 8.3, bottom: 0.7, face: 'E', color: 'rot' },
  ],
  // Rauchfahnen: [x, y, z, Stärke]
  smoke: [[-60, 2, 36, 1], [44, 1, 8, 0.9], [-5, 15, -108, 1.4], [-60, 0.6, -70, 0.9], [8, 3, -64, 1.0], [34, 22, -126, 0.9], [-70, 0.6, -82, 1.1], [26, 0.6, 52, 0.8]],
  // Brummbär-Fahnen auf den Festungsmauern: [x, y (Fuß), z, Masthöhe]
  flags: [[10.4, 1.5, 31.4, 4.2], [-21.4, 1.5, 51.2, 3.6], [-39, 1.2, 15.4, 3.8], [-13.4, 3, 13.4, 3.6], [13.4, 3, 13.4, 3.6], [51.4, 4, -9.6, 3.8],
    [-30.6, 3.5, 5.4, 3.4], [-31, 5, -43.4, 3.6], [-60.6, 5, -45.4, 3.4], [11.4, 7, -99.4, 3.8], [51.4, 8.5, -93, 4.4], [77.4, 8.5, -121.4, 3.6],
    [27.2, 8.2, 27.8, 2.8]],
  // Fackeln (Ständer mit Flamme): [x, y, z, Farbe]
  torches: [[-3.4, 1.5, 30.8, 'rot'], [3.4, 1.5, 30.8, 'rot'], [-3.4, 3, 13.2, 'rot'], [3.4, 3, 13.2, 'rot'], [-20.8, 1.5, 35.4, 'rot'],
    [-31, 3.5, 2.8, 'blau'], [-31, 3.5, -2.8, 'blau'], [-37.4, 5, -30.6, 'rot'], [-42.6, 5, -30.6, 'rot'], [-19, 3, -34.6, 'rot'], [-19, 3, -41.4, 'rot'],
    [-8.4, 3, -49.4, 'rot'], [-3.6, 3, -49.4, 'rot'], [-9.4, 7, -82.6, 'rot'], [-2.6, 7, -82.6, 'rot'], [62.6, 8.5, -108.4, 'rot']],

  levels: [
    { id: 'W6', world: 6, next: 6, label: 'Welt 6', stars: 0 },
    { id: '7-1', stars: 3, stamp: true },
    { id: '7-2', after: '7-1', stars: 3, stamp: true },
    { id: '7-A', after: '7-1', stars: 1 },
    { id: '7-3', after: '7-2', stars: 3, stamp: true },
    { id: '7-4', after: '7-2', stars: 3, stamp: true },
    { id: '7-B', after: '7-4', stars: 1 },
    { id: '7-5', after: '7-4', stars: 3, stamp: true },
    { id: '7-Kapitän', after: '7-5', stars: 5 },
    { id: '7-6', after: '7-5', stars: 3, stamp: true },
    { id: '7-C', after: '7-6', stars: 1 },
    { id: '7-7', after: '7-6', stars: 3, stamp: true },
    { id: '7-Burg', after: '7-7', minStars: 150, stars: 3, stamp: true },
    { id: 'W8', after: '7-Burg', world: 8, next: 8, label: 'Welt 8', stars: 0 },
  ],

  ground: [
    // ---- A Ankunftsbucht (im Nordosten greift die blaue Lava mit der Werfer-Festung in die Bucht), schwarzer Strand,
    //      Felsschulter im Südwesten
    g(-22, 40, 22, 52, 1.5, { walk: W }),
    g(-22, 30, 12, 40, 1.5, { walk: W }),
    g(-30, 52, 22, 57, 0.45, { style: 'blacksand', noEdge: true }),
    g(-30, 42, -22, 52, 2.2, { style: 'rock' }),
    // ---- roter Lavafluss zwischen Bucht und Tempel (fließt nach Osten ins Lavafeld der Rennbahn)
    g(-26, 14, 24, 30, 0.4, { style: 'basin', flow: [1, 0] }),
    // ---- AA Lavasee im Westen mit der Felsfläche (7-A)
    g(-70, 8, -26, 42, 0.4, { style: 'basin', flow: [1, -0.4] }),
    g(-58, 14, -38, 34, 1.2, { style: 'arena', walk: W }),
    // ---- blaue Lava mit der Werfer-Festung (7-1)
    g(12, 30, 46, 40, 0.4, { style: 'bluebasin', flow: [1, 0.3] }),
    g(22, 40, 46, 54, 0.4, { style: 'bluebasin', flow: [0.3, 1] }),
    // ---- B Tempelplatz vor der Felswand mit Basaltsäulen, Felsschultern
    g(-14, -6, 14, 14, 3, { style: 'temple', walk: W }),
    g(-24, -22, 24, -6, 11, { style: 'cliff' }),
    g(-26, -12, -14, 14, 2.2, { style: 'rock' }),
    g(14, -6, 24, 14, 2.2, { style: 'rock' }),
    // ---- C Lavafeld mit dem Startplatz der Rennbahn (7-3)
    g(24, -30, 72, 30, 0.4, { style: 'basin', flow: [0.2, 1] }),
    g(34, -10, 52, 6, 4, { style: 'track', walk: W }),
    // ---- D Blaue-Lava-Ufer (7-4), blaue Lava im Westen und Norden, Felsstreifen zum Lavasee
    g(-50, -12, -30, 6, 3.5, { style: 'bluerock', walk: W }),
    g(-70, 6, -26, 8, 2, { style: 'rock', noDeco: true }),
    g(-66, -12, -50, 6, 0.4, { style: 'bluebasin', flow: [-1, 0] }),
    g(-74, -30, -24, -12, 0.4, { style: 'bluebasin', flow: [-1, -0.3] }),
    // ---- DB Käfig-Insel (7-B)
    g(-88, -14, -66, 6, 3.5, { style: 'fort', walk: W }),
    // ---- E Turm-Ufer (7-5) am roten Lavasee, EK Diorama-Insel (7-Kapitän)
    g(-52, -44, -30, -30, 5, { walk: W }),
    g(-74, -84, -24, -44, 0.4, { style: 'basin', flow: [0.4, -1] }),
    g(-76, -46, -60, -30, 5, { style: 'fort', walk: W }),
    // ---- F Riff-Ufer (7-6) an der Lagune, Felsrücken im Süden und Westen
    g(-20, -50, 8, -34, 3, { style: 'blacksand', walk: W }),
    g(-24, -34, 24, -22, 3.5, { style: 'rock' }),
    g(-24, -84, -20, -44, 3, { style: 'rock', noDeco: true }),
    g(-20, -76, 22, -50, 1.0, { style: 'lagoon' }),
    // ---- FC Hallen-Insel (7-C)
    g(18, -54, 40, -34, 5, { style: 'fort', walk: W }),
    // ---- G Kraterrand (7-7) mit dem Vulkankegel dahinter, Felsband zur Lagune
    g(-26, -100, 12, -82, 7, { style: 'crater', walk: W }),
    g(-26, -82, 22, -76, 2, { style: 'rock', noDeco: true }),
    g(-26, -128, 12, -100, 7.5, { style: 'crater', noEdge: true, noDeco: true }),
    // ---- H Burghof (7-Burg) im Lavagraben, I Röhren-Insel (W8)
    g(12, -146, 60, -86, 0.4, { style: 'basin', flow: [1, 0.2] }),
    g(22, -130, 52, -92, 8.5, { style: 'castle', walk: W }),
    g(62, -122, 78, -102, 8.5, { walk: W }),
  ],

  // Zusätzlich begehbar: Brücken, Stege, Damm
  walk: [
    [-38, 30, -22, 34],       // A → Felsfläche (Basaltbrücke)
    [-2, 14, 2, 30],          // A → B (Basaltbrücke über den Lavafluss)
    [14, -2, 34, 2],          // B → Rennbahn (Basaltbrücke)
    [-30, -2, -14, 2],        // B → blaue Lava (Basaltbrücke)
    [-66, -6, -50, -2],       // D → Käfig (Kettensteg)
    [-42, -30, -38, -12],     // D → Turm-Ufer (Kettensteg)
    [-60, -40, -52, -36],     // E → Diorama (Basaltbrücke)
    [-30, -40, -20, -36],     // E → Riff (Basaltbrücke)
    [8, -38, 18, -34],        // F → Halle (Kettensteg)
    [-8, -82, -4, -50],       // F → Krater (Basaltdamm über die Lagune)
    [12, -98, 22, -94],       // G → Burg (Zugbrücke)
    [52, -114, 62, -110],     // H → Röhren-Insel (Glasröhre)
  ],

  paths: [
    [[2, 48.5], [2, 40], [0, 36], [0, 30]],
    [[2, 45], [-8, 45.4], [-16, 47.6]],
    [[2, 44], [9, 44.2], [13.6, 44.2]],
    [[0, 33], [-12, 32], [-22, 32]],
    [[-38, 32], [-42, 29], [-46, 26.4]],
    [[0, 14], [0, 4]],
    [[0, 9], [-8, 3], [-14, 0]],
    [[0, 9], [8, 3], [14, 0]],
    [[34, 0], [40, 0.6], [43, 0.6]],
    [[-30, 0], [-38, -1.4], [-40, -1.4]],
    [[-40, -6], [-40, -12]],
    [[-50, -4], [-66, -4], [-68.6, -4]],
    [[-40, -30], [-40, -36], [-41, -38.4]],
    [[-40, -36], [-46, -37], [-52, -38]],
    [[-60, -38], [-65.4, -37.4]],
    [[-40, -36], [-34, -37], [-30, -38]],
    [[-20, -38], [-14, -41], [-13, -42.4]],
    [[-14, -41], [-6, -44], [-6, -50]],
    [[-6, -44], [2, -40], [3, -39.6]],
    [[2, -40], [8, -36]],
    [[18, -36], [22, -40], [22, -44], [26.4, -44]],
    [[-6, -82], [-6, -89], [-7, -93.9]],
    [[-6, -86], [4, -92], [12, -96]],
    [[22, -96], [30, -100], [37, -105.4]],
    [[30, -100], [44, -104], [50, -112], [52, -112]],
    [[62, -112], [68, -109], [70, -107.4]],
  ],

  entrances: [
    { id: 'W6', kind: 'pipe', pos: [-16, 1.5, 45], decor: [-16, 1.5, 41.9],
      pipe: [[0, 0, 0], [0, 3.5, 0], [-0.7, 5.8, 0.5], [-5, 7.6, 2.6], [-16, 9, 7], [-40, 12, 15], [-80, 16, 28], [-150, 22, 52]], pipeDetail: 'low',
      arriveCam: { up: 6, ahead: 6, drop: 2.5 }, signPos: [2.6, 0, 0.8], departAlong: true },
    { id: '7-1', kind: 'bluefort', pos: [16, 1.5, 44], decor: [25, 0.4, 32] },
    { id: '7-A', kind: 'rockarena', pos: [-48, 1.2, 24], decor: [-48, 1.2, 24], exit: [-39.6, 1.2, 32],
      spikes: [[-55.6, 16.6, 3.2], [-40.4, 16.4, 2.6], [-55.8, 31.6, 2.4]], braziers: [[-40.6, 19], [-55.4, 23]] },
    { id: '7-2', kind: 'templerock', pos: [0, 3, 2.4], decor: [0, 3, -6] },
    { id: '7-3', kind: 'lavarace', pos: [43, 4, -2], decor: [43, 4, -8.6] },
    { id: '7-4', kind: 'bluecylinders', pos: [-40, 3.5, -4], decor: [-48, 0.4, -21] },
    { id: '7-B', kind: 'bluecage', pos: [-77, 3.5, -4], decor: [-77, 3.5, -4], exit: [-67.4, 3.5, -4],
      cage: [[-86.5, -12.5, -67.5, -12.5], [-86.5, 4.5, -67.5, 4.5], [-86.5, -12.5, -86.5, 4.5], [-67.5, -12.5, -67.5, -6.4], [-67.5, -1.6, -67.5, 4.5]],
      towers: [[-86.5, -12.5], [-67.5, -12.5], [-86.5, 4.5], [-67.5, 4.5]], gateAt: [-67.5, -4] },
    { id: '7-5', kind: 'lavatower', pos: [-41, 5, -40.5], decor: [-41, 0.4, -53] },
    { id: '7-Kapitän', kind: 'machinediorama', pos: [-68, 5, -36], decor: [-68, 5, -41.6], disc: '7-K', labelY: 2.4 },
    { id: '7-6', kind: 'reeflagoon', pos: [-13, 3, -45], decor: [-2, 1, -62] },
    { id: '7-C', kind: 'werferhall', pos: [29, 5, -44], decor: [29, 5, -44], exit: [19.4, 5, -36] },
    { id: '7-7', kind: 'crater', pos: [-7, 7, -96.5], decor: [-7, 7.5, -107.5] },
    { id: '7-Burg', kind: 'lavakeep', pos: [37, 8.5, -108], decor: [37, 8.5, -122], labelY: 2.8 },
    { id: 'W8', kind: 'pipe', pos: [70, 8.5, -110], decor: [70, 8.5, -113.1],
      pipe: [[0, 0, 0], [0, 3.5, 0], [0.8, 5.8, -0.4], [5, 8.4, -2.4], [16, 11, -8], [40, 14, -22], [80, 16, -46], [150, 14, -88]], pipeDetail: 'low',
      arriveCam: { up: 7.5, ahead: 4, drop: 3.5 } },
  ],

  gates: [
    { for: '7-A', at: [-30, 32], axis: 'x' },
    { for: '7-2', at: [0, 22], axis: 'z' },
    { for: '7-3', at: [19, 0], axis: 'x' },
    { for: '7-4', at: [-22, 0], axis: 'x' },
    { for: '7-B', at: [-58, -4], axis: 'x' },
    { for: '7-5', at: [-40, -21], axis: 'z' },
    { for: '7-Kapitän', at: [-56, -38], axis: 'x' },
    { for: '7-6', at: [-25, -38], axis: 'x' },
    { for: '7-C', at: [13, -36], axis: 'x' },
    { for: '7-7', at: [-6, -60], axis: 'z' },
    { for: '7-Burg', at: [17, -96], axis: 'x' },
    { for: 'W8', at: [57, -112], axis: 'x' },
  ],

  // Wandernde Gegnergruppen der drei Arenen: der helle Lavafelsen-König stapft über die Felsfläche im Lavasee (7-A), der
  // blaue Schubser-Prinz durch den Käfig (7-B), vier Feuer-Werfer tänzeln in der Werfer-Halle (7-C)
  roamers: [
    { level: '7-A', model: 'lavafelsen_koenig', memberOpts: [{ variant: 'hell' }], count: 1, circle: [-48, 24, 4.4], y: 1.2, speed: 1.4, scale: 0.62,
      anims: { walk: 'idle' }, half: [0.9, 1.2, 0.9], castShadow: false, hint: 'Lauf den Lavafelsen-König an!' },
    { level: '7-B', model: 'schubser_prinz', memberOpts: [{ color: 'blau' }], standIn: 'schubser_prinz', count: 1, circle: [-77, -4, 4.6], y: 3.5, speed: 1.9,
      anims: { walk: 'charge' }, half: [0.8, 0.9, 0.8], castShadow: false, hint: 'Lauf den Schubser-Prinzen an!' },
    { level: '7-C', model: 'feuer_werfer', count: 4, circle: [29, -45, 4.2], y: 5, speed: 1.5,
      half: [0.5, 0.8, 0.5], castShadow: false, instance: true, hint: 'Lauf die Feuer-Werfer an!' },
  ],

  houses: [
    { kind: 'beeren', pos: [-6, 1.5, 38.6], yaw: -PI / 2, item: [-6, 1.5, 43.2], items: ['krallen', 'funken'] },
    { kind: 'glueck', pos: [3, 3, -47.6], yaw: -PI / 2, machine: [3, 3, -42.8], pad: [3, 3, -40.1], stake: 10 },
  ],

  signs: [
    { pos: [6.4, 1.5, 49.4], yaw: -0.15, text: 'Welt 7\nLava-Festung' },
    { pos: [-10.6, 1.5, 40.8], yaw: 0.3, text: 'Beerenhaus' },
    { pos: [-1.6, 3, -38.8], yaw: -0.2, text: 'Glückshaus' },
    // Sternschranke: Schild mit dem Sternbedarf vor der Lava-Burg
    { pos: [31.4, 8.5, -104.4], yaw: 0.3, text: 'ab 150 ★' },
  ],

  props: [
    // A Ankunftsbucht: Basaltsäulen, Lavablumen, Kisten, Fässer, Kanone an der Mauer
    { kind: 'basalt7', pos: [-19.6, 1.5, 49.6], size: 2.4 }, { kind: 'basalt7', pos: [19.4, 1.5, 49.8], size: 2.0, seed: 3 },
    { kind: 'lavaflower7', pos: [8.6, 1.5, 44.6], area: [4, 1.4], solid: false, shadow: false }, { kind: 'lavaflower7', pos: [-5.6, 1.5, 49.4], area: [4.4, 1.2], solid: false, shadow: false },
    { kind: 'emberbush7', pos: [-20, 1.5, 31.6], size: 0.9 }, { kind: 'emberbush7', pos: [9.6, 1.5, 38.4], size: 0.8 }, { kind: 'emberbush7', pos: [10.8, 1.5, 50.4], size: 0.7 },
    { kind: 'crates7', pos: [17.6, 1.5, 48.6] }, { kind: 'barrels7', pos: [-19.2, 1.5, 38.6] }, { kind: 'cannon7', pos: [19.6, 1.5, 41.6], yaw: 0.6 },
    { kind: 'vrock7', pos: [-14, 1.5, 51.2], size: 0.9 },
    // B Tempelplatz: Lavablumen, Basaltstümpfe
    { kind: 'lavaflower7', pos: [-9.6, 3, 10.4], area: [3, 1.2], solid: false, shadow: false }, { kind: 'lavaflower7', pos: [9.6, 3, 10.4], area: [3, 1.2], solid: false, shadow: false },
    { kind: 'basalt7', pos: [-12.4, 3, -3.6], size: 1.6, seed: 4 }, { kind: 'basalt7', pos: [12.4, 3, -3.6], size: 1.8, seed: 5 },
    // C Startplatz: Reifenstapel, Kisten
    { kind: 'tires7', pos: [35.6, 4, 4.4] }, { kind: 'tires7', pos: [50.4, 4, 4.4] }, { kind: 'crates7', pos: [50.2, 4, -8.4] },
    // D Blaue-Lava-Ufer
    { kind: 'basalt7', pos: [-48.4, 3.5, 4.4], size: 2.2, seed: 6, glow: 'blau' }, { kind: 'emberbush7', pos: [-31.6, 3.5, 4.4], size: 0.8, tone: 1 },
    { kind: 'crates7', pos: [-48.6, 3.5, -10.2] },
    // E Turm-Ufer
    { kind: 'basalt7', pos: [-50.4, 5, -32], size: 2, seed: 7 }, { kind: 'barrels7', pos: [-46.6, 5, -42.6] }, { kind: 'emberbush7', pos: [-50.6, 5, -42.6], size: 0.8 },
    // EK Diorama-Insel: Zahnräder
    { kind: 'gears7', pos: [-74.4, 5, -32] }, { kind: 'crates7', pos: [-61.6, 5, -44.6] },
    // F Riff-Ufer: Muscheln, Korallenäste am Strand, Laternen
    { kind: 'shells7', pos: [-17.6, 3, -36], solid: false }, { kind: 'shells7', pos: [6.4, 3, -48.6], solid: false }, { kind: 'vrock7', pos: [-18.6, 3, -48.6], size: 0.8, seed: 3 },
    // FC Hallen-Insel: Kisten
    { kind: 'crates7', pos: [38.4, 5, -36] },
    // G Kraterrand: Lavabrocken, Basalt
    { kind: 'vrock7', pos: [-24.2, 7, -84.6], size: 1.1, seed: 5 }, { kind: 'vrock7', pos: [10.4, 7, -84.4], size: 0.9, seed: 6 }, { kind: 'basalt7', pos: [-23.6, 7, -99.4], size: 2.4, seed: 8 },
    // H Burghof: Kanonen, Fässer
    { kind: 'cannon7', pos: [24.6, 8.5, -104], yaw: 0.6 }, { kind: 'cannon7', pos: [49.4, 8.5, -104], yaw: -0.6 }, { kind: 'barrels7', pos: [49.6, 8.5, -94.6] },
    // I Röhren-Insel
    { kind: 'basalt7', pos: [76, 8.5, -104.4], size: 2.2, seed: 9 }, { kind: 'lavaflower7', pos: [66, 8.5, -104.4], area: [3, 1.2], solid: false, shadow: false },
    { kind: 'emberbush7', pos: [76.2, 8.5, -119.6], size: 0.8 },
    // Basaltsäulen und Felsnadeln in Lava und Meer (nur Kulisse)
    { kind: 'basalt7', pos: [-20, 0.4, 25.6], size: 3.2, seed: 11, solid: false }, { kind: 'basalt7', pos: [16, 0.4, 18], size: 2.6, seed: 12, solid: false },
    { kind: 'spire7', pos: [-66, 0.4, 36], size: 6, solid: false }, { kind: 'spire7', pos: [62, 0.4, 22], size: 7, solid: false }, { kind: 'spire7', pos: [66, 0.4, -24], size: 5.5, solid: false },
    { kind: 'spire7', pos: [-70, 0.4, -78], size: 6.5, solid: false }, { kind: 'spire7', pos: [58, 0.4, -140], size: 8, solid: false },
    { kind: 'spire7', pos: [-40, 0, 66], size: 6, solid: false }, { kind: 'spire7', pos: [46, 0, 66], size: 7, solid: false }, { kind: 'spire7', pos: [-96, 0, -28], size: 8, solid: false },
    { kind: 'spire7', pos: [86, 0, -64], size: 9, solid: false }, { kind: 'spire7', pos: [-44, 0, -110], size: 9, solid: false },
  ],

  segments: [
    { type: 'basaltbridge', from: [-22, 1.5, 32], to: [-38, 1.2, 32], width: 4 },
    { type: 'basaltbridge', from: [0, 1.5, 30], to: [0, 3, 14], width: 4 },
    { type: 'basaltbridge', from: [14, 3, 0], to: [34, 4, 0], width: 4 },
    { type: 'basaltbridge', from: [-14, 3, 0], to: [-30, 3.5, 0], width: 4 },
    { type: 'chainbridge', from: [-50, 3.5, -4], to: [-66, 3.5, -4], width: 4 },
    { type: 'chainbridge', from: [-40, 3.5, -12], to: [-40, 5, -30], width: 4 },
    { type: 'basaltbridge', from: [-52, 5, -38], to: [-60, 5, -38], width: 4 },
    { type: 'basaltbridge', from: [-30, 5, -38], to: [-20, 3, -38], width: 4 },
    { type: 'chainbridge', from: [8, 3, -36], to: [18, 5, -36], width: 4 },
    { type: 'causeway', from: [-6, 3, -50], to: [-6, 7, -82], width: 4 },
    { type: 'drawbridge', from: [12, 7, -96], to: [22, 8.5, -96], width: 4 },
    { type: 'glasstube', from: [52, 8.5, -112], to: [62, 8.5, -112], width: 4 },
  ],
};
